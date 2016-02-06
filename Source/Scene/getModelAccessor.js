/*global define*/
define([
        '../Core/ComponentDatatype'
    ], function(
        ComponentDatatype) {
    'use strict';

    var ComponentsPerAttribute = {
        SCALAR : 1,
        VEC2 : 2,
        VEC3 : 3,
        VEC4 : 4,
        MAT2 : 4,
        MAT3 : 9,
        MAT4 : 16
    };

    /**
     * @private
     */
    function getModelAccessor(accessor) {
        var componentDatatype = accessor.componentType;
        var componentsPerAttribute = ComponentsPerAttribute[accessor.type];

        return {
            componentsPerAttribute : componentsPerAttribute,
            createArrayBufferView : function(buffer, byteOffset, length) {
                return ComponentDatatype.createArrayBufferView(componentDatatype, buffer, byteOffset, componentsPerAttribute * length);
            }
        };
    }

    return getModelAccessor;
});
