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
import GeometryResult from "./GeometryResult.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";

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
 * Returns an array of {@link GeometryResult} objects, one per primitive in
 * the model, containing the requested vertex attributes.
 * <p>
 * Attributes to extract are specified with the
 * <code>options.attributes</code> array. Each element is a semantic string
 * following glTF conventions (e.g. <code>"POSITION"</code>,
 * <code>"COLOR_0"</code>, <code>"_FEATURE_ID"</code>). Set-indexed
 * attributes use the <code>SEMANTIC_N</code> convention
 * (e.g. <code>"TEXCOORD_1"</code>).
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {Model} options.model The model from which to extract geometry.
 * @param {string} [options.featureIdLabel="featureId_0"] The label of the primitive-level feature ID set to match against.
 * @param {string} [options.instanceFeatureIdLabel="instanceFeatureId_0"] The label of the instance-level feature ID set to match against.
 * @param {string[]} [options.attributes=undefined] The vertex attributes to extract. Each element is a semantic string (e.g. <code>"POSITION"</code>, <code>"COLOR_0"</code>, <code>"_FEATURE_ID"</code>). Set-indexed attributes use the <code>SEMANTIC_N</code> convention (e.g. <code>"TEXCOORD_1"</code>). If omitted, all attributes on each primitive are extracted.
 * @param {boolean} [options.extractIndices=false] Whether to extract vertex indices.
 * @returns {GeometryResult[]} An array of geometry results, one per primitive.
 *
 * @exception {DeveloperError} A WebGL 2 context is required.
 * @exception {DeveloperError} The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true.
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
  if (!options.model._ready) {
    throw new DeveloperError(
      "The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true.",
    );
  }
  //>>includeEnd('debug');

  const model = options.model;
  const featureIdLabel = options.featureIdLabel ?? "featureId_0";
  const instanceFeatureIdLabel =
    options.instanceFeatureIdLabel ?? "instanceFeatureId_0";
  const extractIndices = options.extractIndices ?? false;

  // Build the normalized attribute request list.
  const attributeRequests = normalizeAttributeRequests(options);

  const result = [];

  ModelReader.forEachPrimitive(
    model,
    { instanceFeatureIdLabel: instanceFeatureIdLabel },
    function (runtimePrimitive, primitive, instances) {
      const entry = extractAttributesFromPrimitive(
        primitive,
        featureIdLabel,
        instances,
        extractIndices,
        attributeRequests,
      );
      result.push(entry);
    },
  );

  return result;
};

/**
 * Builds the attribute key used in the values and types maps.
 * For attributes without a set index the key is the semantic string itself
 * (e.g. <code>"POSITION"</code>). For set-indexed attributes the index is
 * appended (e.g. <code>"COLOR_0"</code>, <code>"TEXCOORD_1"</code>).
 *
 * @param {string} semantic The vertex attribute semantic string.
 * @param {number} [setIndex] The set index, if applicable.
 * @returns {string} The attribute key.
 * @private
 */
function getAttributeKey(semantic, setIndex) {
  if (defined(setIndex)) {
    return `${semantic}_${setIndex}`;
  }
  return semantic;
}

/**
 * Parses an attribute string into a semantic and optional set index.
 * <p>
 * Strings like <code>"COLOR_0"</code> or <code>"_FEATURE_ID_1"</code> are
 * split into <code>{ semantic: "COLOR", setIndex: 0 }</code> and
 * <code>{ semantic: "_FEATURE_ID", setIndex: 1 }</code> respectively.
 * Strings without a recognized set-indexed suffix (e.g. <code>"POSITION"</code>)
 * are returned as-is.
 * </p>
 *
 * @param {string} str The attribute string to parse.
 * @returns {AttributeRequest} The parsed attribute request.
 * @private
 */
