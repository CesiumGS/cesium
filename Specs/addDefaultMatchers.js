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
            return function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        // based on the built-in Jasmine toThrow matcher
                        var result = false;
                        var exception;

                        if (typeof actual !== 'function') {
                            throw new Error('Actual is not a function');
                        }

                        try {
                            actual();
                        } catch (e) {
                            exception = e;
                        }

                        if (exception) {
                            result = exception instanceof Type;
                        }

                        var message;
                        if (result) {
                            message = ['Expected function not to throw ' + name + ' , but it threw', exception.message || exception].join(' ');
                        } else {
                            message = 'Expected function to throw ' + name + '.';
                        }

                        return {
                            pass : result,
                            message : message
                        };
                    }
                };
            };
        }

        return function() {
            return {
                compare : function(actual, expected) {
                    return { pass : true  };
                },
                negativeCompare : function(actual, expected) {
                    return { pass : true };
                }
            };
        };
    }

    function createDefaultMatchers(debug) {
        return {
            toBeGreaterThanOrEqualTo : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return { pass : actual >= expected };
                    }
                };
            },

            toBeLessThanOrEqualTo : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return { pass : actual <= expected };
                    }
                };
            },

            toBeBetween : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, lower, upper) {
                        if (lower > upper) {
                            var tmp = upper;
                            upper = lower;
                            lower = tmp;
                        }
                        return { pass : actual >= lower && actual <= upper };
                    }
                };
            },

            toStartWith : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return { pass : actual.slice(0, expected.length) === expected };
                    }
                };
            },

            toEndWith : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return { pass : actual.slice(-expected.length) === expected };
                    }
                };
            },

            toEqual : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return { pass : equals(util, customEqualityTesters, actual, expected) };
                    }
                };
            },

            toEqualEpsilon : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected, epsilon) {
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

                        var result = equals(util, [equalityTester], actual, expected);

                        return { pass : result };
                    }
                };
            },

            toConformToInterface : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expectedInterface) {
                        // All function properties on the prototype should also exist on the actual's prototype.
                        var actualPrototype = actual.prototype;
                        var expectedInterfacePrototype = expectedInterface.prototype;

                        for ( var item in expectedInterfacePrototype) {
                            if (expectedInterfacePrototype.hasOwnProperty(item) && typeof expectedInterfacePrototype[item] === 'function' && !actualPrototype.hasOwnProperty(item)) {
                                return { pass : false, message : createMissingFunctionMessageFunction(item, actualPrototype, expectedInterfacePrototype) };
                            }
                        }

                        return { pass : true };
                    }
                };
            },

            toBeInstanceOf : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expectedConstructor) {
                        return { pass : actual instanceof expectedConstructor };
                    }
                };
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