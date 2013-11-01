/*global define*/
define([
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Quaternion',
        '../Core/LinearSpline',
        '../Core/QuaternionSpline',
        './ModelConstants',
        './ModelTypes'
    ], function(
        defined,
        Cartesian3,
        Quaternion,
        LinearSpline,
        QuaternionSpline,
        ModelConstants,
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

            if (type === ModelConstants.FLOAT) {
                values = typedArray;
            }
            else if (type === ModelConstants.FLOAT_VEC3) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    values[i] = Cartesian3.fromArray(typedArray, 3 * i);
                }
            } else if (type === ModelConstants.FLOAT_VEC4) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    var byteOffset = 4 * i;
                    values[i] = Quaternion.fromAxisAngle(Cartesian3.fromArray(typedArray, byteOffset, axisScratch), typedArray[byteOffset + 3]);
                }
            }
            // TODO: else handle other parameters when glTF supports material channel targets: https://github.com/KhronosGroup/glTF/issues/142

            cachedAnimationParameters[key] = values;
        }

        return values;
    };

    var cachedAnimationSplines = {
    };

    function getAnimationSplineKey(model, animationName, samplerName) {
        return model.basePath + ':' + animationName + ':' + samplerName;
    }

    ModelCache.getAnimationSpline = function(model, animationName, animation, samplerName, sampler) {
        var key = getAnimationSplineKey(model, animationName, samplerName);
        var spline = cachedAnimationSplines[key];

        if (!defined(spline)) {
            var input = animation.parameters[sampler.input];
            var output = animation.parameters[sampler.output];

            var times = input.czm.values;
            var controlPoints = output.czm.values;

            if (sampler.interpolation === 'LINEAR') {
                if (output.type === ModelConstants.FLOAT_VEC3) {
                    spline = new LinearSpline({
                        times : times,
                        points : controlPoints
                    });
                } else if (output.type === ModelConstants.FLOAT_VEC4) {
                    spline = new QuaternionSpline({
                        times : times,
                        points : controlPoints
                    });
                }
                // TODO: else handle other parameters when glTF supports material channel targets: https://github.com/KhronosGroup/glTF/issues/142
            }
            // TODO: else support all interpolators.  https://github.com/KhronosGroup/glTF/issues/156

            cachedAnimationSplines[key] = spline;
        }

        return spline;
    };

    return ModelCache;
});