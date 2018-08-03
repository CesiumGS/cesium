define([
        './addToArray',
        './ForEach',
        './readAccessorPacked',
        '../../Core/ComponentDatatype',
        '../../Core/WebGLConstants'
    ], function(
        addToArray,
        ForEach,
        readAccessorPacked,
        ComponentDatatype,
        WebGLConstants) {
    'use strict';

    /**
     * Update accessors referenced by JOINTS_0 and WEIGHTS_0 attributes to use correct component types.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with compressed meshes.
     *
     * @private
     */
    function updateAccessorComponentTypes(gltf) {
        var componentType;
        ForEach.accessorWithSemantic(gltf, 'JOINTS_0', function(accessorId) {
            var accessor = gltf.accessors[accessorId];
            componentType = accessor.componentType;
            if (componentType === WebGLConstants.BYTE) {
                convertType(gltf, accessor, ComponentDatatype.UNSIGNED_BYTE);
            } else if (componentType !== WebGLConstants.UNSIGNED_BYTE
                    && componentType !== WebGLConstants.UNSIGNED_SHORT) {
                convertType(gltf, accessor, ComponentDatatype.UNSIGNED_SHORT);
            }
        });
        ForEach.accessorWithSemantic(gltf, 'WEIGHTS_0', function(accessorId) {
            var accessor = gltf.accessors[accessorId];
            componentType = accessor.componentType;
            if (componentType === WebGLConstants.BYTE) {
                convertType(gltf, accessor, ComponentDatatype.UNSIGNED_BYTE);
            } else if (componentType === WebGLConstants.SHORT) {
                convertType(gltf, accessor, ComponentDatatype.UNSIGNED_SHORT);
            }
        });

        return gltf;
    }

    function convertType(gltf, accessor, updatedComponentType) {
        var typedArray = ComponentDatatype.createTypedArray(updatedComponentType, readAccessorPacked(gltf, accessor));
        var newBuffer = new Uint8Array(typedArray.buffer);
        var newBufferLength = newBuffer.length;
        var buffer = {
            byteLength: newBufferLength,
            extras: {
                _pipeline: {
                    source: newBuffer
                }
            }
        };

        var bufferId = addToArray(gltf.buffers, buffer);
        accessor.componentType = updatedComponentType;
        accessor.bufferView = addToArray(gltf.bufferViews, {
            buffer: bufferId,
            byteLength: newBufferLength
        });
    }

    return updateAccessorComponentTypes;
});
