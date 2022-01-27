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
import getAccessorByteStride from "./GltfPipeline/getAccessorByteStride.js";
import numberOfComponentsForType from "./GltfPipeline/numberOfComponentsForType.js";
import AttributeType from "./AttributeType.js";

/**
 * @private
 */
function ModelAnimationCache() {}

const dataUriRegex = /^data\:/i;

function getAccessorKey(model, accessor) {
  const gltf = model.gltf;
  const buffers = gltf.buffers;
  const bufferViews = gltf.bufferViews;

  const bufferView = bufferViews[accessor.bufferView];
  const buffer = buffers[bufferView.buffer];

  const byteOffset = bufferView.byteOffset + accessor.byteOffset;
  const byteLength = accessor.count * numberOfComponentsForType(accessor.type);

  const uriKey = dataUriRegex.test(buffer.uri) ? "" : buffer.uri;
  return model.cacheKey + "//" + uriKey + "/" + byteOffset + "/" + byteLength;
}

const cachedAnimationParameters = {};

ModelAnimationCache.getAnimationParameterValues = function (model, accessor) {
  const key = getAccessorKey(model, accessor);
  let values = cachedAnimationParameters[key];

  if (!defined(values)) {
    // Cache miss
    const gltf = model.gltf;

    const buffers = gltf.buffers;
    const bufferViews = gltf.bufferViews;

    const bufferView = bufferViews[accessor.bufferView];
    const bufferId = bufferView.buffer;
    const buffer = buffers[bufferId];
    const source = buffer.extras._pipeline.source;

    const componentType = accessor.componentType;
    const type = accessor.type;
    const numberOfComponents = numberOfComponentsForType(type);
    const count = accessor.count;
    const byteStride = getAccessorByteStride(gltf, accessor);

    values = new Array(count);
    const accessorByteOffset = defaultValue(accessor.byteOffset, 0);
    let byteOffset = bufferView.byteOffset + accessorByteOffset;
    for (let i = 0; i < count; i++) {
      const typedArrayView = ComponentDatatype.createArrayBufferView(
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

const cachedAnimationSplines = {};

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
  const i = (this._lastTimeIndex = this.findTimeInterval(
    time,
    this._lastTimeIndex
  ));
  const times = this._spline.times;
  const steppedTime = time >= times[i + 1] ? times[i + 1] : times[i];
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
  const key = getAnimationSplineKey(model, animationName, samplerName);
  let spline = cachedAnimationSplines[key];

  if (!defined(spline)) {
    const times = input;
    const controlPoints = output;

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

const cachedSkinInverseBindMatrices = {};

ModelAnimationCache.getSkinInverseBindMatrices = function (model, accessor) {
  const key = getAccessorKey(model, accessor);
  let matrices = cachedSkinInverseBindMatrices[key];

  if (!defined(matrices)) {
    // Cache miss
    const gltf = model.gltf;
    const buffers = gltf.buffers;
    const bufferViews = gltf.bufferViews;

    const bufferViewId = accessor.bufferView;
    const bufferView = bufferViews[bufferViewId];
    const bufferId = bufferView.buffer;
    const buffer = buffers[bufferId];
    const source = buffer.extras._pipeline.source;

    const componentType = accessor.componentType;
    const type = accessor.type;
    const count = accessor.count;
    const byteStride = getAccessorByteStride(gltf, accessor);
    let byteOffset = bufferView.byteOffset + accessor.byteOffset;
    const numberOfComponents = numberOfComponentsForType(type);

    matrices = new Array(count);

    if (componentType === WebGLConstants.FLOAT && type === AttributeType.MAT4) {
      for (let i = 0; i < count; ++i) {
        const typedArrayView = ComponentDatatype.createArrayBufferView(
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
