import Cartesian3 from "../../Core/Cartesian3.js";
import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import AttributeType from "../AttributeType.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelReader from "./ModelReader.js";
import ModelUtility from "./ModelUtility.js";

const scratchPosition = new Cartesian3();

/**
 * Extracts vertex geometry (positions, colors, etc.) from a loaded Model.
 * <p>
 * Uses GPU readback (WebGL 2) to read vertex data from GPU buffers when
 * CPU-side typed arrays are not available.
 * </p>
 *
 * @namespace ModelGeometryExtractor
 * @private
 */
const ModelGeometryExtractor = {};

/**
 * @typedef {object} ModelGeometryExtractor.GeometryResult
 * @property {Cartesian3[]} [positions] The vertex positions for the feature.
 * @property {Color[]} [colors] The vertex colors for the feature.
 * @property {number[]} [featureIds] The per-vertex feature IDs.
 * @property {PrimitiveType} [primitiveType] The primitive type (e.g. TRIANGLES, LINES, POINTS) of the geometry.
 */

/**
 * Returns an array of geometry results, one per primitive in the model,
 * containing arrays of positions, colors, and/or feature IDs for all
 * vertices within each primitive.
 * <p>
 * This combines extraction of multiple vertex attributes in a single
 * scene graph traversal, avoiding duplicate work when both positions
 * and colors are needed.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {Model} options.model The model from which to extract geometry.
 * @param {string} [options.featureIdLabel="featureId_0"] The label of the feature ID set to match against.
 * @param {boolean} [options.extractPositions=true] Whether to extract vertex positions.
 * @param {boolean} [options.extractColors=false] Whether to extract vertex colors.
 * @param {boolean} [options.uniqueIndices=true] Whether to deduplicate vertex indices before extracting.
 * @returns {ModelGeometryExtractor.GeometryResult[]} An array of geometry results, one per primitive.
 *
 * @private
 */
ModelGeometryExtractor.getGeometryForModel = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options)) {
    throw new DeveloperError("options is required.");
  }
  if (!defined(options.model)) {
    throw new DeveloperError("options.model is required.");
  }
  //>>includeEnd('debug');

  const model = options.model;
  const featureIdLabel = options.featureIdLabel ?? "featureId_0";
  const extractPositions = options.extractPositions ?? true;
  const extractColors = options.extractColors ?? false;
  const uniqueIndices = options.uniqueIndices ?? true;
  const result = [];

  if (!model._ready) {
    return result;
  }

  ModelReader.forEachPrimitive(
    model,
    undefined,
    function (runtimePrimitive, primitive, instanceTransforms) {
      const entry = extractAttributesFromPrimitive(
        primitive,
        featureIdLabel,
        instanceTransforms,
        extractPositions,
        extractColors,
        uniqueIndices,
      );
      if (entry) {
        result.push(entry);
      }
    },
  );

  return result;
};

/**
 * Reads a 3D position from a flat vertex array at the given element index.
 *
 * @param {TypedArray} vertices The flat array of vertex components.
 * @param {number} index The vertex index (element index, not byte offset).
 * @param {number} elementStride The number of components per vertex element.
 * @param {Cartesian3} result The object into which to store the position.
 * @returns {Cartesian3} The modified result parameter.
 * @private
 */
function readPosition(vertices, index, elementStride, result) {
  const i = index * elementStride;
  result.x = vertices[i];
  result.y = vertices[i + 1];
  result.z = vertices[i + 2];
  return result;
}

/**
 * Reads a color from a flat vertex array at the given element index.
 * If the element stride is 4, the alpha component is read from the array;
 * otherwise it defaults to 1.0.
 *
 * @param {TypedArray} typedArray The flat array of color components.
 * @param {number} index The vertex index (element index, not byte offset).
 * @param {number} elementStride The number of components per color element (3 or 4).
 * @param {Color} result The object into which to store the color.
 * @returns {Color} The modified result parameter.
 * @private
 */
function readColor(typedArray, index, elementStride, result) {
  const i = index * elementStride;
  result.red = typedArray[i];
  result.green = typedArray[i + 1];
  result.blue = typedArray[i + 2];
  result.alpha = elementStride === 4 ? typedArray[i + 3] : 1.0;
  return result;
}

/**
 * Reads a single feature ID value from a typed array.
 *
 * @param {TypedArray} typedArray The typed array containing feature ID data.
 * @param {number} index The vertex index to read the feature ID for.
 * @returns {number} The feature ID at the given index.
 * @private
 */
