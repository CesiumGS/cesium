import {
  getSemanticNameFromPropertyName,
  getSetIndexFromPropertyName,
} from "../VertexAttributeSemantic.js";
import { Attribute, Quantization } from "../ModelComponents.js";
import AttributeType from "../AttributeType.js";
import getAccessorByteStride from "../GltfPipeline/getAccessorByteStride.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import ModelUtility from "./Model/ModelUtility.js";

/**
 * @typedef GltfAccessor
 * @property {number} bufferView
 * @property {number} byteOffset
 * @property {number} count
 * @property {ComponentDatatype} componentType
 * @property {string} type
 * @property {boolean} [normalized=false]
 * @property {} [min]
 * @property {} [max]
 */

/**
 * TODO
 */
export default function createModelAttribute({
  gltf,
  accessor,
  attributeSemantic,
}) {
  const attribute = new Attribute();

  const { propertyName } = attributeSemantic;
  attribute.name = propertyName;
  attribute.semantic = getSemanticNameFromPropertyName(propertyName);

  if (attributeSemantic.hasSetIndex) {
    attribute.setIndex = getSetIndexFromPropertyName(propertyName);
  }

  attribute.componentDatatype = accessor.componentType;
  attribute.normalized = accessor.normalized ?? false;
  attribute.count = accessor.count;
  attribute.type = accessor.type;

  // TODO: Ignore byteOffset and stride for draco and spz

  attribute.byteOffset = accessor.byteOffset;
  attribute.byteStride = getAccessorByteStride(gltf, accessor);

  // TODO: Constant?
  const { min, max, quantization } = getMinMaxQuantization(accessor, attribute);
  attribute.min = min;
  attribute.max = max;

  if (defined(quantization)) {
    attribute.quantization = quantization;
  }

  if (attributeSemantic.canQuantize) {
    const { min, max } = dequantizeMinMax(gltf, attribute);
    attribute.min = min;
    attribute.max = max;
  }
}

function getQuantizationDivisor(componentDatatype) {
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return 127;
    case ComponentDatatype.UNSIGNED_BYTE:
      return 255;
    case ComponentDatatype.SHORT:
      return 32767;
    case ComponentDatatype.UNSIGNED_SHORT:
      return 65535;
    default:
      return 1.0;
  }
}

const minimumBoundsByType = {
  VEC2: new Cartesian2(-1.0, -1.0),
  VEC3: new Cartesian3(-1.0, -1.0, -1.0),
  VEC4: new Cartesian4(-1.0, -1.0, -1.0, -1.0),
};

/**
 * TODO
 */
function dequantizeMinMax(gltf, attribute) {
  let min = attribute.min;
  let max = attribute.max;

  const hasKhrMeshQuantization = gltf.extensionsRequired?.includes(
    "KHR_mesh_quantization",
  );

  if (!hasKhrMeshQuantization || !attribute.normalized) {
    return { min, max };
  }

  const MathType = AttributeType.getMathType(attribute.type);
  const divisor = getQuantizationDivisor(attribute.componentDatatype);
  const minimumBound = minimumBoundsByType[attribute.type];

  // dequantized = max(quantized / divisor, -1.0)

  if (defined(min)) {
    min = MathType.divideByScalar(min, divisor, min);
    min = MathType.maximumByComponent(min, minimumBound, min);
  }

  if (defined(max)) {
    max = MathType.divideByScalar(max, divisor, max);
    max = MathType.maximumByComponent(max, minimumBound, max);
  }

  return {
    min,
    max,
  };
}

/**
 * @typedef MinMaxQuantizationResult
 * @property {Number|Cartesian2|Cartesian3|Cartesian4} min
 * @property {Number|Cartesian2|Cartesian3|Cartesian4} max
 * @property {ModelComponents.Quantization|undefined} quantization
 */

/**
 * TODO
 * @returns {MinMaxQuantizationResult}
 * @private
 */
function getMinMaxQuantization(accessor, attribute) {
  const MathType = AttributeType.getMathType(attribute.type);
  const result = {
    min: ModelUtility.fromArray(MathType, accessor.min),
    max: ModelUtility.fromArray(MathType, accessor.max),
    quantization: undefined,
  };

  const extension = accessor.extensions?.WEB3D_quantized_attributes;
  if (!defined(extension)) {
    return result;
  }

  const decodeMatrix = extension.decodeMatrix;
  const decodedMin = ModelUtility.fromArray(MathType, extension.decodedMin);
  const decodedMax = ModelUtility.fromArray(MathType, extension.decodedMax);

  if (defined(decodedMin) && defined(decodedMax)) {
    result.min = decodedMin;
    result.max = decodedMax;
  }

  const quantization = new Quantization();
  quantization.componentDatatype = attribute.componentDatatype;
  quantization.type = attribute.type;

  if (decodeMatrix.length === 4) {
    quantization.quantizedVolumeOffset = decodeMatrix[2];
    quantization.quantizedVolumeStepSize = decodeMatrix[0];
  } else if (decodeMatrix.length === 9) {
    quantization.quantizedVolumeOffset = new Cartesian2(
      decodeMatrix[6],
      decodeMatrix[7],
    );
    quantization.quantizedVolumeStepSize = new Cartesian2(
      decodeMatrix[0],
      decodeMatrix[4],
    );
  } else if (decodeMatrix.length === 16) {
    quantization.quantizedVolumeOffset = new Cartesian3(
      decodeMatrix[12],
      decodeMatrix[13],
      decodeMatrix[14],
    );
    quantization.quantizedVolumeStepSize = new Cartesian3(
      decodeMatrix[0],
      decodeMatrix[5],
      decodeMatrix[10],
    );
  } else if (decodeMatrix.length === 25) {
    quantization.quantizedVolumeOffset = new Cartesian4(
      decodeMatrix[20],
      decodeMatrix[21],
      decodeMatrix[22],
      decodeMatrix[23],
    );
    quantization.quantizedVolumeStepSize = new Cartesian4(
      decodeMatrix[0],
      decodeMatrix[6],
      decodeMatrix[12],
      decodeMatrix[18],
    );
  }

  result.quantization = quantization;
  return result;
}
