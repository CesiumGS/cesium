/*global define*/
define([
        '../Core/ComponentDatatype'
    ], function(
        ComponentDatatype) {
    "use strict";

    /**
     * @private
     */
    return {
        FLOAT : {
            componentsPerAttribute : 1,
            componentDatatype : ComponentDatatype.FLOAT,
            createArrayBufferView : function(buffer, byteOffset, length) {
                return new Float32Array(buffer, byteOffset, length);
            }
        },
        FLOAT_VEC2 : {
            componentsPerAttribute : 2,
            componentDatatype : ComponentDatatype.FLOAT,
            createArrayBufferView : function(buffer, byteOffset, length) {
                return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
            }
        },
        FLOAT_VEC3 : {
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            createArrayBufferView : function(buffer, byteOffset, length) {
                return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
            }
        },
        FLOAT_VEC4 : {
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            createArrayBufferView : function(buffer, byteOffset, length) {
                return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
            }
        }
    };
});