/**
 * PROG2002 Web Development II - Assessment 3
 * File: routes/events.js
 * Purpose: RESTful API endpoints for the `charity_events` resource.
 *
 * Endpoints (mounted at /api/events)
 *   GET    /                     list / search events (filters: date, location,
 *                                category_id, keyword, status, upcoming)
 *   GET    /upcoming             active events that have not happened yet (Home page)
 *   GET    /:id                  event detail + complete list of its registrations
 *   GET    /:id/registrations    registrations of one event (newest purchase first)
 *   GET    /:id/weather          external Open-Meteo forecast for the event day
 *   POST   /                     create a new charity event          (admin)
 *   PUT    /:id                  update an existing charity event    (admin)
 *   DELETE /:id                  delete an event - blocked when registrations exist
 */

const express = require('express');
const router = express.Router();
const db = require('../event_db');
const weatherService = require('../services/weatherService');
const { withStatus, validateEvent, toMysqlDateTime } = require('../utils/helpers');

/**
 * Reusable SELECT that joins the event to its category and organisation and
 * calculates the registration aggregates required by the admin list.
 * Written once so every endpoint returns exactly the same shape of data.
 */
const EVENT_SELECT = `
    SELECT  e.event_id,
            e.organisation_id,
            e.category_id,
            e.event_title,
            e.event_description,
            e.event_date,
            e.location,
            e.latitude,
            e.longitude,
            e.ticket_price,
            e.fundraising_goal,
            e.current_progress,
            e.is_suspended,
            c.category_name,
            o.organisation_name,
            (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.event_id)                        AS registration_count,
            (SELECT COALESCE(SUM(r.tickets_purchased), 0) FROM event_registrations r WHERE r.event_id = e.event_id) AS tickets_sold,
            (SELECT COALESCE(SUM(r.total_amount), 0) FROM event_registrations r WHERE r.event_id = e.event_id)     AS amount_raised
    FROM charity_events e
    JOIN event_categories c      ON e.category_id = c.category_id
    JOIN charity_organisations o ON e.organisation_id = o.organisation_id
`;

/**
 * Translates a status keyword coming from the UI into a SQL WHERE fragment.
 * @param {string} status 'Active' | 'Past' | 'Suspended' | '' (all)
 */
function statusCondition(status) {
    switch (String(status || '').toLowerCase()) {
        case 'active':
            return { sql: ' AND e.is_suspended = 0 AND e.event_date >= NOW() ', params: [] };
        case 'past':
            return { sql: ' AND e.is_suspended = 0 AND e.event_date <  NOW() ', params: [] };
        case 'suspended':
            return { sql: ' AND e.is_suspended = 1 ', params: [] };
        default:
            return { sql: '', params: [] };
    }
}

// ---------------------------------------------------------------------------
// GET /api/events/upcoming  -> Home page: next active charity events
// ---------------------------------------------------------------------------
router.get('/upcoming', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 6, 50);
        const sql = `${EVENT_SELECT}
                     WHERE e.is_suspended = 0 AND e.event_date >= NOW()
                     ORDER BY e.event_date ASC
                     LIMIT ?`;
        const [rows] = await db.query(sql, [limit]);
        res.json(rows.map(withStatus));
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/events  -> list / search (Home, Search page and admin list)
// Supported query strings: date, location, keyword, category_id, status, upcoming
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
    try {
        const { date, location, keyword, category_id, status, upcoming } = req.query;
        let sql = EVENT_SELECT + ' WHERE 1 = 1 ';
        const params = [];

        if (date) {
            sql += ' AND DATE(e.event_date) = ? ';
            params.push(date);
        }
        if (location) {
            sql += ' AND e.location LIKE ? ';
            params.push(`%${location}%`);
        }
        if (keyword) {
            sql += ' AND (e.event_title LIKE ? OR e.event_description LIKE ?) ';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }
        if (category_id) {
            sql += ' AND e.category_id = ? ';
            params.push(category_id);
        }
        if (String(upcoming).toLowerCase() === 'true') {
            sql += ' AND e.is_suspended = 0 AND e.event_date >= NOW() ';
        }

        const statusFilter = statusCondition(status);
        sql += statusFilter.sql;

        sql += ' ORDER BY e.event_date ASC ';

        const [rows] = await db.query(sql, params.concat(statusFilter.params));
        res.json(rows.map(withStatus));
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/events/:id/registrations
// "the list of tickets purchased at the event, sorted by the latest date when
//  the tickets were purchased" -> ORDER BY registration_date DESC
// ---------------------------------------------------------------------------
router.get('/:id/registrations', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT registration_id, event_id, attendee_name, attendee_email, contact_phone,
                    tickets_purchased, total_amount, registration_date, registration_status
             FROM event_registrations
             WHERE event_id = ?
             ORDER BY registration_date DESC, registration_id DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/events/:id/weather  -> proxy to the external Open-Meteo API
// ---------------------------------------------------------------------------
router.get('/:id/weather', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT event_id, event_title, event_date, location, latitude, longitude FROM charity_events WHERE event_id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ msg: `Event with id ${req.params.id} was not found.` });
        }
        const weather = await weatherService.getEventWeather(rows[0]);
        res.json(weather);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/events/:id  -> event detail + all of its registrations
