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
 * @property {number[]} [indices] The vertex indices for the primitive.
 * @property {PrimitiveType} [primitiveType] The primitive type (e.g. TRIANGLES, LINES, POINTS) of the geometry.
 * @property {number} [count] The number of vertices in the primitive.
 * @property {number} [instances] The number of instances of this primitive.
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
 * @param {boolean} [options.extractIndices=false] Whether to extract vertex indices.
 * @param {boolean} [options.extractFeatureIds=false] Whether to extract per-vertex feature IDs.
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
  const extractIndices = options.extractIndices ?? false;
  const extractFeatureIds = options.extractFeatureIds ?? false;
  const result = [];

  if (!model._ready) {
    return result;
  }

  ModelReader.forEachPrimitive(
    model,
    undefined,
    function (runtimePrimitive, primitive, instances) {
      const entry = extractAttributesFromPrimitive(
        primitive,
        featureIdLabel,
        instances,
        extractPositions,
        extractColors,
        extractIndices,
        extractFeatureIds,
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
 * Reads a single index value from a typed array.
 *
 * @param {TypedArray} typedArray The typed array containing index data.
 * @param {number} index The position in the array to read.
 * @returns {number} The index value at the given position.
 * @private
 */
function readIndex(typedArray, index) {
  return typedArray[index];
}

/**
 * Extracts requested attributes from a single primitive.
 * Reads positions, colors, and feature IDs for each vertex, expanding
 * indexed geometry and applying instance transforms when present.
 *
 * @param {ModelComponents.Primitive} primitive The primitive to extract attributes from.
 * @param {string} featureIdLabel The label of the feature ID set to resolve.
 * @param {ModelReader.Instance[]} instances Per-instance data (transforms and optional feature IDs).
 * @param {boolean} extractPositions Whether to extract vertex positions.
 * @param {boolean} extractColors Whether to extract vertex colors.
 * @param {boolean} extractIndices Whether to extract vertex indices.
 * @param {boolean} extractFeatureIds Whether to extract per-vertex feature IDs.
 * @returns {ModelGeometryExtractor.GeometryResult|undefined} The extracted geometry, or undefined if nothing could be extracted.
 * @private
 */
function extractAttributesFromPrimitive(
  primitive,
  featureIdLabel,
  instances,
  extractPositions,
  extractColors,
  extractIndices,
  extractFeatureIds,
) {
  let count;

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
      if (!defined(count) && defined(positionAttribute.count)) {
        count = positionAttribute.count;
      }
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
      if (!defined(count) && defined(colorAttribute.count)) {
        count = colorAttribute.count;
      }
    }
  }
  const hasColor = defined(colorData);

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
      if (!defined(count) && defined(featureIdAttribute.count)) {
        count = featureIdAttribute.count;
      }
    }
  }
  const hasFeatureId = defined(featureIdData);

  let indices;
  if (extractIndices && defined(primitive.indices)) {
    indices = ModelReader.readIndicesAsTypedArray(primitive.indices);
  }
  const hasIndices = defined(indices);

  const entry = {};
  entry.primitiveType = primitive.primitiveType ?? PrimitiveType.TRIANGLES;
  entry.count = defined(count) ? count : 0;
  entry.instances = instances.length;

  if (hasIndices) {
    for (let i = 0; i < indices.length; i++) {
      const idx = readIndex(indices, i);
      (entry.indices ??= []).push(idx);
    }
  }

  if (defined(count)) {
    for (let t = 0; t < instances.length; t++) {
      for (let i = 0; i < count; i++) {
        const vertexIndex = i;
        if (hasPos) {
          readPosition(posData, vertexIndex, numPosComponents, scratchPosition);
          const worldPos = Matrix4.multiplyByPoint(
            instances[t].transform,
            scratchPosition,
            scratchPosition,
          );
          (entry.positions ??= []).push(Cartesian3.clone(worldPos));
        }
        if (hasColor) {
          const color = new Color();
          readColor(colorData, vertexIndex, numColorComponents, color);
          (entry.colors ??= []).push(color);
        }
        // TODO: is it possible to have both featureid and instance featureid? how to handle
        if (hasFeatureId) {
          const fid = readFeatureId(featureIdData, vertexIndex);
          (entry.featureIds ??= []).push(fid);
        } else if (defined(instances[t].featureId)) {
          (entry.featureIds ??= []).push(instances[t].featureId);
        }
      }
    }
  }
  return entry;
}

export default ModelGeometryExtractor;
