define([
        '../../Core/WebGLConstants'
    ], function(
        WebGLConstants) {
    'use strict';

    /**
     * Utility function for retrieving the byte length of a component type.
     * As per the spec:
     *     5120 (BYTE)           : 1
     *     5121 (UNSIGNED_BYTE)  : 1
     *     5122 (SHORT)          : 2
     *     5123 (UNSIGNED_SHORT) : 2
     *     5126 (FLOAT)          : 4
     *     5125 (UNSIGNED_INT)   : 4
     *
     * @param {Number} [componentType]
     * @returns {Number} The byte length of the component type.
     */
    function byteLengthForComponentType(componentType) {
        switch (componentType) {
            case WebGLConstants.BYTE:
            case WebGLConstants.UNSIGNED_BYTE:
                return 1;
            case WebGLConstants.SHORT:
            case WebGLConstants.UNSIGNED_SHORT:
                return 2;
            case WebGLConstants.FLOAT:
            case WebGLConstants.UNSIGNED_INT:
                return 4;
        }
    }
    return byteLengthForComponentType;
});
