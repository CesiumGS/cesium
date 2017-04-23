/*global define*/
define([
        './equals',
        'Core/Cartesian2',
        'Core/defaultValue',
        'Core/defined',
        'Core/DeveloperError',
        'Core/Math',
        'Core/PrimitiveType',
        'Core/RuntimeError',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/ShaderProgram',
        'Renderer/VertexArray'
    ], function(
        equals,
        Cartesian2,
        defaultValue,
        defined,
        DeveloperError,
        CesiumMath,
        PrimitiveType,
        RuntimeError,
        Buffer,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        ShaderProgram,
        VertexArray) {
    'use strict';

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
                    compare : function(actual, expected) {
                        return { pass : actual >= expected };
                    }
                };
            },

            toBeLessThanOrEqualTo : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return { pass : actual <= expected };
                    }
                };
            },

            toBeBetween : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, lower, upper) {
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
                    compare : function(actual, expected) {
                        return { pass : actual.slice(0, expected.length) === expected };
                    }
                };
            },

            toEndWith : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return { pass : actual.slice(-expected.length) === expected };
                    }
                };
            },

            toEqual : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return { pass : equals(util, customEqualityTesters, actual, expected) };
                    }
                };
            },

            toEqualEpsilon : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected, epsilon) {
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
                    compare : function(actual, expected) {
                        return renderEquals(util, customEqualityTesters, actual, expected, true);
                    }
                };
            },

            notToRender : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return renderEquals(util, customEqualityTesters, actual, expected, false);
                    }
                };
            },

            toRenderAndCall : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        var actualRgba = renderAndReadPixels(actual);

                        var webglStub = !!window.webglStub;
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
                    compare : function(actual, expected) {
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
                    compare : function(actual, expected) {
                        var scene = actual;
                        var result = scene.pick(new Cartesian2(0, 0));

                        var webglStub = !!window.webglStub;
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
                    compare : function(actual, expected) {
                        var scene = actual;
                        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));

                        var webglStub = !!window.webglStub;
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

            toReadPixels : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        var context;
                        var framebuffer;
                        var epsilon = 0;

                        var options = actual;
                        if (defined(options.context)) {
                            // options were passed to to a framebuffer
                            context = options.context;
                            framebuffer = options.framebuffer;
                            epsilon = defaultValue(options.epsilon, epsilon);
                        } else {
                            context = options;
                        }

                        var rgba = context.readPixels({
                            framebuffer : framebuffer
                        });

                        var pass = true;
                        var message;

                        var webglStub = !!window.webglStub;
                        if (!webglStub) {
                            if (!CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) ||
                                !CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) ||
                                !CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) ||
                                !CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)) {
                                pass = false;
                                if (epsilon === 0) {
                                    message = 'Expected context to render ' + expected + ', but rendered: ' + rgba;
                                } else {
                                    message = 'Expected context to render ' + expected + ' with epsilon = ' + epsilon + ', but rendered: ' + rgba;
                                }
                            }
                        }

                        return {
                            pass : pass,
                            message : message
                        };
                    }
                };
            },

            notToReadPixels : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        var context = actual;
                        var rgba = context.readPixels();

                        var pass = true;
                        var message;

                        var webglStub = !!window.webglStub;
                        if (!webglStub) {
                            if ((rgba[0] === expected[0]) &&
                                (rgba[1] === expected[1]) &&
                                (rgba[2] === expected[2]) &&
                                (rgba[3] === expected[3])) {
                                pass = false;
                                message = 'Expected context not to render ' + expected + ', but rendered: ' + rgba;
                            }
                        }

                        return {
                            pass : pass,
                            message : message
                        };
                    }
                };
            },

            contextToRender : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return expectContextToRender(actual, expected, true);
                    }
                };
            },

            notContextToRender : function(util, customEqualityTesters) {
                return {
                    compare : function(actual, expected) {
                        return expectContextToRender(actual, expected, false);
                    }
                };
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
        if (!!window.webglStub) {
            return {
                pass : true
            };
        }

        var eq = equals(util, customEqualityTesters, actualRgba, expected);
        var pass = expectEqual ? eq : !eq;

        var message;
        if (!pass) {
            message = 'Expected ' + (expectEqual ? '' : 'not ')  + 'to render [' + expected + '], but actually rendered [' + actualRgba + '].';
        }

        return {
            pass : pass,
            message : message
        };
    }

    function pickPrimitiveEquals(actual, expected) {
        var scene = actual;
        var result = scene.pick(new Cartesian2(0, 0));

        if (!!window.webglStub) {
            return {
                pass : true
            };
        }

        var pass = true;
        var message;

        if (defined(expected)) {
            pass = (result.primitive === expected);
        } else {
            pass = !defined(result);
        }

        if (!pass) {
            message = 'Expected to pick ' + expected + ', but picked: ' + result;
        }

        return {
            pass : pass,
            message : message
        };
    }

    function expectContextToRender(actual, expected, expectEqual) {
        var options = actual;
        var context = options.context;
        var vs = options.vertexShader;
        var fs = options.fragmentShader;
        var sp = options.shaderProgram;
        var uniformMap = options.uniformMap;
        var modelMatrix = options.modelMatrix;
        var depth = defaultValue(options.depth, 0.0);
        var clear = defaultValue(options.clear, true);
        var epsilon = defaultValue(options.epsilon, 0);

        if (!defined(expected)) {
            expected = [255, 255, 255, 255];
        }

        if (!defined(context)) {
            throw new DeveloperError('options.context is required.');
        }

        if (!defined(fs) && !defined(sp)) {
            throw new DeveloperError('options.fragmentShader or options.shaderProgram is required.');
        }

        if (defined(fs) && defined(sp)) {
            throw new DeveloperError('Both options.fragmentShader and options.shaderProgram can not be used at the same time.');
        }

        if (defined(vs) && defined(sp)) {
            throw new DeveloperError('Both options.vertexShader and options.shaderProgram can not be used at the same time.');
        }

        if (!defined(sp)) {
            if (!defined(vs)) {
                vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
            }
            sp = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations: {
                    position: 0
                }
            });
        }

        var va = new VertexArray({
            context : context,
            attributes : [{
                index : 0,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0.0, 0.0, depth, 1.0]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        var webglStub = !!window.webglStub;

        if (clear) {
            ClearCommand.ALL.execute(context);

            var clearedRgba = context.readPixels();
            if (!webglStub) {
                var expectedAlpha = context.options.webgl.alpha ? 0 : 255;
                if ((clearedRgba[0] !== 0) ||
                    (clearedRgba[1] !== 0) ||
                    (clearedRgba[2] !== 0) ||
                    (clearedRgba[3] !== expectedAlpha)) {
                    return {
                        pass : false,
                        message : 'After clearing the framebuffer, expected context to render [0, 0, 0, ' + expectedAlpha + '], but rendered: ' + clearedRgba
                    };
                }
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
            if (expectEqual) {
                if (!CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) ||
                    !CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) ||
                    !CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) ||
                    !CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)) {
                    return {
                        pass : false,
                        message : 'Expected context to render ' + expected + ', but rendered: ' + rgba
                    };
                }
            } else {
                if (CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) &&
                    CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) &&
                    CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) &&
                    CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)) {
                    return {
                        pass : false,
                        message : 'Expected context not to render ' + expected + ', but rendered: ' + rgba
                    };
                }
            }
        }

        sp = sp.destroy();
        va = va.destroy();

        return {
            pass : true
        };
    }

    return function(debug) {
        return function() {
            this.addMatchers(createDefaultMatchers(debug));
        };
    };
});