function readFeatureId(typedArray, index) {
  return typedArray[index];
}

/**
 * Removes duplicate indices from a typed array, preserving first-occurrence order.
 *
 * @param {TypedArray} indices The index array to deduplicate.
 * @returns {number[]} A new array containing only unique indices.
 * @private
 */
function removeDuplicateIndices(indices) {
  return [...new Set(indices)];
}

/**
 * Extracts requested attributes from a single primitive.
 * Reads positions, colors, and feature IDs for each vertex, expanding
 * indexed geometry and applying instance transforms when present.
 *
 * @param {ModelComponents.Primitive} primitive The primitive to extract attributes from.
 * @param {string} featureIdLabel The label of the feature ID set to resolve.
 * @param {Matrix4[]} instanceTransforms The instance transform matrices to apply to positions.
 * @param {boolean} extractPositions Whether to extract vertex positions.
 * @param {boolean} extractColors Whether to extract vertex colors.
 * @param {boolean} uniqueIndices Whether to deduplicate vertex indices before extracting.
 * @returns {ModelGeometryExtractor.GeometryResult|undefined} The extracted geometry, or undefined if nothing could be extracted.
 * @private
 */
function extractAttributesFromPrimitive(
  primitive,
  featureIdLabel,
  instanceTransforms,
  extractPositions,
  extractColors,
  uniqueIndices,
) {
  // Look up requested attributes
  let posData;
  let numPosComponents;
  if (extractPositions) {
    const positionAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.POSITION,
    );
    if (defined(positionAttribute)) {
      numPosComponents = AttributeType.getNumberOfComponents(
        positionAttribute.type,
      );
      posData = ModelReader.readAttributeAsTypedArray(positionAttribute);
    }
  }
  const hasPos = defined(posData);

  let colorData;
  let numColorComponents;
  if (extractColors) {
    const colorAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.COLOR,
      0,
    );
    if (defined(colorAttribute)) {
      numColorComponents = AttributeType.getNumberOfComponents(
        colorAttribute.type,
      );
      colorData = ModelReader.readAttributeAsTypedArray(colorAttribute);
    }
  }
  const hasColor = defined(colorData);

  const extractFeatureIds = true;

  // Feature ID grouping (done once for all attributes)
  let featureIdData;
  if (extractFeatureIds) {
    const featureIdMapping = defined(primitive.featureIds)
      ? ModelUtility.getFeatureIdsByLabel(primitive.featureIds, featureIdLabel)
      : undefined;
    const featureIdAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.FEATURE_ID,
      featureIdMapping ? featureIdMapping.setIndex : undefined,
    );
    if (defined(featureIdAttribute)) {
      featureIdData = ModelReader.readAttributeAsTypedArray(featureIdAttribute);
    }
  }
  const hasFeatureId = defined(featureIdData);

  const extractIndices = true;

  let indices;
  if (extractIndices) {
    indices = ModelReader.readIndicesAsTypedArray(primitive.indices);
  }
  const hasIndices = defined(indices);

  const entry = {};
  entry.primitiveType = primitive.primitiveType ?? PrimitiveType.TRIANGLES;
  if (hasPos) {
    entry.positions = [];
  }
  if (hasColor) {
    entry.colors = [];
  }
  if (hasFeatureId) {
    entry.featureIds = [];
  }

  if (hasIndices) {
    const vertexIndices = uniqueIndices
      ? removeDuplicateIndices(indices)
      : indices;
    for (let t = 0; t < instanceTransforms.length; t++) {
      for (let i = 0; i < vertexIndices.length; i++) {
        const vertexIndex = vertexIndices[i];
        if (defined(posData)) {
          readPosition(posData, vertexIndex, numPosComponents, scratchPosition);
          const worldPos = Matrix4.multiplyByPoint(
            instanceTransforms[t],
            scratchPosition,
            scratchPosition,
          );
          entry.positions.push(Cartesian3.clone(worldPos));
        }
        if (defined(colorData)) {
          const color = new Color();
          readColor(colorData, vertexIndex, numColorComponents, color);
          entry.colors.push(color);
        }
        if (defined(featureIdData)) {
          const fid = readFeatureId(featureIdData, vertexIndex);
          entry.featureIds.push(fid);
        }
      }
    }
  }
  return entry;
}

export default ModelGeometryExtractor;