function parseAttributeKey(str) {
  const match = str.match(/^(.+)_(\d+)$/);
  if (match) {
    const baseSemantic = match[1];
    if (VertexAttributeSemantic.hasSetIndex(baseSemantic)) {
      return {
        semantic: baseSemantic,
        setIndex: parseInt(match[2], 10),
      };
    }
  }
  return { semantic: str };
}

/**
 * @typedef {object} AttributeRequest
 * @property {string} semantic The vertex attribute semantic string.
 * @property {number} [setIndex] The set index, if applicable.
 * @private
 */

/**
 * Normalizes the caller-supplied options into
 * a uniform array of {@link AttributeRequest} objects. If no attributes are
 * specified, returns <code>undefined</code> to signal that all attributes
 * on each primitive should be extracted.
 *
 * @param {object} options The options passed to {@link ModelGeometryExtractor.getGeometryForModel}.
 * @returns {AttributeRequest[]|undefined} The normalized attribute requests, or <code>undefined</code> if <code>options.attributes</code> is not defined.
 * @private
 */
function normalizeAttributeRequests(options) {
  if (defined(options.attributes)) {
    return options.attributes.map(function (item) {
      return parseAttributeKey(item);
    });
  }
  return undefined;
}

/**
 * Builds an {@link AttributeRequest} array from all attributes present on a
 * primitive, so that every available attribute is extracted.
 *
 * @param {ModelComponents.Primitive} primitive The primitive to inspect.
 * @returns {AttributeRequest[]} One request per attribute on the primitive.
 * @private
 */
function buildRequestsFromPrimitive(primitive) {
  const requests = [];
  const attributes = primitive.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    requests.push({
      semantic: attribute.semantic,
      setIndex: attribute.setIndex,
    });
  }
  return requests;
}

/**
 * Reads a color from a flat vertex array at the given element index.
 * If the element stride is 4, the alpha component is read from the array;
 * otherwise it defaults to 1.0.
 *
 * @param {TypedArray} typedArray The flat array of color components.
 * @param {number} index The vertex index (element index, not byte offset).
 * @param {number} elementStride The number of components per color element (3 or 4).
 * @returns {Color} A new Color instance.
 * @private
 */
function readColor(typedArray, index, elementStride) {
  const i = index * elementStride;
  const r = typedArray[i];
  const g = typedArray[i + 1];
  const b = typedArray[i + 2];
  const a = elementStride === 4 ? typedArray[i + 3] : 1.0;
  return new Color(r, g, b, a);
}

/**
 * Unpacks a single element from a flat typed array using the math type's
 * <code>unpack</code> method. For SCALAR attributes the raw number is returned.
 *
 * @param {*} MathType The CesiumJS math type (e.g. Cartesian3, Cartesian2, Matrix4) or <code>Number</code> for scalars.
 * @param {TypedArray} typedArray The flat array of components.
 * @param {number} index The element index.
 * @param {number} numComponents The number of components per element.
 * @returns {*} The unpacked value.
 * @private
 */
function unpackElement(MathType, typedArray, index, numComponents) {
  if (MathType === Number) {
    return typedArray[index];
  }
  return MathType.unpack(typedArray, index * numComponents);
}

/**
 * Extracts requested attributes from a single primitive, returning a
 * {@link GeometryResult}.
 *
 * @param {ModelComponents.Primitive} primitive The primitive to extract attributes from.
 * @param {string} featureIdLabel The label of the feature ID set to resolve.
 * @param {ModelReader.Instance[]} instances Per-instance data (transforms and optional feature IDs).
 * @param {boolean} extractIndices Whether to extract vertex indices.
 * @param {AttributeRequest[]|undefined} [attributeRequests] The attributes to extract. If undefined, all attributes on the primitive are extracted.
 * @returns {GeometryResult} The extracted geometry.
 * @private
 */
