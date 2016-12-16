/*global define*/
define([
        './equals',
        'Core/Cartesian2',
        'Core/defined',
        'Core/DeveloperError',
        'Core/PrimitiveType',
        'Core/RuntimeError',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/ShaderProgram',
        'Renderer/VertexArray',
    ], function(
        equals,
        Cartesian2,
        defined,
        DeveloperError,
        PrimitiveType,
        RuntimeError,
        Buffer,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        ShaderProgram,
        VertexArray) {
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
                        var actualRgba = renderAndReadPixels(actual);

                        if (!webglStub) {
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

            toPickPrimitive : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        return pickPrimitiveEquals(actual, expected);
                    }
                };
            },

            notToPick : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return pickPrimitiveEquals(actual, undefined);
                    }
                };
            },

            toPickAndCall : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var scene = actual;
                        var result = scene.pick(new Cartesian2(0, 0));

                        if (!webglStub) {
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

            toDrillPickAndCall : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var scene = actual;
                        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));

                        if (!webglStub) {
                            // The callback may have expectations that fail, which still makes the
                            // spec fail, as we desired, even though this matcher sets pass to true.
                            var callback = expected;
                            callback(pickedObjects);
                        }

                        return {
                            pass : true
                        };
                    }
                };
            },

            toRenderFragmentShader : function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var options = actual;
                        var context = options.context;
                        var fs = options.fragmentShader;
                        var uniformMap = options.uniformMap;
                        var modelMatrix = options.modelMatrix;

                        if (!defined(context)) {
                            throw new DeveloperError('options.context is required.');
                        }

                        if (!defined(fs)) {
                            throw new DeveloperError('options.fragmentShader is required.');
                        }

                        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
                        var sp = ShaderProgram.fromCache({
                            context : context,
                            vertexShaderSource : vs,
                            fragmentShaderSource : fs
                        });
                        var va = new VertexArray({
                            context : context,
                            attributes : [{
                                index : !webglStub ? sp.vertexAttributes.position.index : 0,
                                vertexBuffer : Buffer.createVertexBuffer({
                                    context : context,
                                    typedArray : new Float32Array([0, 0, 0, 1]),
                                    usage : BufferUsage.STATIC_DRAW
                                }),
                                componentsPerAttribute : 4
                            }]
                        });

                        ClearCommand.ALL.execute(context);
                        var clearedRgba = context.readPixels();
                        if (!webglStub) {
                            if ((clearedRgba[0] !== 0) ||
                                (clearedRgba[1] !== 0) ||
                                (clearedRgba[2] !== 0) ||
                                (clearedRgba[3] !== 0)) {
                                    return {
                                        pass : false,
                                        message : 'Expected context to render [0, 0, 0, 0], but rendered: ' + clearedRgba
                                    };
                            }
                        }

                        var command = new DrawCommand({
                            primitiveType : PrimitiveType.POINTS,
                            shaderProgram : sp,
                            vertexArray : va,
                            uniformMap : uniformMap,
                            modelMatrix : modelMatrix
                        });
                        command.execute(context);
                        var rgba = context.readPixels();
                        if (!webglStub) {
                            if ((rgba[0] !== 255) ||
                                (rgba[1] !== 255) ||
                                (rgba[2] !== 255) ||
                                (rgba[3] !== 255)) {
                                    return {
                                        pass : false,
                                        message : 'Expected context to render [255, 255, 255, 255], but rendered: ' + rgba
                                    };
                            }
                        }

                        sp = sp.destroy();
                        va = va.destroy();

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

    function renderAndReadPixels(options) {
        var scene;

        if (defined(options.scene)) {
            // options were passed to render the scene at a given time or prime shadow map
            scene = options.scene;
            var time = options.time;

            scene.initializeFrame();
            if (defined(options.primeShadowMap)) {
                scene.render(time); // Computes shadow near/far for next frame
            }
            scene.render(time);
        } else {
            scene = options;
            scene.initializeFrame();
            scene.render();
        }

        return scene.context.readPixels();
    }

    function renderEquals(util, customEqualityTesters, actual, expected, expectEqual) {
        var actualRgba = renderAndReadPixels(actual);

        // When the WebGL stub is used, all WebGL function calls are noops so
        // the expectation is not verified.  This allows running all the WebGL
        // tests, to exercise as much Cesium code as possible, even if the system
        // doesn't have a WebGL implementation or a reliable one.
        if (webglStub) {
            return {
                pass : true
            };
        }

        var eq = equals(util, customEqualityTesters, actualRgba, expected);
        var pass = expectEqual ? eq : !eq;

        var message;
        if (!pass) {
            message = 'Expected to render [' + expected + '], but actually rendered [' + actualRgba + '].';
        }

        return {
            pass : pass,
            message : message
        };
    }

    function pickPrimitiveEquals(actual, expected) {
        var scene = actual;
        var result = scene.pick(new Cartesian2(0, 0));

        var pass = true;
        var message;

        if (!webglStub) {
            if (defined(expected)) {
                pass = (result.primitive === expected);
            } else {
                pass = !defined(result);
            }

            if (!pass) {
                message = 'Expected to pick ' + expected + ', but picked: ' + result;
            }
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
