/**
 * PROG2002 Web Development II - Assessment 3
 * File: client-side/js/filters.js
 * Purpose: Custom AngularJS filters used by the client-side templates.
 *   money     - formats a number as Australian dollars ('Free' when it is 0)
 *   eventDate - turns 'YYYY-MM-DD HH:mm:ss' into 'Sat 18 Oct 2026, 6:30 PM'
 *   dayMonth  - short '18 Oct' version used inside the registration table
 *   statusClass - maps an event status to the matching CSS badge class
 */

(function () {
    'use strict';

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    /** Safely parses the 'YYYY-MM-DD HH:mm:ss' strings that MySQL returns. */
    function parse(value) {
        if (!value) return null;
        const date = new Date(String(value).replace(' ', 'T'));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function twelveHour(hours, minutes) {
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const h = hours % 12 === 0 ? 12 : hours % 12;
        return `${h}:${String(minutes).padStart(2, '0')} ${suffix}`;
    }

    angular.module('charityApp')

        /** Formatted ticket price: numbers > 0 become '$85.00', 0 becomes 'Free'. */
        .filter('money', function () {
            return function (value) {
                const number = Number(value);
                if (!number) return 'Free';
                return '$' + number.toFixed(2);
            };
        })

        /** Always-currency variant used for the fundraising thermometer ($0.00). */
        .filter('currency', function () {
            return function (value) {
                return '$' + Number(value || 0).toFixed(2);
            };
        })

        .filter('eventDate', function () {
            return function (value) {
                const date = parse(value);
                if (!date) return '-';
                return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ` +
                       twelveHour(date.getHours(), date.getMinutes());
            };
        })

        .filter('shortDate', function () {
            return function (value) {
                const date = parse(value);
                if (!date) return '-';
                return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
            };
        })

        .filter('dateTime', function () {
            return function (value) {
                const date = parse(value);
                if (!date) return '-';
                return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ` +
                       twelveHour(date.getHours(), date.getMinutes());
            };
        })

        .filter('statusClass', function () {
            return function (status) {
                switch (String(status || '').toLowerCase()) {
                    case 'active': return 'badge badge-active';
                    case 'past': return 'badge badge-past';
                    case 'suspended': return 'badge badge-suspended';
                    default: return 'badge';
                }
            };
        })

        /** Percentage of the fundraising goal that has been reached (0-100). */
        .filter('goalPercent', function () {
            return function (event) {
                const goal = Number(event && event.fundraising_goal);
                const progress = Number(event && event.current_progress);
                if (!goal || goal <= 0) return 0;
                return Math.max(0, Math.min(100, Math.round((progress / goal) * 100)));
            };
        });
})();
