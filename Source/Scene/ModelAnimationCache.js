/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/LinearSpline',
        '../Core/Quaternion',
        '../Core/QuaternionSpline',
        './ModelTypes'
    ], function(
        Cartesian3,
        defined,
        LinearSpline,
        Quaternion,
        QuaternionSpline,
        ModelTypes) {
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
        var byteLength = accessor.count * ModelTypes[accessor.type].componentsPerAttribute;

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

            var type = accessor.type;
            var count = accessor.count;

            // Convert typed array to Cesium types
            var typedArray = ModelTypes[type].createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + accessor.byteOffset, accessor.count);
            var i;

            if (type === WebGLRenderingContext.FLOAT) {
                values = typedArray;
            }
            else if (type === WebGLRenderingContext.FLOAT_VEC3) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    values[i] = Cartesian3.fromArray(typedArray, 3 * i);
                }
            } else if (type === WebGLRenderingContext.FLOAT_VEC4) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    var byteOffset = 4 * i;
                    values[i] = Quaternion.fromAxisAngle(Cartesian3.fromArray(typedArray, byteOffset, axisScratch), typedArray[byteOffset + 3]);
                }
            }
            // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142

            cachedAnimationParameters[key] = values;
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
            var output = model.gltf.accessors[animation.parameters[sampler.output]];
            var controlPoints = parameterValues[sampler.output];

// GLTF_SPEC: https://github.com/KhronosGroup/glTF/issues/185
            if ((times.length === 1) && (controlPoints.length === 1)) {
                spline = new ConstantSpline(controlPoints[0]);
            } else {
// END GLTF_SPEC
                if (sampler.interpolation === 'LINEAR') {
                    if (output.type === WebGLRenderingContext.FLOAT_VEC3) {
                        spline = new LinearSpline({
                            times : times,
                            points : controlPoints
                        });
                    } else if (output.type === WebGLRenderingContext.FLOAT_VEC4) {
                        spline = new QuaternionSpline({
                            times : times,
                            points : controlPoints
                        });
                    }
                    // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142
                }
                // GLTF_SPEC: Support new interpolators. https://github.com/KhronosGroup/glTF/issues/156
            }

            cachedAnimationSplines[key] = spline;
        }

        return spline;
    };

    return ModelAnimationCache;
});