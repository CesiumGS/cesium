/*global define*/
define([
        'Core/defined',
        './equals'
    ], function(
        defined,
        equals) {
    "use strict";

    function createMissingFunctionMessageFunction(item, actualPrototype, expectedInterfacePrototype) {
        return function() {
            return 'Expected function \'' + item + '\' to exist on ' + actualPrototype.constructor.name + ' because it should implement interface ' + expectedInterfacePrototype.constructor.name + '.';
        };
    }

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
                if (defined(a) && typeof a.equalsEpsilon === 'function') {
                    return a.equalsEpsilon(b, epsilon);
                }

                if (defined(b) && typeof b.equalsEpsilon === 'function') {
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
        },

        toConformToInterface : function(expectedInterface) {
            // All function properties on the prototype should also exist on the actual's prototype.
            var actualPrototype = this.actual.prototype;
            var expectedInterfacePrototype = expectedInterface.prototype;

            for ( var item in expectedInterfacePrototype) {
                if (expectedInterfacePrototype.hasOwnProperty(item) && typeof expectedInterfacePrototype[item] === 'function' && !actualPrototype.hasOwnProperty(item)) {
                    this.message = createMissingFunctionMessageFunction(item, actualPrototype, expectedInterfacePrototype);
                    return false;
                }
            }

            return true;
        },

        toBeInstanceOf : function(expectedConstructor) {
            return this.actual instanceof expectedConstructor;
        }
    };

    return function() {
        this.addMatchers(defaultMatchers);
    };
});