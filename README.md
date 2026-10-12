# Charity Event Management System

**PROG2002 Web Development II — Assessment 3 (Group, 2 students)**

A complete dynamic website built with **Node.js + Express + MySQL** on the server and
**AngularJS** on both the client side and the admin side, enhanced with the external
**Open-Meteo** weather API.

| | |
|---|---|
| **Team member 1** | MXH39 (GitHub: `MXH39`) |
| **Team member 2** | ShygirlJiang (GitHub: `ShygirlJiang`) |
| **Case study** | City Community Charity — organising and managing charity events |
| **Node.js** | 18.20.8 (LTS) |
| **Database** | `charityevents_db` (MySQL 8) |

---

## 1. What Assessment 3 added on top of Assessment 2

| # | Assessment 3 requirement | Where it is implemented |
|---|---|---|
| 1 | Improved database with a registration table | [`database/charityevents_db.sql`](database/charityevents_db.sql) — `event_registrations` + `charity_organisations`, lat/long on `charity_events`, 14 sample registrations |
| 2 | RESTful API with the full **C.R.U.D.** cycle | [`routes/events.js`](routes/events.js), [`routes/registrations.js`](routes/registrations.js), [`routes/categories.js`](routes/categories.js) |
| 2 | Event detail endpoint also returns its registrations | `GET /api/events/:id` → `{ event, registrations[] }` |
| 2 | Delete blocked when registrations exist (data integrity) | `DELETE /api/events/:id` → **HTTP 409** when registrations exist |
| 3 | Event detail page shows the tickets purchased, newest first | [`client-side/views/detail.html`](client-side/views/detail.html) — `ORDER BY registration_date DESC` |
| 3 | Updated **Register** button → new registration page | `#/register/:id` |
| 3 | **New registration page** with validation + confirmation | [`client-side/views/register.html`](client-side/views/register.html), `POST /api/registrations` |
| 4 | **Admin-side website** with List / New / Update / Delete + navigation | [`admin-side/`](admin-side/) |
| 4 | Admin can manipulate **event category** data too | [`admin-side/views/categories.html`](admin-side/views/categories.html) |
| ★ | **Extra marks:** both websites developed with **AngularJS** | `client-side/js/*`, `admin-side/js/*` (module + `ngRoute` + services + filters + directives) |
| ★ | **Extra marks:** **external API** — Open-Meteo weather | [`services/weatherService.js`](services/weatherService.js), [`routes/weather.js`](routes/weather.js) |

---

## 2. Project structure

```
CharityEvent/
├── server.js                       Express entry point (API + both websites)
├── event_db.js                     MySQL connection pool
├── package.json
├── database/
│   └── charityevents_db.sql        Complete schema + data (single export file)
├── routes/                         One module per REST resource
│   ├── events.js                   events: read/search/detail/weather + CRUD
│   ├── registrations.js            registration records (new table)
│   ├── categories.js               event categories CRUD
│   ├── organisations.js            charity organisations (read)
│   ├── weather.js                  external Open-Meteo integration
│   └── admin.js                    dashboard statistics + "all events" list
├── services/
│   └── weatherService.js           Open-Meteo client + WMO code translation + 30 min cache
├── utils/
│   └── helpers.js                  event status, weather codes, validation
├── scripts/
│   └── api-smoke-test.js           exercises every endpoint from the command line
├── client-side/                    ★ ANGULARJS CLIENT WEBSITE  (served at /)
│   ├── index.html                  ng-app shell + navigation
│   ├── css/style.css
│   ├── js/
│   │   ├── lib/                    angular.min.js, angular-route.min.js (v1.8.3)
│   │   ├── app.js                  module + ngRoute configuration
│   │   ├── services.js             apiService / weatherService / storageService
│   │   ├── filters.js              money, currency, eventDate, statusClass…
│   │   ├── directives.js           eventCard, progressBar, weatherBadge, statusBadge
│   │   └── controllers.js          Home, Search, Detail, Register, About
│   └── views/                      home, search, detail, register, about + partials
└── admin-side/                     ★ ANGULARJS ADMIN WEBSITE   (served at /admin)
    ├── index.html                  ng-app shell + sidebar navigation
    ├── css/admin.css
    ├── js/                         app / services / filters / controllers
    └── views/                      dashboard, events, event-new, event-edit,
                                    registrations, categories
```

