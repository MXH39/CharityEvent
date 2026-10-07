/**
 * PROG2002 Web Development II - Assessment 3
 * File: utils/helpers.js
 * Purpose: Shared pure functions used by the API routes.
 *   - Work out the administrative status of an event (Active / Past / Suspended)
 *   - Translate Open-Meteo WMO weather codes into human readable descriptions
 *   - Validate the data submitted by the registration form and the admin forms
 */

// ---------------------------------------------------------------------------
// 1. Event status
// ---------------------------------------------------------------------------
/**
 * Assessment 3 requires the admin list to show "all registered events,
 * regardless of their status (Active, Past, Suspended)". The status is derived
 * from two columns that already exist in the schema:
 *   is_suspended = 1                -> Suspended
 *   event_date   < now              -> Past
 *   otherwise                       -> Active
 *
 * @param {{is_suspended: number|boolean, event_date: string|Date}} event
 * @returns {'Suspended'|'Past'|'Active'}
 */
function getEventStatus(event) {
    if (!event) return 'Unknown';
    if (Number(event.is_suspended) === 1) return 'Suspended';
    const eventTime = new Date(event.event_date).getTime();
    if (!Number.isNaN(eventTime) && eventTime < Date.now()) return 'Past';
    return 'Active';
}

/**
 * Adds a ready-to-use `status` property to a single event row.
 * @param {object} event
 * @returns {object} a new object (does not mutate the input)
 */
function withStatus(event) {
    return { ...event, status: getEventStatus(event) };
}

// ---------------------------------------------------------------------------
// 2. Open-Meteo (WMO) weather codes
// ---------------------------------------------------------------------------
/**
 * WMO weather interpretation codes returned by api.open-meteo.com as
 * `daily.weather_code`. The descriptions follow the table supplied in the
 * Assessment 3 brief (codes 1, 2 and 3 = mainly clear / partly cloudy / overcast).
 */
const WEATHER_CODES = {
    0: { description: 'Clear sky', icon: '☀️', severity: 'good' },
    1: { description: 'Mainly clear', icon: '🌤️', severity: 'good' },
    2: { description: 'Partly cloudy', icon: '⛅', severity: 'good' },
    3: { description: 'Overcast', icon: '☁️', severity: 'good' },
    45: { description: 'Fog', icon: '🌫️', severity: 'caution' },
    48: { description: 'Depositing rime fog', icon: '🌫️', severity: 'caution' },
    51: { description: 'Light drizzle', icon: '🌦️', severity: 'caution' },
    53: { description: 'Moderate drizzle', icon: '🌦️', severity: 'caution' },
    55: { description: 'Dense drizzle', icon: '🌧️', severity: 'caution' },
    56: { description: 'Light freezing drizzle', icon: '🌧️', severity: 'caution' },
    57: { description: 'Dense freezing drizzle', icon: '🌧️', severity: 'caution' },
    61: { description: 'Light rain', icon: '🌦️', severity: 'caution' },
    63: { description: 'Moderate rain', icon: '🌧️', severity: 'caution' },
    65: { description: 'Heavy rain', icon: '🌧️', severity: 'warning' },
    66: { description: 'Light freezing rain', icon: '🌧️', severity: 'warning' },
    67: { description: 'Heavy freezing rain', icon: '🌧️', severity: 'warning' },
    71: { description: 'Light snow fall', icon: '🌨️', severity: 'caution' },
    73: { description: 'Moderate snow fall', icon: '🌨️', severity: 'caution' },
    75: { description: 'Heavy snow fall', icon: '❄️', severity: 'warning' },
    77: { description: 'Snow grains', icon: '🌨️', severity: 'caution' },
    80: { description: 'Light rain showers', icon: '🌦️', severity: 'caution' },
    81: { description: 'Moderate rain showers', icon: '🌧️', severity: 'caution' },
    82: { description: 'Violent rain showers', icon: '⛈️', severity: 'warning' },
    85: { description: 'Light snow showers', icon: '🌨️', severity: 'caution' },
    86: { description: 'Heavy snow showers', icon: '❄️', severity: 'warning' },
    95: { description: 'Thunderstorm', icon: '⛈️', severity: 'warning' },
    96: { description: 'Thunderstorm with slight hail', icon: '⛈️', severity: 'warning' },
    99: { description: 'Thunderstorm with heavy hail', icon: '⛈️', severity: 'warning' }
};

/**
 * Converts a WMO weather code into a description + emoji icon.
 * Unknown codes fall back to a neutral "Unknown" value instead of throwing.
 * @param {number} code
 */
function describeWeatherCode(code) {
    return WEATHER_CODES[Number(code)] || { description: 'Unknown', icon: '❔', severity: 'unknown' };
}

// ---------------------------------------------------------------------------
// 3. Validation helpers
// ---------------------------------------------------------------------------
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{6,30}$/;

function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_PATTERN.test(email.trim());
}

