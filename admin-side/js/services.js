/**
 * PROG2002 Web Development II - Assessment 3
 * File: admin-side/js/services.js
 * Purpose: The data-access layer of the admin website.
 *
 * Every method wraps an $http call to the Express REST API and returns a promise,
 * so the admin controllers never contain a URL or a raw XMLHttpRequest.
 */

(function () {
    'use strict';

    angular.module('adminApp')

        .factory('adminService', ['$http', 'API_BASE', function ($http, API_BASE) {

            /**
             * Converts an $http error response into { message, errors, status }.
             * The API returns { msg, errors[] } for validation problems (400) and
             * a plain { msg } for conflicts such as "cannot delete: registrations exist" (409).
             */
            function describeError(response) {
                const data = response && response.data;
                return {
                    message: (data && data.msg) || 'The request could not be completed.',
                    errors: (data && data.errors) || [],
                    registrationCount: data && data.registration_count,
                    status: response && response.status
                };
            }

            return {
                // ------------------------- events (C.R.U.D.) -------------------------
                /** READ (all): every event regardless of status. */
                listEvents: function () {
                    return $http.get(`${API_BASE}/admin/events`);
                },

                /** READ (filtered) - reuses the public search endpoint. */
                searchEvents: function (params) {
                    return $http.get(`${API_BASE}/events`, { params: params });
                },

                /** READ (one) together with its registrations. */
                getEvent: function (id) {
                    return $http.get(`${API_BASE}/events/${id}`);
                },

                getEventRegistrations: function (id) {
                    return $http.get(`${API_BASE}/events/${id}/registrations`);
                },

                /** CREATE */
                createEvent: function (event) {
                    return $http.post(`${API_BASE}/events`, event);
                },

                /** UPDATE */
                updateEvent: function (id, event) {
                    return $http.put(`${API_BASE}/events/${id}`, event);
                },

                /** DELETE - the API answers 409 when registrations still exist. */
                deleteEvent: function (id) {
                    return $http.delete(`${API_BASE}/events/${id}`);
                },

                // --------------------------- registrations ---------------------------
                listRegistrations: function (params) {
                    return $http.get(`${API_BASE}/registrations`, { params: params });
                },

                updateRegistration: function (id, changes) {
                    return $http.put(`${API_BASE}/registrations/${id}`, changes);
                },

                deleteRegistration: function (id) {
                    return $http.delete(`${API_BASE}/registrations/${id}`);
                },

                // ------------------------ categories (CRUD) --------------------------
                listCategories: function () {
                    return $http.get(`${API_BASE}/categories`);
                },

                createCategory: function (category_name) {
                    return $http.post(`${API_BASE}/categories`, { category_name: category_name });
                },

                updateCategory: function (id, category_name) {
                    return $http.put(`${API_BASE}/categories/${id}`, { category_name: category_name });
                },

                deleteCategory: function (id) {
                    return $http.delete(`${API_BASE}/categories/${id}`);
                },

                // ----------------------------- supporting ----------------------------
                listOrganisations: function () {
                    return $http.get(`${API_BASE}/organisations`);
                },

                getStats: function () {
                    return $http.get(`${API_BASE}/admin/stats`);
                },

                getWeatherForEvent: function (id) {
                    return $http.get(`${API_BASE}/events/${id}/weather`);
                },

                extractError: describeError
            };
        }])

        /**
         * confirmService - wraps the native browser confirm() dialog so that the
         * "are you sure?" step is testable and consistent across the admin screens.
         */
        .factory('confirmService', [function () {
            return {
                ask: function (message) {
                    return window.confirm(message);
                }
            };
        }]);
})();
