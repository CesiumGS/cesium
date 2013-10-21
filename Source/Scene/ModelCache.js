/*global define*/
define([
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Quaternion',
        './ModelTypes'
    ], function(
        defined,
        Cartesian3,
        Quaternion,
        ModelTypes) {
    "use strict";

    /**
     * @private
     */
    var ModelCache = function() {
    };

    var cachedAnimationParameters = {
    };

    function getAnimationParameterKey(model, parameter) {
        var gltf = model.gltf;
        var buffers = gltf.buffers;
        var bufferViews = gltf.bufferViews;

        var bufferView = bufferViews[parameter.bufferView];
        var buffer = buffers[bufferView.buffer];

        var byteOffset = bufferView.byteOffset + parameter.byteOffset;
        var byteLength = parameter.count * ModelTypes[parameter.type].componentsPerAttribute;

        return model.basePath + buffer.path + ':' + byteOffset + ':' + byteLength;
    }

    var axisScratch = new Cartesian3();

    ModelCache.getAnimationParameterValues = function(model, parameter) {
        var key = getAnimationParameterKey(model, parameter);
        var values = cachedAnimationParameters[key];

        if (!defined(values)) {
            // Cache miss
            var buffers = model._loadResources.buffers;
            var gltf = model.gltf;
            var bufferViews = gltf.bufferViews;

            var bufferView = bufferViews[parameter.bufferView];

            var type = parameter.type;
            var count = parameter.count;

            // Convert typed array to Cesium types
            var typedArray = ModelTypes[type].createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + parameter.byteOffset, parameter.count);
            var i;

            if (type === 'FLOAT') {
                values = typedArray;
            }
            else if (type === 'FLOAT_VEC3') {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    values[i] = Cartesian3.fromArray(typedArray, 3 * i);
                }
            } else if (type === 'FLOAT_VEC4') {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    var byteOffset = 4 * i;
                    values[i] = Quaternion.fromAxisAngle(Cartesian3.fromArray(typedArray, byteOffset, axisScratch), typedArray[byteOffset + 3]);
                }
            } else {
                // TODO: Handle other parameters when glTF supports material channel targets: https://github.com/KhronosGroup/glTF/issues/142
            }

            cachedAnimationParameters[key] = values;
        }

        return values;
    };

    return ModelCache;
});