---

## 3. Database design

```
charity_organisations ──1:N──> charity_events ──N:1──> event_categories
                                     │
                                     └──1:N──> event_registrations
```

### `event_registrations` (the new table created for Assessment 3)

| Column | Type | Notes |
|---|---|---|
| `registration_id` | INT PK AI | unique identifier |
| `event_id` | INT FK → `charity_events.event_id` | which event (must exist) |
| `attendee_name` | VARCHAR(100) | user details |
| `attendee_email` | VARCHAR(150) | contact details |
| `contact_phone` | VARCHAR(30) | contact details |
| `tickets_purchased` | INT | number of tickets bought |
| `total_amount` | DECIMAL(10,2) | `ticket_price × tickets` |
| `registration_date` | DATETIME | **date of registration** |
| `registration_status` | ENUM | Confirmed / Pending / Cancelled |

* **`UNIQUE KEY uq_registration_event_email (event_id, attendee_email)`** enforces the
  business rule *"one user may register for multiple events but can only register for an
  event once"* directly at the database level.
* **`ON DELETE RESTRICT`** on the foreign key is what makes "an event can only be deleted
  when it has no registrations" enforceable by the database itself.
* `charity_events.latitude` / `longitude` were added because the Open-Meteo weather API
  needs coordinates to return a forecast for the event location.

Import it with:

```bash
mysql -u root -p < database/charityevents_db.sql
```

---

## 4. REST API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | health check (also verifies the DB connection) |
| GET | `/api/events/upcoming` | active events that have not happened yet (Home page) |
| GET | `/api/events` | list / search — filters: `date`, `location`, `keyword`, `category_id`, `status`, `upcoming` |
| GET | `/api/events/:id` | **event details + all of its registrations** |
| GET | `/api/events/:id/registrations` | registrations of one event (newest purchase first) |
| GET | `/api/events/:id/weather` | external Open-Meteo forecast for the event day |
| POST | `/api/events` | **create** a charity event (admin) |
| PUT | `/api/events/:id` | **update** a charity event (admin) |
| DELETE | `/api/events/:id` | **delete** — HTTP 409 when registrations exist |
| GET | `/api/registrations` | all registrations (filter by `event_id`, `status`) |
| POST | `/api/registrations` | **create** a registration (used by the registration page) |
| PUT | `/api/registrations/:id` | update a registration (e.g. change its status) |
| DELETE | `/api/registrations/:id` | remove a registration |
| GET | `/api/categories` | all categories + how many events use each |
| POST / PUT / DELETE | `/api/categories[/:id]` | category **C.R.U.D.** (admin) |
| GET | `/api/organisations[/:id]` | organisation mission and contact details |
| GET | `/api/admin/events` | every event regardless of status (admin List) |
| GET | `/api/admin/stats` | aggregated dashboard statistics |
| GET | `/api/weather/forecast?latitude=&longitude=` | generic Open-Meteo proxy |
| GET | `/api/weather/codes` | the WMO weather-code translation table |

### Example requests

```bash
# Search: active events in the city, only the "Fun Run" category
curl "http://localhost:3000/api/events?location=Park&category_id=1&status=Active"

# Event detail + registrations
curl "http://localhost:3000/api/events/2"

# External weather API for the event location
curl "http://localhost:3000/api/events/2/weather"

# Create a registration
curl -X POST http://localhost:3000/api/registrations \
     -H "Content-Type: application/json" \
     -d '{"event_id":2,"attendee_name":"Jane Doe","attendee_email":"jane@example.com",
          "contact_phone":"0412345678","tickets_purchased":2}'

# Deleting an event that has registrations -> HTTP 409 (blocked on purpose)
curl -X DELETE "http://localhost:3000/api/events/2"
```

