/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    // Earlier versions of IE do not support typed arrays, and as a result,
    // using them below will cause the setup function itself to fail, causing
    // the page to abort load, and preventing us from prompting to install
    // Chrome Frame.  To avoid this, bail out early and return a dummy object,
    // since we won't be able to create a WebGL context anyway.
    if (typeof Int8Array === 'undefined') {
        return {};
    }

    /**
     * Enumerations for WebGL component datatypes.  Components are intrinsics,
     * which form attributes, which form vertices.
     *
     * @alias ComponentDatatype
     * @enumeration
     */
    var ComponentDatatype = {};

    /**
     * 8-bit signed byte enumeration corresponding to <code>gl.BYTE</code> and the type
     * of an element in <code>Int8Array</code>.
     *
     * @memberOf ComponentDatatype
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1400
     */
    ComponentDatatype.BYTE = new Enumeration(0x1400, 'BYTE');
    ComponentDatatype.BYTE.sizeInBytes = Int8Array.BYTES_PER_ELEMENT;
    ComponentDatatype.BYTE.createTypedArray = function(valuesOrLength) {
        return new Int8Array(valuesOrLength);
    };

    ComponentDatatype.BYTE.createArrayBufferView = function(buffer, byteOffset) {
        return new Int8Array(buffer, byteOffset);
    };

    /**
     * 8-bit unsigned byte enumeration corresponding to <code>UNSIGNED_BYTE</code> and the type
     * of an element in <code>Uint8Array</code>.
     *
     * @memberOf ComponentDatatype
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1401
     */
    ComponentDatatype.UNSIGNED_BYTE = new Enumeration(0x1401, 'UNSIGNED_BYTE');
    ComponentDatatype.UNSIGNED_BYTE.sizeInBytes = Uint8Array.BYTES_PER_ELEMENT;
    ComponentDatatype.UNSIGNED_BYTE.createTypedArray = function(valuesOrLength) {
        return new Uint8Array(valuesOrLength);
    };

    ComponentDatatype.UNSIGNED_BYTE.createArrayBufferView = function(buffer, byteOffset) {
        return new Uint8Array(buffer, byteOffset);
    };

    /**
     * 16-bit signed short enumeration corresponding to <code>SHORT</code> and the type
     * of an element in <code>Int16Array</code>.
     *
     * @memberOf ComponentDatatype
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1402
     */
    ComponentDatatype.SHORT = new Enumeration(0x1402, 'SHORT');
    ComponentDatatype.SHORT.sizeInBytes = Int16Array.BYTES_PER_ELEMENT;
    ComponentDatatype.SHORT.createTypedArray = function(valuesOrLength) {
        return new Int16Array(valuesOrLength);
    };

    ComponentDatatype.SHORT.createArrayBufferView = function(buffer, byteOffset) {
        return new Int16Array(buffer, byteOffset);
    };

    /**
     * 16-bit unsigned short enumeration corresponding to <code>UNSIGNED_SHORT</code> and the type
     * of an element in <code>Uint16Array</code>.
     *
     * @memberOf ComponentDatatype
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1403
     */
    ComponentDatatype.UNSIGNED_SHORT = new Enumeration(0x1403, 'UNSIGNED_SHORT');
    ComponentDatatype.UNSIGNED_SHORT.sizeInBytes = Uint16Array.BYTES_PER_ELEMENT;
    ComponentDatatype.UNSIGNED_SHORT.createTypedArray = function(valuesOrLength) {
        return new Uint16Array(valuesOrLength);
    };

    ComponentDatatype.UNSIGNED_SHORT.createArrayBufferView = function(buffer, byteOffset) {
        return new Uint16Array(buffer, byteOffset);
    };

    /**
     * 32-bit floating-point enumeration corresponding to <code>FLOAT</code> and the type
     * of an element in <code>Float32Array</code>.
     *
     * @memberOf ComponentDatatype
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1406
     */
    ComponentDatatype.FLOAT = new Enumeration(0x1406, 'FLOAT');
    ComponentDatatype.FLOAT.sizeInBytes = Float32Array.BYTES_PER_ELEMENT;
    ComponentDatatype.FLOAT.createTypedArray = function(valuesOrLength) {
        return new Float32Array(valuesOrLength);
    };

    ComponentDatatype.FLOAT.createArrayBufferView = function(buffer, byteOffset) {
        return new Float32Array(buffer, byteOffset);
    };

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
    ComponentDatatype.DOUBLE = new Enumeration(0x140A, 'DOUBLE');
    ComponentDatatype.DOUBLE.sizeInBytes = Float64Array.BYTES_PER_ELEMENT;
    ComponentDatatype.DOUBLE.createTypedArray = function(valuesOrLength) {
        return new Float64Array(valuesOrLength);
    };

    ComponentDatatype.DOUBLE.createArrayBufferView = function(buffer, byteOffset) {
        return new Float64Array(buffer, byteOffset);
    };

    /**
     * Validates that the provided component datatype is a valid {@link ComponentDatatype}
     *
     * @param {ComponentDatatype} componentDatatype The component datatype to validate.
     *
     * @return {Boolean} <code>true</code> if the provided component datatype is a valid enumeration value; otherwise, <code>false</code>.
     *
     * @example
     * if (!ComponentDatatype.validate(componentDatatype)) {
     *   throw new DeveloperError('componentDatatype must be a valid enumeration value.');
     * }
     */
    ComponentDatatype.validate = function(componentDatatype) {
        return ((componentDatatype === ComponentDatatype.BYTE) ||
                (componentDatatype === ComponentDatatype.UNSIGNED_BYTE) ||
                (componentDatatype === ComponentDatatype.SHORT) ||
                (componentDatatype === ComponentDatatype.UNSIGNED_SHORT) ||
                (componentDatatype === ComponentDatatype.FLOAT) ||
                (componentDatatype === ComponentDatatype.DOUBLE));
    };

    return ComponentDatatype;
});
