/**
 * PROG2002 Web Development II - Assessment 3
 * File: scripts/api-smoke-test.js
 * Purpose: Exercises every REST endpoint of the Charity Event API from the
 * command line and prints a pass/fail summary. Handy for demonstrating the
 * backend before recording the video, and for a quick regression check.
 *
 * Usage:
 *   node server.js            # in one terminal
 *   npm run test:api          # in another terminal
 *
 * Node.js 18+ provides `fetch` globally, so no extra dependency is required.
 */

const BASE = process.env.API_BASE || 'http://localhost:3000/api';

let passed = 0;
let failed = 0;
const created = { eventId: null, registrationId: null };
const results = [];

/**
 * Helper: performs a request, checks the expected HTTP status and prints a line.
 */
async function call(label, method, path, options = {}) {
    const expected = options.expected || 200;
    const url = BASE + path;
    let status = 0;
    let body = null;
    let error = null;

    try {
        const response = await fetch(url, {
            method: method,
            headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        status = response.status;
        const text = await response.text();
        try { body = JSON.parse(text); } catch (e) { body = text; }
    } catch (err) {
        error = err.message;
    }

    const ok = error === null && (Array.isArray(expected) ? expected.includes(status) : status === expected);
    if (ok) passed++; else failed++;

    const icon = ok ? 'PASS' : 'FAIL';
    const expectText = Array.isArray(expected) ? expected.join('/') : expected;
    console.log(`[${icon}] ${label.padEnd(52)} ${method.padEnd(6)} ${path}  -> ${status} (expected ${expectText})`);
    if (!ok) {
        console.log(`        error: ${error || JSON.stringify(body).slice(0, 220)}`);
        if (Array.isArray(body && body.errors)) console.log(`        validation: ${body.errors.join(' | ')}`);
    }

    results.push({ label, method, path, status, ok, body });
    return { status, body, ok };
}

async function main() {
    console.log(`\n=== Charity Event API smoke test (${BASE}) ===\n`);

    // ---------------------------------------------------------------- health
    await call('Health check + database connectivity', 'GET', '/health');

    // ------------------------------------------------------------ read: home
    await call('Home page - upcoming active events', 'GET', '/events/upcoming');
    await call('Organisation details (mission/contact)', 'GET', '/organisations');
    await call('Event categories with usage counts', 'GET', '/categories');

    // ---------------------------------------------------------- read: search
    await call('Search - all events', 'GET', '/events');
    await call('Search - location filter', 'GET', '/events?location=Park');
    await call('Search - category filter', 'GET', '/events?category_id=1');
    await call('Search - status filter (Suspended)', 'GET', '/events?status=Suspended');
    await call('Search - keyword filter', 'GET', '/events?keyword=concert');

    // ---------------------------------------------------------- read: detail
    await call('Event detail + its registrations', 'GET', '/events/2');
    await call('Registrations of one event', 'GET', '/events/2/registrations');
    await call('Event that does not exist -> 404', 'GET', '/events/999999', { expected: 404 });

    // -------------------------------------------------- external weather API
    await call('External Open-Meteo forecast for event 2', 'GET', '/events/2/weather');
    await call('Open-Meteo generic coordinates', 'GET', '/weather/forecast?latitude=-33.87&longitude=151.21');
    await call('WMO weather code table', 'GET', '/weather/codes');
    await call('Invalid coordinates -> 400', 'GET', '/weather/forecast?latitude=abc', { expected: 400 });

    // --------------------------------------------------------------- admin
    await call('Admin list (all statuses)', 'GET', '/admin/events');
    await call('Admin dashboard statistics', 'GET', '/admin/stats');

    // ------------------------------------------------------------ registrations
    await call('All registration records', 'GET', '/registrations');

    // ------------------------------------------------------- CREATE + DELETE
    const createdEvent = await call('CREATE event -> 201', 'POST', '/events', {
        expected: 201,
        body: {
            organisation_id: 1,
            category_id: 1,
            event_title: 'API Smoke Test Event',
            event_description: 'Temporary event created by scripts/api-smoke-test.js',
            event_date: '2027-06-01 09:00:00',
            location: 'Smoke Test Oval',
            latitude: -33.9,
            longitude: 151.2,
            ticket_price: 12.5,
            fundraising_goal: 2000,
            current_progress: 0,
            is_suspended: 0
        }
    });
    created.eventId = createdEvent.body && createdEvent.body.newId;

    await call('CREATE event with missing fields -> 400', 'POST', '/events', {
        expected: 400,
        body: { event_title: '' }
    });

    if (created.eventId) {
        await call('UPDATE the created event', 'PUT', `/events/${created.eventId}`, {
            body: { event_title: 'API Smoke Test Event (updated)', ticket_price: 20 }
        });
        await call('Validation error on update -> 400', 'PUT', `/events/${created.eventId}`, {
            expected: 400,
            body: { ticket_price: -5 }
        });

        // registration on the new event
        const registration = await call('CREATE registration -> 201', 'POST', '/registrations', {
            expected: 201,
            body: {
                event_id: created.eventId,
                attendee_name: 'Smoke Test Attendee',
                attendee_email: 'smoke.test@example.com',
                contact_phone: '0412345678',
                tickets_purchased: 3
            }
        });
        created.registrationId = registration.body && registration.body.registration
            ? registration.body.registration.registration_id : null;

        await call('Duplicate registration -> 409', 'POST', '/registrations', {
            expected: 409,
            body: {
                event_id: created.eventId,
                attendee_name: 'Smoke Test Attendee',
                attendee_email: 'smoke.test@example.com',
                contact_phone: '0412345678',
                tickets_purchased: 1
            }
        });

        await call('Registration validation -> 400', 'POST', '/registrations', {
            expected: 400,
            body: { event_id: created.eventId, attendee_name: '', attendee_email: 'nope', contact_phone: 'x', tickets_purchased: 0 }
        });

        await call('DELETE event WITH registrations -> 409', 'DELETE', `/events/${created.eventId}`, { expected: 409 });

        if (created.registrationId) {
            await call('DELETE the test registration', 'DELETE', `/registrations/${created.registrationId}`);
            await call('DELETE the created event (now allowed)', 'DELETE', `/events/${created.eventId}`);
        }
    }

    // ------------------------------------------------------------ categories
    const newCategory = await call('CREATE category -> 201', 'POST', '/categories', {
        expected: 201,
        body: { category_name: 'Smoke Test Category' }
    });
    const categoryId = newCategory.body && newCategory.body.category ? newCategory.body.category.category_id : null;
    if (categoryId) {
        await call('UPDATE the test category', 'PUT', `/categories/${categoryId}`, {
            body: { category_name: 'Smoke Test Category (renamed)' }
        });
        await call('DELETE the test category', 'DELETE', `/categories/${categoryId}`);
    }
    await call('DELETE category in use -> 409', 'DELETE', '/categories/1', { expected: 409 });

    // ------------------------------------------------------------------ misc
    await call('Unknown API endpoint -> 404', 'GET', '/not-a-real-endpoint', { expected: 404 });

    // ------------------------------------------------------------- summary
    console.log('\n==============================================================');
    console.log(` RESULT: ${passed} passed, ${failed} failed (${passed + failed} checks)`);
    console.log('==============================================================\n');

    process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('Smoke test crashed:', err);
    process.exit(1);
});
