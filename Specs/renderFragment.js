/*global define*/
define([
        'Core/defaultValue',
        'Core/PrimitiveType',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/RenderState',
        'Renderer/ShaderProgram',
        'Renderer/VertexArray'
    ], function(
        defaultValue,
        PrimitiveType,
        Buffer,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        RenderState,
        ShaderProgram,
        VertexArray) {
    'use strict';

    function renderFragment(context, fs, depth, clear) {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';

        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        depth = defaultValue(depth, 0.0);
        var va = new VertexArray({
            context : context,
            attributes : [{
                index : sp.vertexAttributes.position.index,
                vertexBuffer : Buffer.createVertexBuffer({
                    context : context,
                    typedArray : new Float32Array([0.0, 0.0, depth, 1.0]),
                    usage : BufferUsage.STATIC_DRAW
                }),
                componentsPerAttribute : 4
            }]
        });
        var rs = RenderState.fromCache({
            depthTest : {
                enabled : true
            }
        });

        clear = defaultValue(clear, true);
        if (clear) {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        }

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            renderState : rs
        });
        command.execute(context);

        sp = sp.destroy();
        va = va.destroy();

        return context.readPixels();
    }

    return renderFragment;
});
