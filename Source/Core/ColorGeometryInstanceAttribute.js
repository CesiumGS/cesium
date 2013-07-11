/*global define*/
define([
        './defaultValue',
        './Color',
        './ComponentDatatype',
        './DeveloperError'
    ], function(
        defaultValue,
        Color,
        ComponentDatatype,
        DeveloperError) {
    "use strict";

    /**
     * Value and type information for per-instance geometry color.
     *
     * @alias ColorGeometryInstanceAttribute
     * @constructor
     *
     * @param {Number} [red=1.0] The red component.
     * @param {Number} [green=1.0] The green component.
     * @param {Number} [blue=1.0] The blue component.
     * @param {Number} [alpha=1.0] The alpha component.
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
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link ColorGeometryInstanceAttribute#value}.
         *
         * @type ComponentDatatype
         *
         * @default {@link ComponentDatatype.UNSIGNED_BYTE}
         *
         * @readonly
         */
        this.componentDatatype = ComponentDatatype.UNSIGNED_BYTE;

        /**
         * The number of components in the attributes, i.e., {@link ColorGeometryInstanceAttribute#value}.
         *
         * @type Number
         *
         * @default 4
         *
         * @readonly
         */
        this.componentsPerAttribute = 4;

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
         * @default [255, 255, 255, 255]
         */
        this.value = new Uint8Array([
            Color.floatToByte(red),
            Color.floatToByte(green),
            Color.floatToByte(blue),
            Color.floatToByte(alpha)
        ]);
    };

    /**
     * Creates a new {@link ColorGeometryInstanceAttribute} instance given the provided {@link Color}.
     *
     * @param {Color} color The color.
     *
     * @returns {ColorGeometryInstanceAttribute} The new {@link ColorGeometryInstanceAttribute} instance.
     *
     * @exception {DeveloperError} color is required.
     *
     * @example
     * var instance = new GeometryInstance({
     *   geometry : // ...
     *   attributes : {
     *     color : ColorGeometryInstanceAttribute.fromColor(Color.CORNFLOWERBLUE),
     *   }
     * });
     */
    ColorGeometryInstanceAttribute.fromColor = function(color) {
        if (typeof color === 'undefined') {
            throw new DeveloperError('color is required.');
        }

        return new ColorGeometryInstanceAttribute(color.red, color.green, color.blue, color.alpha);
    };

    /**
     * Converts a color to a typed array that can be used to assign a color attribute.
     *
     * @param {Color} color The color.
     *
     * @returns {Uint8Array} The typed array in the attribute's format.
     *
     * @exception {DeveloperError} color is required.
     *
     * @example
     * var attributes = primitive.getGeometryInstanceAttributes('an id');
     * attributes.color = ColorGeometryInstanceAttribute.toValue(Color.AQUA);
     */
    ColorGeometryInstanceAttribute.toValue = function(color) {
        if (typeof color === 'undefined') {
            throw new DeveloperError('color is required.');
        }

        return new Uint8Array(color.toBytes());
    };

    return ColorGeometryInstanceAttribute;
});
