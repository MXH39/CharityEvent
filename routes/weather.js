/**
 * PROG2002 Web Development II - Assessment 3
 * File: routes/weather.js
 * Purpose: Exposes the external Open-Meteo integration as standalone REST
 * endpoints so it can be demonstrated independently (Postman / browser) as well
 * as through the event detail page.
 *
 * Endpoints (mounted at /api/weather)
 *   GET /forecast?latitude=..&longitude=..[&start_date=..&end_date=..]
 *   GET /event/:id          forecast for the day of a specific charity event
 *   GET /codes              the WMO weather-code translation table used by the API
 */

const express = require('express');
const router = express.Router();
const db = require('../event_db');
const weatherService = require('../services/weatherService');
const { WEATHER_CODES } = require('../utils/helpers');

// GET /api/weather/codes - documents the "code -> description" mapping from the brief
router.get('/codes', (req, res) => {
    res.json(
        Object.keys(WEATHER_CODES).map((code) => ({
            code: Number(code),
            description: WEATHER_CODES[code].description,
            icon: WEATHER_CODES[code].icon
        }))
    );
});

// GET /api/weather/forecast?latitude=-33.87&longitude=151.21
router.get('/forecast', async (req, res, next) => {
    try {
        const latitude = Number(req.query.latitude);
        const longitude = Number(req.query.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude) ||
            latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                msg: 'Query parameters latitude (-90..90) and longitude (-180..180) are required, e.g. ' +
                     '/api/weather/forecast?latitude=-33.87&longitude=151.21'
            });
        }

        const forecast = await weatherService.getForecast(latitude, longitude, req.query.start_date, req.query.end_date);
        res.json(forecast);
    } catch (err) {
        next(err);
    }
});

// GET /api/weather/event/:id
router.get('/event/:id', async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT event_id, event_title, event_date, location, latitude, longitude FROM charity_events WHERE event_id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ msg: `Event with id ${req.params.id} was not found.` });
        }
        res.json(await weatherService.getEventWeather(rows[0]));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