function extractAttributesFromPrimitive(
  primitive,
  featureIdLabel,
  instances,
  extractIndices,
  attributeRequests,
) {
  // No explicit attributes requested — extract all attributes on the primitive.
  const requestAll = !defined(attributeRequests);

  if (requestAll) {
    attributeRequests = buildRequestsFromPrimitive(primitive);
  }

  const entry = new GeometryResult();
  let count;

  // ---- Resolve each requested attribute ----
  // Each resolved item contains the data needed for the per-vertex loop.
  const outputAttributes = [];

  for (let r = 0; r < attributeRequests.length; r++) {
    const request = attributeRequests[r];
    const semantic = request.semantic;
    let setIndex = request.setIndex;

    // Feature IDs are resolved by label lookup and require some extra logic
    if (semantic === VertexAttributeSemantic.FEATURE_ID) {
      const featureIdSet = defined(primitive.featureIds)
        ? ModelUtility.getFeatureIdsByLabel(
            primitive.featureIds,
            featureIdLabel,
          )
        : undefined;
      if (!defined(featureIdSet)) {
        continue;
      }
      if ("setIndex" in featureIdSet) {
        // Case: FeatureIdAttribute
        setIndex = featureIdSet.setIndex;
      } else if ("offset" in featureIdSet) {
        // Case: FeatureIdImplicitRange
        resolveFromImplicitRange(
          featureIdSet,
          primitive,
          semantic,
          entry,
          outputAttributes,
        );
        continue;
      }
    }

    const attribute = ModelUtility.getAttributeBySemantic(
      primitive,
      semantic,
      setIndex,
    );
    if (!defined(attribute) || !defined(attribute.count)) {
      continue;
    }

    if (!defined(count)) {
      count = attribute.count;
    }

    resolveFromAttribute(
      attribute,
      semantic,
      setIndex,
      entry,
      outputAttributes,
    );
  }

  // ---- Indices ----
  let indices;
  if (extractIndices && defined(primitive.indices)) {
    indices = ModelReader.readIndicesAsTypedArray(primitive.indices);
  }

  entry.primitiveType = primitive.primitiveType ?? PrimitiveType.TRIANGLES;
  entry.count = defined(count) ? count : 0;
  entry.instances = instances.length;

  if (defined(indices)) {
    const indexArray = [];
    for (let i = 0; i < indices.length; i++) {
      indexArray.push(indices[i]);
    }
    entry.indices = indexArray;
  }

  // Pre-compute whether feature IDs were requested and whether any
  // per-vertex feature ID attribute was resolved.
  const featureIdRequested =
    requestAll ||
    attributeRequests.some(function (r) {
      return r.semantic === VertexAttributeSemantic.FEATURE_ID;
    });

  const scratchPosition = new Cartesian3();

  // ---- Per-instance, per-vertex extraction ----
  if (outputAttributes.length > 0) {
    // For each instance
    for (let t = 0; t < instances.length; t++) {
      const transform = instances[t].transform;
      const instanceFeatureId = instances[t].featureId;
      const hasInstanceFeatureId = defined(instanceFeatureId);
      // For each attribute
      for (let a = 0; a < outputAttributes.length; a++) {
        const attr = outputAttributes[a];
        const values = entry.attributeValues.get(attr.key);
        // For each vertex
        for (let i = 0; i < count; i++) {
          if (attr.semantic === VertexAttributeSemantic.POSITION) {
            // POSITION: apply instance transform to world space
            const pos = Cartesian3.unpack(
              attr.typedArray,
              i * attr.numComponents,
            );
            Matrix4.multiplyByPoint(transform, pos, scratchPosition);
            values.push(Cartesian3.clone(scratchPosition));
          } else if (attr.semantic === VertexAttributeSemantic.COLOR) {
            // COLOR: produce Color objects (handles RGB vs RGBA)
            values.push(readColor(attr.typedArray, i, attr.numComponents));
          } else if (
            attr.semantic === VertexAttributeSemantic.FEATURE_ID &&
            hasInstanceFeatureId
          ) {
            // Skip as we have per-instance feature IDs that has precedence
            // @see Model.fromGltfAsync options.instanceFeatureIdLabel
          } else {
            // Generic path: use MathType.unpack (works for all types including SCALAR feature IDs)
            values.push(
              unpackElement(
                attr.MathType,
                attr.typedArray,
                i,
                attr.numComponents,
              ),
            );
          }
        }
      }
      // If feature IDs were requested and per-instance feature IDs are present, these should override per-primitive feature IDs.
      // @see Model.fromGltfAsync options.instanceFeatureIdLabel
      if (featureIdRequested && hasInstanceFeatureId) {
        const featureIdKey = getAttributeKey(
          VertexAttributeSemantic.FEATURE_ID,
        );
        if (!entry.attributeValues.has(featureIdKey)) {
          entry.attributeNames.push(featureIdKey);
          entry.attributeTypes.set(featureIdKey, {
            type: AttributeType.SCALAR,
            componentDatatype: ComponentDatatype.FLOAT,
          });
          entry.attributeValues.set(featureIdKey, []);
        }
        const values = entry.attributeValues.get(featureIdKey);
        for (let i = 0; i < count; i++) {
          values.push(instanceFeatureId);
        }
      }
    }
  }

  return entry;
}

