/*global define*/
define([
        '../Core/ComponentDatatype'
    ], function(
        ComponentDatatype) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var ModelTypes = {};

    // Bail out if the browser doesn't support WebGL, to prevent the setup function from crashing.
    // This check must use typeof, not defined, because defined doesn't work with undeclared variables.
    if (typeof WebGLRenderingContext === 'undefined') {
        return ModelTypes;
    }

    ModelTypes[WebGLRenderingContext.FLOAT] = {
        componentsPerAttribute : 1,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, length);
        }
    };
    ModelTypes[WebGLRenderingContext.FLOAT_VEC2] = {
        componentsPerAttribute : 2,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };
    ModelTypes[WebGLRenderingContext.FLOAT_VEC3] = {
        componentsPerAttribute : 3,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };
    ModelTypes[WebGLRenderingContext.FLOAT_VEC4] = {
        componentsPerAttribute : 4,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };

    ModelTypes[WebGLRenderingContext.FLOAT_MAT2] = {
        componentsPerAttribute : 4,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };
    ModelTypes[WebGLRenderingContext.FLOAT_MAT3] = {
        componentsPerAttribute : 9,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };
    ModelTypes[WebGLRenderingContext.FLOAT_MAT4] = {
        componentsPerAttribute : 16,
        componentDatatype : ComponentDatatype.FLOAT,
        createArrayBufferView : function(buffer, byteOffset, length) {
            return new Float32Array(buffer, byteOffset, this.componentsPerAttribute * length);
        }
    };

    return ModelTypes;
});