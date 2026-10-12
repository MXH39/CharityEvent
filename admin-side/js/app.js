/**
 * PROG2002 Web Development II - Assessment 3
 * File: admin-side/js/app.js
 * Purpose: Bootstraps the AngularJS ADMIN-SIDE single page application.
 *
 * Assessment 3 Part 4 asks for a dedicated staff website that provides the full
 * C.R.U.D. functionality (List / New / Update / Delete) over the charity events,
 * plus navigation between the screens and the ability to manipulate event
 * category data.
 *
 * Routes
 *   /dashboard        summary statistics
 *   /events           list of ALL events (Active, Past and Suspended) + delete
 *   /events/new       create a new charity event
 *   /events/:id/edit  update an event and view its registrations
 *   /registrations    every registration record (bonus)
 *   /categories       create / rename / delete event categories
 */

(function () {
    'use strict';

    angular
        .module('adminApp', ['ngRoute'])
        .constant('API_BASE', '/api')
        .config(configureRoutes);

    configureRoutes.$inject = ['$routeProvider', '$locationProvider'];

    function configureRoutes($routeProvider, $locationProvider) {
        $routeProvider
            .when('/dashboard', {
                templateUrl: 'views/dashboard.html',
                controller: 'DashboardController',
                title: 'Dashboard'
            })
            .when('/events', {
                templateUrl: 'views/events.html',
                controller: 'EventListController',
                title: 'Manage Events'
            })
            .when('/events/new', {
                templateUrl: 'views/event-new.html',
                controller: 'EventNewController',
                title: 'New Event'
            })
            .when('/events/:id/edit', {
                templateUrl: 'views/event-edit.html',
                controller: 'EventEditController',
                title: 'Edit Event'
            })
            .when('/registrations', {
                templateUrl: 'views/registrations.html',
                controller: 'RegistrationListController',
                title: 'Registrations'
            })
            .when('/categories', {
                templateUrl: 'views/categories.html',
                controller: 'CategoryController',
                title: 'Event Categories'
            })
            .otherwise({ redirectTo: '/dashboard' });

        // Hash routing keeps deep links working on a plain Apache/cPanel folder.
        $locationProvider.html5Mode(false);

        // AngularJS 1.6 changed the default hash prefix from '' to '!'. Without
        // this line AngularJS rewrites '#/dashboard' into '#!/dashboard' and the
        // plain href="#/..." sidebar links stop changing the route.
        $locationProvider.hashPrefix('');
    }

    /** Keeps the tab title in sync and provides the sidebar highlight helper. */
    angular.module('adminApp').run(['$rootScope', '$route', '$location',
        function ($rootScope, $route, $location) {
            $rootScope.$on('$routeChangeSuccess', function () {
                const current = $route.current;
                document.title = current && current.title
                    ? `${current.title} | Charity Admin Portal`
                    : 'Charity Admin Portal';
            });

            /**
             * Sidebar highlighting. '/events/new' must still highlight the generic
             * '/events' link when `exact` is false.
             */
            $rootScope.isActive = function (path, exact) {
                const current = $location.path();
                return exact ? current === path : current.indexOf(path) === 0;
            };
        }]);
})();
