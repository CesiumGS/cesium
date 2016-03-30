/*global define*/
define([
        '../Renderer/WebGLConstants',
        './defaultValue',
        './defined',
        './DeveloperError',
        './FeatureDetection',
        './freezeObject'
    ], function(
        WebGLConstants,
        defaultValue,
        defined,
        DeveloperError,
        FeatureDetection,
        freezeObject) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * WebGL component datatypes.  Components are intrinsics,
     * which form attributes, which form vertices.
     *
     * @exports ComponentDatatype
     */
    var ComponentDatatype = {
        /**
         * 8-bit signed byte corresponding to <code>gl.BYTE</code> and the type
         * of an element in <code>Int8Array</code>.
         *
         * @type {Number}
         * @constant
         */
        BYTE : WebGLConstants.BYTE,

        /**
         * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
         * of an element in <code>Uint8Array</code>.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_BYTE : WebGLConstants.UNSIGNED_BYTE,

        /**
         * 16-bit signed short corresponding to <code>SHORT</code> and the type
         * of an element in <code>Int16Array</code>.
         *
         * @type {Number}
         * @constant
         */
        SHORT : WebGLConstants.SHORT,

        /**
         * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
         * of an element in <code>Uint16Array</code>.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_SHORT : WebGLConstants.UNSIGNED_SHORT,

        /**
         * 32-bit floating-point corresponding to <code>FLOAT</code> and the type
         * of an element in <code>Float32Array</code>.
         *
         * @type {Number}
         * @constant
         */
        FLOAT : WebGLConstants.FLOAT,

        /**
         * 64-bit floating-point corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
         * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
         * and the type of an element in <code>Float64Array</code>.
         *
         * @memberOf ComponentDatatype
         *
         * @type {Number}
         * @constant
         * @default 0x140A
         */
        DOUBLE : WebGLConstants.DOUBLE
    };

    /**
     * Returns the size, in bytes, of the corresponding datatype.
     *
     * @param {ComponentDatatype} componentDatatype The component datatype to get the size of.
     * @returns {Number} The size in bytes.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
     *
     * @example
     * // Returns Int8Array.BYTES_PER_ELEMENT
     * var size = Cesium.ComponentDatatype.getSizeInBytes(Cesium.ComponentDatatype.BYTE);
     */
    ComponentDatatype.getSizeInBytes = function(componentDatatype){
        //>>includeStart('debug', pragmas.debug);
        if (!defined(componentDatatype)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return Int8Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_BYTE:
            return Uint8Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.SHORT:
            return Int16Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_SHORT:
            return Uint16Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.FLOAT:
            return Float32Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.DOUBLE:
            return Float64Array.BYTES_PER_ELEMENT;
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        }
    };

    /**
     * Gets the ComponentDatatype for the provided TypedArray instance.
     *
     * @param {TypedArray} array The typed array.
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
     * @returns {Boolean} <code>true</code> if the provided component datatype is a valid value; otherwise, <code>false</code>.
     *
     * @example
     * if (!Cesium.ComponentDatatype.validate(componentDatatype)) {
     *   throw new Cesium.DeveloperError('componentDatatype must be a valid value.');
     * }
     */
    ComponentDatatype.validate = function(componentDatatype) {
        return defined(componentDatatype) &&
               (componentDatatype === ComponentDatatype.BYTE ||
                componentDatatype === ComponentDatatype.UNSIGNED_BYTE ||
                componentDatatype === ComponentDatatype.SHORT ||
                componentDatatype === ComponentDatatype.UNSIGNED_SHORT ||
                componentDatatype === ComponentDatatype.FLOAT ||
                componentDatatype === ComponentDatatype.DOUBLE);
    };

    /**
     * Creates a typed array corresponding to component data type.
     *
     * @param {ComponentDatatype} componentDatatype The component data type.
     * @param {Number|Array} valuesOrLength The length of the array to create or an array.
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Float32Array|Float64Array} A typed array.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
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

        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return new Int8Array(valuesOrLength);
        case ComponentDatatype.UNSIGNED_BYTE:
            return new Uint8Array(valuesOrLength);
        case ComponentDatatype.SHORT:
            return new Int16Array(valuesOrLength);
        case ComponentDatatype.UNSIGNED_SHORT:
            return new Uint16Array(valuesOrLength);
        case ComponentDatatype.FLOAT:
            return new Float32Array(valuesOrLength);
        case ComponentDatatype.DOUBLE:
            return new Float64Array(valuesOrLength);
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        }
    };

    /**
     * Creates a typed view of an array of bytes.
     *
     * @param {ComponentDatatype} componentDatatype The type of the view to create.
     * @param {ArrayBuffer} buffer The buffer storage to use for the view.
     * @param {Number} [byteOffset] The offset, in bytes, to the first element in the view.
     * @param {Number} [length] The number of elements in the view.
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Float32Array|Float64Array} A typed array view of the buffer.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
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
        length = defaultValue(length, (buffer.byteLength - byteOffset) / ComponentDatatype.getSizeInBytes(componentDatatype));

        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return new Int8Array(buffer, byteOffset, length);
        case ComponentDatatype.UNSIGNED_BYTE:
            return new Uint8Array(buffer, byteOffset, length);
        case ComponentDatatype.SHORT:
            return new Int16Array(buffer, byteOffset, length);
        case ComponentDatatype.UNSIGNED_SHORT:
            return new Uint16Array(buffer, byteOffset, length);
        case ComponentDatatype.FLOAT:
            return new Float32Array(buffer, byteOffset, length);
        case ComponentDatatype.DOUBLE:
            return new Float64Array(buffer, byteOffset, length);
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        }
    };

    return freezeObject(ComponentDatatype);
});