// Assessment 3: "retrieves not only the event details but also the complete
// list of associated registrations for that specific event"
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
    try {
        const [eventRows] = await db.query(`${EVENT_SELECT} WHERE e.event_id = ?`, [req.params.id]);
        if (eventRows.length === 0) {
            return res.status(404).json({ msg: `Event with id ${req.params.id} was not found.` });
        }

        const [registrationRows] = await db.query(
            `SELECT registration_id, event_id, attendee_name, attendee_email, contact_phone,
                    tickets_purchased, total_amount, registration_date, registration_status
             FROM event_registrations
             WHERE event_id = ?
             ORDER BY registration_date DESC, registration_id DESC`,
            [req.params.id]
        );

        const event = withStatus(eventRows[0]);
        // Summary numbers used by the detail page "progress bars".
        event.total_tickets_purchased = registrationRows.reduce((sum, r) => sum + Number(r.tickets_purchased), 0);
        event.total_raised = Number(event.amount_raised || 0);

        res.json({ event, registrations: registrationRows });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/events  -> CREATE (admin-side website)
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
    try {
        const { valid, errors } = validateEvent(req.body, { partial: false });
        if (!valid) {
            return res.status(400).json({ msg: 'Validation failed.', errors });
        }

        const payload = {
            organisation_id: Number(req.body.organisation_id),
            category_id: Number(req.body.category_id),
            event_title: String(req.body.event_title).trim(),
            event_description: (req.body.event_description || '').trim() || null,
            event_date: toMysqlDateTime(req.body.event_date),
            location: String(req.body.location).trim(),
            latitude: req.body.latitude === '' || req.body.latitude === undefined ? null : Number(req.body.latitude),
            longitude: req.body.longitude === '' || req.body.longitude === undefined ? null : Number(req.body.longitude),
            ticket_price: Number(req.body.ticket_price) || 0,
            fundraising_goal: Number(req.body.fundraising_goal) || 0,
            current_progress: Number(req.body.current_progress) || 0,
            is_suspended: Number(req.body.is_suspended) === 1 ? 1 : 0
        };

        const [result] = await db.query(
            `INSERT INTO charity_events
                (organisation_id, category_id, event_title, event_description, event_date,
                 location, latitude, longitude, ticket_price, fundraising_goal, current_progress, is_suspended)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.organisation_id, payload.category_id, payload.event_title, payload.event_description,
                payload.event_date, payload.location, payload.latitude, payload.longitude,
                payload.ticket_price, payload.fundraising_goal, payload.current_progress, payload.is_suspended
            ]
        );

        const [created] = await db.query(`${EVENT_SELECT} WHERE e.event_id = ?`, [result.insertId]);
        res.status(201).json({
            msg: 'Event created successfully.',
            newId: result.insertId,
            event: withStatus(created[0])
        });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// PUT /api/events/:id  -> UPDATE (admin-side website)
// Only the columns that were actually sent are updated.
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
    try {
        const { valid, errors } = validateEvent(req.body, { partial: true });
        if (!valid) {
            return res.status(400).json({ msg: 'Validation failed.', errors });
        }

        const [exists] = await db.query('SELECT event_id FROM charity_events WHERE event_id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ msg: `Event with id ${req.params.id} was not found.` });
        }

        // Map incoming camelCase-free field names straight onto their columns.
        const columnMap = {
            organisation_id: (v) => Number(v),
            category_id: (v) => Number(v),
            event_title: (v) => String(v).trim(),
            event_description: (v) => (v || '').toString().trim() || null,
            event_date: (v) => toMysqlDateTime(v),
            location: (v) => String(v).trim(),
            latitude: (v) => (v === '' || v === null ? null : Number(v)),
            longitude: (v) => (v === '' || v === null ? null : Number(v)),
            ticket_price: (v) => Number(v) || 0,
            fundraising_goal: (v) => Number(v) || 0,
            current_progress: (v) => Number(v) || 0,
            is_suspended: (v) => (Number(v) === 1 ? 1 : 0)
        };

        const setClauses = [];
        const params = [];
        Object.keys(columnMap).forEach((column) => {
            if (req.body[column] !== undefined) {
                setClauses.push(`\`${column}\` = ?`);
                params.push(columnMap[column](req.body[column]));
            }
        });

        if (setClauses.length === 0) {
            return res.status(400).json({ msg: 'No updatable fields were provided.' });
        }

        params.push(req.params.id);
        await db.query(`UPDATE charity_events SET ${setClauses.join(', ')} WHERE event_id = ?`, params);

        const [updated] = await db.query(`${EVENT_SELECT} WHERE e.event_id = ?`, [req.params.id]);
        res.json({ msg: 'Event updated successfully.', event: withStatus(updated[0]) });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/events/:id
// Data integrity rule from the brief: an event can ONLY be deleted when it has
// no registrations. Otherwise the request is blocked with HTTP 409 Conflict.
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
    try {
        const [exists] = await db.query(
            'SELECT event_id, event_title FROM charity_events WHERE event_id = ?',
            [req.params.id]
        );
        if (exists.length === 0) {
            return res.status(404).json({ msg: `Event with id ${req.params.id} was not found.` });
        }

        const [countRows] = await db.query(
            'SELECT COUNT(*) AS registration_count FROM event_registrations WHERE event_id = ?',
            [req.params.id]
        );
        const registrationCount = countRows[0].registration_count;

        if (registrationCount > 0) {
            return res.status(409).json({
                msg: `Cannot delete "${exists[0].event_title}" because it already has ${registrationCount} registration(s). ` +
                     'Cancel or remove the registrations first to keep the database consistent.',
                registration_count: registrationCount
            });
        }

        await db.query('DELETE FROM charity_events WHERE event_id = ?', [req.params.id]);
        res.json({ msg: `Event "${exists[0].event_title}" was deleted successfully.` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
