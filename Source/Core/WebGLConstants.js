/*global define*/
/**
 * @module WebGLConstants
 */
define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Enum containing WebGL Constant values by name.
     * for use without an active WebGL context, or in cases where certain constants are unavailable using the WebGL context
     * (For example, in [Safari 9]{@link https://github.com/AnalyticalGraphicsInc/cesium/issues/2989}).
     *
     * @readonly
     * @alias WebGLConstants
     * @enum {Number}
     */
    var WebGLConstants = {
        /**
         * Passed to [gl.clear]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/clear}
         * to clear the current depth buffer.
         */
        DEPTH_BUFFER_BIT : 0x00000100,
        /**
         * Passed to [gl.clear]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/clear}
         * to clear the current stencil buffer.
         */
        STENCIL_BUFFER_BIT : 0x00000400,
        /**
         * Passed to [gl.clear]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/clear}
         * to clear the current color buffer.
         */
        COLOR_BUFFER_BIT : 0x00004000,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw single points.
         */
        POINTS : 0x0000,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw lines. Each vertex connects to the one after it.
         */
        LINES : 0x0001,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw draw lines. Each set of two vertices is treated as a separate line segment.
         */
        LINE_LOOP : 0x0002,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw a connected group of line segments from the first vertex to the last.
         */
        LINE_STRIP : 0x0003,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw triangles. Each set of three vertices creates a separate triangle.
         */
        TRIANGLES : 0x0004,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw a connected group of triangles.
         */
        TRIANGLE_STRIP : 0x0005,
        /**
         * Passed to [gl.drawElements]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements}
         * or [gl.drawArrays]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays}
         * to draw a connected group of triangles. Each vertex connects to the previous and the first vertex in the fan.
         */
        TRIANGLE_FAN : 0x0006,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to turn off a component.
         */
        ZERO : 0,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to turn on a component.
         */
        ONE : 1,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by the source color.
         */
        SRC_COLOR : 0x0300,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by one minus the source color.
         */
        ONE_MINUS_SRC_COLOR : 0x0301,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by the source alpha.
         */
        SRC_ALPHA : 0x0302,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by one minus the source alpha.
         */
        ONE_MINUS_SRC_ALPHA : 0x0303,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by the destination alpha.
         */
        DST_ALPHA : 0x0304,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by one minus the destination alpha.
         */
        ONE_MINUS_DST_ALPHA : 0x0305,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by the destination color.
         */
        DST_COLOR : 0x0306,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by one minus the destination color.
         */
        ONE_MINUS_DST_COLOR : 0x0307,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to multiply a component by the minimum of the source alpha or one minus the destination alpha.
         */
        SRC_ALPHA_SATURATE : 0x0308,
        /**
         * Passed to [gl.blendEquation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquation}
         * or [gl.blendEquationSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquationSeparate}
         * to set an addition blend function.
         */
        FUNC_ADD : 0x8006,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current RGB blend function.
         */
        BLEND_EQUATION : 0x8009,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current RGB blend function, same as BLEND_EQUATION.
         */
        BLEND_EQUATION_RGB : 0x8009,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current alpha blend function.
         */
        BLEND_EQUATION_ALPHA : 0x883D,
        /**
         * Passed to [gl.blendEquation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquation}
         * or [gl.blendEquationSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquationSeparate}
         * to set a subtraction blend function (source - destination).
         */
        FUNC_SUBTRACT : 0x800A,
        /**
         * Passed to [gl.blendEquation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquation}
         * or [gl.blendEquationSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquationSeparate}
         * to set a subtraction blend function (destination - source).
         */
        FUNC_REVERSE_SUBTRACT : 0x800B,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current destination RGB blend function.
         */
        BLEND_DST_RGB : 0x80C8,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current source RGB blend function.
         */
        BLEND_SRC_RGB : 0x80C9,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current destination alpha blend function.
         */
        BLEND_DST_ALPHA : 0x80CA,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current source alpha blend function.
         */
        BLEND_SRC_ALPHA : 0x80CB,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to specify a constant color blend function.
         */
        CONSTANT_COLOR : 0x8001,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to specify one minus a constant color blend function.
         */
        ONE_MINUS_CONSTANT_COLOR : 0x8002,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to specify a constant alpha blend function.
         */
        CONSTANT_ALPHA : 0x8003,
        /**
         * Passed to [gl.blendFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc}
         * or [gl.blendFuncSeparate]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate}
         * to specify one minus a constant alpha blend function.
         */
        ONE_MINUS_CONSTANT_ALPHA : 0x8004,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to return the current blend color.
         */
        BLEND_COLOR : 0x8005,
        /**
         * Passed to [gl.bindBuffer]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindBuffer}
         * or [gl.bufferData]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
         * to specify that the buffer is used for vertex attributes.
         */
        ARRAY_BUFFER : 0x8892,
        /**
         * Passed to [gl.bindBuffer]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindBuffer}
         * or [gl.bufferData]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
         * to specify that the buffer is used for element indices.
         */
        ELEMENT_ARRAY_BUFFER : 0x8893,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the array buffer binding.
         */
        ARRAY_BUFFER_BINDING : 0x8894,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current element array buffer.
         */
        ELEMENT_ARRAY_BUFFER_BINDING : 0x8895,
        /**
         * Passed to [gl.bufferData]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
         * as a hint about whether the contents of the buffer are likely to not be used often.
         */
        STREAM_DRAW : 0x88E0,
        /**
         * Passed to [gl.bufferData]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
         * as a hint about whether the contents of the buffer are likely to be used often and not change often.
         */
        STATIC_DRAW : 0x88E4,
        /**
         * Passed to [gl.bufferData]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
         * as a hint about whether the contents of the buffer are likely to be used often and change often.
         */
        DYNAMIC_DRAW : 0x88E8,
        /**
         * Passed to [gl.getBufferParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getBufferParameter}
         * to get a buffer's size.
         */
        BUFFER_SIZE : 0x8764,
        /**
         * Passed to [gl.getBufferParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getBufferParameter}
         * to get the hint for the buffer passed in when it was created.
         */
        BUFFER_USAGE : 0x8765,
        /**
         * Passed to [gl.getVertexAttrib]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getVertexAttrib}
         * to read back the current vertex attribute.
         */
        CURRENT_VERTEX_ATTRIB : 0x8626,
        /**
         * Passed to [gl.cullFace]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace}
         * to specify that only front faces should be drawn.
         */
        FRONT : 0x0404,
        /**
         * Passed to [gl.cullFace]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace}
         * to specify that only back faces should be drawn.
         */
        BACK : 0x0405,
        /**
         * Passed to [gl.cullFace]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace}
         * to specify that front and back faces should be drawn.
         */
        FRONT_AND_BACK : 0x0408,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off culling. Can also be used with [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to find the current culling method.
         */
        CULL_FACE : 0x0B44,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off blending. Can also be used with [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to find the current blending method.
         */
        BLEND : 0x0BE2,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off dithering. Can also be used with [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to find the current dithering method.
         */
        DITHER : 0x0BD0,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off the stencil test. Can also be used with [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to query the stencil test.
         */
        STENCIL_TEST : 0x0B90,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off the depth test. Can also be used with [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to query the depth test.
         */
        DEPTH_TEST : 0x0B71,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off the scissor test. Can also be used with [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to query the scissor test.
         */
        SCISSOR_TEST : 0x0C11,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off the polygon offset. Useful for rendering hidden-line images, decals, and or solids with highlighted edges.
         */
        POLYGON_OFFSET_FILL : 0x8037,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off the alpha to coverage. Used in multi-sampling alpha channels.
         */
        SAMPLE_ALPHA_TO_COVERAGE : 0x809E,
        /**
         * Passed to [gl.enable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable}/[disable]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/disable}
         * to turn on/off the sample coverage. Used in multi-sampling.
         */
        SAMPLE_COVERAGE : 0x80A0,
        /**
         * Returned from [gl.getError]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError}.
         * Indicates that no error has been recorded.
         */
        NO_ERROR : 0,
        /**
         * Returned from [gl.getError]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError}.
         * Indicates that an unacceptable value has been specified for an enumerated argument.
         */
        INVALID_ENUM : 0x0500,
        /**
         * Returned from [gl.getError]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError}.
         * Indicates that a numeric argument is out of range.
         */
        INVALID_VALUE : 0x0501,
        /**
         * Returned from [gl.getError]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError}.
         * Indicates that the specified command is not allowed for the current state.
         */
        INVALID_OPERATION : 0x0502,
        /**
         * Returned from [gl.getError]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError}.
         * Indicates that the not enough memory is left to execute the command.
         */
        OUT_OF_MEMORY : 0x0505,
        /**
         * Passed to [gl.frontFace]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace}
         * to specify the front face of a polygon is drawn in the clockwise direction.
         */
        CW : 0x0900,
        /**
         * Passed to [gl.frontFace]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace}
         * to specify the front face of a polygon is drawn in the counter-clockwise direction.
         */
        CCW : 0x0901,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current lineWidth (set by [gl.lineWidth]{https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/lineWidth}).
         */
        LINE_WIDTH : 0x0B21,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current size of a drawn point.
         */
        ALIASED_POINT_SIZE_RANGE : 0x846D,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the range of available widths for a line. Returns a length-2 array with the lo value at 0, and hight at 1.
         */
        ALIASED_LINE_WIDTH_RANGE : 0x846E,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current value of cullFace. Should return FRONT, BACK, or FRONT_AND_BACK.
         */
        CULL_FACE_MODE : 0x0B45,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to determine the current value of [gl.frontFace]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace}.
         */
        FRONT_FACE : 0x0B46,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to return a length-2 array of floats giving the current depth range.
         */
        DEPTH_RANGE : 0x0B70,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to determine if the depth write mask is enabled.
         */
        DEPTH_WRITEMASK : 0x0B72,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to determine the current depth clear value.
         */
        DEPTH_CLEAR_VALUE : 0x0B73,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current depth function. Returns NEVER, ALWAYS, LESS, EQUAL, LEQUAL, GREATER, GEQUAL, or NOTEQUAL.
         */
        DEPTH_FUNC : 0x0B74,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the value the stencil will be cleared to.
         */
        STENCIL_CLEAR_VALUE : 0x0B91,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current stencil function. Returns NEVER, ALWAYS, LESS, EQUAL, LEQUAL, GREATER, GEQUAL, or NOTEQUAL.
         */
        STENCIL_FUNC : 0x0B92,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current stencil fail function. Should return KEEP, REPLACE, INCR, DECR, INVERT, INCR_WRAP, or DECR_WRAP.
         */
        STENCIL_FAIL : 0x0B94,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current stencil fail function should the depth buffer test fail. Should return KEEP, REPLACE, INCR, DECR, INVERT, INCR_WRAP, or DECR_WRAP.
         */
        STENCIL_PASS_DEPTH_FAIL : 0x0B95,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the current stencil fail function should the depth buffer test pass. Should return KEEP, REPLACE, INCR, DECR, INVERT, INCR_WRAP, or DECR_WRAP.
         */
        STENCIL_PASS_DEPTH_PASS : 0x0B96,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get the reference value used for stencil tests.
         */
        STENCIL_REF : 0x0B97,
        STENCIL_VALUE_MASK : 0x0B93,
        STENCIL_WRITEMASK : 0x0B98,
        STENCIL_BACK_FUNC : 0x8800,
        STENCIL_BACK_FAIL : 0x8801,
        STENCIL_BACK_PASS_DEPTH_FAIL : 0x8802,
        STENCIL_BACK_PASS_DEPTH_PASS : 0x8803,
        STENCIL_BACK_REF : 0x8CA3,
        STENCIL_BACK_VALUE_MASK : 0x8CA4,
        STENCIL_BACK_WRITEMASK : 0x8CA5,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get an Int32Array with four elements for the current viewport dimensions.
         */
        VIEWPORT : 0x0BA2,
        /**
         * Passed to [gl.getParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter}
         * to get an Int32Array with four elements for the current scissor box dimensions.
         */
        SCISSOR_BOX : 0x0C10,
        COLOR_CLEAR_VALUE : 0x0C22,
        COLOR_WRITEMASK : 0x0C23,
        UNPACK_ALIGNMENT : 0x0CF5,
        PACK_ALIGNMENT : 0x0D05,
        MAX_TEXTURE_SIZE : 0x0D33,
        MAX_VIEWPORT_DIMS : 0x0D3A,
        SUBPIXEL_BITS : 0x0D50,
        RED_BITS : 0x0D52,
        GREEN_BITS : 0x0D53,
        BLUE_BITS : 0x0D54,
        ALPHA_BITS : 0x0D55,
        DEPTH_BITS : 0x0D56,
        STENCIL_BITS : 0x0D57,
        POLYGON_OFFSET_UNITS : 0x2A00,
        POLYGON_OFFSET_FACTOR : 0x8038,
        TEXTURE_BINDING_2D : 0x8069,
        SAMPLE_BUFFERS : 0x80A8,
        SAMPLES : 0x80A9,
        SAMPLE_COVERAGE_VALUE : 0x80AA,
        SAMPLE_COVERAGE_INVERT : 0x80AB,
        COMPRESSED_TEXTURE_FORMATS : 0x86A3,
        /**
         * Passed to [gl.hint]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/hint}
         * There is no preference for this behavior.
         */
        DONT_CARE : 0x1100,
        /**
         * Passed to [gl.hint]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/hint}
         * The most efficient behavior should be used.
         */
        FASTEST : 0x1101,
        /**
         * Passed to [gl.hint]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/hint}
         * The most correct or the highest quality option should be used.
         */
        NICEST : 0x1102,
        /**
         * Passed to [gl.hint]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/hint}
         * for the quality of filtering when generating mipmap images with
         * [gl.generateMipmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/generateMipmap}.
         */
        GENERATE_MIPMAP_HINT : 0x8192,
        BYTE : 0x1400,
        UNSIGNED_BYTE : 0x1401,
        SHORT : 0x1402,
        UNSIGNED_SHORT : 0x1403,
        INT : 0x1404,
        UNSIGNED_INT : 0x1405,
        FLOAT : 0x1406,
        DEPTH_COMPONENT : 0x1902,
        ALPHA : 0x1906,
        RGB : 0x1907,
        RGBA : 0x1908,
        LUMINANCE : 0x1909,
        LUMINANCE_ALPHA : 0x190A,
        UNSIGNED_SHORT_4_4_4_4 : 0x8033,
        UNSIGNED_SHORT_5_5_5_1 : 0x8034,
        UNSIGNED_SHORT_5_6_5 : 0x8363,
        /**
         * Passed to [gl.createShader]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/createShader}
         * to define a fragment shader.
         */
        FRAGMENT_SHADER : 0x8B30,
        /**
         * Passed to [gl.createShader]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/createShader}
         * to define a vertex shader.
         */
        VERTEX_SHADER : 0x8B31,
        MAX_VERTEX_ATTRIBS : 0x8869,
        MAX_VERTEX_UNIFORM_VECTORS : 0x8DFB,
        MAX_VARYING_VECTORS : 0x8DFC,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS : 0x8B4D,
        MAX_VERTEX_TEXTURE_IMAGE_UNITS : 0x8B4C,
        MAX_TEXTURE_IMAGE_UNITS : 0x8872,
        MAX_FRAGMENT_UNIFORM_VECTORS : 0x8DFD,
        SHADER_TYPE : 0x8B4F,
        /**
         * Passed to [gl.getShaderParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getShaderParameter}
         * to determine if a shader was deleted via [gl.deleteShader]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/deleteShader}.
         */
        DELETE_STATUS : 0x8B80,
        /**
         * Passed to [gl.getProgramParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getProgramParameter}
         * after calling [gl.linkProgram]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/linkProgram}
         * to determine if a program was linked correctly.
         */
        LINK_STATUS : 0x8B82,
        /**
         * Passed to [gl.getProgramParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getProgramParameter}
         * after calling [gl.validateProgram]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/validateProgram}
         * to determine if it is valid.
         */
        VALIDATE_STATUS : 0x8B83,
        /**
         * Passed to [gl.getProgramParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getProgramParameter}
         * after calling [gl.attachShader]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/validateProgram}
         * to determine if the shader was attached correctly.
         */
        ATTACHED_SHADERS : 0x8B85,
        /**
         * Passed to [gl.getProgramParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getProgramParameter}
         * to get the number of uniforms active in a program.
          */
        ACTIVE_UNIFORMS : 0x8B86,
        /**
         * Passed to [gl.getProgramParameter]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getProgramParameter}
         * to get the number of attributes active in a program.
         */
        ACTIVE_ATTRIBUTES : 0x8B89,
        SHADING_LANGUAGE_VERSION : 0x8B8C,
        CURRENT_PROGRAM : 0x8B8D,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will never pass. i.e. Nothing will be drawn.
         */
        NEVER : 0x0200,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will pass if the new depth value is less than the stored value.
         */
        LESS : 0x0201,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will pass if the new depth value is equals to the stored value.
         */
        EQUAL : 0x0202,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will pass if the new depth value is less than or equal to the stored value.
         */
        LEQUAL : 0x0203,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will pass if the new depth value is greater than the stored value.
         */
        GREATER : 0x0204,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will pass if the new depth value is not equal to the stored value.
         */
        NOTEQUAL : 0x0205,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will pass if the new depth value is greater than or equal to the stored value.
         */
        GEQUAL : 0x0206,
        /**
         * Passed to [gl.depthFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc}
         * or [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * to specify depth or stencil tests will always pass. i.e. Pixels will be drawn in the order they are drawn.
         */
        ALWAYS : 0x0207,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to keep the current value when the stencil test fails.
         */
        KEEP : 0x1E00,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to set the stencil buffer value to the reference value as specified by
         * [gl.stencilFunc]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc}
         * when the stencil test fails.
         */
        REPLACE : 0x1E01,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to increment the current stencil buffer value when the stencil test fails. Clamps to the maximum representable unsigned value.
         */
        INCR : 0x1E02,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to decrement the current stencil buffer value when the stencil test fails. Clamps to zero.
         */
        DECR : 0x1E03,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to invert the current stencil buffer value bitwise when the stencil test fails.
         */
        INVERT : 0x150A,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to increment the current stencil buffer value when the stencil test fails. Wraps stencil buffer value to zero when incrementing the maximum representable unsigned value.
         */
        INCR_WRAP : 0x8507,
        /**
         * Passed to [gl.stencilOp]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp}
         * to decrement the current stencil buffer value when the stencil test fails. Wraps stencil buffer value to the maximum representable unsigned value when decrementing a stencil buffer value of zero.
         */
        DECR_WRAP : 0x8508,
        VENDOR : 0x1F00,
        RENDERER : 0x1F01,
        VERSION : 0x1F02,
        NEAREST : 0x2600,
        LINEAR : 0x2601,
        NEAREST_MIPMAP_NEAREST : 0x2700,
        LINEAR_MIPMAP_NEAREST : 0x2701,
        NEAREST_MIPMAP_LINEAR : 0x2702,
        LINEAR_MIPMAP_LINEAR : 0x2703,
        TEXTURE_MAG_FILTER : 0x2800,
        TEXTURE_MIN_FILTER : 0x2801,
        TEXTURE_WRAP_S : 0x2802,
        TEXTURE_WRAP_T : 0x2803,
        TEXTURE_2D : 0x0DE1,
        TEXTURE : 0x1702,
        TEXTURE_CUBE_MAP : 0x8513,
        TEXTURE_BINDING_CUBE_MAP : 0x8514,
        TEXTURE_CUBE_MAP_POSITIVE_X : 0x8515,
        TEXTURE_CUBE_MAP_NEGATIVE_X : 0x8516,
        TEXTURE_CUBE_MAP_POSITIVE_Y : 0x8517,
        TEXTURE_CUBE_MAP_NEGATIVE_Y : 0x8518,
        TEXTURE_CUBE_MAP_POSITIVE_Z : 0x8519,
        TEXTURE_CUBE_MAP_NEGATIVE_Z : 0x851A,
        MAX_CUBE_MAP_TEXTURE_SIZE : 0x851C,
        /**
         * Used to address texture units.
         */
        TEXTURE0 : 0x84C0,
        TEXTURE1 : 0x84C1,
        TEXTURE2 : 0x84C2,
        TEXTURE3 : 0x84C3,
        TEXTURE4 : 0x84C4,
        TEXTURE5 : 0x84C5,
        TEXTURE6 : 0x84C6,
        TEXTURE7 : 0x84C7,
        TEXTURE8 : 0x84C8,
        TEXTURE9 : 0x84C9,
        TEXTURE10 : 0x84CA,
        TEXTURE11 : 0x84CB,
        TEXTURE12 : 0x84CC,
        TEXTURE13 : 0x84CD,
        TEXTURE14 : 0x84CE,
        TEXTURE15 : 0x84CF,
        TEXTURE16 : 0x84D0,
        TEXTURE17 : 0x84D1,
        TEXTURE18 : 0x84D2,
        TEXTURE19 : 0x84D3,
        TEXTURE20 : 0x84D4,
        TEXTURE21 : 0x84D5,
        TEXTURE22 : 0x84D6,
        TEXTURE23 : 0x84D7,
        TEXTURE24 : 0x84D8,
        TEXTURE25 : 0x84D9,
        TEXTURE26 : 0x84DA,
        TEXTURE27 : 0x84DB,
        TEXTURE28 : 0x84DC,
        TEXTURE29 : 0x84DD,
        TEXTURE30 : 0x84DE,
        TEXTURE31 : 0x84DF,
        /**
         * Used to address the current active texture unit.
         */
        ACTIVE_TEXTURE : 0x84E0,
        REPEAT : 0x2901,
        CLAMP_TO_EDGE : 0x812F,
        MIRRORED_REPEAT : 0x8370,
        FLOAT_VEC2 : 0x8B50,
        FLOAT_VEC3 : 0x8B51,
        FLOAT_VEC4 : 0x8B52,
        INT_VEC2 : 0x8B53,
        INT_VEC3 : 0x8B54,
        INT_VEC4 : 0x8B55,
        BOOL : 0x8B56,
        BOOL_VEC2 : 0x8B57,
        BOOL_VEC3 : 0x8B58,
        BOOL_VEC4 : 0x8B59,
        FLOAT_MAT2 : 0x8B5A,
        FLOAT_MAT3 : 0x8B5B,
        FLOAT_MAT4 : 0x8B5C,
        SAMPLER_2D : 0x8B5E,
        SAMPLER_CUBE : 0x8B60,
        VERTEX_ATTRIB_ARRAY_ENABLED : 0x8622,
        VERTEX_ATTRIB_ARRAY_SIZE : 0x8623,
        VERTEX_ATTRIB_ARRAY_STRIDE : 0x8624,
        VERTEX_ATTRIB_ARRAY_TYPE : 0x8625,
        VERTEX_ATTRIB_ARRAY_NORMALIZED : 0x886A,
        VERTEX_ATTRIB_ARRAY_POINTER : 0x8645,
        VERTEX_ATTRIB_ARRAY_BUFFER_BINDING : 0x889F,
        IMPLEMENTATION_COLOR_READ_TYPE : 0x8B9A,
        IMPLEMENTATION_COLOR_READ_FORMAT : 0x8B9B,
        COMPILE_STATUS : 0x8B81,
        LOW_FLOAT : 0x8DF0,
        MEDIUM_FLOAT : 0x8DF1,
        HIGH_FLOAT : 0x8DF2,
        LOW_INT : 0x8DF3,
        MEDIUM_INT : 0x8DF4,
        HIGH_INT : 0x8DF5,
        FRAMEBUFFER : 0x8D40,
        RENDERBUFFER : 0x8D41,
        RGBA4 : 0x8056,
        RGB5_A1 : 0x8057,
        RGB565 : 0x8D62,
        DEPTH_COMPONENT16 : 0x81A5,
        STENCIL_INDEX : 0x1901,
        STENCIL_INDEX8 : 0x8D48,
        DEPTH_STENCIL : 0x84F9,
        RENDERBUFFER_WIDTH : 0x8D42,
        RENDERBUFFER_HEIGHT : 0x8D43,
        RENDERBUFFER_INTERNAL_FORMAT : 0x8D44,
        RENDERBUFFER_RED_SIZE : 0x8D50,
        RENDERBUFFER_GREEN_SIZE : 0x8D51,
        RENDERBUFFER_BLUE_SIZE : 0x8D52,
        RENDERBUFFER_ALPHA_SIZE : 0x8D53,
        RENDERBUFFER_DEPTH_SIZE : 0x8D54,
        RENDERBUFFER_STENCIL_SIZE : 0x8D55,
        FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE : 0x8CD0,
        FRAMEBUFFER_ATTACHMENT_OBJECT_NAME : 0x8CD1,
        FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL : 0x8CD2,
        FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE : 0x8CD3,
        COLOR_ATTACHMENT0 : 0x8CE0,
        DEPTH_ATTACHMENT : 0x8D00,
        STENCIL_ATTACHMENT : 0x8D20,
        DEPTH_STENCIL_ATTACHMENT : 0x821A,
        NONE : 0,
        FRAMEBUFFER_COMPLETE : 0x8CD5,
        FRAMEBUFFER_INCOMPLETE_ATTACHMENT : 0x8CD6,
        FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT : 0x8CD7,
        FRAMEBUFFER_INCOMPLETE_DIMENSIONS : 0x8CD9,
        FRAMEBUFFER_UNSUPPORTED : 0x8CDD,
        FRAMEBUFFER_BINDING : 0x8CA6,
        RENDERBUFFER_BINDING : 0x8CA7,
        MAX_RENDERBUFFER_SIZE : 0x84E8,
        INVALID_FRAMEBUFFER_OPERATION : 0x0506,
        UNPACK_FLIP_Y_WEBGL : 0x9240,
        UNPACK_PREMULTIPLY_ALPHA_WEBGL : 0x9241,
        CONTEXT_LOST_WEBGL : 0x9242,
        UNPACK_COLORSPACE_CONVERSION_WEBGL : 0x9243,
        BROWSER_DEFAULT_WEBGL : 0x9244,

        // Desktop OpenGL
        DOUBLE : 0x140A,

        // WebGL 2
        READ_BUFFER : 0x0C02,
        UNPACK_ROW_LENGTH : 0x0CF2,
        UNPACK_SKIP_ROWS : 0x0CF3,
        UNPACK_SKIP_PIXELS : 0x0CF4,
        PACK_ROW_LENGTH : 0x0D02,
        PACK_SKIP_ROWS : 0x0D03,
        PACK_SKIP_PIXELS : 0x0D04,
        COLOR : 0x1800,
        DEPTH : 0x1801,
        STENCIL : 0x1802,
        RED : 0x1903,
        RGB8 : 0x8051,
        RGBA8 : 0x8058,
        RGB10_A2 : 0x8059,
        TEXTURE_BINDING_3D : 0x806A,
        UNPACK_SKIP_IMAGES : 0x806D,
        UNPACK_IMAGE_HEIGHT : 0x806E,
        TEXTURE_3D : 0x806F,
        TEXTURE_WRAP_R : 0x8072,
        MAX_3D_TEXTURE_SIZE : 0x8073,
        UNSIGNED_INT_2_10_10_10_REV : 0x8368,
        MAX_ELEMENTS_VERTICES : 0x80E8,
        MAX_ELEMENTS_INDICES : 0x80E9,
        TEXTURE_MIN_LOD : 0x813A,
        TEXTURE_MAX_LOD : 0x813B,
        TEXTURE_BASE_LEVEL : 0x813C,
        TEXTURE_MAX_LEVEL : 0x813D,
        MIN : 0x8007,
        MAX : 0x8008,
        DEPTH_COMPONENT24 : 0x81A6,
        MAX_TEXTURE_LOD_BIAS : 0x84FD,
        TEXTURE_COMPARE_MODE : 0x884C,
        TEXTURE_COMPARE_FUNC : 0x884D,
        CURRENT_QUERY : 0x8865,
        QUERY_RESULT : 0x8866,
        QUERY_RESULT_AVAILABLE : 0x8867,
        STREAM_READ : 0x88E1,
        STREAM_COPY : 0x88E2,
        STATIC_READ : 0x88E5,
        STATIC_COPY : 0x88E6,
        DYNAMIC_READ : 0x88E9,
        DYNAMIC_COPY : 0x88EA,
        MAX_DRAW_BUFFERS : 0x8824,
        DRAW_BUFFER0 : 0x8825,
        DRAW_BUFFER1 : 0x8826,
        DRAW_BUFFER2 : 0x8827,
        DRAW_BUFFER3 : 0x8828,
        DRAW_BUFFER4 : 0x8829,
        DRAW_BUFFER5 : 0x882A,
        DRAW_BUFFER6 : 0x882B,
        DRAW_BUFFER7 : 0x882C,
        DRAW_BUFFER8 : 0x882D,
        DRAW_BUFFER9 : 0x882E,
        DRAW_BUFFER10 : 0x882F,
        DRAW_BUFFER11 : 0x8830,
        DRAW_BUFFER12 : 0x8831,
        DRAW_BUFFER13 : 0x8832,
        DRAW_BUFFER14 : 0x8833,
        DRAW_BUFFER15 : 0x8834,
        MAX_FRAGMENT_UNIFORM_COMPONENTS : 0x8B49,
        MAX_VERTEX_UNIFORM_COMPONENTS : 0x8B4A,
        SAMPLER_3D : 0x8B5F,
        SAMPLER_2D_SHADOW : 0x8B62,
        FRAGMENT_SHADER_DERIVATIVE_HINT : 0x8B8B,
        PIXEL_PACK_BUFFER : 0x88EB,
        PIXEL_UNPACK_BUFFER : 0x88EC,
        PIXEL_PACK_BUFFER_BINDING : 0x88ED,
        PIXEL_UNPACK_BUFFER_BINDING : 0x88EF,
        FLOAT_MAT2x3 : 0x8B65,
        FLOAT_MAT2x4 : 0x8B66,
        FLOAT_MAT3x2 : 0x8B67,
        FLOAT_MAT3x4 : 0x8B68,
        FLOAT_MAT4x2 : 0x8B69,
        FLOAT_MAT4x3 : 0x8B6A,
        SRGB : 0x8C40,
        SRGB8 : 0x8C41,
        SRGB8_ALPHA8 : 0x8C43,
        COMPARE_REF_TO_TEXTURE : 0x884E,
        RGBA32F : 0x8814,
        RGB32F : 0x8815,
        RGBA16F : 0x881A,
        RGB16F : 0x881B,
        VERTEX_ATTRIB_ARRAY_INTEGER : 0x88FD,
        MAX_ARRAY_TEXTURE_LAYERS : 0x88FF,
        MIN_PROGRAM_TEXEL_OFFSET : 0x8904,
        MAX_PROGRAM_TEXEL_OFFSET : 0x8905,
        MAX_VARYING_COMPONENTS : 0x8B4B,
        TEXTURE_2D_ARRAY : 0x8C1A,
        TEXTURE_BINDING_2D_ARRAY : 0x8C1D,
        R11F_G11F_B10F : 0x8C3A,
        UNSIGNED_INT_10F_11F_11F_REV : 0x8C3B,
        RGB9_E5 : 0x8C3D,
        UNSIGNED_INT_5_9_9_9_REV : 0x8C3E,
        TRANSFORM_FEEDBACK_BUFFER_MODE : 0x8C7F,
        MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS : 0x8C80,
        TRANSFORM_FEEDBACK_VARYINGS : 0x8C83,
        TRANSFORM_FEEDBACK_BUFFER_START : 0x8C84,
        TRANSFORM_FEEDBACK_BUFFER_SIZE : 0x8C85,
        TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN : 0x8C88,
        RASTERIZER_DISCARD : 0x8C89,
        MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS : 0x8C8A,
        MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS : 0x8C8B,
        INTERLEAVED_ATTRIBS : 0x8C8C,
        SEPARATE_ATTRIBS : 0x8C8D,
        TRANSFORM_FEEDBACK_BUFFER : 0x8C8E,
        TRANSFORM_FEEDBACK_BUFFER_BINDING : 0x8C8F,
        RGBA32UI : 0x8D70,
        RGB32UI : 0x8D71,
        RGBA16UI : 0x8D76,
        RGB16UI : 0x8D77,
        RGBA8UI : 0x8D7C,
        RGB8UI : 0x8D7D,
        RGBA32I : 0x8D82,
        RGB32I : 0x8D83,
        RGBA16I : 0x8D88,
        RGB16I : 0x8D89,
        RGBA8I : 0x8D8E,
        RGB8I : 0x8D8F,
        RED_INTEGER : 0x8D94,
        RGB_INTEGER : 0x8D98,
        RGBA_INTEGER : 0x8D99,
        SAMPLER_2D_ARRAY : 0x8DC1,
        SAMPLER_2D_ARRAY_SHADOW : 0x8DC4,
        SAMPLER_CUBE_SHADOW : 0x8DC5,
        UNSIGNED_INT_VEC2 : 0x8DC6,
        UNSIGNED_INT_VEC3 : 0x8DC7,
        UNSIGNED_INT_VEC4 : 0x8DC8,
        INT_SAMPLER_2D : 0x8DCA,
        INT_SAMPLER_3D : 0x8DCB,
        INT_SAMPLER_CUBE : 0x8DCC,
        INT_SAMPLER_2D_ARRAY : 0x8DCF,
        UNSIGNED_INT_SAMPLER_2D : 0x8DD2,
        UNSIGNED_INT_SAMPLER_3D : 0x8DD3,
        UNSIGNED_INT_SAMPLER_CUBE : 0x8DD4,
        UNSIGNED_INT_SAMPLER_2D_ARRAY : 0x8DD7,
        DEPTH_COMPONENT32F : 0x8CAC,
        DEPTH32F_STENCIL8 : 0x8CAD,
        FLOAT_32_UNSIGNED_INT_24_8_REV : 0x8DAD,
        FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING : 0x8210,
        FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE : 0x8211,
        FRAMEBUFFER_ATTACHMENT_RED_SIZE : 0x8212,
        FRAMEBUFFER_ATTACHMENT_GREEN_SIZE : 0x8213,
        FRAMEBUFFER_ATTACHMENT_BLUE_SIZE : 0x8214,
        FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE : 0x8215,
        FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE : 0x8216,
        FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE : 0x8217,
        FRAMEBUFFER_DEFAULT : 0x8218,
        UNSIGNED_INT_24_8 : 0x84FA,
        DEPTH24_STENCIL8 : 0x88F0,
        UNSIGNED_NORMALIZED : 0x8C17,
        DRAW_FRAMEBUFFER_BINDING : 0x8CA6, // Same as FRAMEBUFFER_BINDING
        READ_FRAMEBUFFER : 0x8CA8,
        DRAW_FRAMEBUFFER : 0x8CA9,
        READ_FRAMEBUFFER_BINDING : 0x8CAA,
        RENDERBUFFER_SAMPLES : 0x8CAB,
        FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER : 0x8CD4,
        /**
         * Maximum number of framebuffer color attachment points.
         */
        MAX_COLOR_ATTACHMENTS : 0x8CDF,
        COLOR_ATTACHMENT1 : 0x8CE1,
        COLOR_ATTACHMENT2 : 0x8CE2,
        COLOR_ATTACHMENT3 : 0x8CE3,
        COLOR_ATTACHMENT4 : 0x8CE4,
        COLOR_ATTACHMENT5 : 0x8CE5,
        COLOR_ATTACHMENT6 : 0x8CE6,
        COLOR_ATTACHMENT7 : 0x8CE7,
        COLOR_ATTACHMENT8 : 0x8CE8,
        COLOR_ATTACHMENT9 : 0x8CE9,
        COLOR_ATTACHMENT10 : 0x8CEA,
        COLOR_ATTACHMENT11 : 0x8CEB,
        COLOR_ATTACHMENT12 : 0x8CEC,
        COLOR_ATTACHMENT13 : 0x8CED,
        COLOR_ATTACHMENT14 : 0x8CEE,
        COLOR_ATTACHMENT15 : 0x8CEF,
        FRAMEBUFFER_INCOMPLETE_MULTISAMPLE : 0x8D56,
        MAX_SAMPLES : 0x8D57,
        HALF_FLOAT : 0x140B,
        RG : 0x8227,
        RG_INTEGER : 0x8228,
        R8 : 0x8229,
        RG8 : 0x822B,
        R16F : 0x822D,
        R32F : 0x822E,
        RG16F : 0x822F,
        RG32F : 0x8230,
        R8I : 0x8231,
        R8UI : 0x8232,
        R16I : 0x8233,
        R16UI : 0x8234,
        R32I : 0x8235,
        R32UI : 0x8236,
        RG8I : 0x8237,
        RG8UI : 0x8238,
        RG16I : 0x8239,
        RG16UI : 0x823A,
        RG32I : 0x823B,
        RG32UI : 0x823C,
        VERTEX_ARRAY_BINDING : 0x85B5,
        R8_SNORM : 0x8F94,
        RG8_SNORM : 0x8F95,
        RGB8_SNORM : 0x8F96,
        RGBA8_SNORM : 0x8F97,
        SIGNED_NORMALIZED : 0x8F9C,
        COPY_READ_BUFFER : 0x8F36,
        COPY_WRITE_BUFFER : 0x8F37,
        COPY_READ_BUFFER_BINDING : 0x8F36, // Same as COPY_READ_BUFFER
        COPY_WRITE_BUFFER_BINDING : 0x8F37, // Same as COPY_WRITE_BUFFER
        UNIFORM_BUFFER : 0x8A11,
        UNIFORM_BUFFER_BINDING : 0x8A28,
        UNIFORM_BUFFER_START : 0x8A29,
        UNIFORM_BUFFER_SIZE : 0x8A2A,
        MAX_VERTEX_UNIFORM_BLOCKS : 0x8A2B,
        MAX_FRAGMENT_UNIFORM_BLOCKS : 0x8A2D,
        MAX_COMBINED_UNIFORM_BLOCKS : 0x8A2E,
        MAX_UNIFORM_BUFFER_BINDINGS : 0x8A2F,
        MAX_UNIFORM_BLOCK_SIZE : 0x8A30,
        MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS : 0x8A31,
        MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS : 0x8A33,
        UNIFORM_BUFFER_OFFSET_ALIGNMENT : 0x8A34,
        ACTIVE_UNIFORM_BLOCKS : 0x8A36,
        UNIFORM_TYPE : 0x8A37,
        UNIFORM_SIZE : 0x8A38,
        UNIFORM_BLOCK_INDEX : 0x8A3A,
        UNIFORM_OFFSET : 0x8A3B,
        UNIFORM_ARRAY_STRIDE : 0x8A3C,
        UNIFORM_MATRIX_STRIDE : 0x8A3D,
        UNIFORM_IS_ROW_MAJOR : 0x8A3E,
        UNIFORM_BLOCK_BINDING : 0x8A3F,
        UNIFORM_BLOCK_DATA_SIZE : 0x8A40,
        UNIFORM_BLOCK_ACTIVE_UNIFORMS : 0x8A42,
        UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES : 0x8A43,
        UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER : 0x8A44,
        UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER : 0x8A46,
        INVALID_INDEX : 0xFFFFFFFF,
        MAX_VERTEX_OUTPUT_COMPONENTS : 0x9122,
        MAX_FRAGMENT_INPUT_COMPONENTS : 0x9125,
        MAX_SERVER_WAIT_TIMEOUT : 0x9111,
        OBJECT_TYPE : 0x9112,
        SYNC_CONDITION : 0x9113,
        SYNC_STATUS : 0x9114,
        SYNC_FLAGS : 0x9115,
        SYNC_FENCE : 0x9116,
        SYNC_GPU_COMMANDS_COMPLETE : 0x9117,
        UNSIGNALED : 0x9118,
        SIGNALED : 0x9119,
        ALREADY_SIGNALED : 0x911A,
        TIMEOUT_EXPIRED : 0x911B,
        CONDITION_SATISFIED : 0x911C,
        WAIT_FAILED : 0x911D,
        SYNC_FLUSH_COMMANDS_BIT : 0x00000001,
        VERTEX_ATTRIB_ARRAY_DIVISOR : 0x88FE,
        ANY_SAMPLES_PASSED : 0x8C2F,
        ANY_SAMPLES_PASSED_CONSERVATIVE : 0x8D6A,
        SAMPLER_BINDING : 0x8919,
        RGB10_A2UI : 0x906F,
        INT_2_10_10_10_REV : 0x8D9F,
        TRANSFORM_FEEDBACK : 0x8E22,
        TRANSFORM_FEEDBACK_PAUSED : 0x8E23,
        TRANSFORM_FEEDBACK_ACTIVE : 0x8E24,
        TRANSFORM_FEEDBACK_BINDING : 0x8E25,
        COMPRESSED_R11_EAC : 0x9270,
        COMPRESSED_SIGNED_R11_EAC : 0x9271,
        COMPRESSED_RG11_EAC : 0x9272,
        COMPRESSED_SIGNED_RG11_EAC : 0x9273,
        COMPRESSED_RGB8_ETC2 : 0x9274,
        COMPRESSED_SRGB8_ETC2 : 0x9275,
        COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 : 0x9276,
        COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 : 0x9277,
        COMPRESSED_RGBA8_ETC2_EAC : 0x9278,
        COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : 0x9279,
        TEXTURE_IMMUTABLE_FORMAT : 0x912F,
        MAX_ELEMENT_INDEX : 0x8D6B,
        TEXTURE_IMMUTABLE_LEVELS : 0x82DF
    };

    return freezeObject(WebGLConstants);
});
