/*global define*/
define([
        './equals',
        'Core/defined',
        'Core/DeveloperError',
        'Core/RuntimeError'
    ], function(
        equals,
        defined,
        DeveloperError,
        RuntimeError) {
    "use strict";

    function createMissingFunctionMessageFunction(item, actualPrototype, expectedInterfacePrototype) {
        return function() {
            return 'Expected function \'' + item + '\' to exist on ' + actualPrototype.constructor.name + ' because it should implement interface ' + expectedInterfacePrototype.constructor.name + '.';
        };
    }

    function makeThrowFunction(debug, Type, name) {
        if (debug) {
            return function(expected) {
                // based on the built-in Jasmine toThrow matcher
                var result = false;
                var exception;

                if (typeof this.actual !== 'function') {
                    throw new Error('Actual is not a function');
                }

                try {
                    this.actual();
                } catch (e) {
                    exception = e;
                }

                if (exception) {
                    result = exception instanceof Type;
                }

                var not = this.isNot ? 'not ' : '';

                this.message = function() {
                    if (result) {
                        return ['Expected function ' + not + 'to throw ' + name + ' , but it threw', exception.message || exception].join(' ');
                    } else {
                        return 'Expected function to throw ' + name + '.';
                    }
                };

                return result;
            };
        }

        return function() {
            return this.isNot ? false : true;
        };
    }

    function createDefaultMatchers(debug) {
        return {
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

            toStartWith : function(expected) {
                return this.actual.slice(0, expected.length) === expected;
            },

            toEndWith : function(expected) {
                return this.actual.slice(-expected.length) === expected;
            },

            toEqual : function(expected) {
                return equals(this.env, this.actual, expected);
            },

            toEqualEpsilon : function(expected, epsilon) {
                function equalityTester(a, b) {
                    var to_run;
                    if (defined(a)) {
                        if (typeof a.equalsEpsilon === 'function') {
                            return a.equalsEpsilon(b, epsilon);
                        } else if (a instanceof Object) {
                            // Check if the current object has a static function named 'equalsEpsilon'
                            to_run = Object.getPrototypeOf(a).constructor.equalsEpsilon;
                            if (typeof to_run === 'function') {
                                return to_run(a, b, epsilon);
                            }
                        }
                    }

                    if (defined(b)) {
                        if (typeof b.equalsEpsilon === 'function') {
                            return b.equalsEpsilon(a, epsilon);
                        } else if (b instanceof Object) {
                            // Check if the current object has a static function named 'equalsEpsilon'
                            to_run = Object.getPrototypeOf(b).constructor.equalsEpsilon;
                            if (typeof to_run === 'function') {
                                return to_run(b, a, epsilon);
                            }
                        }
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
            },

            toThrow : function(expectedConstructor) {
                throw new Error('Do not use toThrow.  Use toThrowDeveloperError or toThrowRuntimeError instead.');
            },

            toThrowDeveloperError : makeThrowFunction(debug, DeveloperError, 'DeveloperError'),

            toThrowRuntimeError : makeThrowFunction(true, RuntimeError, 'RuntimeError')
        };
    }

    return function(debug) {
        return function() {
            this.addMatchers(createDefaultMatchers(debug));
        };
    };
});