function isValidPhone(phone) {
    return typeof phone === 'string' && PHONE_PATTERN.test(phone.trim());
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates the payload of POST /api/registrations.
 * Returns { valid: boolean, errors: string[] } so the route can answer with a
 * clear 400 response that the AngularJS form can display.
 * @param {object} body
 */
function validateRegistration(body = {}) {
    const errors = [];

    if (!Number.isInteger(Number(body.event_id)) || Number(body.event_id) <= 0) {
        errors.push('A valid event is required.');
    }
    if (!isNonEmptyString(body.attendee_name)) {
        errors.push('Attendee name is required.');
    } else if (body.attendee_name.trim().length > 100) {
        errors.push('Attendee name must be 100 characters or fewer.');
    }
    if (!isNonEmptyString(body.attendee_email)) {
        errors.push('Attendee email is required.');
    } else if (!isValidEmail(body.attendee_email)) {
        errors.push('Please provide a valid email address (e.g. name@example.com).');
    } else if (body.attendee_email.trim().length > 150) {
        errors.push('Attendee email must be 150 characters or fewer.');
    }
    if (!isNonEmptyString(body.contact_phone)) {
        errors.push('Contact phone number is required.');
    } else if (!isValidPhone(body.contact_phone)) {
        errors.push('Please provide a valid contact phone number (6-30 digits).');
    }

    const tickets = Number(body.tickets_purchased);
    if (!Number.isInteger(tickets) || tickets < 1) {
        errors.push('Number of tickets must be a whole number of at least 1.');
    } else if (tickets > 10) {
        errors.push('A single registration may purchase at most 10 tickets.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validates the payload used by the admin create / update event forms.
 * @param {object} body
 * @param {{partial?: boolean}} [options] when partial=true (PUT) only the
 *        fields that were supplied are validated.
 */
function validateEvent(body = {}, options = {}) {
    const errors = [];
    const partial = options.partial === true;
    const has = (key) => body[key] !== undefined && body[key] !== null && body[key] !== '';

    if (!partial || has('organisation_id')) {
        if (!Number.isInteger(Number(body.organisation_id)) || Number(body.organisation_id) <= 0) {
            errors.push('Organisation is required.');
        }
    }
    if (!partial || has('category_id')) {
        if (!Number.isInteger(Number(body.category_id)) || Number(body.category_id) <= 0) {
            errors.push('Event category is required.');
        }
    }
    if (!partial || has('event_title')) {
        if (!isNonEmptyString(body.event_title)) {
            errors.push('Event title is required.');
        } else if (body.event_title.trim().length > 150) {
            errors.push('Event title must be 150 characters or fewer.');
        }
    }
    if (!partial || has('event_date')) {
        if (!isNonEmptyString(body.event_date)) {
            errors.push('Event date is required.');
        } else if (Number.isNaN(new Date(body.event_date).getTime())) {
            errors.push('Event date must be a valid date.');
        }
    }
    if (!partial || has('location')) {
        if (!isNonEmptyString(body.location)) {
            errors.push('Event location is required.');
        } else if (body.location.trim().length > 150) {
            errors.push('Event location must be 150 characters or fewer.');
        }
    }
    if (!partial || has('ticket_price')) {
        const price = Number(body.ticket_price);
        if (Number.isNaN(price) || price < 0) {
            errors.push('Ticket price must be zero or a positive number.');
        }
    }
    if (!partial || has('fundraising_goal')) {
        const goal = Number(body.fundraising_goal);
        if (Number.isNaN(goal) || goal < 0) {
            errors.push('Fundraising goal must be zero or a positive number.');
        }
    }
    if (has('current_progress')) {
        const progress = Number(body.current_progress);
        if (Number.isNaN(progress) || progress < 0) {
            errors.push('Current progress must be zero or a positive number.');
        }
    }
    if (has('latitude')) {
        const lat = Number(body.latitude);
        if (Number.isNaN(lat) || lat < -90 || lat > 90) {
            errors.push('Latitude must be a number between -90 and 90.');
        }
    }
    if (has('longitude')) {
        const lng = Number(body.longitude);
        if (Number.isNaN(lng) || lng < -180 || lng > 180) {
            errors.push('Longitude must be a number between -180 and 180.');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Formats a JS date (or Date object) as 'YYYY-MM-DD HH:mm:ss' so it can be
 * written into a MySQL DATETIME column without relying on the local timezone
 * conversion that mysql2 performs for Date objects.
 * @param {string|Date} value
 */
function toMysqlDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Formats a Date as 'YYYY-MM-DD' (used for Open-Meteo start_date/end_date). */
function toIsoDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

module.exports = {
    getEventStatus,
    withStatus,
    describeWeatherCode,
    WEATHER_CODES,
    isValidEmail,
    isValidPhone,
    isNonEmptyString,
    validateRegistration,
    validateEvent,
    toMysqlDateTime,
    toIsoDate
};
