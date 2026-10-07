/**
 * PROG2002 Web Development II - Assessment 3
 * File: routes/organisations.js
 * Purpose: Read-only endpoints for `charity_organisations`, the new parent table
 * that the Home page uses to display the mission statement and contact details
 * (previously those values were hard-coded in the HTML of Assessment 2 - now they
 * are dynamic and come from the database through an API).
 *
 * Endpoints (mounted at /api/organisations)
 *   GET /       all organisations
 *   GET /:id    one organisation
 */

const express = require('express');
const router = express.Router();
const db = require('../event_db');

// GET /api/organisations
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT o.organisation_id, o.organisation_name, o.mission, o.contact_email, o.contact_phone,
                    (SELECT COUNT(*) FROM charity_events e WHERE e.organisation_id = o.organisation_id) AS event_count
             FROM charity_organisations o
             ORDER BY o.organisation_id ASC`
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/organisations/:id
router.get('/:id', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT organisation_id, organisation_name, mission, contact_email, contact_phone
             FROM charity_organisations WHERE organisation_id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ msg: `Organisation with id ${req.params.id} was not found.` });
        }
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
