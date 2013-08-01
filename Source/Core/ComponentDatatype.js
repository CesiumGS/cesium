/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
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
            sizeInBytes : Int8Array.BYTES_PER_ELEMENT,

            createTypedArray : function(valuesOrLength) {
                return new Int8Array(valuesOrLength);
            },

            createArrayBufferView : function(buffer, byteOffset) {
                return new Int8Array(buffer, byteOffset);
            }
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
            sizeInBytes : Uint8Array.BYTES_PER_ELEMENT,

            createTypedArray : function(valuesOrLength) {
                return new Uint8Array(valuesOrLength);
            },

            createArrayBufferView : function(buffer, byteOffset) {
                return new Uint8Array(buffer, byteOffset);
            }
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
            sizeInBytes : Int16Array.BYTES_PER_ELEMENT,

            createTypedArray : function(valuesOrLength) {
                return new Int16Array(valuesOrLength);
            },

            createArrayBufferView : function(buffer, byteOffset) {
                return new Int16Array(buffer, byteOffset);
            }
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
            sizeInBytes : Uint16Array.BYTES_PER_ELEMENT,

            createTypedArray : function(valuesOrLength) {
                return new Uint16Array(valuesOrLength);
            },

            createArrayBufferView : function(buffer, byteOffset) {
                return new Uint16Array(buffer, byteOffset);
            }
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
            sizeInBytes : Float32Array.BYTES_PER_ELEMENT,

            createTypedArray : function(valuesOrLength) {
                return new Float32Array(valuesOrLength);
            },

            createArrayBufferView : function(buffer, byteOffset) {
                return new Float32Array(buffer, byteOffset);
            }
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
            sizeInBytes : Float64Array.BYTES_PER_ELEMENT,

            createTypedArray : function(valuesOrLength) {
                return new Float64Array(valuesOrLength);
            },

            createArrayBufferView : function(buffer, byteOffset) {
                return new Float64Array(buffer, byteOffset);
            }
        })
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
        return componentDatatype === ComponentDatatype.BYTE ||
               componentDatatype === ComponentDatatype.UNSIGNED_BYTE ||
               componentDatatype === ComponentDatatype.SHORT ||
               componentDatatype === ComponentDatatype.UNSIGNED_SHORT ||
               componentDatatype === ComponentDatatype.FLOAT ||
               componentDatatype === ComponentDatatype.DOUBLE;
    };

    return ComponentDatatype;
});
