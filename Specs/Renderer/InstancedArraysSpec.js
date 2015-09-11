/*global defineSuite*/
defineSuite([
        'Core/ComponentDatatype',
        'Core/PrimitiveType',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/RenderState',
        'Renderer/ShaderProgram',
        'Renderer/VertexArray',
        'Scene/BlendingState',
        'Specs/createContext'
    ], 'Renderer/InstancedArrays', function(
        ComponentDatatype,
        PrimitiveType,
        Buffer,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        RenderState,
        ShaderProgram,
        VertexArray,
        BlendingState,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,WebGLRenderingContext*/

    var context;
    var sp;
    var va;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
    });

    it('throws if instanceDivisor is less than 0', function() {
        expect(function() {
            va = new VertexArray({
                context : context,
                attributes : [{
                    index : 0,
                    vertexBuffer : Buffer.createVertexBuffer({
                        context : context,
                        typedArray : new Float32Array([0, 0, 0, 1]),
                        usage : BufferUsage.STATIC_DRAW
                    }),
                    componentsPerAttribute : 4,
                    instanceDivisor : -1
                }]
            });
        }).toThrowDeveloperError();
    });

    it('throws if instanceCount is less than 0', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        va = new VertexArray({
            context : context,
            attributes : [{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            instanceCount : -1
        });

        expect(function() {
            command.execute(context);
        }).toThrowDeveloperError();
    });

    it('throws when attempting to render instances when the instanced arrays extension is not supported', function() {
        // disable extension
        var instancedArrays = context._instancedArrays;
        context._instancedArrays = undefined;

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        va = new VertexArray({
            context : context,
            attributes : [{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            instanceCount : 2
        });

        expect(function() {
            command.execute(context);
        }).toThrowDeveloperError();

        context._instancedArrays = instancedArrays;
    });

    it('throws if all attributes are instanced', function() {
        expect(function() {
            va = new VertexArray({
                context : context,
                attributes : [{
                    index : 0,
                    vertexBuffer : Buffer.createVertexBuffer({
                        context : context,
                        typedArray : new Float32Array([0, 0, 0, 1]),
                        usage : BufferUsage.STATIC_DRAW
                    }),
                    componentsPerAttribute : 4,
                    instanceDivisor : 1
                }]
            });
        }).toThrowDeveloperError();
    });

    it('throws if an attribute has an instanceDivisor and is not backed by a buffer', function() {
        expect(function() {
            va = new VertexArray({
                context : context,
                attributes : [{
                    index : 0,
                    value : [0.0, 0.0, 0.0, 1.0],
                    componentsPerAttribute : 4,
                    instanceDivisor : 1
                }]
            });
        }).toThrowDeveloperError();
    });

    it('sets default values for instanceDivisor and instanceCount', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        va = new VertexArray({
            context : context,
            attributes : [{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });

        expect(va.getAttribute(0).instanceDivisor).toEqual(0);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        expect(command.instanceCount).toEqual(1);
    });

    it('draws two instances of a point with different per-instance colors', function() {
        var vs =
            'attribute vec4 position;' +
            'attribute vec4 color;' +
            'varying vec4 v_color;' +
            'void main() {' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = position;' +
            '  v_color = color;' +
            '}';
        var fs = 'varying vec4 v_color; void main() { gl_FragColor = v_color; }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        va = new VertexArray({
            context : context,
            attributes : [{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0, 0, 0, 1]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }, {
                index : sp.vertexAttributes.color.index,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                instanceDivisor : 1
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            instanceCount : 2,
            renderState : RenderState.fromCache({
                blending : BlendingState.ADDITIVE_BLEND
            })
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);
    });
}, 'WebGL');
