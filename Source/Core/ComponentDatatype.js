/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './FeatureDetection',
        './Enumeration'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        FeatureDetection,
        Enumeration) {
    "use strict";

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Enumerations for WebGL component datatypes.  Components are intrinsics,
     * which form attributes, which form vertices.
     *
     * @alias ComponentDatatype
     * @enumeration
     */
    var ComponentDatatype = {
        /**
         * 8-bit signed byte enumeration corresponding to <code>gl.BYTE</code> and the type
         * of an element in <code>Int8Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1400
         */
        BYTE : new Enumeration(0x1400, 'BYTE', {
            sizeInBytes : Int8Array.BYTES_PER_ELEMENT
        }),

        /**
         * 8-bit unsigned byte enumeration corresponding to <code>UNSIGNED_BYTE</code> and the type
         * of an element in <code>Uint8Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1401
         */
        UNSIGNED_BYTE : new Enumeration(0x1401, 'UNSIGNED_BYTE', {
            sizeInBytes : Uint8Array.BYTES_PER_ELEMENT
        }),

        /**
         * 16-bit signed short enumeration corresponding to <code>SHORT</code> and the type
         * of an element in <code>Int16Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1402
         */
        SHORT : new Enumeration(0x1402, 'SHORT', {
            sizeInBytes : Int16Array.BYTES_PER_ELEMENT
        }),

        /**
         * 16-bit unsigned short enumeration corresponding to <code>UNSIGNED_SHORT</code> and the type
         * of an element in <code>Uint16Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1403
         */
        UNSIGNED_SHORT : new Enumeration(0x1403, 'UNSIGNED_SHORT', {
            sizeInBytes : Uint16Array.BYTES_PER_ELEMENT
        }),

        /**
         * 32-bit floating-point enumeration corresponding to <code>FLOAT</code> and the type
         * of an element in <code>Float32Array</code>.
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1406
         */
        FLOAT : new Enumeration(0x1406, 'FLOAT', {
            sizeInBytes : Float32Array.BYTES_PER_ELEMENT
        }),

        /**
         * 64-bit floating-point enumeration corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
         * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
         * and the type of an element in <code>Float64Array</code>.
         *
         * @memberOf ComponentDatatype
         *
         * @type {Enumeration}
         * @constant
         * @default 0x140A
         */
        DOUBLE : new Enumeration(0x140A, 'DOUBLE', {
            sizeInBytes : Float64Array.BYTES_PER_ELEMENT
        })
    };

    /**
     * Gets the ComponentDatatype for the provided value.
     *
     * @param {Number} value The value.
     *
     * @returns {ComponentDatatype} The ComponentDatatype for the provided value, or undefined if no enumeration with the provided value exists.
     */
    ComponentDatatype.fromValue = function(value) {
        switch (value) {
        case ComponentDatatype.BYTE.value:
            return ComponentDatatype.BYTE;
        case ComponentDatatype.UNSIGNED_BYTE.value:
            return ComponentDatatype.UNSIGNED_BYTE;
        case ComponentDatatype.SHORT.value:
            return ComponentDatatype.SHORT;
        case ComponentDatatype.UNSIGNED_SHORT.value:
            return ComponentDatatype.UNSIGNED_SHORT;
        case ComponentDatatype.FLOAT.value:
            return ComponentDatatype.FLOAT;
        case ComponentDatatype.DOUBLE.value:
            return ComponentDatatype.DOUBLE;
        }
    };

    /**
     * Gets the ComponentDatatype for the provided TypedArray instance.
     *
     * @param {TypedArray} array The typed array.
     *
     * @returns {ComponentDatatype} The ComponentDatatype for the provided array, or undefined if the array is not a TypedArray.
     */
    ComponentDatatype.fromTypedArray = function(array) {
        if (array instanceof Int8Array) {
            return ComponentDatatype.BYTE;
        }
        if (array instanceof Uint8Array) {
            return ComponentDatatype.UNSIGNED_BYTE;
        }
        if (array instanceof Int16Array) {
            return ComponentDatatype.SHORT;
        }
        if (array instanceof Uint16Array) {
            return ComponentDatatype.UNSIGNED_SHORT;
        }
        if (array instanceof Float32Array) {
            return ComponentDatatype.FLOAT;
        }
        if (array instanceof Float64Array) {
            return ComponentDatatype.DOUBLE;
        }
    };

    /**
     * Validates that the provided component datatype is a valid {@link ComponentDatatype}
     *
     * @param {ComponentDatatype} componentDatatype The component datatype to validate.
     *
     * @returns {Boolean} <code>true</code> if the provided component datatype is a valid enumeration value; otherwise, <code>false</code>.
     *
     * @example
     * if (!Cesium.ComponentDatatype.validate(componentDatatype)) {
     *   throw new Cesium.DeveloperError('componentDatatype must be a valid enumeration value.');
     * }
     */
    ComponentDatatype.validate = function(componentDatatype) {
        return defined(componentDatatype) && defined(componentDatatype.value) &&
               (componentDatatype.value === ComponentDatatype.BYTE.value ||
                componentDatatype.value === ComponentDatatype.UNSIGNED_BYTE.value ||
                componentDatatype.value === ComponentDatatype.SHORT.value ||
                componentDatatype.value === ComponentDatatype.UNSIGNED_SHORT.value ||
                componentDatatype.value === ComponentDatatype.FLOAT.value ||
                componentDatatype.value === ComponentDatatype.DOUBLE.value);
    };

    /**
     * Creates a typed array corresponding to component data type.
     * @memberof ComponentDatatype
     *
     * @param {ComponentDatatype} componentDatatype The component data type.
     * @param {Number|Array} valuesOrLength The length of the array to create or an array.
     *
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Float32Array|Float64Array} A typed array.
     *
     * @exception {DeveloperError} componentDatatype is not a valid enumeration value.
     *
     * @example
     * // creates a Float32Array with length of 100
     * var typedArray = Cesium.ComponentDatatype.createTypedArray(Cesium.ComponentDatatype.FLOAT, 100);
     */
    ComponentDatatype.createTypedArray = function(componentDatatype, valuesOrLength) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(componentDatatype)) {
            throw new DeveloperError('componentDatatype is required.');
        }
        if (!defined(valuesOrLength)) {
            throw new DeveloperError('valuesOrLength is required.');
        }
        //>>includeEnd('debug');

        switch (componentDatatype.value) {
        case ComponentDatatype.BYTE.value:
            return new Int8Array(valuesOrLength);
        case ComponentDatatype.UNSIGNED_BYTE.value:
            return new Uint8Array(valuesOrLength);
        case ComponentDatatype.SHORT.value:
            return new Int16Array(valuesOrLength);
        case ComponentDatatype.UNSIGNED_SHORT.value:
            return new Uint16Array(valuesOrLength);
        case ComponentDatatype.FLOAT.value:
            return new Float32Array(valuesOrLength);
        case ComponentDatatype.DOUBLE.value:
            return new Float64Array(valuesOrLength);
        default:
            throw new DeveloperError('componentDatatype is not a valid enumeration value.');
        }
    };

    /**
     * Creates a typed view of an array of bytes.
     * @memberof ComponentDatatype
     *
     * @param {ComponentDatatype} componentDatatype The type of the view to create.
     * @param {ArrayBuffer} buffer The buffer storage to use for the view.
     * @param {Number} [byteOffset] The offset, in bytes, to the first element in the view.
     * @param {Number} [length] The number of elements in the view.
     *
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Float32Array|Float64Array} A typed array view of the buffer.
     *
     * @exception {DeveloperError} componentDatatype is not a valid enumeration value.
     */
    ComponentDatatype.createArrayBufferView = function(componentDatatype, buffer, byteOffset, length) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(componentDatatype)) {
            throw new DeveloperError('componentDatatype is required.');
        }
        if (!defined(buffer)) {
            throw new DeveloperError('buffer is required.');
        }
        //>>includeEnd('debug');

        byteOffset = defaultValue(byteOffset, 0);
        length = defaultValue(length, (buffer.byteLength - byteOffset) / componentDatatype.sizeInBytes);

        switch (componentDatatype.value) {
        case ComponentDatatype.BYTE.value:
            return new Int8Array(buffer, byteOffset, length);
        case ComponentDatatype.UNSIGNED_BYTE.value:
            return new Uint8Array(buffer, byteOffset, length);
        case ComponentDatatype.SHORT.value:
            return new Int16Array(buffer, byteOffset, length);
        case ComponentDatatype.UNSIGNED_SHORT.value:
            return new Uint16Array(buffer, byteOffset, length);
        case ComponentDatatype.FLOAT.value:
            return new Float32Array(buffer, byteOffset, length);
        case ComponentDatatype.DOUBLE.value:
            return new Float64Array(buffer, byteOffset, length);
        default:
            throw new DeveloperError('componentDatatype is not a valid enumeration value.');
        }
    };

    return ComponentDatatype;
});
