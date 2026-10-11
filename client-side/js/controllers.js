/**
 * PROG2002 Web Development II - Assessment 3
 * File: client-side/js/controllers.js
 * Purpose: Controllers for the client-side AngularJS application.
 *
 *   HomeController          - organisation details + next active events
 *   SearchController        - server-side filtering (date / location / category / keyword)
 *   EventDetailController   - event details + registration list + weather
 *   RegisterController      - NEW registration page (create a registration record)
 *   AboutController         - organisation contact information
 *
 * Data flow (ULO1 / ULO3): the controller asks apiService -> apiService sends an
 * $http (AJAX) request to the Express API -> the API queries MySQL and returns
 * JSON -> the controller stores the JSON on $scope -> the template renders it
 * with ng-repeat / {{ }} bindings. No HTML strings are built by hand any more.
 */

(function () {
    'use strict';

    angular.module('charityApp')

        // =====================================================================
        // HOME
        // =====================================================================
        .controller('HomeController', ['$scope', 'apiService', 'weatherService',
            function ($scope, apiService, weatherService) {

                $scope.events = [];
                $scope.organisation = null;
                $scope.loading = true;
                $scope.error = null;
                $scope.nextEventWeather = null;

                // GET /api/organisations -> mission statement + contact details
                apiService.getOrganisations().then(function (response) {
                    $scope.organisation = response.data[0] || null;
                });

                // GET /api/events/upcoming -> the six next active charity events
                apiService.getUpcomingEvents(6).then(function (response) {
                    $scope.events = response.data;
                    $scope.loading = false;
                    // Bonus: show the weather for the very next event (external API)
                    if ($scope.events.length) {
                        const first = $scope.events[0];
                        weatherService.getEventWeather(first.event_id).then(function (res) {
                            $scope.nextEventWeather = res.data;
                            $scope.nextEventWeather.event_title = first.event_title;
                        });
                    }
                }, function (response) {
                    $scope.error = apiService.extractError(response).message;
                    $scope.loading = false;
                });

                /** Aggregated "impact" numbers shown in the hero panel. */
                $scope.totalEvents = function () { return $scope.events.length; };
            }])

        // =====================================================================
        // SEARCH
        // =====================================================================
        .controller('SearchController', ['$scope', 'apiService',
            function ($scope, apiService) {

                $scope.categories = [];
                $scope.results = null;      // null = the form has not been submitted yet
                $scope.loading = false;
                $scope.error = null;
                $scope.searched = false;

                // Remember the filters so the user can clear them.
                $scope.filters = { date: '', location: '', category_id: '', keyword: '' };

                // GET /api/categories -> populate the drop-down
                apiService.getCategories().then(function (response) {
                    $scope.categories = response.data;
                });

                /**
                 * Client-side guard executed before the API call. Assessment 3
                 * asks for validation plus a client-side alert when it fails.
                 */
                function validate(filters) {
                    const messages = [];

                    if (filters.date && Number.isNaN(new Date(filters.date).getTime())) {
                        messages.push('Please choose a valid event date.');
                    }
                    if (filters.location && filters.location.trim().length > 150) {
                        messages.push('The location filter must be 150 characters or fewer.');
                    }
                    if (filters.keyword && filters.keyword.trim().length < 2) {
                        messages.push('Enter at least 2 characters to search by keyword.');
                    }
                    // A date filter that lies in the distant past will never match
                    if (filters.date) {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        if (new Date(filters.date) < new Date('2000-01-01')) {
                            messages.push('That date is unrealistic - please check the year.');
                        }
                    }
                    return messages;
                }

                /** Runs the search through GET /api/events?date=..&location=..&category_id=.. */
                $scope.search = function (form) {
                    $scope.error = null;
                    $scope.submitted = true;

                    const messages = validate($scope.filters);
                    if (messages.length) {
                        $scope.error = messages.join(' ');
                        window.alert('Please fix the following before searching:\n\n- ' + messages.join('\n- '));
                        return;
                    }

                    $scope.loading = true;
                    $scope.searched = true;

                    const params = {};
                    angular.forEach($scope.filters, function (value, key) {
                        if (value !== '' && value !== null && value !== undefined) params[key] = value;
                    });

                    apiService.searchEvents(params).then(function (response) {
                        $scope.results = response.data;
                        $scope.loading = false;
                        if (!response.data.length) {
                            $scope.error = 'No charity events matched your search criteria. Try widening the filters.';
                        }
                    }, function (response) {
                        $scope.error = apiService.extractError(response).message;
                        $scope.loading = false;
                    });
                };

                /** Resets the form and the result list. */
                $scope.clear = function (form) {
                    if (form) form.$setPristine();
                    $scope.filters = { date: '', location: '', category_id: '', keyword: '' };
                    $scope.results = null;
                    $scope.error = null;
                    $scope.searched = false;
                };
            }])

        // =====================================================================
        // EVENT DETAIL  (+ the NEW registration list)
        // =====================================================================
        .controller('EventDetailController', ['$scope', '$routeParams', 'apiService', 'weatherService',
            function ($scope, $routeParams, apiService, weatherService) {

                const eventId = $routeParams.id;

                $scope.event = null;
                $scope.registrations = [];
                $scope.loading = true;
                $scope.error = null;
                $scope.weather = null;

                // Sorting of the registration table. The brief requires the list to
                // be "sorted by the latest date when the tickets were purchased",
                // which is the default here; the other options are a bonus.
                $scope.sort = { field: 'registration_date', reverse: true };

                // GET /api/events/:id -> { event, registrations }
                apiService.getEventDetail(eventId).then(function (response) {
                    $scope.event = response.data.event;
                    $scope.registrations = response.data.registrations;
                    $scope.loading = false;
                }, function (response) {
                    $scope.error = apiService.extractError(response).message;
                    $scope.loading = false;
                });

                // EXTERNAL API: GET /api/events/:id/weather (Open-Meteo)
                weatherService.getEventWeather(eventId).then(function (response) {
                    $scope.weather = response.data;
                });

                /** Totals shown above the registration table. */
                $scope.totalTickets = function () {
                    return $scope.registrations.reduce(function (sum, row) {
                        return sum + Number(row.tickets_purchased);
                    }, 0);
                };

                $scope.totalAmount = function () {
                    return $scope.registrations.reduce(function (sum, row) {
                        return sum + Number(row.total_amount);
                    }, 0);
                };

                $scope.confirmedCount = function () {
                    return $scope.registrations.filter(function (row) {
                        return row.registration_status === 'Confirmed';
                    }).length;
                };

                /** Change the table ordering. */
                $scope.setSort = function (field) {
                    if ($scope.sort.field === field) {
                        $scope.sort.reverse = !$scope.sort.reverse;
                    } else {
                        $scope.sort.field = field;
                        $scope.sort.reverse = true;
                    }
                };
            }])

        // =====================================================================
        // REGISTRATION PAGE (new in Assessment 3)
        // =====================================================================
        .controller('RegisterController', ['$scope', '$routeParams', 'apiService', 'storageService', 'weatherService',
            function ($scope, $routeParams, apiService, storageService, weatherService) {

                const eventId = Number($routeParams.id);

                $scope.event = null;
                $scope.weather = null;
                $scope.loading = true;
                $scope.error = null;
                $scope.fieldErrors = [];
                $scope.submitting = false;
                $scope.submitted = false;      // set to true once the API said "OK"
                $scope.confirmation = null;
                $scope.today = new Date();     // shown as the "registration date" preview
                $scope.total = 0;

                /**
                 * The form model. The event_id is taken from the route parameter so
                 * the user cannot accidentally register for the wrong event, and the
                 * registration date / total amount are calculated by the API.
                 */
                $scope.registration = {
                    event_id: eventId,
                    attendee_name: '',
                    attendee_email: '',
                    contact_phone: '',
                    tickets_purchased: 1
                };

                // Pre-fill from the previous registration (localStorage convenience)
                const last = storageService.getLastRegistration();
                if (last) {
                    $scope.registration.attendee_name = last.attendee_name || '';
                    $scope.registration.attendee_email = last.attendee_email || '';
                    $scope.registration.contact_phone = last.contact_phone || '';
                    $scope.previousRegistration = last;
                }

                // GET /api/events/:id -> show WHICH event the user is registering for
                apiService.getEventDetail(eventId).then(function (response) {
                    $scope.event = response.data.event;
                    $scope.loading = false;
                }, function (response) {
                    $scope.error = apiService.extractError(response).message;
                    $scope.loading = false;
                });

                // EXTERNAL API: Open-Meteo forecast so the attendee knows what to expect
                weatherService.getEventWeather(eventId).then(function (response) {
                    $scope.weather = response.data;
                });

                // Refresh the ticket total whenever the number of tickets changes
                $scope.$watch('registration.tickets_purchased', function () {
                    $scope.total = $scope.event
                        ? Number($scope.event.ticket_price) * Number($scope.registration.tickets_purchased || 0)
                        : 0;
                });

                /**
                 * Client-side validation. Returns a list of readable problems and
                 * is reused by `submit()`. Keeping the rules in one place means the
                 * inline errors and the alert always agree.
                 */
                function collectErrors(form) {
                    const errors = [];
                    const r = $scope.registration;

                    if (!r.attendee_name || !r.attendee_name.trim()) {
                        errors.push('Full name is required.');
                    } else if (r.attendee_name.trim().length > 100) {
                        errors.push('Full name must be 100 characters or fewer.');
                    }

                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
                    if (!r.attendee_email || !r.attendee_email.trim()) {
                        errors.push('Email address is required.');
                    } else if (!emailPattern.test(r.attendee_email.trim())) {
                        errors.push('Please enter a valid email address, e.g. name@example.com.');
                    }

                    const phonePattern = /^[0-9+\-\s()]{6,30}$/;
                    if (!r.contact_phone || !r.contact_phone.trim()) {
                        errors.push('Contact phone number is required.');
                    } else if (!phonePattern.test(r.contact_phone.trim())) {
                        errors.push('Contact phone must be 6-30 digits (spaces, +, - and brackets are allowed).');
                    }

                    const tickets = Number(r.tickets_purchased);
                    if (!Number.isInteger(tickets) || tickets < 1) {
                        errors.push('Number of tickets must be a whole number of at least 1.');
                    } else if (tickets > 10) {
                        errors.push('You may purchase at most 10 tickets in a single registration.');
                    }

                    if (form && form.$invalid && !errors.length) {
                        errors.push('Please complete all required fields.');
                    }
                    return errors;
                }

                /** Live validation used by ng-change on each input. */
                $scope.validate = function (form) {
                    $scope.fieldErrors = collectErrors(form);
                    return $scope.fieldErrors.length === 0;
                };

                /**
                 * "Finalise the registration" button handler:
                 *   1. validate on the client and show an alert when something is wrong
                 *   2. POST the record to /api/registrations
                 *   3. show the confirmation message and the follow-up navigation
                 */
                $scope.submit = function (form) {
                    $scope.error = null;
                    $scope.resultMessage = null;

                    // Step 1 - client-side validation + alert
                    const errors = collectErrors(form);
                    $scope.fieldErrors = errors;
                    if (errors.length) {
                        window.alert('Your registration could not be submitted:\n\n- ' + errors.join('\n- '));
                        return;
                    }

                    // Guard against registering for a suspended / past event
                    if ($scope.event && $scope.event.status !== 'Active') {
                        $scope.error = `"${$scope.event.event_title}" is ${String($scope.event.status).toLowerCase()} ` +
                                       'and cannot accept new registrations.';
                        return;
                    }

                    // Step 2 - call the API
                    $scope.submitting = true;
                    apiService.createRegistration({
                        event_id: eventId,
                        attendee_name: $scope.registration.attendee_name.trim(),
                        attendee_email: $scope.registration.attendee_email.trim(),
                        contact_phone: $scope.registration.contact_phone.trim(),
                        tickets_purchased: Number($scope.registration.tickets_purchased)
                    }).then(function (response) {
                        $scope.submitting = false;
                        $scope.submitted = true;
                        $scope.confirmation = response.data;
                        $scope.resultMessage = response.data.msg;

                        // Remember the attendee so the next registration is quicker
                        storageService.saveLastRegistration({
                            attendee_name: $scope.registration.attendee_name.trim(),
                            attendee_email: $scope.registration.attendee_email.trim(),
                            contact_phone: $scope.registration.contact_phone.trim()
                        });

                        // Keep the "tickets sold" figures on this page up to date
                        if ($scope.event) {
                            $scope.event.registration_count += 1;
                            $scope.event.tickets_sold = Number($scope.event.tickets_sold) +
                                Number($scope.registration.tickets_purchased);
                            $scope.event.amount_raised = Number($scope.event.amount_raised) +
                                Number($scope.confirmation.registration.total_amount);
                        }
                    }, function (response) {
                        $scope.submitting = false;
                        const info = apiService.extractError(response);
                        $scope.error = info.message;
                        $scope.fieldErrors = (response.data && response.data.errors) || [];
                        window.alert(info.message);
                    });
                };

                /** Starts a fresh registration form for the same event. */
                $scope.registerAnother = function () {
                    $scope.submitted = false;
                    $scope.confirmation = null;
                    $scope.resultMessage = null;
                    $scope.fieldErrors = [];
                    $scope.registration.tickets_purchased = 1;
                };
            }])

        // =====================================================================
        // ABOUT
        // =====================================================================
        .controller('AboutController', ['$scope', 'apiService',
            function ($scope, apiService) {
                $scope.organisation = null;
                apiService.getOrganisations().then(function (response) {
                    $scope.organisation = response.data[0] || null;
                });
            }]);
})();
