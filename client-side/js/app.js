/**
 * PROG2002 Web Development II - Assessment 3
 * File: client-side/js/app.js
 * Purpose: Bootstraps the AngularJS CLIENT-SIDE single page application.
 *
 * The Assessment 2 client website consisted of four plain HTML pages where every
 * page fetched its own data with `fetch()` and then hand-built HTML strings with
 * `innerHTML`. For Assessment 3 the whole client website was migrated to the
 * AngularJS framework:
 *   - one module (`charityApp`) with ngRoute routing between "pages"
 *   - declarative templates (views/*.html) driven by ng-repeat / ng-if / ng-model
 *   - a reusable data layer (services.js) wrapping $http
 *   - custom filters (filters.js) and directives (directives.js)
 */

(function () {
    'use strict';

    // The single AngularJS module for the client-side website.
    // ngRoute provides client-side "page" navigation without a full page reload.
    angular
        .module('charityApp', ['ngRoute'])
        .constant('API_BASE', '/api')          // all REST calls start here
        .config(configureRoutes);

    configureRoutes.$inject = ['$routeProvider', '$locationProvider'];

    /**
     * Defines one route per screen of the client-side website.
     * `otherwise()` sends unknown URLs back to the home page, and
     * `reloadOnSearch:false` keeps the search form from re-running the route
     * when only the query string changes.
     */
    function configureRoutes($routeProvider, $locationProvider) {
        $routeProvider
            .when('/home', {
                templateUrl: 'views/home.html',
                controller: 'HomeController',
                controllerAs: 'vm',
                title: 'Home'
            })
            .when('/search', {
                templateUrl: 'views/search.html',
                controller: 'SearchController',
                title: 'Search Events'
            })
            .when('/events/:id', {
                templateUrl: 'views/detail.html',
                controller: 'EventDetailController',
                title: 'Event Details'
            })
            .when('/register/:id', {
                templateUrl: 'views/register.html',
                controller: 'RegisterController',
                title: 'Event Registration'
            })
            .when('/about', {
                templateUrl: 'views/about.html',
                controller: 'AboutController',
                title: 'About Us'
            })
            .otherwise({ redirectTo: '/home' });

        // Hash-based routing (the default) is used because the site is deployed
        // into a normal Apache/PHP folder on the SCU cPanel, where a <base href>
        // rewrite rule for HTML5 mode may not be available.
        $locationProvider.html5Mode(false);
    }

    /**
     * Keeps the browser tab title in sync with the active route and exposes a
     * small helper used by the navigation bar to highlight the current link.
     */
    angular.module('charityApp').run(['$rootScope', '$route', '$location',
        function ($rootScope, $route, $location) {
            $rootScope.$on('$routeChangeSuccess', function () {
                const current = $route.current;
                document.title = current && current.title
                    ? `${current.title} | City Community Charity`
                    : 'City Community Charity';
            });

            /**
             * @param {string} path route prefix, e.g. '/search'
             * @returns {boolean} true when the current URL starts with `path`
             */
            $rootScope.isActive = function (path) {
                return $location.path().indexOf(path) === 0;
            };
        }]);
})();
