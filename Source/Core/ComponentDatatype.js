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
     * DOC_TBA
     *
     * @alias ComponentDatatype
     * @enumeration
     */
    var ComponentDatatype = {};

    /**
     * DOC_TBA
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1400
     * @memberOf ComponentDatatype
     */
    ComponentDatatype.BYTE = new Enumeration(0x1400, 'BYTE');
    ComponentDatatype.BYTE.sizeInBytes = Int8Array.BYTES_PER_ELEMENT;
    ComponentDatatype.BYTE.toTypedArray = function(values) {
        return new Int8Array(values);
    };

    ComponentDatatype.BYTE.createArrayBufferView = function(buffer, byteOffset) {
        return new Int8Array(buffer, byteOffset);
    };

    /**
     * DOC_TBA
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1401
     * @memberOf ComponentDatatype
     */
    ComponentDatatype.UNSIGNED_BYTE = new Enumeration(0x1401, 'UNSIGNED_BYTE');
    ComponentDatatype.UNSIGNED_BYTE.sizeInBytes = Uint8Array.BYTES_PER_ELEMENT;
    ComponentDatatype.UNSIGNED_BYTE.toTypedArray = function(values) {
        return new Uint8Array(values);
    };

    ComponentDatatype.UNSIGNED_BYTE.createArrayBufferView = function(buffer, byteOffset) {
        return new Uint8Array(buffer, byteOffset);
    };

    /**
     * DOC_TBA
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1402
     * @memberOf ComponentDatatype
     */
    ComponentDatatype.SHORT = new Enumeration(0x1402, 'SHORT');
    ComponentDatatype.SHORT.sizeInBytes = Int16Array.BYTES_PER_ELEMENT;
    ComponentDatatype.SHORT.toTypedArray = function(values) {
        return new Int16Array(values);
    };

    ComponentDatatype.SHORT.createArrayBufferView = function(buffer, byteOffset) {
        return new Int16Array(buffer, byteOffset);
    };

    /**
     * DOC_TBA
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1403
     * @memberOf ComponentDatatype
     */
    ComponentDatatype.UNSIGNED_SHORT = new Enumeration(0x1403, 'UNSIGNED_SHORT');
    ComponentDatatype.UNSIGNED_SHORT.sizeInBytes = Uint16Array.BYTES_PER_ELEMENT;
    ComponentDatatype.UNSIGNED_SHORT.toTypedArray = function(values) {
        return new Uint16Array(values);
    };

    ComponentDatatype.UNSIGNED_SHORT.createArrayBufferView = function(buffer, byteOffset) {
        return new Uint16Array(buffer, byteOffset);
    };

    /**
     * DOC_TBA
     *
     * @type {Enumeration}
     * @constant
     * @default 0x1406
     * @memberOf ComponentDatatype
     */
    ComponentDatatype.FLOAT = new Enumeration(0x1406, 'FLOAT');
    ComponentDatatype.FLOAT.sizeInBytes = Float32Array.BYTES_PER_ELEMENT;
    ComponentDatatype.FLOAT.toTypedArray = function(values) {
        return new Float32Array(values);
    };

    ComponentDatatype.FLOAT.createArrayBufferView = function(buffer, byteOffset) {
        return new Float32Array(buffer, byteOffset);
    };

    /**
     * DOC_TBA
     *
     * @param {ComponentDataType} componentDatatype
     *
     * @returns {Boolean}
     */
    ComponentDatatype.validate = function(componentDatatype) {
        return ((componentDatatype === ComponentDatatype.BYTE) ||
                (componentDatatype === ComponentDatatype.UNSIGNED_BYTE) ||
                (componentDatatype === ComponentDatatype.SHORT) ||
                (componentDatatype === ComponentDatatype.UNSIGNED_SHORT) ||
                (componentDatatype === ComponentDatatype.FLOAT));
    };

    return ComponentDatatype;
});
