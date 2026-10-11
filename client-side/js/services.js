/**
 * PROG2002 Web Development II - Assessment 3
 * File: client-side/js/services.js
 * Purpose: The data-access layer of the client website.
 *
 * Every screen talks to the Node/Express API through these AngularJS services
 * instead of calling `fetch()` directly. $http returns a PROMISE, so each method
 * is consumed in the controllers with `.then(success, failure)`. Centralising the
 * URLs here means the pages never contain a hard-coded endpoint.
 */

(function () {
    'use strict';

    angular.module('charityApp')

        /**
         * apiService - wraps the main REST resources.
         */
        .factory('apiService', ['$http', 'API_BASE', function ($http, API_BASE) {

            /** Extracts the readable error message returned by the API. */
            function fail(response) {
                const data = response && response.data;
                let message = (data && data.msg) || 'The server could not complete the request.';
                if (data && angular.isArray(data.errors) && data.errors.length) {
                    message = data.errors.join(' ');
                }
                return { message: message, status: response && response.status };
            }

            return {
                // ---------------- events ----------------
                /** Home page: active, upcoming events only. */
                getUpcomingEvents: function (limit) {
                    return $http.get(`${API_BASE}/events/upcoming`, { params: { limit: limit || 6 } });
                },

                /** Search page: server-side filtering. */
                searchEvents: function (filters) {
                    return $http.get(`${API_BASE}/events`, { params: filters });
                },

                /** Event detail + the complete list of its registrations. */
                getEventDetail: function (id) {
                    return $http.get(`${API_BASE}/events/${id}`);
                },

                getEventRegistrations: function (id) {
                    return $http.get(`${API_BASE}/events/${id}/registrations`);
                },

                // ---------------- registrations ----------------
                createRegistration: function (registration) {
                    return $http.post(`${API_BASE}/registrations`, registration);
                },

                // ---------------- lookups ----------------
                getCategories: function () {
                    return $http.get(`${API_BASE}/categories`);
                },

                getOrganisations: function () {
                    return $http.get(`${API_BASE}/organisations`);
                },

                // ------------------ utils ------------------
                extractError: fail
            };
        }])

        /**
         * weatherService - talks to the EXTERNAL Open-Meteo integration through
         * our own API (GET /api/events/:id/weather), which translates the WMO
         * weather codes into descriptions and emoji icons on the server.
         */
        .factory('weatherService', ['$http', 'API_BASE', function ($http, API_BASE) {
            return {
                /**
                 * @param {number} eventId
                 * @returns {Promise} resolves with
                 *   { available, forecast:{description,icon,temperature_max,...}, reason }
                 */
                getEventWeather: function (eventId) {
                    return $http.get(`${API_BASE}/events/${eventId}/weather`);
                }
            };
        }])

        /**
         * storageService - a very small wrapper around window.localStorage.
         * The brief suggests using URL query strings OR local storage to pass the
         * event id between pages. The id travels in the route (/register/:id),
         * while localStorage is used to remember the details of the last
         * registration so the form can pre-fill them on the next visit.
         */
        .factory('storageService', [function () {
            const LAST_REGISTRATION_KEY = 'charity.lastRegistration';

            return {
                saveLastRegistration: function (registration) {
                    try {
                        window.localStorage.setItem(LAST_REGISTRATION_KEY, angular.toJson(registration));
                    } catch (e) { /* private browsing mode - ignore */ }
                },

                getLastRegistration: function () {
                    try {
                        const raw = window.localStorage.getItem(LAST_REGISTRATION_KEY);
                        return raw ? angular.fromJson(raw) : null;
                    } catch (e) {
                        return null;
                    }
                },

                clearLastRegistration: function () {
                    try { window.localStorage.removeItem(LAST_REGISTRATION_KEY); } catch (e) { /* ignore */ }
                }
            };
        }]);
})();
