import Cartesian3 from "../../Core/Cartesian3.js";
import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import AttributeType from "../AttributeType.js";
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
 * Returns a Map keyed by feature ID, where each value is an object
 * containing arrays of positions and/or colors for all vertices
 * belonging to that feature within the model.
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
 * @returns {Map<number, {positions?: Cartesian3[], colors?: Color[]}>} A Map from feature ID to an object with the requested attribute arrays.
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
  const result = new Map();

  if (!model._ready) {
    return result;
  }

  ModelReader.forEachPrimitive(
    model,
    undefined,
    function (runtimePrimitive, primitive, instanceTransforms) {
      extractAttributesFromPrimitive(
        primitive,
        featureIdLabel,
        instanceTransforms,
        extractPositions,
        extractColors,
        result,
      );
    },
  );

  return result;
};

/**
 * Groups unique vertex indices by feature ID from indices or vertex count.
 * This is shared across all attribute extraction to avoid duplicate work.
 * @private
 */
function buildFeatureVertexMap(indices, featureIdData) {
  const map = new Map();
  if (defined(indices)) {
    const indicesLength = indices.length;
    for (let i = 0; i < indicesLength; i++) {
      const vertexIndex = indices[i];
      const fid = defined(featureIdData) ? featureIdData[vertexIndex] : 0;
      let vertexSet = map.get(fid);
      if (!defined(vertexSet)) {
        vertexSet = new Set();
        map.set(fid, vertexSet);
      }
      vertexSet.add(vertexIndex);
    }
  }
  return map;
}

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
 * Extracts requested attributes from a single primitive, grouped by feature ID.
 * Performs feature ID resolution and vertex grouping once, then reads each
 * requested attribute from the grouped vertices.
 * @private
 */
function extractAttributesFromPrimitive(
  primitive,
  featureIdLabel,
  instanceTransforms,
  extractPositions,
  extractColors,
  result,
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

  // Nothing to extract from this primitive
  if (!defined(posData) && !defined(colorData)) {
    return;
  }

  // Feature ID grouping (done once for all attributes)
  const featureIdMapping = defined(primitive.featureIds)
    ? ModelUtility.getFeatureIdsByLabel(primitive.featureIds, featureIdLabel)
    : undefined;
  const featureIdAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.FEATURE_ID,
    featureIdMapping ? featureIdMapping.setIndex : undefined,
  );
  let featureIdData;
  if (featureIdAttribute) {
    featureIdData = ModelReader.readAttributeAsTypedArray(featureIdAttribute);
  }

  const indexData = ModelReader.readIndicesAsTypedArray(primitive.indices);
  const featureVerticesMap = buildFeatureVertexMap(indexData, featureIdData);

  // Extract from grouped vertices
  for (const [featureId, vertexIndicesSet] of featureVerticesMap) {
    let entry = result.get(featureId);
    if (!defined(entry)) {
      entry = {};
      if (extractPositions) {
        entry.positions = [];
      }
      if (extractColors) {
        entry.colors = [];
      }
      result.set(featureId, entry);
    }

    for (const vertexIndex of vertexIndicesSet) {
      // Positions need per-instance-transform duplication
      if (defined(posData)) {
        for (let t = 0; t < instanceTransforms.length; t++) {
          readPosition(posData, vertexIndex, numPosComponents, scratchPosition);
          const worldPos = Matrix4.multiplyByPoint(
            instanceTransforms[t],
            scratchPosition,
            scratchPosition,
          );
          entry.positions.push(Cartesian3.clone(worldPos));
        }
      }

      // Colors are instance-independent
      if (defined(colorData)) {
        const color = new Color();
        readColor(colorData, vertexIndex, numColorComponents, color);
        entry.colors.push(color);
      }
    }
  }
}

export default ModelGeometryExtractor;
