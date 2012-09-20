/*global define*/
define([
        './equals'
    ], function(
        equals) {
    "use strict";

    var defaultMatchers = {
        toBeGreaterThanOrEqualTo : function(value, epsilon) {
            return this.actual >= value;
        },

        toBeLessThanOrEqualTo : function(value, epsilon) {
            return this.actual <= value;
        },

        toBeBetween : function(lower, upper) {
            if (lower > upper) {
                var tmp = upper;
                upper = lower;
                lower = tmp;
            }
            return this.actual >= lower && this.actual <= upper;
        },

        toEqual : function(expected) {
            return equals(this.env, this.actual, expected);
        },

        toEqualEpsilon : function(expected, epsilon) {
            function equalityTester(a, b) {
                if (a !== 'undefined' && typeof a.equalsEpsilon === 'function') {
                    return a.equalsEpsilon(b, epsilon);
                }

                if (typeof b !== 'undefined' && typeof b.equalsEpsilon === 'function') {
                    return b.equalsEpsilon(a, epsilon);
                }

                if (typeof a === 'number' || typeof b === 'number') {
                    return Math.abs(a - b) <= epsilon;
                }

                return undefined;
            }

            var origTesters = this.env.equalityTesters_;
            this.env.equalityTesters_ = [equalityTester];

            var result = equals(this.env, this.actual, expected);

            this.env.equalityTesters_ = origTesters;

            return result;
        }
    };

    return function() {
        this.addMatchers(defaultMatchers);
    };
});