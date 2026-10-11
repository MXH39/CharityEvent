/**
 * PROG2002 Web Development II - Assessment 3
 * File: client-side/js/directives.js
 * Purpose: Reusable UI components for the client-side website.
 *
 * Using directives (instead of copy-pasting HTML) keeps the views short and
 * proves that the AngularJS component model is understood.
 */

(function () {
    'use strict';

    angular.module('charityApp')

        /**
         * <progress-bar value="event.current_progress" max="event.fundraising_goal">
         * Renders the fundraising thermometer used on the detail page and cards.
         */
        .directive('progressBar', function () {
            return {
                restrict: 'E',
                scope: {
                    value: '<',   // current progress
                    max: '<',     // fundraising goal
                    label: '@'    // optional caption
                },
                templateUrl: 'views/partials/progress-bar.html'
            };
        })

        /**
         * <weather-badge data="vm.weather"></weather-badge>
         * Displays the Open-Meteo forecast returned by the API. The template
         * changes depending on whether a forecast is available, so the user always
         * understands WHY no weather is shown (suspended/past/missing coordinates).
         */
        .directive('weatherBadge', function () {
            return {
                restrict: 'E',
                scope: { data: '<' },
                templateUrl: 'views/partials/weather-badge.html'
            };
        })

        /**
         * <status-badge status="event.status"></status-badge>
         * Small pill showing Active / Past / Suspended.
         */
        .directive('statusBadge', function () {
            return {
                restrict: 'E',
                scope: { status: '<' },
                template:
                    '<span ng-class="{\'badge badge-active\': status===\'Active\',' +
                    '               \'badge badge-past\': status===\'Past\',' +
                    '               \'badge badge-suspended\': status===\'Suspended\'}">{{ status }}</span>'
            };
        })

        /**
         * <event-card event="event"></event-card>
         * The event summary card reused by the Home page and the Search results,
         * so both pages look identical without duplicated markup.
         */
        .directive('eventCard', function () {
            return {
                restrict: 'E',
                scope: { event: '<' },
                templateUrl: 'views/partials/event-card.html'
            };
        });
})();
