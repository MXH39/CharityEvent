/**
 * PROG2002 Web Development II - Assessment 3
 * File: services/weatherService.js
 * Purpose: Wrapper around the EXTERNAL Open-Meteo weather API
 *          (https://api.open-meteo.com) - the optional enhancement in Part 6 of
 *          the brief. It is used by the event detail page to show what the
 *          weather will be like on the day of a charity event (an outdoor Fun Run
 *          with heavy rain is very different from a sunny one!).
 *
 * Why proxy the call through Node instead of calling it from AngularJS?
 *   1. Keeps the third-party URL and any future API key on the server.
 *   2. The WMO weather codes are translated into text/emoji ONCE, server-side,
 *      so the AngularJS controller stays thin.
 *   3. Caches the response in memory for 30 minutes, which is polite to the free
 *      public API and makes the page much faster on repeat visits.
 *
 * Node.js 18+ exposes `fetch` globally, so no extra HTTP library is required.
 */

const { describeWeatherCode, toIsoDate } = require('../utils/helpers');

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEZONE = process.env.WEATHER_TIMEZONE || 'Australia/Sydney';
const CACHE_TTL_MS = 30 * 60 * 1000;            // 30 minutes
const FORECAST_DAYS = 16;                        // Open-Meteo daily forecast window

/** Very small in-memory cache: key -> { expires, data } */
const cache = new Map();

/**
 * Builds the Open-Meteo request URL for a given coordinate pair.
 * Example (from the brief):
 *   https://api.open-meteo.com/v1/forecast?latitude=-33.87&longitude=151.21
 *     &daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Australia%2FSydney
 */
function buildUrl(latitude, longitude, startDate, endDate) {
    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: TIMEZONE,
        forecast_days: String(FORECAST_DAYS)
    });
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
}

/**
 * Retrieves the weather forecast for a single event.
 *
 * @param {{event_id:number, event_title:string, event_date:string, location:string,
 *          latitude:number|null, longitude:number|null}} event
 * @returns {Promise<object>} a plain object that is safe to serialise to JSON.
 */
async function getEventWeather(event) {
    const result = {
        available: false,
        provider: 'Open-Meteo (api.open-meteo.com)',
        timezone: TIMEZONE,
        latitude: event.latitude !== null ? Number(event.latitude) : null,
        longitude: event.longitude !== null ? Number(event.longitude) : null,
        location: event.location,
        event_date: event.event_date ? toIsoDate(event.event_date) : null
    };

    // --- Guard: the event must have coordinates. The brief tells us to extend
    //     the event table with latitude/longitude exactly for this reason. -----
    if (result.latitude === null || result.longitude === null) {
        result.reason = 'No coordinates are stored for this event, so a weather forecast cannot be retrieved.';
        return result;
    }

    const eventIsoDate = result.event_date;
    const today = new Date();
    const todayIso = toIsoDate(today);
    const forecastLimit = new Date(today.getTime() + FORECAST_DAYS * 24 * 60 * 60 * 1000);
    const isFutureEvent = eventIsoDate >= todayIso;

    const url = buildUrl(result.latitude, result.longitude, null, null);
    result.request_url = url;

    // --- Cached response? -----------------------------------------------------
    const cachedEntry = cache.get(url);
    let payload;
    if (cachedEntry && cachedEntry.expires > Date.now()) {
        payload = cachedEntry.data;
        result.cached = true;
    } else {
        try {
            const response = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                result.reason = `Open-Meteo responded with HTTP ${response.status}. Weather information is temporarily unavailable.`;
                return result;
            }
            payload = await response.json();
            cache.set(url, { expires: Date.now() + CACHE_TTL_MS, data: payload });
        } catch (err) {
            result.reason = `Could not reach Open-Meteo (${err.message}). Weather information is temporarily unavailable.`;
            return result;
        }
    }

    const daily = payload && payload.daily;
    if (!daily || !Array.isArray(daily.time)) {
        result.reason = 'Open-Meteo returned an unexpected response.';
        return result;
    }

    // --- Map the raw arrays into an array of day objects ----------------------
    const days = daily.time.map((date, index) => {
        const code = daily.weather_code ? daily.weather_code[index] : null;
        const info = describeWeatherCode(code);
        return {
            date,
            weather_code: code,
            description: info.description,
            icon: info.icon,
            severity: info.severity,
            temperature_max: daily.temperature_2m_max ? daily.temperature_2m_max[index] : null,
            temperature_min: daily.temperature_2m_min ? daily.temperature_2m_min[index] : null,
            precipitation_probability: daily.precipitation_probability_max ? daily.precipitation_probability_max[index] : null
        };
    });

    /**
     * Only surface a forecast when the event is in the future AND inside the
     * 16-day Open-Meteo window, otherwise a "too far away" / "already happened"
     * note is returned so the UI can explain the situation to the user.
     */
    if (!isFutureEvent) {
        result.reason = 'This event has already taken place, so no forecast is shown.';
        result.days = days.slice(0, 3);
        result.unit = { temperature: payload.daily_units?.temperature_2m_max || '°C' };
        return result;
    }

    if (new Date(eventIsoDate) > forecastLimit) {
        result.reason = `The event is more than ${FORECAST_DAYS} days away, which is beyond the free Open-Meteo forecast range. ` +
                        'Showing the current outlook instead.';
        result.days = days.slice(0, 3);
        result.unit = { temperature: payload.daily_units?.temperature_2m_max || '°C' };
        return result;
    }

    const match = days.find((day) => day.date === eventIsoDate);
    if (!match) {
        result.reason = 'No forecast data was returned for the event date.';
        result.days = days.slice(0, 3);
        return result;
    }

    result.available = true;
    result.forecast = match;
    result.reason = null;
    result.unit = { temperature: payload.daily_units?.temperature_2m_max || '°C' };
    return result;
}

/**
 * Generic forecast lookup used by the standalone /api/weather endpoints, so the
 * external API integration can also be demonstrated independently (e.g. from Postman).
 */
async function getForecast(latitude, longitude, startDate, endDate) {
    const url = buildUrl(latitude, longitude, startDate, endDate);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
        const error = new Error(`Open-Meteo responded with HTTP ${response.status}`);
        error.statusCode = 502;
        throw error;
    }
    const payload = await response.json();
    const daily = payload.daily || {};
    return {
        provider: 'Open-Meteo (api.open-meteo.com)',
        timezone: payload.timezone,
        latitude: payload.latitude,
        longitude: payload.longitude,
        request_url: url,
        days: (daily.time || []).map((date, index) => {
            const info = describeWeatherCode(daily.weather_code ? daily.weather_code[index] : null);
            return {
                date,
                weather_code: daily.weather_code ? daily.weather_code[index] : null,
                description: info.description,
                icon: info.icon,
                severity: info.severity,
                temperature_max: daily.temperature_2m_max ? daily.temperature_2m_max[index] : null,
                temperature_min: daily.temperature_2m_min ? daily.temperature_2m_min[index] : null,
                precipitation_probability: daily.precipitation_probability_max ? daily.precipitation_probability_max[index] : null
            };
        })
    };
}

module.exports = { getEventWeather, getForecast, buildUrl, TIMEZONE };
