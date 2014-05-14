/*global define*/
define([
        './defaultValue',
        './defined',
        './ComponentDatatype',
        './DeveloperError'
    ], function(
        defaultValue,
        defined,
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
     * var instance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.BoxGeometry({
     *     vertexFormat : Cesium.VertexFormat.POSITION_AND_NORMAL,
     *     dimensions : new Cesium.Cartesian3(1000000.0, 1000000.0, 500000.0)
     *   }),
     *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883))), new Cesium.Cartesian3(0.0, 0.0, 1000000.0)),
     *   id : 'box',
     *   attributes : {
     *     show : new Cesium.ShowGeometryInstanceAttribute(false)
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
     * @param {Uint8Array} [result] The array to store the result in, if undefined a new instance will be created.
     *
     * @returns {Uint8Array} The modified result parameter or a new instance if result was undefined.
     *
     * @example
     * var attributes = primitive.getGeometryInstanceAttributes('an id');
     * attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true, attributes.show);
     */
    ShowGeometryInstanceAttribute.toValue = function(show, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(show)) {
            throw new DeveloperError('show is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            return new Uint8Array([show]);
        }
        result[0] = show;
        return result;
    };

    return ShowGeometryInstanceAttribute;
});
