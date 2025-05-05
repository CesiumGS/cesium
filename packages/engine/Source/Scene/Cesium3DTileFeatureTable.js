import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";

/**
 * @private
 */
function Cesium3DTileFeatureTable(featureTableJson, featureTableBinary) {
  this.json = featureTableJson;
  this.buffer = featureTableBinary;
  this._cachedTypedArrays = {};
  this.featuresLength = 0;
}

function getTypedArrayFromBinary(
  featureTable,
  semantic,
  componentType,
  componentLength,
  count,
  byteOffset,
) {
  const cachedTypedArrays = featureTable._cachedTypedArrays;
  let typedArray = cachedTypedArrays[semantic];
  if (!defined(typedArray)) {
    typedArray = ComponentDatatype.createArrayBufferView(
      componentType,
      featureTable.buffer.buffer,
      featureTable.buffer.byteOffset + byteOffset,
      count * componentLength,
    );
    cachedTypedArrays[semantic] = typedArray;
  }
  return typedArray;
}

function getTypedArrayFromArray(featureTable, semantic, componentType, array) {
  const cachedTypedArrays = featureTable._cachedTypedArrays;
  let typedArray = cachedTypedArrays[semantic];
  if (!defined(typedArray)) {
    typedArray = ComponentDatatype.createTypedArray(componentType, array);
    cachedTypedArrays[semantic] = typedArray;
  }
  return typedArray;
}

Cesium3DTileFeatureTable.prototype.getGlobalProperty = function (
  semantic,
  componentType,
  componentLength,
) {
  const jsonValue = this.json[semantic];
  if (!defined(jsonValue)) {
    return undefined;
  }

  if (defined(jsonValue.byteOffset)) {
    componentType = defaultValue(componentType, ComponentDatatype.UNSIGNED_INT);
    componentLength = defaultValue(componentLength, 1);
    return getTypedArrayFromBinary(
      this,
      semantic,
      componentType,
      componentLength,
      1,
      jsonValue.byteOffset,
    );
  }

  return jsonValue;
};

Cesium3DTileFeatureTable.prototype.hasProperty = function (semantic) {
  return defined(this.json[semantic]);
};

Cesium3DTileFeatureTable.prototype.getPropertyArray = function (
  semantic,
  componentType,
  componentLength,
) {
  const jsonValue = this.json[semantic];
  if (!defined(jsonValue)) {
    return undefined;
  }

  if (defined(jsonValue.byteOffset)) {
    if (defined(jsonValue.componentType)) {
      componentType = ComponentDatatype.fromName(jsonValue.componentType);
    }
    return getTypedArrayFromBinary(
      this,
      semantic,
      componentType,
      componentLength,
      this.featuresLength,
      jsonValue.byteOffset,
    );
  }

  return getTypedArrayFromArray(this, semantic, componentType, jsonValue);
};

Cesium3DTileFeatureTable.prototype.getProperty = function (
  semantic,
  componentType,
  componentLength,
  featureId,
  result,
) {
  const jsonValue = this.json[semantic];
  if (!defined(jsonValue)) {
    return undefined;
  }

  const typedArray = this.getPropertyArray(
    semantic,
    componentType,
    componentLength,
  );

  if (componentLength === 1) {
    return typedArray[featureId];
  }

  for (let i = 0; i < componentLength; ++i) {
    result[i] = typedArray[componentLength * featureId + i];
  }

  return result;
};
export default Cesium3DTileFeatureTable;
