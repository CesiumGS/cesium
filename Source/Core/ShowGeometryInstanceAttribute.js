/*global define*/
define([
        './defaultValue',
        './ComponentDatatype',
        './DeveloperError'
    ], function(
        defaultValue,
        ComponentDatatype,
        DeveloperError) {
    "use strict";

    /**
     * Value and type information for per-instance geometry attribute that determines if the geometry instance will be shown.
     *
     * @alias ShowGeometryInstanceAttribute
     * @constructor
     *
     * @param {Boolean} [show=true] Determines if the geometry instance will be shown.
     *
     * @example
     * var instance = new GeometryInstance({
     *   geometry : new BoxGeometry({
     *     vertexFormat : VertexFormat.POSITION_AND_NORMAL,
     *     dimensions : new Cartesian3(1000000.0, 1000000.0, 500000.0)
     *   }),
     *   modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 1000000.0)),
     *   id : 'box',
     *   attributes : {
     *     show : new ShowGeometryInstanceAttribute(false)
     *   }
     * });
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     */
    var ShowGeometryInstanceAttribute = function(show) {
        show = defaultValue(show, true);

        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link ShowGeometryInstanceAttribute#value}.
         *
         * @type ComponentDatatype
         *
         * @default {@link ComponentDatatype.UNSIGNED_BYTE}
         *
         * @readonly
         */
        this.componentDatatype = ComponentDatatype.UNSIGNED_BYTE;

        /**
         * The number of components in the attributes, i.e., {@link ShowGeometryInstanceAttribute#value}.
         *
         * @type Number
         *
         * @default 1
         *
         * @readonly
         */
        this.componentsPerAttribute = 1;

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         *
         * @type Boolean
         *
         * @default true
         *
         * @readonly
         */
        this.normalize = true;

        /**
         * The values for the attributes stored in a typed array.
         *
         * @type Uint8Array
         *
         * @default [1.0]
         */
        this.value = ShowGeometryInstanceAttribute.toValue(show);
    };

    /**
     * Converts a boolean show to a typed array that can be used to assign a show attribute.
     *
     * @param {Boolean} show The show value.
     *
     * @returns {Uint8Array} The typed array in the attribute's format.
     *
     * @exception {DeveloperError} show is required.
     *
     * @example
     * var attributes = primitive.getGeometryInstanceAttributes('an id');
     * attributes.show = ShowGeometryInstanceAttribute.toValue(true);
     */
    ShowGeometryInstanceAttribute.toValue = function(show) {
        if (typeof show === 'undefined') {
            throw new DeveloperError('show is required.');
        }

        return new Uint8Array([show]);
    };

    return ShowGeometryInstanceAttribute;
});
