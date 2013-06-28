/*global define*/
define([
        './defaultValue',
        './Color',
        './ComponentDatatype'
    ], function(
        defaultValue,
        Color,
        ComponentDatatype) {
    "use strict";

    var defaultColor = new Color(1.0, 0.0, 0.0, 0.5);

    /**
     * Value and type information for per-instance geometry color.
     *
     * @alias ColorGeometryInstanceAttribute
     * @constructor
     *
     * @param {Color} [color=new Color(1.0, 0.0, 0.0, 0.5)] The color of the geometry instance.
     *
     * @example
     * var instance = new GeometryInstance({
     *   geometry : new BoxGeometry({
     *     dimensions : new Cartesian3(1000000.0, 1000000.0, 500000.0)
     *   }),
     *   modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-0.0, 0.0))), new Cartesian3(0.0, 0.0, 1000000.0)),
     *   id : 'box',
     *   attributes : {
     *     color : new ColorGeometryInstanceAttribute(Color.AQUA)
     *   }
     * });
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     */
    var ColorGeometryInstanceAttribute = function(color) {
        color = defaultValue(color, defaultColor);

        /**
         * DOC_TBA
         */
        this.componentDatatype = ComponentDatatype.UNSIGNED_BYTE;

        /**
         * DOC_TBA
         */
        this.componentsPerAttribute = 4;

        /**
         * DOC_TBA
         */
        this.normalize = true;

        /**
         * DOC_TBA
         */
        this.value = ColorGeometryInstanceAttribute.toValue(color);
    };

    /**
     * DOC_TBA
     */
    ColorGeometryInstanceAttribute.toValue = function(color) {
        return [
            Color.floatToByte(color.red),
            Color.floatToByte(color.green),
            Color.floatToByte(color.blue),
            Color.floatToByte(color.alpha)
        ];
    };

    return ColorGeometryInstanceAttribute;
});
