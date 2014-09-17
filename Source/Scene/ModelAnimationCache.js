/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/LinearSpline',
        '../Core/Quaternion',
        '../Core/QuaternionSpline',
        './getModelAccessor'
    ], function(
        Cartesian3,
        defined,
        LinearSpline,
        Quaternion,
        QuaternionSpline,
        getModelAccessor) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var ModelAnimationCache = function() {
    };

    var cachedAnimationParameters = {
    };

    function getAnimationParameterKey(model, accessor) {
        var gltf = model.gltf;
        var buffers = gltf.buffers;
        var bufferViews = gltf.bufferViews;

        var bufferView = bufferViews[accessor.bufferView];
        var buffer = buffers[bufferView.buffer];

        var byteOffset = bufferView.byteOffset + accessor.byteOffset;
        var byteLength = accessor.count * getModelAccessor(accessor).componentsPerAttribute;

        return model.basePath + buffer.path + ':' + byteOffset + ':' + byteLength;
    }

    var axisScratch = new Cartesian3();

    ModelAnimationCache.getAnimationParameterValues = function(model, accessor) {
        var key = getAnimationParameterKey(model, accessor);
        var values = cachedAnimationParameters[key];

        if (!defined(values)) {
            // Cache miss
            var buffers = model._loadResources.buffers;
            var gltf = model.gltf;
            var bufferViews = gltf.bufferViews;

            var bufferView = bufferViews[accessor.bufferView];

            var componentType = accessor.componentType;
            var type = accessor.type;
            var count = accessor.count;

            // Convert typed array to Cesium types
            var typedArray = getModelAccessor(accessor).createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + accessor.byteOffset, count);
            var i;

            if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'SCALAR')) {
                values = typedArray;
            }
            else if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC3')) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    values[i] = Cartesian3.fromArray(typedArray, 3 * i);
                }
            } else if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC4')) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    var byteOffset = 4 * i;
                    values[i] = Quaternion.fromAxisAngle(Cartesian3.fromArray(typedArray, byteOffset, axisScratch), typedArray[byteOffset + 3]);
                }
            }
            // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142

            if (model.basePath !== '') {
                // Only cache when we can create a unique id
                cachedAnimationParameters[key] = values;
            }
        }

        return values;
    };

    var cachedAnimationSplines = {
    };

    function getAnimationSplineKey(model, animationName, samplerName) {
        return model.basePath + ':' + animationName + ':' + samplerName;
    }

 // GLTF_SPEC: https://github.com/KhronosGroup/glTF/issues/185
    var ConstantSpline = function(value) {
        this._value = value;
    };

    ConstantSpline.prototype.evaluate = function(time, result) {
        return this._value;
    };
 // END GLTF_SPEC

    ModelAnimationCache.getAnimationSpline = function(model, animationName, animation, samplerName, sampler, parameterValues) {
        var key = getAnimationSplineKey(model, animationName, samplerName);
        var spline = cachedAnimationSplines[key];

        if (!defined(spline)) {
            var times = parameterValues[sampler.input];
            var accessor = model.gltf.accessors[animation.parameters[sampler.output]];
            var controlPoints = parameterValues[sampler.output];

// GLTF_SPEC: https://github.com/KhronosGroup/glTF/issues/185
            if ((times.length === 1) && (controlPoints.length === 1)) {
                spline = new ConstantSpline(controlPoints[0]);
            } else {
// END GLTF_SPEC
                var componentType = accessor.componentType;
                var type = accessor.type;

                if (sampler.interpolation === 'LINEAR') {
                    if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC3')) {
                        spline = new LinearSpline({
                            times : times,
                            points : controlPoints
                        });
                    } else if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC4')) {
                        spline = new QuaternionSpline({
                            times : times,
                            points : controlPoints
                        });
                    }
                    // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142
                }
                // GLTF_SPEC: Support new interpolators. https://github.com/KhronosGroup/glTF/issues/156
            }

            if (model.basePath !== '') {
                // Only cache when we can create a unique id
                cachedAnimationSplines[key] = spline;
            }
        }

        return spline;
    };

    return ModelAnimationCache;
});