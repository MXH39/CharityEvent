/**
 * PROG2002 Web Development II - Assessment 3
 * File: server.js
 * Purpose: Express application entry point for the Charity Event Management System.
 *
 * It is responsible for three things:
 *   1. Serving the AngularJS CLIENT-SIDE website  ->  http://localhost:3000/
 *   2. Serving the AngularJS ADMIN-SIDE website   ->  http://localhost:3000/admin/
 *   3. Exposing the RESTful JSON API              ->  http://localhost:3000/api/...
 *
 * The Assessment 2 version of this file contained every endpoint inline. For
 * Assessment 3 the routes have been split into separate modules under /routes so
 * that the project stays readable and each team member can work on a different
 * resource without constantly editing the same file.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./event_db');

// --- Route modules ----------------------------------------------------------
const eventsRouter = require('./routes/events');
const categoriesRouter = require('./routes/categories');
const registrationsRouter = require('./routes/registrations');
const organisationsRouter = require('./routes/organisations');
const weatherRouter = require('./routes/weather');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors());                                   // allow the AngularJS $http calls
app.use(express.json());                           // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));    // parse classic form posts

// Tiny request logger - very helpful while demonstrating the API in the video.
app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
        if (req.originalUrl.startsWith('/api')) {
            console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
        }
    });
    next();
});

// ---------------------------------------------------------------------------
// RESTful API
// ---------------------------------------------------------------------------
app.use('/api/events', eventsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/organisations', organisationsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/admin', adminRouter);

/**
 * Backwards-compatible alias for the Assessment 2 endpoint name, so any old
 * bookmarks / links keep working after the upgrade.
 *   GET /api/event-detail/:id  ->  GET /api/events/:id
 */
app.get('/api/event-detail/:id', (req, res) => res.redirect(307, `/api/events/${req.params.id}`));

/** Health check - handy for the cPanel deployment and for Postman. */
app.get('/api/health', async (req, res) => {
    const connected = await db.testConnection();
    res.status(connected ? 200 : 503).json({
        status: connected ? 'ok' : 'database unavailable',
        database: db.dbConfig.database,
        node: process.version,
        time: new Date().toISOString()
    });
});

// ---------------------------------------------------------------------------
// Static websites
//   /        -> client-side  (AngularJS single page application)
//   /admin   -> admin-side   (AngularJS single page application)
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'client-side')));
app.use('/admin', express.static(path.join(__dirname, 'admin-side')));

// ---------------------------------------------------------------------------
// 404 + central error handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ msg: `API endpoint ${req.method} ${req.originalUrl} does not exist.` });
    }
    res.status(404).sendFile(path.join(__dirname, 'client-side', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[error]', err);
    // Translate the most common MySQL errors into meaningful HTTP responses.
    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ msg: 'The referenced category or organisation does not exist.' });
    }
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({ msg: 'This record cannot be deleted because other records still reference it.' });
    }
    res.status(err.statusCode || 500).json({
        msg: 'An unexpected server error occurred.',
        detail: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
    console.log('==============================================================');
    console.log(' PROG2002 A3 - Charity Event Management System');
    console.log(` Client-side website : http://localhost:${PORT}/`);
    console.log(` Admin-side website  : http://localhost:${PORT}/admin/`);
    console.log(` REST API base       : http://localhost:${PORT}/api/`);
    console.log(` Node.js runtime     : ${process.version}`);
    console.log('==============================================================');
    db.testConnection();
});

// Make sure the MySQL pool is closed cleanly when the process stops.
['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
        server.close(() => {
            db.end().finally(() => process.exit(0));
        });
    });
});

module.exports = app;
