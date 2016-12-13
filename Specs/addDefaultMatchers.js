/*global define*/
define([
        './equals',
        'Core/Cartesian2',
        'Core/defined',
        'Core/DeveloperError',
        'Core/RuntimeError'
    ], function(
        equals,
        Cartesian2,
        defined,
        DeveloperError,
        RuntimeError) {
    'use strict';

    var webglStub = !!window.webglStub;

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
                            if (Array.isArray(a) && Array.isArray(b)) {
                                if (a.length !== b.length) {
                                    return false;
                                }

                                for (var i = 0; i < a.length; ++i) {
                                    if (!equalityTester(a[i], b[i])) {
                                        return false;
                                    }
                                }

                                return true;
                            }

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

            toRender : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return renderEquals(util, customEqualityTesters, actual, expected, true);
                    }
                };
            },

            notToRender : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return renderEquals(util, customEqualityTesters, actual, expected, false);
                    }
                };
            },

            toRenderAndCall : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        if (!webglStub) {
                            var scene = actual;
                            scene.initializeFrame();
                            scene.render();
                            var actualRgba = scene.context.readPixels();

                            // The callback may have expectations that fail, which still makes the
                            // spec fail, as we desired, even though this matcher sets pass to true.
                            var callback = expected;
                            callback(actualRgba);
                        }

                        return {
                            pass : true
                        };
                    }
                };
            },

            toPick : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        if (!webglStub) {
                            var scene = actual;
                            var result = scene.pick(new Cartesian2(0, 0));

                            // The callback may have expectations that fail, which still makes the
                            // spec fail, as we desired, even though this matcher sets pass to true.
                            var callback = expected;
                            callback(result);
                        }

                        return {
                            pass : true
                        };
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

    function renderEquals(util, customEqualityTesters, actual, expected, expectEqual) {
        var scene = actual;
        scene.initializeFrame();

        var expectedRgba;
        if (Array.isArray(expected) || (expected instanceof Uint8Array)) {
            expectedRgba = expected;

            scene.render();
        } else if (defined(expected)) {
            // expected might not actually be defined when the WebGL stub is used, e.g.,
            // because it is set in a callback passed to toRenderAndCall that isn't called.

            var options = expected;
            expectedRgba = options.rgba;
            if (!defined(expectedRgba)) {
                throw new DeveloperError('toRender and notToRender matchers require options.rgba.');
            }

            scene.render(options.time);
        }

        var actualRgba = scene.context.readPixels();

        // When the WebGL stub is used, all WebGL function calls are noops so
        // the expectation is not verified.  This allows running all the WebGL
        // tests, to exercise as much Cesium code as possible, even if the system
        // doesn't have a WebGL implementation or a reliable one.
        if (webglStub) {
            return {
                pass : true
            };
        }

        var eq = equals(util, customEqualityTesters, actualRgba, expectedRgba);
        var pass = expectEqual ? eq : !eq;

        var message;
        if (!pass) {
            message = 'Expected to render [' + expectedRgba + '], but actually rendered [' + actualRgba + '].';
        }

        return {
            pass : pass,
            message : message
        };
    }

    return function(debug) {
        return function() {
            this.addMatchers(createDefaultMatchers(debug));
        };
    };
});
