/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias GeometryAttribute
     * @constructor
     *
     * @example
     * var geometry = new Geometry({
     *   attributes : {
     *     position : new GeometryAttribute({
     *       componentDatatype : ComponentDatatype.FLOAT,
     *       componentsPerAttribute : 3,
     *       values : [
     *         0.0, 0.0, 0.0,
     *         7500000.0, 0.0, 0.0,
     *         0.0, 7500000.0, 0.0
     *       ]
     *     })
     *   },
     *   primitiveType : PrimitiveType.LINE_LOOP
     * });
     */
    var GeometryAttribute = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@see GeometryAttribute#values}.
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
         * attribute.componentDatatype : ComponentDatatype.FLOAT,
         * attribute.componentsPerAttribute : 3,
         * attribute.values = new Float32Array([
         *   0.0, 0.0, 0.0,
         *   7500000.0, 0.0, 0.0,
         *   0.0, 7500000.0, 0.0
         * ]);
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
         * attribute.values = new Uint8Array([
         *   Color.floatToByte(color.red)
         *   Color.floatToByte(color.green)
         *   Color.floatToByte(color.blue)
         *   Color.floatToByte(color.alpha)
         * ]);
         */
        this.normalize = defaultValue(options.normalize, false);

        /**
         * The values for the attributes stored in a typed array.  In the code example,
         * every three elements in <code>values</code> defines one attributes since
         * <code>componentsPerAttribute</code> is 3.
         *
         * @type Array
         *
         * @default undefined
         *
         * @example
         * attribute.componentDatatype : ComponentDatatype.FLOAT,
         * attribute.componentsPerAttribute : 3,
         * attribute.values = new Float32Array([
         *   0.0, 0.0, 0.0,
         *   7500000.0, 0.0, 0.0,
         *   0.0, 7500000.0, 0.0
         * ]);
         */
        this.values = options.values;
    };

    /**
     * DOC_TBA
     */
    GeometryAttribute.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new GeometryAttribute();
        }

        result.componentDatatype = this.componentDatatype;              // Shallow copy enum
        result.componentsPerAttribute = this.componentsPerAttribute;
        result.normalize = this.normalize;
        result.values = new this.values.constructor(this.values);

        return result;
    };

    return GeometryAttribute;
});
