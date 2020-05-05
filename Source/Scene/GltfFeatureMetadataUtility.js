import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";

/**
 * Utility functions for the feature metadata extension.
 *
 * @exports GltfFeatureMetadataUtility
 * @private
 */
var GltfFeatureMetadataUtility = {};

GltfFeatureMetadataUtility.getBufferDataFromPipelineExtras = function (buffer) {
  if (!defined(buffer.extras)) {
    return undefined;
  }

  var pipelineExtras = buffer.extras._pipeline;

  if (!defined(pipelineExtras) || !defined(pipelineExtras.source)) {
    return undefined;
  }

  return pipelineExtras.source;
};

// TODO: doc
GltfFeatureMetadataUtility.getBufferViewDataFromPipelineExtras = function (
  gltf,
  bufferView
) {
  // TODO : temporary - want gltf-pipeline to stop using extras._pipeline eventually
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];
  var bufferData = GltfFeatureMetadataUtility.getBufferDataFromPipelineExtras(
    buffer
  );
  if (!defined(bufferData)) {
    return undefined;
  }

  return GltfFeatureMetadataUtility.getBufferViewData(bufferView, bufferData);
};

GltfFeatureMetadataUtility.getBufferViewData = function (
  bufferView,
  bufferData
) {
  var bufferViewByteOffset = defaultValue(bufferView.byteOffset, 0);
  var byteOffset = bufferData.byteOffset + bufferViewByteOffset;
  // TODO: probably want to do a deep copy of the buffer if the buffer is referenced by other things in the glTF because otherwise the buffer won't get freed
  return bufferData.subarray(byteOffset, byteOffset + bufferView.byteLength);
};

GltfFeatureMetadataUtility.getAccessorBuffer = function (gltf, accessor) {
  var bufferViewId = accessor.bufferView;
  if (!defined(bufferViewId)) {
    return undefined;
  }

  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  return buffer;
};

var NumberOfComponentByType = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

GltfFeatureMetadataUtility.getTypedArrayForAccessor = function (
  gltf,
  accessor,
  bufferData
) {
  if (!defined(bufferData) || !defined(accessor.bufferView)) {
    return undefined;
  }

  var bufferView = gltf.bufferViews[accessor.bufferView];
  var byteOffset =
    bufferData.byteOffset + bufferView.byteOffset + accessor.byteOffset;

  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;

  var componentCount = NumberOfComponentByType[type];
  var length = count * componentCount;

  return ComponentDatatype.createArrayBufferView(
    componentType,
    bufferData,
    byteOffset,
    length
  );
};

export default GltfFeatureMetadataUtility;
