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
     *     color : new ColorGeometryInstanceAttribute(red, green, blue, alpha)
     *   }
     * });
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     */
    var ColorGeometryInstanceAttribute = function(red, green, blue, alpha) {
        red = defaultValue(red, 1.0);
        green = defaultValue(green, 1.0);
        blue = defaultValue(blue, 1.0);
        alpha = defaultValue(alpha, 1.0);

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
        this.value = [
            Color.floatToByte(red),
            Color.floatToByte(green),
            Color.floatToByte(blue),
            Color.floatToByte(alpha)
        ];
    };

    /**
     * DOC_TBA
     */
    ColorGeometryInstanceAttribute.fromColor = function(color) {
        return new ColorGeometryInstanceAttribute(color.red, color.green, color.blue, color.alpha);
    };

    /**
     * DOC_TBA
     */
    ColorGeometryInstanceAttribute.toValue = function(color) {
        return color.toBytes();
    };

    return ColorGeometryInstanceAttribute;
});