/**
 * Resolves a standard vertex attribute into an output attribute descriptor,
 * registering the attribute on the given {@link GeometryResult}.
 *
 * @param {ModelComponents.Attribute} attribute The attribute to read.
 * @param {string} semantic The vertex attribute semantic string.
 * @param {number} [setIndex] The set index, if applicable.
 * @param {GeometryResult} entry The geometry result to register the attribute on.
 * @param {object[]} outputAttributes The array to push the resolved descriptor into.
 * @private
 */
function resolveFromAttribute(
  attribute,
  semantic,
  setIndex,
  entry,
  outputAttributes,
) {
  const typedArray = ModelReader.readAttributeAsTypedArray(attribute);
  if (!defined(typedArray)) {
    return;
  }

  const numComponents = AttributeType.getNumberOfComponents(attribute.type);
  const MathType = AttributeType.getMathType(attribute.type);
  const key = getAttributeKey(semantic, setIndex);

  // Record type information
  entry.attributeNames.push(key);
  entry.attributeTypes.set(key, {
    type: attribute.type,
    componentDatatype: attribute.componentDatatype,
  });
  entry.attributeValues.set(key, []);

  outputAttributes.push({
    key: key,
    semantic: semantic,
    typedArray: typedArray,
    numComponents: numComponents,
    MathType: MathType,
  });
}

/**
 * Resolves a FeatureIdImplicitRange set into an output attribute descriptor,
 * registering the attribute on the given {@link GeometryResult}.
 *
 * @param {FeatureIdImplicitRange} featureIdSet The implicit range feature ID set.
 * @param {ModelComponents.Primitive} primitive The primitive (used as attributeOwner).
 * @param {string} semantic The semantic string for the attribute.
 * @param {GeometryResult} entry The geometry result to register the attribute on.
 * @param {object[]} outputAttributes The array to push the resolved descriptor into.
 * @private
 */
function resolveFromImplicitRange(
  featureIdSet,
  primitive,
  semantic,
  entry,
  outputAttributes,
) {
  const typedArray = ModelReader.readImplicitRangeAsTypedArray(
    featureIdSet,
    primitive,
  );
  if (!defined(typedArray)) {
    return;
  }
  const key = getAttributeKey(semantic);
  entry.attributeNames.push(key);
  entry.attributeTypes.set(key, {
    type: AttributeType.SCALAR,
    componentDatatype: ComponentDatatype.FLOAT,
  });
  entry.attributeValues.set(key, []);
  outputAttributes.push({
    key: key,
    semantic: semantic,
    typedArray: typedArray,
    numComponents: 1,
    MathType: Number,
  });
}

export default ModelGeometryExtractor;
