/*global defineSuite*/
defineSuite([
        'Renderer/VertexArray',
        'Core/ComponentDatatype',
        'Core/PrimitiveType',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/DrawCommand',
        'Renderer/ShaderProgram',
        'Specs/createContext'
    ], function(
        VertexArray,
        ComponentDatatype,
        PrimitiveType,
        Buffer,
        BufferUsage,
        DrawCommand,
        ShaderProgram,
        createContext) {
    'use strict';

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('binds', function() {
        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            index : 0,
            enabled : true,
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            normalize : false,
            offsetInBytes : 0,
            strideInBytes : 0,
            instanceDivisor : 0
        // tightly packed
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });
        va._bind();
        va._unBind();
        va = va.destroy();
    });

    it('binds with default values', function() {
        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });

        expect(va.numberOfAttributes).toEqual(1);
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).enabled).toEqual(true);
        expect(va.getAttribute(0).vertexBuffer).toEqual(positionBuffer);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(3);
        expect(va.getAttribute(0).componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(va.getAttribute(0).normalize).toEqual(false);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(0);
        expect(va.getAttribute(0).instanceDivisor).toEqual(0);

        va._bind();
        va._unBind();
        va = va.destroy();
    });

    it('binds with multiple buffers', function() {
        var attributeSize = 3 * Float32Array.BYTES_PER_ELEMENT;
        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : attributeSize,
            usage : BufferUsage.STATIC_DRAW
        });
        var normalBuffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : attributeSize,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            index : 0,
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }, {
            index : 1,
            vertexBuffer : normalBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });

        expect(va.numberOfAttributes).toEqual(2);
        va._bind();
        va._unBind();
        va = va.destroy();
    });

    it('binds with interleaved buffer', function() {
        var attributeSize = 3 * Float32Array.BYTES_PER_ELEMENT;
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : attributeSize,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            offsetInBytes : 0,
            strideInBytes : 2 * attributeSize
        }, {
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            normalize : true,
            offsetInBytes : attributeSize,
            strideInBytes : 2 * attributeSize
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });

        expect(va.numberOfAttributes).toEqual(2);
        va._bind();
        va._unBind();
        va = va.destroy();
    });

    it('adds attributes', function() {
        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : positionBuffer,
                componentsPerAttribute : 3
            }]
        });

        expect(va.numberOfAttributes).toEqual(1);
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).enabled).toEqual(true);
        expect(va.getAttribute(0).vertexBuffer).toEqual(positionBuffer);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(3);
        expect(va.getAttribute(0).componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(va.getAttribute(0).normalize).toEqual(false);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(0);
        expect(va.getAttribute(0).instanceDivisor).toEqual(0);

        va = va.destroy();
    });

    it('modifies attributes', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 6,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });

        expect(va.numberOfAttributes).toEqual(1);
        expect(va.getAttribute(0).enabled).toEqual(true);

        va.getAttribute(0).enabled = false;
        expect(va.getAttribute(0).enabled).toEqual(false);

        va._bind();
        va._unBind();
        va = va.destroy();
    });

    // The following specs test draw calls that pull from a constant attribute.
    // Due to what I believe is a range checking bug in Firefox (Section 6.4 of
    // the WebGL spec), an attribute backed by a buffer must also be bound,
    // otherwise drawArrays unjustly reports an INVALID_OPERATION, hence the
    // firefoxWorkaround attribute below.  In practice, we will always have
    // an attribute backed by a buffer anyway.

    it('renders with a one-component constant value', function() {
        var vs =
            'attribute float firefoxWorkaround;' +
            'attribute float attr;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == 0.5) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                firefoxWorkaround : 0,
                attr : 1
            }
        });

        var va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    sizeInBytes : Float32Array.BYTES_PER_ELEMENT,
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 1
            }, {
                value : [0.5]
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });
        command.execute(context);

        expect(context).toReadPixels([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders with a two-component constant value', function() {
        var vs =
            'attribute float firefoxWorkaround;' +
            'attribute vec2 attr;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == vec2(0.25, 0.75)) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                firefoxWorkaround : 0,
                attr : 1
            }
        });

        var va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    sizeInBytes : Float32Array.BYTES_PER_ELEMENT,
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 1
            }, {
                value : [0.25, 0.75]
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });
        command.execute(context);

        expect(context).toReadPixels([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders with a three-component constant value', function() {
        var vs =
            'attribute float firefoxWorkaround;' +
            'attribute vec3 attr;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == vec3(0.25, 0.5, 0.75)) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                firefoxWorkaround : 0,
                attr : 1
            }
        });

        var va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    sizeInBytes : Float32Array.BYTES_PER_ELEMENT,
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 1
            }, {
                value : [0.25, 0.5, 0.75]
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });
        command.execute(context);

        expect(context).toReadPixels([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders with a four-component constant value', function() {
        var vs =
            'attribute float firefoxWorkaround;' +
            'attribute vec4 attr;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == vec4(0.2, 0.4, 0.6, 0.8)) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                firefoxWorkaround : 0,
                attr : 1
            }
        });

        var va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    sizeInBytes : Float32Array.BYTES_PER_ELEMENT,
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 1
            }, {
                value : [0.2, 0.4, 0.6, 0.8]
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });
        command.execute(context);

        expect(context).toReadPixels([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders two vertex arrays with constant values', function() {
        var vs =
            'attribute float firefoxWorkaround;' +
            'attribute vec4 attr;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = attr + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';

        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';

        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                firefoxWorkaround : 0,
                attr : 1
            }
        });

        var vertexBuffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : Float32Array.BYTES_PER_ELEMENT,
            usage : BufferUsage.STATIC_DRAW
        });

        var vaRed = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : vertexBuffer,
                componentsPerAttribute : 1
            }, {
                value : [1, 0, 0, 1]
            }]
        });

        var vaGreen = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : vertexBuffer,
                componentsPerAttribute : 1
            }, {
                value : [0, 1, 0, 1]
            }]
        });

        var commandRed = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : vaRed,
            count : 1
        });

        var commandGreen = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : vaGreen,
            count : 1
        });

        commandRed.execute(context);
        expect(context).toReadPixels([255, 0, 0, 255]);

        commandGreen.execute(context);
        expect(context).toReadPixels([0, 255, 0, 255]);

        sp = sp.destroy();
        vaRed = vaRed.destroy();
        vaGreen = vaGreen.destroy();
    });

    it('destroys', function() {
        var va = new VertexArray({
            context : context,
            attributes : [{
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    sizeInBytes : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        expect(va.isDestroyed()).toEqual(false);
        va.destroy();
        expect(va.isDestroyed()).toEqual(true);
    });

    it('fails to create (missing vertexBuffer and value)', function() {
        var attributes = [{
            componentsPerAttribute : 3
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (provides both vertexBuffer and value)', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer,
            value : [1, 2, 3],
            componentsPerAttribute : 3
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create with duplicate indices', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 1,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            index : 1,
            vertexBuffer : buffer,
            componentsPerAttribute : 1
        }, {
            index : 1,
            vertexBuffer : buffer,
            componentsPerAttribute : 1
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (componentsPerAttribute missing)', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (componentsPerAttribute < 1)', function() {
        var attributes = [{
            componentsPerAttribute : 0
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (componentsPerAttribute > 4)', function() {
        var attributes = [{
            componentsPerAttribute : 5
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (value.length < 1)', function() {
        var attributes = [{
            value : []
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (value.length > 4)', function() {
        var attributes = [{
            value : [1.0, 2.0, 3.0, 4.0, 5.0]
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (componentDatatype)', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            componentDatatype : 'invalid component datatype'
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (strideInBytes)', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            strideInBytes : 256
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('fails to get attribute', function() {
        var attributes = [{
            value : [0.0, 0.0, 0.0],
            componentsPerAttribute : 3
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });

        expect(function() {
            return va.getAttribute();
        }).toThrowDeveloperError();
    });

    it('fails to destroy', function() {
        var attributes = [{
            value : [0.0, 0.0, 0.0],
            componentsPerAttribute : 3
        }];

        var va = new VertexArray({
            context : context,
            attributes : attributes
        });

        va.destroy();

        expect(function() {
            va.destroy();
        }).toThrowDeveloperError();
    });

    it('throws when there is no context', function() {
        expect(function() {
            return new VertexArray();
        }).toThrowDeveloperError();
    });

    it('throws if instanceDivisor is less than zero', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            instanceDivisor : -1
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    // Direct3D 9 requires vertex attribute zero to not be instanced. While ANGLE can work around this, it is best
    // to follow this convention. This test also guarantees that not all vertex attributes are instanced.
    it('throws if vertex attribute zero is instanced', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            index : 0,
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            instanceDivisor : 1
        }, {
            index : 1,
            vertexBuffer : buffer,
            componentsPerAttribute : 3
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('throws if an attribute has an instanceDivisor and is not backed by a buffer', function() {
        var buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });

        var attributes = [{
            index : 0,
            vertexBuffer : buffer,
            componentsPerAttribute : 3
        }, {
            index : 1,
            value : [0.0, 0.0, 1.0],
            componentsPerAttribute : 3,
            instanceDivisor : 1
        }];

        expect(function() {
            return new VertexArray({
                context : context,
                attributes : attributes
            });
        }).toThrowDeveloperError();
    });

    it('throws when instanceDivisor is greater than zero and the instanced arrays extension is not supported.', function() {
        if (!context.instancedArrays) {
            var buffer = Buffer.createVertexBuffer({
                context : context,
                sizeInBytes : 3,
                usage : BufferUsage.STATIC_DRAW
            });

            var attributes = [{
                index : 0,
                vertexBuffer : buffer,
                componentsPerAttribute : 3
            }, {
                index : 1,
                vertexBuffer : buffer,
                componentsPerAttribute : 3,
                instanceDivisor : 1
            }];

            expect(function() {
                return new VertexArray({
                    context : context,
                    attributes : attributes
                });
            }).toThrowDeveloperError();
        }
    });
}, 'WebGL');
