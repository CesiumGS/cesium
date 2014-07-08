/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * The type of a geometric primitive, i.e., points, lines, and triangles.
     *
     * @namespace
     * @alias PrimitiveType
     */
    var PrimitiveType = {
        /**
         * 0x0000.  Points primitive where each vertex (or index) is a separate point.
         *
         * @type {Number}
         * @constant
         */
        POINTS : 0x0000,

        /**
         * 0x0001.  Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
         *
         * @type {Number}
         * @constant
         */
        LINES : 0x0001,

        /**
         * 0x0002.  Line loop primitive where each vertex (or index) after the first connects a line to
         * the previous vertex, and the last vertex implicitly connects to the first.
         *
         * @type {Number}
         * @constant
         */
        LINE_LOOP : 0x0002,

        /**
         * 0x0003.  Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
         *
         * @type {Number}
         * @constant
         */
        LINE_STRIP : 0x0003,

        /**
         * 0x0004.  Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLES : 0x0004,

        /**
         * 0x0005.  Triangle strip primitive where each vertex (or index) after the first two connect to
         * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLE_STRIP : 0x0005,

        /**
         * 0x0006.  Triangle fan primitive where each vertex (or index) after the first two connect to
         * the previous vertex and the first vertex forming a triangle.  For example, this can be used
         * to model a cone or circle.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLE_FAN : 0x0006,

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

    return freezeObject(PrimitiveType);
});
