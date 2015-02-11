/*global define*/
define([
        'Core/clone',
        'Core/defaultValue',
        'Core/defined',
        'Core/PrimitiveType',
        'Core/queryToObject',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/Context',
        'Renderer/DrawCommand',
        'Specs/createCanvas',
        'Specs/createFrameState',
        'Specs/destroyCanvas'
    ], function(
        clone,
        defaultValue,
        defined,
        PrimitiveType,
        queryToObject,
        BufferUsage,
        ClearCommand,
        Context,
        DrawCommand,
        createCanvas,
        createFrameState,
        destroyCanvas) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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
        us.update(context, createFrameState());

        // Add function for test
        context.destroyForSpecs = function() {
            destroyCanvas(context.canvas);
            return context.destroy();
        };

        context.verifyDrawForSpecs = function(fs, uniformMap, modelMatrix) {
            var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
            var sp = context.createShaderProgram(vs, fs);

            var va = context.createVertexArray([{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            }]);

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