---

## 5. Running the project

**Prerequisites:** Node.js 18+, MySQL 8 running locally.

```bash
# 1. install dependencies
npm install

# 2. create the database (schema + sample data)
mysql -u root -p < database/charityevents_db.sql

# 3. start the server
npm start            # or: npm run dev   (auto-restart on file changes)
```

Then open:

* client-side website → <http://localhost:3000/>
* admin-side website → <http://localhost:3000/admin/>
* REST API → <http://localhost:3000/api/>

Connection settings can be overridden with environment variables, which is how the same
code runs locally and on the SCU cPanel server:

```bash
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=123456 DB_NAME=charityevents_db PORT=3000 npm start
```

### Verifying the API from the command line

```bash
npm run test:api
```

This runs [`scripts/api-smoke-test.js`](scripts/api-smoke-test.js), which calls every
endpoint (including the deliberate HTTP 409 delete and the live Open-Meteo request) and
prints a pass/fail summary — useful for the demonstration video.

---

## 6. AngularJS implementation notes (extra marks)

Both websites are genuine AngularJS single page applications, not static HTML with a
couple of `ng-` attributes:

* **Modules & routing** — `angular.module('charityApp', ['ngRoute'])` and
  `angular.module('adminApp', ['ngRoute'])` with one `$routeProvider` route per screen.
* **Services / factories** — `apiService`, `weatherService`, `storageService`,
  `adminService`, `confirmService`: no controller ever contains a URL string.
* **Promises** — every HTTP call uses `$http`, which returns a promise consumed with
  `.then(success, failure)`; the failure handler shows the API's message to the user.
* **Directives** — `eventCard`, `progressBar`, `weatherBadge`, `statusBadge` reuse markup
  instead of duplicating it.
* **Filters** — `money`, `currency`, `eventDate`, `shortDate`, `dateTime`,
  `datetimeLocal`, `statusClass`, `goalPercent`.
* **Form validation** — AngularJS `required`, `type="email"`, `ng-pattern`, `min`/`max`
  on every form, mirrored by server-side validation in `utils/helpers.js`.
* **Local storage** — the registration page remembers the attendee's details between
  visits (`storageService`), and the event id is passed between pages through the URL
  (`#/register/:id`).

## 7. External API — Open-Meteo

`services/weatherService.js` calls

```
https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
&timezone=Australia%2FSydney
```

and translates the WMO `weather_code` values into a description and an icon
(e.g. `61 → Light rain 🌦️`) using the table from the assessment brief. Responses are
cached in memory for 30 minutes.

The forecast is displayed on:

* the **Home** page (next event),
* the **Event detail** page,
* the **Registration** page,
* the **Admin → Edit event** page.

If the event is more than 16 days away (outside the free forecast window), has already
taken place, or has no coordinates, the API returns `available: false` together with a
human-readable `reason`, and the UI explains the situation instead of showing nothing.

---

## 8. Team workflow

The repository history shows both members committing regularly with descriptive commit
messages. Work was divided as follows:

| Area | Main contributor |
|---|---|
| Database schema, `event_registrations` table, sample data | ShygirlJiang |
| Database redesign, API refactor into route modules, event CRUD | MXH39 |
| Registration API + duplicate/suspended checks | ShygirlJiang |
| Open-Meteo weather integration | MXH39 |
| AngularJS client website (home, search, detail) | ShygirlJiang |
| Registration page, client-side validation | MXH39 |
| AngularJS admin portal (list / new / update / delete) | ShygirlJiang |
| Category management, registration monitoring, README | MXH39 |

---

## 9. GenAI use declaration

I acknowledge that I have used GenAI tools to complete this assessment. We used a
Generative AI assistant to brainstorm ideas and to help check grammar and clarity within
the parameters outlined in the Assessment Brief and by the Unit Assessor.
