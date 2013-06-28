/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Values and type information for per-instance geometry attributes.
     *
     * @alias GeometryInstanceAttribute
     * @constructor
     *
     * @param {ComponentDatatype} [options.componentDatatype=undefined] The datatype of each component in the attribute, e.g., individual elements in values.
     * @param {Number} [options.componentsPerAttribute=undefined] A number between 1 and 4 that defines the number of components in an attributes.
     * @param {Boolean} [options.normalize=false] When <code>true</code> and <code>componentDatatype</code> is an integer format, indicate that the components should be mapped to the range [0, 1] (unsigned) or [-1, 1] (signed) when they are accessed as floating-point for rendering.
     * @param {Array} [options.value=undefined] The value for the attribute.
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
     *       color : new GeometryInstanceAttribute({
     *         componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
     *         componentsPerAttribute : 4,
     *         normalize : true,
     *         value : [255, 255, 0 255]
     *       }
     *   }
     * });
     *
     * @see ColorGeometryInstanceAttribute
     * @see ShowGeometryInstanceAttribute
     */
    var GeometryInstanceAttribute = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@see GeometryInstanceAttribute#value}.
         *
         * @type ComponentDatatype
         *
         * @default undefined
         */
        this.componentDatatype = options.componentDatatype;

        /**
         * A number between 1 and 4 that defines the number of components in an attributes.
         * For example, a position attribute with x, y, and z components would have 3 as
         * shown in the code example.
         *
         * @type Number
         *
         * @default undefined
         *
         * @example
         * show : new GeometryInstanceAttribute({
         *   componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
         *   componentsPerAttribute : 1,
         *   normalize : true,
         *   value : 1.0
         * }
         */
        this.componentsPerAttribute = options.componentsPerAttribute;

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         * <p>
         * This is commonly used when storing colors using {@ ComponentDatatype.UNSIGNED_BYTE}.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         *
         * @example
         * attribute.componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
         * attribute.componentsPerAttribute : 4,
         * attribute.normalize = true;
         * attribute.value = [
         *   Color.floatToByte(color.red)
         *   Color.floatToByte(color.green)
         *   Color.floatToByte(color.blue)
         *   Color.floatToByte(color.alpha)
         * ];
         */
        this.normalize = defaultValue(options.normalize, false);

        /**
         * The values for the attributes stored in a typed array.  In the code example,
         * every three elements in <code>values</code> defines one attributes since
         * <code>componentsPerAttribute</code> is 3.
         *
         * @default undefined
         *
         * @example
         * show : new GeometryInstanceAttribute({
         *   componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
         *   componentsPerAttribute : 1,
         *   normalize : true,
         *   value : [1.0]
         * }
         */
        this.value = options.value;
    };

    /**
     * Duplicates a GeometryInstanceAttribute instance.
     *
     * @param {GeometryInstanceAttribute} instanceAttribute The per-instance attribute to clone.
     * @param {GeometryInstanceAttribute} [result] The object onto which to store the result.
     *
     * @return {GeometryInstanceAttribute} The modified result parameter or a new GeometryInstanceAttribute instance if one was not provided.
     */
    GeometryInstanceAttribute.clone = function(instanceAttribute, result) {
        if (typeof result === 'undefined') {
            result = new GeometryInstanceAttribute();
        }

        result.componentDatatype = instanceAttribute.componentDatatype;
        result.componentsPerAttribute = instanceAttribute.componentsPerAttribute;
        result.normalize = instanceAttribute.normalize;
        result.value = new instanceAttribute.value.constructor(instanceAttribute.value);

        return result;
    };

    return GeometryInstanceAttribute;
});
