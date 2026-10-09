/**
 * PROG2002 Web Development II - Assessment 3
 * File: routes/registrations.js
 * Purpose: RESTful endpoints for the `event_registrations` resource - the new
 * table created in Part 1 to record who registered for which charity event.
 *
 * Endpoints (mounted at /api/registrations)
 *   GET    /        all registrations (optional ?event_id= & ?status=)  (admin)
 *   GET    /:id     one registration
 *   POST   /        create a new registration  <- used by the client registration page
 *   PUT    /:id     update a registration (e.g. change status / ticket count)
 *   DELETE /:id     remove a registration
 *
 * Business rules enforced here (from the brief):
 *   - One user may register for MULTIPLE events but only ONCE per event.
 *     This is guaranteed by the UNIQUE (event_id, attendee_email) index in the
 *     database and double-checked here so the client receives a friendly message.
 *   - Suspended or already finished events no longer accept registrations.
 */

const express = require('express');
const router = express.Router();
const db = require('../event_db');
const { validateRegistration, getEventStatus } = require('../utils/helpers');

const REGISTRATION_SELECT = `
    SELECT  r.registration_id, r.event_id, r.attendee_name, r.attendee_email, r.contact_phone,
            r.tickets_purchased, r.total_amount, r.registration_date, r.registration_status,
            e.event_title, e.event_date, e.location, e.ticket_price, c.category_name
    FROM event_registrations r
    JOIN charity_events e   ON r.event_id = e.event_id
    JOIN event_categories c ON e.category_id = c.category_id
`;

// GET /api/registrations
router.get('/', async (req, res, next) => {
    try {
        const { event_id, status } = req.query;
        let sql = REGISTRATION_SELECT + ' WHERE 1 = 1 ';
        const params = [];

        if (event_id) {
            sql += ' AND r.event_id = ? ';
            params.push(event_id);
        }
        if (status) {
            sql += ' AND r.registration_status = ? ';
            params.push(status);
        }
        sql += ' ORDER BY r.registration_date DESC, r.registration_id DESC ';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/registrations/:id
router.get('/:id', async (req, res, next) => {
    try {
        const [rows] = await db.query(`${REGISTRATION_SELECT} WHERE r.registration_id = ?`, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: `Registration with id ${req.params.id} was not found.` });
        }
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/registrations  -> INSERT a new registration record
// Called by the new Event Registration Page (client-side website).
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
    try {
        // --- 1. server-side validation (never trust the browser) -------------
        const { valid, errors } = validateRegistration(req.body);
        if (!valid) {
            return res.status(400).json({ msg: 'Please correct the highlighted fields.', errors });
        }

        const eventId = Number(req.body.event_id);
        const email = String(req.body.attendee_email).trim().toLowerCase();
        const tickets = Number(req.body.tickets_purchased);

        // --- 2. the event must exist ----------------------------------------
        const [eventRows] = await db.query(
            `SELECT event_id, event_title, event_date, is_suspended, ticket_price
             FROM charity_events WHERE event_id = ?`,
            [eventId]
        );
        if (eventRows.length === 0) {
            return res.status(404).json({ msg: `Event with id ${eventId} was not found.` });
        }

        const event = eventRows[0];
        const status = getEventStatus(event);

        // --- 3. business rules ----------------------------------------------
        if (status === 'Suspended') {
            return res.status(409).json({ msg: `"${event.event_title}" is suspended and is not accepting new registrations.` });
        }
        if (status === 'Past') {
            return res.status(409).json({ msg: `"${event.event_title}" has already taken place and can no longer be registered for.` });
        }

        // --- 4. one registration per event per email -------------------------
        const [duplicate] = await db.query(
            'SELECT registration_id FROM event_registrations WHERE event_id = ? AND LOWER(attendee_email) = ?',
            [eventId, email]
        );
        if (duplicate.length > 0) {
            return res.status(409).json({
                msg: `This email address has already registered for "${event.event_title}". ` +
                     'Each attendee may only register once per event.'
            });
        }

        // --- 5. calculate the total and insert ------------------------------
        const totalAmount = Number((Number(event.ticket_price) * tickets).toFixed(2));

        const [result] = await db.query(
            `INSERT INTO event_registrations
                (event_id, attendee_name, attendee_email, contact_phone,
                 tickets_purchased, total_amount, registration_status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                eventId,
                String(req.body.attendee_name).trim(),
                email,
                String(req.body.contact_phone).trim(),
                tickets,
                totalAmount,
                'Confirmed'
            ]
        );

        const [created] = await db.query(`${REGISTRATION_SELECT} WHERE r.registration_id = ?`, [result.insertId]);
        res.status(201).json({
            msg: `Thank you! Your registration for "${event.event_title}" is confirmed.`,
            registration: created[0]
        });
    } catch (err) {
        // ER_DUP_ENTRY is raised by the UNIQUE (event_id, attendee_email) index.
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ msg: 'This email address has already registered for this event.' });
        }
        next(err);
    }
});

// ---------------------------------------------------------------------------
// PUT /api/registrations/:id  -> UPDATE (admin: e.g. cancel or correct a booking)
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
    try {
        const [exists] = await db.query('SELECT event_id FROM event_registrations WHERE registration_id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ msg: `Registration with id ${req.params.id} was not found.` });
        }

        const allowedStatuses = ['Confirmed', 'Pending', 'Cancelled'];
        const setClauses = [];
        const params = [];

        if (req.body.attendee_name !== undefined) {
            setClauses.push('attendee_name = ?');
            params.push(String(req.body.attendee_name).trim());
        }
        if (req.body.contact_phone !== undefined) {
            setClauses.push('contact_phone = ?');
            params.push(String(req.body.contact_phone).trim());
        }
        if (req.body.registration_status !== undefined) {
            if (!allowedStatuses.includes(req.body.registration_status)) {
                return res.status(400).json({ msg: `registration_status must be one of: ${allowedStatuses.join(', ')}.` });
            }
            setClauses.push('registration_status = ?');
            params.push(req.body.registration_status);
        }
        if (req.body.tickets_purchased !== undefined) {
            const tickets = Number(req.body.tickets_purchased);
            if (!Number.isInteger(tickets) || tickets < 1) {
                return res.status(400).json({ msg: 'tickets_purchased must be a whole number of at least 1.' });
            }
            const [priceRows] = await db.query('SELECT ticket_price FROM charity_events WHERE event_id = ?', [exists[0].event_id]);
            setClauses.push('tickets_purchased = ?', 'total_amount = ?');
            params.push(tickets, Number((Number(priceRows[0].ticket_price) * tickets).toFixed(2)));
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ msg: 'No updatable fields were provided.' });
        }

        params.push(req.params.id);
        await db.query(`UPDATE event_registrations SET ${setClauses.join(', ')} WHERE registration_id = ?`, params);

        const [updated] = await db.query(`${REGISTRATION_SELECT} WHERE r.registration_id = ?`, [req.params.id]);
        res.json({ msg: 'Registration updated successfully.', registration: updated[0] });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/registrations/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM event_registrations WHERE registration_id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: `Registration with id ${req.params.id} was not found.` });
        }
        res.json({ msg: 'Registration deleted successfully.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
