/**
 * PROG2002 Web Development II - Assessment 3
 * File: routes/categories.js
 * Purpose: RESTful endpoints for the `event_categories` resource.
 * Assessment 3 requires the admin-side website to be able to manipulate
 * "charity events AND event category data", so full CRUD is provided here.
 *
 * Endpoints (mounted at /api/categories)
 *   GET    /        all categories (with how many events use each one)
 *   GET    /:id     one category
 *   POST   /        create a category                (admin)
 *   PUT    /:id     rename a category                (admin)
 *   DELETE /:id     delete a category - blocked while events still use it
 */

const express = require('express');
const router = express.Router();
const db = require('../event_db');
const { isNonEmptyString } = require('../utils/helpers');

// GET /api/categories
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT c.category_id, c.category_name,
                    (SELECT COUNT(*) FROM charity_events e WHERE e.category_id = c.category_id) AS event_count
             FROM event_categories c
             ORDER BY c.category_id ASC`
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/categories/:id
router.get('/:id', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT category_id, category_name FROM event_categories WHERE category_id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ msg: `Category with id ${req.params.id} was not found.` });
        }
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
    try {
        const name = (req.body.category_name || '').trim();
        if (!isNonEmptyString(name)) {
            return res.status(400).json({ msg: 'Category name is required.' });
        }
        if (name.length > 50) {
            return res.status(400).json({ msg: 'Category name must be 50 characters or fewer.' });
        }

        const [duplicate] = await db.query(
            'SELECT category_id FROM event_categories WHERE LOWER(category_name) = LOWER(?)',
            [name]
        );
        if (duplicate.length > 0) {
            return res.status(409).json({ msg: `Category "${name}" already exists.` });
        }

        const [result] = await db.query('INSERT INTO event_categories (category_name) VALUES (?)', [name]);
        res.status(201).json({
            msg: 'Category created successfully.',
            category: { category_id: result.insertId, category_name: name, event_count: 0 }
        });
    } catch (err) {
        next(err);
    }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
    try {
        const name = (req.body.category_name || '').trim();
        if (!isNonEmptyString(name)) {
            return res.status(400).json({ msg: 'Category name is required.' });
        }

        const [exists] = await db.query('SELECT category_id FROM event_categories WHERE category_id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ msg: `Category with id ${req.params.id} was not found.` });
        }

        await db.query('UPDATE event_categories SET category_name = ? WHERE category_id = ?', [name, req.params.id]);
        res.json({ msg: 'Category updated successfully.', category: { category_id: Number(req.params.id), category_name: name } });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/categories/:id  (referential integrity guard)
router.delete('/:id', async (req, res, next) => {
    try {
        const [exists] = await db.query(
            'SELECT category_id, category_name FROM event_categories WHERE category_id = ?',
            [req.params.id]
        );
        if (exists.length === 0) {
            return res.status(404).json({ msg: `Category with id ${req.params.id} was not found.` });
        }

        const [usage] = await db.query(
            'SELECT COUNT(*) AS event_count FROM charity_events WHERE category_id = ?',
            [req.params.id]
        );
        if (usage[0].event_count > 0) {
            return res.status(409).json({
                msg: `Cannot delete category "${exists[0].category_name}" because ${usage[0].event_count} event(s) still use it.`
            });
        }

        await db.query('DELETE FROM event_categories WHERE category_id = ?', [req.params.id]);
        res.json({ msg: `Category "${exists[0].category_name}" was deleted successfully.` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
