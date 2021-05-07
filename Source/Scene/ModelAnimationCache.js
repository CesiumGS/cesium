import Cartesian3 from "../Core/Cartesian3.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import LinearSpline from "../Core/LinearSpline.js";
import Matrix4 from "../Core/Matrix4.js";
import Quaternion from "../Core/Quaternion.js";
import QuaternionSpline from "../Core/QuaternionSpline.js";
import Spline from "../Core/Spline.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import WeightSpline from "../Core/WeightSpline.js";
import getAccessorByteStride from "../ThirdParty/GltfPipeline/getAccessorByteStride.js";
import numberOfComponentsForType from "../ThirdParty/GltfPipeline/numberOfComponentsForType.js";
import AttributeType from "./AttributeType.js";

/**
 * @private
 */
function ModelAnimationCache() {}

var dataUriRegex = /^data\:/i;

function getAccessorKey(model, accessor) {
  var gltf = model.gltf;
  var buffers = gltf.buffers;
  var bufferViews = gltf.bufferViews;

  var bufferView = bufferViews[accessor.bufferView];
  var buffer = buffers[bufferView.buffer];

  var byteOffset = bufferView.byteOffset + accessor.byteOffset;
  var byteLength = accessor.count * numberOfComponentsForType(accessor.type);

  var uriKey = dataUriRegex.test(buffer.uri) ? "" : buffer.uri;
  return model.cacheKey + "//" + uriKey + "/" + byteOffset + "/" + byteLength;
}

var cachedAnimationParameters = {};

ModelAnimationCache.getAnimationParameterValues = function (model, accessor) {
  var key = getAccessorKey(model, accessor);
  var values = cachedAnimationParameters[key];

  if (!defined(values)) {
    // Cache miss
    var gltf = model.gltf;

    var buffers = gltf.buffers;
    var bufferViews = gltf.bufferViews;

    var bufferView = bufferViews[accessor.bufferView];
    var bufferId = bufferView.buffer;
    var buffer = buffers[bufferId];
    var source = buffer.extras._pipeline.source;

    var componentType = accessor.componentType;
    var type = accessor.type;
    var numberOfComponents = numberOfComponentsForType(type);
    var count = accessor.count;
    var byteStride = getAccessorByteStride(gltf, accessor);

    values = new Array(count);
    var accessorByteOffset = defaultValue(accessor.byteOffset, 0);
    var byteOffset = bufferView.byteOffset + accessorByteOffset;
    for (var i = 0; i < count; i++) {
      var typedArrayView = ComponentDatatype.createArrayBufferView(
        componentType,
        source.buffer,
        source.byteOffset + byteOffset,
        numberOfComponents
      );
      if (type === "SCALAR") {
        values[i] = typedArrayView[0];
      } else if (type === "VEC3") {
        values[i] = Cartesian3.fromArray(typedArrayView);
      } else if (type === "VEC4") {
        values[i] = Quaternion.unpack(typedArrayView);
      }
      byteOffset += byteStride;
    }
    // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142

    if (defined(model.cacheKey)) {
      // Only cache when we can create a unique id
      cachedAnimationParameters[key] = values;
    }
  }

  return values;
};

var cachedAnimationSplines = {};

function getAnimationSplineKey(model, animationName, samplerName) {
  return model.cacheKey + "//" + animationName + "/" + samplerName;
}

function ConstantSpline(value) {
  this._value = value;
}
ConstantSpline.prototype.evaluate = function (time, result) {
  return this._value;
};
ConstantSpline.prototype.wrapTime = function (time) {
  return 0.0;
};
ConstantSpline.prototype.clampTime = function (time) {
  return 0.0;
};

function SteppedSpline(backingSpline) {
  this._spline = backingSpline;
  this._lastTimeIndex = 0;
}
SteppedSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;
SteppedSpline.prototype.evaluate = function (time, result) {
  var i = (this._lastTimeIndex = this.findTimeInterval(
    time,
    this._lastTimeIndex
  ));
  var times = this._spline.times;
  var steppedTime = time >= times[i + 1] ? times[i + 1] : times[i];
  return this._spline.evaluate(steppedTime, result);
};
Object.defineProperties(SteppedSpline.prototype, {
  times: {
    get: function () {
      return this._spline.times;
    },
  },
});
SteppedSpline.prototype.wrapTime = function (time) {
  return this._spline.wrapTime(time);
};
SteppedSpline.prototype.clampTime = function (time) {
  return this._spline.clampTime(time);
};

ModelAnimationCache.getAnimationSpline = function (
  model,
  animationName,
  animation,
  samplerName,
  sampler,
  input,
  path,
  output
) {
  var key = getAnimationSplineKey(model, animationName, samplerName);
  var spline = cachedAnimationSplines[key];

  if (!defined(spline)) {
    var times = input;
    var controlPoints = output;

    if (times.length === 1 && controlPoints.length === 1) {
      spline = new ConstantSpline(controlPoints[0]);
    } else if (
      sampler.interpolation === "LINEAR" ||
      sampler.interpolation === "STEP"
    ) {
      if (path === "translation" || path === "scale") {
        spline = new LinearSpline({
          times: times,
          points: controlPoints,
        });
      } else if (path === "rotation") {
        spline = new QuaternionSpline({
          times: times,
          points: controlPoints,
        });
      } else if (path === "weights") {
        spline = new WeightSpline({
          times: times,
          weights: controlPoints,
        });
      }

      if (defined(spline) && sampler.interpolation === "STEP") {
        spline = new SteppedSpline(spline);
      }
    }

    if (defined(model.cacheKey)) {
      // Only cache when we can create a unique id
      cachedAnimationSplines[key] = spline;
    }
  }

  return spline;
};

var cachedSkinInverseBindMatrices = {};

ModelAnimationCache.getSkinInverseBindMatrices = function (model, accessor) {
  var key = getAccessorKey(model, accessor);
  var matrices = cachedSkinInverseBindMatrices[key];

  if (!defined(matrices)) {
    // Cache miss
    var gltf = model.gltf;
    var buffers = gltf.buffers;
    var bufferViews = gltf.bufferViews;

    var bufferViewId = accessor.bufferView;
    var bufferView = bufferViews[bufferViewId];
    var bufferId = bufferView.buffer;
    var buffer = buffers[bufferId];
    var source = buffer.extras._pipeline.source;

    var componentType = accessor.componentType;
    var type = accessor.type;
    var count = accessor.count;
    var byteStride = getAccessorByteStride(gltf, accessor);
    var byteOffset = bufferView.byteOffset + accessor.byteOffset;
    var numberOfComponents = numberOfComponentsForType(type);

    matrices = new Array(count);

    if (componentType === WebGLConstants.FLOAT && type === AttributeType.MAT4) {
      for (var i = 0; i < count; ++i) {
        var typedArrayView = ComponentDatatype.createArrayBufferView(
          componentType,
          source.buffer,
          source.byteOffset + byteOffset,
          numberOfComponents
        );
        matrices[i] = Matrix4.fromArray(typedArrayView);
        byteOffset += byteStride;
      }
    }

    cachedSkinInverseBindMatrices[key] = matrices;
  }

  return matrices;
};
export default ModelAnimationCache;
