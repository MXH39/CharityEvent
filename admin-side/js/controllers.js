/**
 * PROG2002 Web Development II - Assessment 3
 * File: admin-side/js/controllers.js
 * Purpose: Controllers for the ADMIN-SIDE AngularJS application.
 *
 *   DashboardController         - summary statistics
 *   EventListController         - LIST all events + DELETE
 *   EventNewController          - NEW event (POST) with validation
 *   EventEditController         - UPDATE event (PUT) + its registrations
 *   RegistrationListController  - every registration record (bonus)
 *   CategoryController          - create / rename / delete event categories
 *
 * Every screen calls the REST API through adminService, exactly like the
 * client-side website, which is what makes this a complete dynamic website.
 */

(function () {
    'use strict';

    angular.module('adminApp')

        // =====================================================================
        // DASHBOARD
        // =====================================================================
        .controller('DashboardController', ['$scope', 'adminService',
            function ($scope, adminService) {
                $scope.stats = null;
                $scope.loading = true;
                $scope.error = null;

                // GET /api/admin/stats
                adminService.getStats().then(function (response) {
                    $scope.stats = response.data;
                    $scope.loading = false;
                }, function (response) {
                    $scope.error = adminService.extractError(response).message;
                    $scope.loading = false;
                });
            }])

        // =====================================================================
        // EVENT LIST (List + Delete)
        // =====================================================================
        .controller('EventListController', ['$scope', 'adminService', 'confirmService',
            function ($scope, adminService, confirmService) {

                $scope.events = [];
                $scope.filtered = [];
                $scope.loading = true;
                $scope.error = null;
                $scope.message = null;
                $scope.filters = { status: '', keyword: '' };

                /** GET /api/admin/events -> every event, any status. */
                $scope.load = function () {
                    $scope.loading = true;
                    $scope.error = null;
                    adminService.listEvents().then(function (response) {
                        $scope.events = response.data;
                        $scope.loading = false;
                        $scope.applyFilters();
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                        $scope.loading = false;
                    });
                };

                /**
                 * The status and keyword filters are applied in the browser here
                 * (the API also supports them) so the list reacts instantly while typing.
                 */
                $scope.applyFilters = function () {
                    const status = $scope.filters.status;
                    const keyword = ($scope.filters.keyword || '').toLowerCase().trim();

                    $scope.filtered = $scope.events.filter(function (event) {
                        const matchesStatus = !status || event.status === status;
                        const matchesKeyword = !keyword ||
                            String(event.event_title).toLowerCase().indexOf(keyword) !== -1 ||
                            String(event.location).toLowerCase().indexOf(keyword) !== -1 ||
                            String(event.category_name).toLowerCase().indexOf(keyword) !== -1;
                        return matchesStatus && matchesKeyword;
                    });
                };

                /** Counts per status, shown on the filter buttons. */
                $scope.countByStatus = function (status) {
                    if (!status) return $scope.events.length;
                    return $scope.events.filter(function (e) { return e.status === status; }).length;
                };

                /**
                 * DELETE feature.
                 * The API refuses to delete an event that already has registrations
                 * (HTTP 409) - that message is shown to the staff member so they know
                 * exactly why the action was blocked.
                 */
                $scope.remove = function (event) {
                    $scope.message = null;
                    $scope.error = null;

                    const warning = event.registration_count > 0
                        ? `"${event.event_title}" has ${event.registration_count} registration(s).\n\n` +
                          'The API will BLOCK this deletion to protect data integrity.\n\nContinue anyway?'
                        : `Delete "${event.event_title}" permanently?`;

                    if (!confirmService.ask(warning)) return;

                    adminService.deleteEvent(event.event_id).then(function (response) {
                        $scope.message = response.data.msg;
                        $scope.load();
                    }, function (response) {
                        const info = adminService.extractError(response);
                        $scope.error = info.message;
                    });
                };

                $scope.load();
            }])

        // =====================================================================
        // NEW EVENT (Create)
        // =====================================================================
        .controller('EventNewController', ['$scope', '$location', 'adminService',
            function ($scope, $location, adminService) {

                $scope.categories = [];
                $scope.organisations = [];
                $scope.saving = false;
                $scope.error = null;
                $scope.fieldErrors = [];
                $scope.submittedOk = false;

                /** A blank event template matching the charity_events columns. */
                $scope.event = {
                    organisation_id: '',
                    category_id: '',
                    event_title: '',
                    event_description: '',
                    event_date: '',
                    location: '',
                    latitude: '',
                    longitude: '',
                    ticket_price: 0,
                    fundraising_goal: 0,
                    current_progress: 0,
                    is_suspended: 0
                };

                // Lookup data for the two drop-downs
                adminService.listCategories().then(function (r) { $scope.categories = r.data; });
                adminService.listOrganisations().then(function (r) {
                    $scope.organisations = r.data;
                    if (r.data.length) $scope.event.organisation_id = r.data[0].organisation_id;
                });

                /** Required-field validation, mirrored by the API. */
                function validate(form) {
                    const errors = [];
                    const e = $scope.event;

                    if (!e.organisation_id) errors.push('Please choose the organisation running this event.');
                    if (!e.category_id) errors.push('Please choose an event category.');
                    if (!e.event_title || !e.event_title.trim()) errors.push('Event title is required.');
                    if (!e.event_date) errors.push('Event date and time are required.');
                    if (!e.location || !e.location.trim()) errors.push('Event location is required.');
                    if (e.ticket_price === null || e.ticket_price === '' || Number(e.ticket_price) < 0) {
                        errors.push('Ticket price must be zero or a positive number.');
                    }
                    if (e.fundraising_goal === null || e.fundraising_goal === '' || Number(e.fundraising_goal) < 0) {
                        errors.push('Fundraising goal must be zero or a positive number.');
                    }
                    if (e.latitude !== '' && e.latitude !== null && (Number(e.latitude) < -90 || Number(e.latitude) > 90)) {
                        errors.push('Latitude must be between -90 and 90.');
                    }
                    if (e.longitude !== '' && e.longitude !== null && (Number(e.longitude) < -180 || Number(e.longitude) > 180)) {
                        errors.push('Longitude must be between -180 and 180.');
                    }
                    if (form && form.$invalid && !errors.length) errors.push('Please complete all required fields.');
                    return errors;
                }

                /** Called by the "Save / Submit" button. */
                $scope.save = function (form) {
                    $scope.error = null;
                    const errors = validate(form);
                    $scope.fieldErrors = errors;

                    if (errors.length) {
                        window.alert('The event could not be saved:\n\n- ' + errors.join('\n- '));
                        return;
                    }

                    $scope.saving = true;
                    adminService.createEvent({
                        organisation_id: Number($scope.event.organisation_id),
                        category_id: Number($scope.event.category_id),
                        event_title: $scope.event.event_title.trim(),
                        event_description: $scope.event.event_description,
                        event_date: $scope.event.event_date,
                        location: $scope.event.location.trim(),
                        latitude: $scope.event.latitude === '' ? null : Number($scope.event.latitude),
                        longitude: $scope.event.longitude === '' ? null : Number($scope.event.longitude),
                        ticket_price: Number($scope.event.ticket_price) || 0,
                        fundraising_goal: Number($scope.event.fundraising_goal) || 0,
                        current_progress: Number($scope.event.current_progress) || 0,
                        is_suspended: Number($scope.event.is_suspended) || 0
                    }).then(function (response) {
                        $scope.saving = false;
                        $scope.submittedOk = true;
                        $scope.newId = response.data.newId;
                        $scope.message = response.data.msg;
                        window.alert(response.data.msg + ' (Event ID: ' + response.data.newId + ')');
                        // Navigate straight to the edit screen of the new event
                        $location.path('/events/' + response.data.newId + '/edit');
                    }, function (response) {
                        $scope.saving = false;
                        const info = adminService.extractError(response);
                        $scope.error = info.message;
                        $scope.fieldErrors = info.errors;
                        window.alert(info.message);
                    });
                };
            }])

        // =====================================================================
        // EDIT EVENT (Update) + associated registrations
        // =====================================================================
        .controller('EventEditController', ['$scope', '$routeParams', '$location', 'adminService',
            function ($scope, $routeParams, $location, adminService) {

                const eventId = Number($routeParams.id);

                $scope.event = null;
                $scope.registrations = [];
                $scope.categories = [];
                $scope.organisations = [];
                $scope.loading = true;
                $scope.saving = false;
                $scope.error = null;
                $scope.message = null;
                $scope.fieldErrors = [];
                $scope.weather = null;

                /**
                 * <input type="datetime-local"> needs 'YYYY-MM-DDTHH:mm' while MySQL
                 * returns 'YYYY-MM-DD HH:mm:ss'. This helper converts between them so
                 * the edit form is populated correctly.
                 */
                function toDatetimeLocal(value) {
                    if (!value) return '';
                    const text = String(value).replace(' ', 'T');
                    return text.length >= 16 ? text.substring(0, 16) : text;
                }

                function loadEvent() {
                    $scope.loading = true;
                    // GET /api/events/:id returns { event, registrations }
                    adminService.getEvent(eventId).then(function (response) {
                        const data = response.data.event;
                        data.event_date = toDatetimeLocal(data.event_date);
                        $scope.event = data;
                        $scope.registrations = response.data.registrations;
                        $scope.loading = false;
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                        $scope.loading = false;
                    });
                }

                adminService.listCategories().then(function (r) { $scope.categories = r.data; });
                adminService.listOrganisations().then(function (r) { $scope.organisations = r.data; });

                // Bonus: the admin can also see the weather forecast for the event
                adminService.getWeatherForEvent(eventId).then(function (r) { $scope.weather = r.data; });

                loadEvent();

                /** UPDATE feature. Only changed values are sent (the API supports partial PUT). */
                $scope.save = function (form) {
                    $scope.error = null;
                    $scope.message = null;

                    const errors = [];
                    if (!$scope.event.event_title || !$scope.event.event_title.trim()) errors.push('Event title is required.');
                    if (!$scope.event.event_date) errors.push('Event date and time are required.');
                    if (!$scope.event.location || !$scope.event.location.trim()) errors.push('Event location is required.');
                    if (Number($scope.event.ticket_price) < 0) errors.push('Ticket price cannot be negative.');
                    if (Number($scope.event.fundraising_goal) < 0) errors.push('Fundraising goal cannot be negative.');
                    if (form && form.$invalid && !errors.length) errors.push('Please correct the invalid fields.');

                    $scope.fieldErrors = errors;
                    if (errors.length) {
                        window.alert('The event could not be saved:\n\n- ' + errors.join('\n- '));
                        return;
                    }

                    $scope.saving = true;
                    adminService.updateEvent(eventId, {
                        organisation_id: Number($scope.event.organisation_id),
                        category_id: Number($scope.event.category_id),
                        event_title: $scope.event.event_title.trim(),
                        event_description: $scope.event.event_description,
                        event_date: $scope.event.event_date,
                        location: $scope.event.location.trim(),
                        latitude: $scope.event.latitude === '' ? null : Number($scope.event.latitude),
                        longitude: $scope.event.longitude === '' ? null : Number($scope.event.longitude),
                        ticket_price: Number($scope.event.ticket_price) || 0,
                        fundraising_goal: Number($scope.event.fundraising_goal) || 0,
                        current_progress: Number($scope.event.current_progress) || 0,
                        is_suspended: Number($scope.event.is_suspended) || 0
                    }).then(function (response) {
                        $scope.saving = false;
                        $scope.message = response.data.msg;
                        $scope.event.status = response.data.event.status;
                    }, function (response) {
                        $scope.saving = false;
                        const info = adminService.extractError(response);
                        $scope.error = info.message;
                        $scope.fieldErrors = info.errors;
                    });
                };

                /** Suspends / re-activates an event without opening the form. */
                $scope.toggleSuspension = function () {
                    const next = Number($scope.event.is_suspended) === 1 ? 0 : 1;
                    adminService.updateEvent(eventId, { is_suspended: next }).then(function (response) {
                        $scope.event.is_suspended = next;
                        $scope.event.status = response.data.event.status;
                        $scope.message = next === 1
                            ? 'The event has been suspended. New registrations are now blocked.'
                            : 'The event is active again.';
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                    });
                };

                /** Removes one registration record (e.g. an accidental booking). */
                $scope.removeRegistration = function (registration) {
                    if (!window.confirm(`Remove the registration of ${registration.attendee_name}?`)) return;
                    adminService.deleteRegistration(registration.registration_id).then(function () {
                        $scope.registrations = $scope.registrations.filter(function (r) {
                            return r.registration_id !== registration.registration_id;
                        });
                        $scope.message = 'Registration removed.';
                        loadEvent();
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                    });
                };

                $scope.cancel = function () { $location.path('/events'); };
            }])

        // =====================================================================
        // REGISTRATION LIST (bonus screen)
        // =====================================================================
        .controller('RegistrationListController', ['$scope', 'adminService',
            function ($scope, adminService) {

                $scope.registrations = [];
                $scope.events = [];
                $scope.loading = true;
                $scope.error = null;
                $scope.message = null;
                $scope.filters = { event_id: '', status: '' };

                function load() {
                    $scope.loading = true;
                    const params = {};
                    if ($scope.filters.event_id) params.event_id = $scope.filters.event_id;
                    if ($scope.filters.status) params.status = $scope.filters.status;

                    adminService.listRegistrations(params).then(function (response) {
                        $scope.registrations = response.data;
                        $scope.loading = false;
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                        $scope.loading = false;
                    });
                }

                adminService.listEvents().then(function (r) { $scope.events = r.data; });

                $scope.apply = load;
                $scope.reset = function () {
                    $scope.filters = { event_id: '', status: '' };
                    load();
                };

                $scope.totalTickets = function () {
                    return $scope.registrations.reduce(function (sum, r) { return sum + Number(r.tickets_purchased); }, 0);
                };
                $scope.totalAmount = function () {
                    return $scope.registrations.reduce(function (sum, r) { return sum + Number(r.total_amount); }, 0);
                };

                $scope.changeStatus = function (registration, status) {
                    adminService.updateRegistration(registration.registration_id, { registration_status: status })
                        .then(function (response) {
                            registration.registration_status = status;
                            $scope.message = response.data.msg;
                        }, function (response) {
                            $scope.error = adminService.extractError(response).message;
                        });
                };

                $scope.remove = function (registration) {
                    if (!window.confirm(`Delete the registration of ${registration.attendee_name}?`)) return;
                    adminService.deleteRegistration(registration.registration_id).then(function () {
                        $scope.message = 'Registration deleted.';
                        load();
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                    });
                };

                load();
            }])

        // =====================================================================
        // CATEGORY MANAGEMENT
        // =====================================================================
        .controller('CategoryController', ['$scope', 'adminService',
            function ($scope, adminService) {

                $scope.categories = [];
                $scope.loading = true;
                $scope.error = null;
                $scope.message = null;
                $scope.newName = '';
                $scope.editingId = null;
                $scope.editingName = '';

                function load() {
                    $scope.loading = true;
                    adminService.listCategories().then(function (response) {
                        $scope.categories = response.data;
                        $scope.loading = false;
                    }, function (response) {
                        $scope.error = adminService.extractError(response).message;
                        $scope.loading = false;
                    });
                }

                $scope.create = function (form) {
                    $scope.error = null; $scope.message = null;
                    const name = ($scope.newName || '').trim();
                    if (!name) {
                        window.alert('Please enter a category name.');
                        return;
                    }
                    adminService.createCategory(name).then(function (response) {
                        $scope.message = response.data.msg;
                        $scope.newName = '';
                        if (form) form.$setPristine();
                        load();
                    }, function (response) {
                        const info = adminService.extractError(response);
                        $scope.error = info.message;
                        window.alert(info.message);
                    });
                };

                $scope.startEdit = function (category) {
                    $scope.editingId = category.category_id;
                    $scope.editingName = category.category_name;
                };

                $scope.cancelEdit = function () {
                    $scope.editingId = null;
                    $scope.editingName = '';
                };

                $scope.saveEdit = function (category) {
                    const name = ($scope.editingName || '').trim();
                    if (!name) {
                        window.alert('The category name cannot be empty.');
                        return;
                    }
                    adminService.updateCategory(category.category_id, name).then(function (response) {
                        $scope.message = response.data.msg;
                        $scope.cancelEdit();
                        load();
                    }, function (response) {
                        const info = adminService.extractError(response);
                        $scope.error = info.message;
                        window.alert(info.message);
                    });
                };

                $scope.remove = function (category) {
                    if (!window.confirm(`Delete the category "${category.category_name}"?`)) return;
                    adminService.deleteCategory(category.category_id).then(function (response) {
                        $scope.message = response.data.msg;
                        load();
                    }, function (response) {
                        // HTTP 409 when events still reference this category
                        const info = adminService.extractError(response);
                        $scope.error = info.message;
                        window.alert(info.message);
                    });
                };

                load();
            }]);
})();
