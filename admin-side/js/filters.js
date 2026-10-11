/**
 * PROG2002 Web Development II - Assessment 3
 * File: admin-side/js/filters.js
 * Purpose: Custom AngularJS filters used by the admin templates.
 *   money          - '$85.00' or 'Free' when the price is 0
 *   currency       - always formatted currency ('$0.00')
 *   eventDate      - 'Sat 18 Oct 2026, 6:30 PM'
 *   shortDate      - '18 Oct 2026' (used inside tables)
 *   dateTime       - '18 Oct 2026, 6:30 PM'
 *   datetimeLocal  - 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
 *   goalPercent    - percentage of the fundraising goal reached
 *   statusClass    - maps an event status onto its CSS badge class
 */

(function () {
    'use strict';

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

    angular.module('adminApp')

        .filter('money', function () {
            return function (value) {
                const number = Number(value);
                return number ? '$' + number.toFixed(2) : 'Free';
            };
        })

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

        /**
         * MySQL stores 'YYYY-MM-DD HH:mm:ss' but <input type="datetime-local">
         * requires 'YYYY-MM-DDTHH:mm'. This filter bridges the two.
         */
        .filter('datetimeLocal', function () {
            return function (value) {
                if (!value) return '';
                const text = String(value).replace(' ', 'T');
                return text.length >= 16 ? text.substring(0, 16) : text;
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

        .filter('goalPercent', function () {
            return function (event) {
                const goal = Number(event && event.fundraising_goal);
                const progress = Number(event && event.current_progress);
                if (!goal || goal <= 0) return 0;
                return Math.max(0, Math.min(100, Math.round((progress / goal) * 100)));
            };
        });
})();
