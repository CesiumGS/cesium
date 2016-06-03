/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError) {
    'use strict';

    /**
     * Values and type information for geometry attributes.  A {@link Geometry}
     * generally contains one or more attributes.  All attributes together form
     * the geometry's vertices.
     *
     * @alias GeometryAttribute
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {ComponentDatatype} [options.componentDatatype] The datatype of each component in the attribute, e.g., individual elements in values.
     * @param {Number} [options.componentsPerAttribute] A number between 1 and 4 that defines the number of components in an attributes.
     * @param {Boolean} [options.normalize=false] When <code>true</code> and <code>componentDatatype</code> is an integer format, indicate that the components should be mapped to the range [0, 1] (unsigned) or [-1, 1] (signed) when they are accessed as floating-point for rendering.
     * @param {TypedArray} [options.values] The values for the attributes stored in a typed array.
     *
     * @exception {DeveloperError} options.componentsPerAttribute must be between 1 and 4.
     *
     *
     * @example
     * var geometry = new Cesium.Geometry({
     *   attributes : {
     *     position : new Cesium.GeometryAttribute({
     *       componentDatatype : Cesium.ComponentDatatype.FLOAT,
     *       componentsPerAttribute : 3,
     *       values : new Float32Array([
     *         0.0, 0.0, 0.0,
     *         7500000.0, 0.0, 0.0,
     *         0.0, 7500000.0, 0.0
     *       ])
     *     })
     *   },
     *   primitiveType : Cesium.PrimitiveType.LINE_LOOP
     * });
     * 
     * @see Geometry
     */
    function GeometryAttribute(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.componentDatatype)) {
            throw new DeveloperError('options.componentDatatype is required.');
        }
        if (!defined(options.componentsPerAttribute)) {
            throw new DeveloperError('options.componentsPerAttribute is required.');
        }
        if (options.componentsPerAttribute < 1 || options.componentsPerAttribute > 4) {
            throw new DeveloperError('options.componentsPerAttribute must be between 1 and 4.');
        }
        if (!defined(options.values)) {
            throw new DeveloperError('options.values is required.');
        }
        //>>includeEnd('debug');

        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link GeometryAttribute#values}.
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
         * attribute.componentDatatype = Cesium.ComponentDatatype.FLOAT;
         * attribute.componentsPerAttribute = 3;
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
         * This is commonly used when storing colors using {@link ComponentDatatype.UNSIGNED_BYTE}.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         *
         * @example
         * attribute.componentDatatype = Cesium.ComponentDatatype.UNSIGNED_BYTE;
         * attribute.componentsPerAttribute = 4;
         * attribute.normalize = true;
         * attribute.values = new Uint8Array([
         *   Cesium.Color.floatToByte(color.red),
         *   Cesium.Color.floatToByte(color.green),
         *   Cesium.Color.floatToByte(color.blue),
         *   Cesium.Color.floatToByte(color.alpha)
         * ]);
         */
        this.normalize = defaultValue(options.normalize, false);

        /**
         * The values for the attributes stored in a typed array.  In the code example,
         * every three elements in <code>values</code> defines one attributes since
         * <code>componentsPerAttribute</code> is 3.
         *
         * @type TypedArray
         *
         * @default undefined
         *
         * @example
         * attribute.componentDatatype = Cesium.ComponentDatatype.FLOAT;
         * attribute.componentsPerAttribute = 3;
         * attribute.values = new Float32Array([
         *   0.0, 0.0, 0.0,
         *   7500000.0, 0.0, 0.0,
         *   0.0, 7500000.0, 0.0
         * ]);
         */
        this.values = options.values;
    }

    return GeometryAttribute;
});
