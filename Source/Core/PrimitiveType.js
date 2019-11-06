import freezeObject from './freezeObject.js';
import WebGLConstants from './WebGLConstants.js';

    /**
     * The type of a geometric primitive, i.e., points, lines, and triangles.
     *
     * @exports PrimitiveType
     */
    var PrimitiveType = {
        /**
         * Points primitive where each vertex (or index) is a separate point.
         *
         * @type {Number}
         * @constant
         */
        POINTS : WebGLConstants.POINTS,

        /**
         * Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
         *
         * @type {Number}
         * @constant
         */
        LINES : WebGLConstants.LINES,

        /**
         * Line loop primitive where each vertex (or index) after the first connects a line to
         * the previous vertex, and the last vertex implicitly connects to the first.
         *
         * @type {Number}
         * @constant
         */
        LINE_LOOP : WebGLConstants.LINE_LOOP,

        /**
         * Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
         *
         * @type {Number}
         * @constant
         */
        LINE_STRIP : WebGLConstants.LINE_STRIP,

        /**
         * Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLES : WebGLConstants.TRIANGLES,

        /**
         * Triangle strip primitive where each vertex (or index) after the first two connect to
         * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLE_STRIP : WebGLConstants.TRIANGLE_STRIP,

        /**
         * Triangle fan primitive where each vertex (or index) after the first two connect to
         * the previous vertex and the first vertex forming a triangle.  For example, this can be used
         * to model a cone or circle.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLE_FAN : WebGLConstants.TRIANGLE_FAN,

        /**
         * @private
         */
        validate : function(primitiveType) {
            return primitiveType === PrimitiveType.POINTS ||
                   primitiveType === PrimitiveType.LINES ||
                   primitiveType === PrimitiveType.LINE_LOOP ||
                   primitiveType === PrimitiveType.LINE_STRIP ||
                   primitiveType === PrimitiveType.TRIANGLES ||
                   primitiveType === PrimitiveType.TRIANGLE_STRIP ||
                   primitiveType === PrimitiveType.TRIANGLE_FAN;
        }
    };
export default freezeObject(PrimitiveType);
