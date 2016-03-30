/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Core/defined',
        'Core/PrimitiveType',
        'Core/queryToObject',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/Context',
        'Renderer/DrawCommand',
        'Renderer/ShaderProgram',
        'Renderer/VertexArray',
        'Specs/createCanvas',
        'Specs/createFrameState',
        'Specs/destroyCanvas'
    ], function(
        clone,
        defaultValue,
        defined,
        PrimitiveType,
        queryToObject,
        Buffer,
        BufferUsage,
        ClearCommand,
        Context,
        DrawCommand,
        ShaderProgram,
        VertexArray,
        createCanvas,
        createFrameState,
        destroyCanvas) {
    'use strict';

    function createContext(options, canvasWidth, canvasHeight) {
        // clone options so we can change properties
        options = clone(defaultValue(options, {}));
        options.webgl = clone(defaultValue(options.webgl, {}));
        options.webgl.alpha = defaultValue(options.webgl.alpha, true);
        options.webgl.antialias = defaultValue(options.webgl.antialias, false);


        var canvas = createCanvas(canvasWidth, canvasHeight);
        var context = new Context(canvas, options);

        var parameters = queryToObject(window.location.search.substring(1));
        if (defined(parameters.webglValidation)) {
            context.validateShaderProgram = true;
            context.validateFramebuffer = true;
            context.logShaderCompilation = true;
            context.throwOnWebGLError = true;
        }

        var us = context.uniformState;
        us.update(createFrameState(context));

        // Add function for test
        context.destroyForSpecs = function() {
            destroyCanvas(context.canvas);
            return context.destroy();
        };

        context.verifyDrawForSpecs = function(fs, uniformMap, modelMatrix) {
            var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';

            var sp = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : fs
            });

            var va = new VertexArray({
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

            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            var command = new DrawCommand({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray : va,
                uniformMap : uniformMap,
                modelMatrix : modelMatrix
            });
            command.execute(context);
            expect(context.readPixels()).toEqual([255, 255, 255, 255]);

            sp = sp.destroy();
            va = va.destroy();
        };

        return context;
    }

    return createContext;
});
