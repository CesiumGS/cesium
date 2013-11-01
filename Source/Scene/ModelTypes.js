/*global define*/
define([
        '../Core/ComponentDatatype',
        './ModelConstants'
    ], function(
        ComponentDatatype,
        ModelConstants) {
    "use strict";

    /**
     * @private
     */
    var ModelTypes = {
    };

    ModelTypes[ModelConstants.FLOAT] = {
        componentsPerAttribute : 1,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, length);
        }
    };
    ModelTypes[ModelConstants.FLOAT_VEC2] = {
        componentsPerAttribute : 2,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };
    ModelTypes[ModelConstants.FLOAT_VEC3] = {
        componentsPerAttribute : 3,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };
    ModelTypes[ModelConstants.FLOAT_VEC4] = {
        componentsPerAttribute : 4,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };

    return ModelTypes;
});