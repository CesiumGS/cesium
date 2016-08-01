/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject) {
    'use strict';

    /**
     * A vertex format defines what attributes make up a vertex.  A VertexFormat can be provided
     * to a {@link Geometry} to request that certain properties be computed, e.g., just position,
     * position and normal, etc.
     *
     * @param {Object} [options] An object with boolean properties corresponding to VertexFormat properties as shown in the code example.
     *
     * @alias VertexFormat
     * @constructor
     *
     * @example
     * // Create a vertex format with position and 2D texture coordinate attributes.
     * var format = new Cesium.VertexFormat({
     *   position : true,
     *   st : true
     * });
     *
     * @see Geometry#attributes
     * @see Packable
     */
    function VertexFormat(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * When <code>true</code>, the vertex has a 3D position attribute.
         * <p>
         * 64-bit floating-point (for precision).  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.position = defaultValue(options.position, false);

        /**
         * When <code>true</code>, the vertex has a normal attribute (normalized), which is commonly used for lighting.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.normal = defaultValue(options.normal, false);

        /**
         * When <code>true</code>, the vertex has a 2D texture coordinate attribute.
         * <p>
         * 32-bit floating-point.  2 components per attribute
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.st = defaultValue(options.st, false);

        /**
         * When <code>true</code>, the vertex has a binormal attribute (normalized), which is used for tangent-space effects like bump mapping.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.binormal = defaultValue(options.binormal, false);

        /**
         * When <code>true</code>, the vertex has a tangent attribute (normalized), which is used for tangent-space effects like bump mapping.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.tangent = defaultValue(options.tangent, false);

        /**
         * When <code>true</code>, the vertex has an RGB color attribute.
         * <p>
         * 8-bit unsigned byte.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.color = defaultValue(options.color, false);
    }

    /**
     * An immutable vertex format with only a position attribute.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     */
    VertexFormat.POSITION_ONLY = freezeObject(new VertexFormat({
        position : true
    }));

    /**
     * An immutable vertex format with position and normal attributes.
     * This is compatible with per-instance color appearances like {@link PerInstanceColorAppearance}.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     */
    VertexFormat.POSITION_AND_NORMAL = freezeObject(new VertexFormat({
        position : true,
        normal : true
    }));

    /**
     * An immutable vertex format with position, normal, and st attributes.
     * This is compatible with {@link MaterialAppearance} when {@link MaterialAppearance#materialSupport}
     * is <code>TEXTURED/code>.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     * @see VertexFormat#st
     */
    VertexFormat.POSITION_NORMAL_AND_ST = freezeObject(new VertexFormat({
        position : true,
        normal : true,
        st : true
    }));

    /**
     * An immutable vertex format with position and st attributes.
     * This is compatible with {@link EllipsoidSurfaceAppearance}.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#st
     */
    VertexFormat.POSITION_AND_ST = freezeObject(new VertexFormat({
        position : true,
        st : true
    }));

    /**
     * An immutable vertex format with position and color attributes.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#color
     */
    VertexFormat.POSITION_AND_COLOR = freezeObject(new VertexFormat({
        position : true,
        color : true
    }));

    /**
     * An immutable vertex format with well-known attributes: position, normal, st, binormal, and tangent.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     * @see VertexFormat#st
     * @see VertexFormat#binormal
     * @see VertexFormat#tangent
     */
    VertexFormat.ALL = freezeObject(new VertexFormat({
        position : true,
        normal : true,
        st : true,
        binormal : true,
        tangent  : true
    }));

    /**
     * An immutable vertex format with position, normal, and st attributes.
     * This is compatible with most appearances and materials; however
     * normal and st attributes are not always required.  When this is
     * known in advance, another <code>VertexFormat</code> should be used.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     */
    VertexFormat.DEFAULT = VertexFormat.POSITION_NORMAL_AND_ST;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    VertexFormat.packedLength = 6;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {VertexFormat} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    VertexFormat.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.position ? 1.0 : 0.0;
        array[startingIndex++] = value.normal ? 1.0 : 0.0;
        array[startingIndex++] = value.st ? 1.0 : 0.0;
        array[startingIndex++] = value.binormal ? 1.0 : 0.0;
        array[startingIndex++] = value.tangent ? 1.0 : 0.0;
        array[startingIndex++] = value.color ? 1.0 : 0.0;

        return array;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {VertexFormat} [result] The object into which to store the result.
     * @returns {VertexFormat} The modified result parameter or a new VertexFormat instance if one was not provided.
     */
    VertexFormat.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new VertexFormat();
        }

        result.position = array[startingIndex++] === 1.0;
        result.normal   = array[startingIndex++] === 1.0;
        result.st       = array[startingIndex++] === 1.0;
        result.binormal = array[startingIndex++] === 1.0;
        result.tangent  = array[startingIndex++] === 1.0;
        result.color    = array[startingIndex++] === 1.0;
        return result;
    };

    /**
     * Duplicates a VertexFormat instance.
     *
     * @param {VertexFormat} cartesian The vertex format to duplicate.
     * @param {VertexFormat} [result] The object onto which to store the result.
     * @returns {VertexFormat} The modified result parameter or a new VertexFormat instance if one was not provided. (Returns undefined if vertexFormat is undefined)
     */
    VertexFormat.clone = function(vertexFormat, result) {
        if (!defined(vertexFormat)) {
            return undefined;
        }
        if (!defined(result)) {
            result = new VertexFormat();
        }

        result.position = vertexFormat.position;
        result.normal = vertexFormat.normal;
        result.st = vertexFormat.st;
        result.binormal = vertexFormat.binormal;
        result.tangent = vertexFormat.tangent;
        result.color = vertexFormat.color;
        return result;
    };

    return VertexFormat;
});
