/**
 * PROG2002 Web Development II - Assessment 3
 * File: routes/admin.js
 * Purpose: Endpoints that only the admin-side dashboard needs - aggregated
 * numbers and the "all events regardless of status" list.
 *
 * Endpoints (mounted at /api/admin)
 *   GET /stats   summary numbers for the dashboard cards
 *   GET /events  every charity event (Active, Past and Suspended) with its
 *                registration count, tickets sold and money raised
 */

const express = require('express');
const router = express.Router();
const db = require('../event_db');
const { withStatus } = require('../utils/helpers');

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
    try {
        const [[eventTotals]] = await db.query(
            `SELECT COUNT(*)                                                        AS total_events,
                    SUM(CASE WHEN is_suspended = 1 THEN 1 ELSE 0 END)                AS suspended_events,
                    SUM(CASE WHEN is_suspended = 0 AND event_date >= NOW() THEN 1 ELSE 0 END) AS active_events,
                    SUM(CASE WHEN is_suspended = 0 AND event_date <  NOW() THEN 1 ELSE 0 END) AS past_events
             FROM charity_events`
        );

        const [[registrationTotals]] = await db.query(
            `SELECT COUNT(*)                                AS total_registrations,
                    COALESCE(SUM(tickets_purchased), 0)     AS total_tickets,
                    COALESCE(SUM(total_amount), 0)          AS total_revenue
             FROM event_registrations
             WHERE registration_status <> 'Cancelled'`
        );

        const [[categoryTotals]] = await db.query('SELECT COUNT(*) AS total_categories FROM event_categories');

        const [topEvents] = await db.query(
            `SELECT e.event_id, e.event_title, e.event_date, c.category_name,
                    COUNT(r.registration_id)               AS registration_count,
                    COALESCE(SUM(r.tickets_purchased), 0)  AS tickets_sold,
                    COALESCE(SUM(r.total_amount), 0)       AS revenue
             FROM charity_events e
             JOIN event_categories c ON e.category_id = c.category_id
             LEFT JOIN event_registrations r ON r.event_id = e.event_id
             GROUP BY e.event_id, e.event_title, e.event_date, c.category_name
             ORDER BY tickets_sold DESC, revenue DESC
             LIMIT 5`
        );

        res.json({
            events: {
                total: Number(eventTotals.total_events || 0),
                active: Number(eventTotals.active_events || 0),
                past: Number(eventTotals.past_events || 0),
                suspended: Number(eventTotals.suspended_events || 0)
            },
            registrations: {
                total: Number(registrationTotals.total_registrations || 0),
                tickets: Number(registrationTotals.total_tickets || 0),
                revenue: Number(registrationTotals.total_revenue || 0)
            },
            categories: Number(categoryTotals.total_categories || 0),
            top_events: topEvents
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/events - the admin "List" feature (all statuses included)
router.get('/events', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT  e.event_id, e.organisation_id, e.category_id, e.event_title, e.event_description,
                     e.event_date, e.location, e.latitude, e.longitude, e.ticket_price,
                     e.fundraising_goal, e.current_progress, e.is_suspended,
                     c.category_name, o.organisation_name,
                     (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.event_id) AS registration_count,
                     (SELECT COALESCE(SUM(r.tickets_purchased), 0) FROM event_registrations r WHERE r.event_id = e.event_id) AS tickets_sold,
                     (SELECT COALESCE(SUM(r.total_amount), 0) FROM event_registrations r WHERE r.event_id = e.event_id) AS amount_raised
             FROM charity_events e
             JOIN event_categories c      ON e.category_id = c.category_id
             JOIN charity_organisations o ON e.organisation_id = o.organisation_id
             ORDER BY e.event_date DESC`
        );
        res.json(rows.map(withStatus));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
