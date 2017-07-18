define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/ComponentDatatype',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        ComponentDatatype,
        Matrix2,
        Matrix3,
        Matrix4) {
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

    var ClassPerType = {
        SCALAR : undefined,
        VEC2 : Cartesian2,
        VEC3 : Cartesian3,
        VEC4 : Cartesian4,
        MAT2 : Matrix2,
        MAT3 : Matrix3,
        MAT4 : Matrix4
    };

    /**
     * @private
     */
    function getBinaryAccessor(accessor) {
        var componentType = accessor.componentType;
        var componentDatatype;
        if (typeof componentType === 'string') {
            componentDatatype = ComponentDatatype.fromName(componentType);
        } else {
            componentDatatype = componentType;
        }

        var componentsPerAttribute = ComponentsPerAttribute[accessor.type];
        var classType = ClassPerType[accessor.type];
        return {
            componentsPerAttribute : componentsPerAttribute,
            classType : classType,
            createArrayBufferView : function(buffer, byteOffset, length) {
                return ComponentDatatype.createArrayBufferView(componentDatatype, buffer, byteOffset, componentsPerAttribute * length);
            }
        };
    }

    return getBinaryAccessor;
});
