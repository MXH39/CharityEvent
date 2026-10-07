/**
 * PROG2002 Web Development II - Assessment 3
 * File: event_db.js
 * Purpose: Central MySQL connection module for the Charity Event database.
 *
 * The database schema was extended for Assessment 3 (see /database/charityevents_db.sql):
 *   - charity_organisations  (new) one organisation runs many charity events
 *   - event_categories       existing lookup table for event types
 *   - charity_events         extended with latitude / longitude (needed by the
 *                            external Open-Meteo weather API) and is_suspended
 *   - event_registrations    (new) records every ticket purchase for an event,
 *                            linked to charity_events with a FOREIGN KEY and a
 *                            UNIQUE (event_id, attendee_email) constraint so that
 *                            one user may register for many events but only once
 *                            per event.
 *
 * A connection POOL is used instead of a single connection so that concurrent
 * requests (e.g. several AngularJS $http calls arriving together) do not queue
 * behind one another and the API can recover automatically if the MySQL server
 * drops an idle connection.
 *
 * Connection settings can be overridden with environment variables so that the
 * exact same code can run on a local machine and on the SCU cPanel server:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

const mysql = require('mysql2/promise');

// ---------------------------------------------------------------------------
// Connection configuration (environment variables win over the local defaults)
// ---------------------------------------------------------------------------
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'charityevents_db',
    waitForConnections: true,
    connectionLimit: 10,     // max simultaneous MySQL connections
    queueLimit: 0,           // unlimited queued requests
    dateStrings: true,       // return DATE/DATETIME as plain strings (JSON friendly)
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

/**
 * Small helper used at start-up (and by the smoke test) to prove the
 * credentials in this file really can reach the charityevents_db database.
 * @returns {Promise<boolean>} true when the connection succeeded.
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log(`[db] Connected to database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
        return true;
    } catch (err) {
        console.error('[db] Connection failed:', err.message);
        return false;
    }
}

module.exports = pool;
module.exports.testConnection = testConnection;
module.exports.dbConfig = dbConfig;
