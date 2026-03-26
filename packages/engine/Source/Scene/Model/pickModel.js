import AttributeCompression from "../../Core/AttributeCompression.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import IntersectionTests from "../../Core/IntersectionTests.js";
import Matrix4 from "../../Core/Matrix4.js";
import Ray from "../../Core/Ray.js";
import VerticalExaggeration from "../../Core/VerticalExaggeration.js";
import AttributeType from "../AttributeType.js";
import SceneMode from "../SceneMode.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelReader from "./ModelReader.js";
import ModelUtility from "./ModelUtility.js";

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();
const scratchPickCartographic = new Cartographic();
const scratchBoundingSphere = new BoundingSphere();

/**
 * Reads the position attribute data from a primitive, including
 * quantization metadata and stride/offset info.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of vertex buffers.
 * @returns {object|undefined} An object with { typedArray, numComponents, elementStride, offset, quantization, count }, or undefined if data is unavailable.
 *
 * @private
 */
function readPositionData(primitive, frameState) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );

  if (!defined(positionAttribute)) {
    return undefined;
  }

  const byteOffset = positionAttribute.byteOffset;
  const byteStride = positionAttribute.byteStride;
  const vertexCount = positionAttribute.count;

  let vertices = positionAttribute.typedArray;
  let componentDatatype = positionAttribute.componentDatatype;
  let attributeType = positionAttribute.type;

  const quantization = positionAttribute.quantization;
  if (defined(quantization)) {
    componentDatatype = quantization.componentDatatype;
    attributeType = quantization.type;
  }

  const numComponents = AttributeType.getNumberOfComponents(attributeType);
  const bytes = ComponentDatatype.getSizeInBytes(componentDatatype);
  const isInterleaved =
    !defined(vertices) &&
    defined(byteStride) &&
    byteStride !== numComponents * bytes;

  let elementStride = numComponents;
  let offset = 0;
  if (isInterleaved) {
    elementStride = byteStride / bytes;
    offset = byteOffset / bytes;
  }
  const elementCount = vertexCount * elementStride;

  if (!defined(vertices)) {
    const verticesBuffer = positionAttribute.buffer;

    if (
      defined(verticesBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      vertices = ComponentDatatype.createTypedArray(
        componentDatatype,
        elementCount,
      );
      verticesBuffer.getBufferData(
        vertices,
        isInterleaved ? 0 : byteOffset,
        0,
        elementCount,
      );
    }

    if (quantization && positionAttribute.normalized) {
      vertices = AttributeCompression.dequantize(
        vertices,
        componentDatatype,
        attributeType,
        vertexCount,
      );
    }
  }

  if (!defined(vertices)) {
    return undefined;
  }

  return {
    typedArray: vertices,
    numComponents: numComponents,
    elementStride: elementStride,
    offset: offset,
    quantization: quantization,
    count: vertexCount,
  };
}

/**
 * Reads the index data from a primitive, falling back to GPU readback
 * when the CPU typed array is not available.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of index buffers.
 * @returns {object|undefined} An object with { typedArray, count }, or undefined if data is unavailable.
 *
 * @private
 */
function readIndices(primitive, frameState) {
  if (!defined(primitive.indices)) {
    return undefined;
  }

  let typedArray = primitive.indices.typedArray;
  const count = primitive.indices.count;

  if (!defined(typedArray)) {
    const indicesBuffer = primitive.indices.buffer;
    const indexDatatype = primitive.indices.indexDatatype;

    if (
      defined(indicesBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
        typedArray = new Uint8Array(count);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
        typedArray = new Uint16Array(count);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
        typedArray = new Uint32Array(count);
      }

      indicesBuffer.getBufferData(typedArray);
    }
  }

  if (!defined(typedArray)) {
    return undefined;
  }

  return {
    typedArray: typedArray,
    count: count,
  };
}

/**
 * Decodes a vertex position from the position data, applying quantization
 * dequantization if necessary.
 *
 * @param {Float32Array|Uint16Array|Uint8Array} vertices The vertex data array.
 * @param {number} index The vertex index.
 * @param {number} offset Element offset within a stride for interleaved data.
 * @param {number} elementStride Number of elements per vertex (may be larger than 3 for interleaved).
 * @param {object} [quantization] Quantization metadata from the position attribute.
 * @param {Cartesian3} result Scratch Cartesian3 to store the result.
 * @returns {Cartesian3} The decoded position in local space.
 *
 * @private
 */
function decodePosition(
  vertices,
  index,
  offset,
  elementStride,
  quantization,
  result,
) {
  const i = offset + index * elementStride;
  result.x = vertices[i];
  result.y = vertices[i + 1];
  result.z = vertices[i + 2];

  if (defined(quantization)) {
    if (quantization.octEncoded) {
      result = AttributeCompression.octDecodeInRange(
        result.x,
        result.y,
        quantization.normalizationRange,
        result,
      );

      if (quantization.octEncodedZXY) {
        const x = result.x;
        result.x = result.z;
        result.z = result.y;
        result.y = x;
      }
    } else {
      result = Cartesian3.multiplyComponents(
        result,
        quantization.quantizedVolumeStepSize,
        result,
      );

      result = Cartesian3.add(
        result,
        quantization.quantizedVolumeOffset,
        result,
      );
    }
  }

  return result;
}

/**
 * Find an intersection between a ray and the model surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Model} model The model to pick.
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {number} [verticalExaggeration=1.0] A scalar used to exaggerate the height of a position relative to the ellipsoid. If the value is 1.0 there will be no effect.
 * @param {number} [relativeHeight=0.0] The ellipsoid height relative to which a position is exaggerated. If the value is 0.0 the position will be exaggerated relative to the ellipsoid surface.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid to which the exaggerated position is relative.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
export default function pickModel(
  model,
  ray,
  frameState,
  verticalExaggeration,
  relativeHeight,
  ellipsoid,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  Check.typeOf.object("ray", ray);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (!model._ready || frameState.mode === SceneMode.MORPHING) {
    return;
  }

  let minT = Number.MAX_VALUE;

  ellipsoid = ellipsoid ?? Ellipsoid.default;
  verticalExaggeration = verticalExaggeration ?? 1.0;
  relativeHeight = relativeHeight ?? 0.0;

  ModelReader.forEachPrimitive(
    model,
    frameState,
    function (runtimePrimitive, primitive, transforms, computedModelMatrix) {
      // Bounding sphere early-out for non-instanced primitives
      if (defined(runtimePrimitive.boundingSphere) && transforms.length === 1) {
        const boundingSphere = BoundingSphere.transform(
          runtimePrimitive.boundingSphere,
          computedModelMatrix,
          scratchBoundingSphere,
        );
        const boundsIntersection = IntersectionTests.raySphere(
          ray,
          boundingSphere,
        );
        if (!defined(boundsIntersection)) {
          return;
        }
      }

      if (!defined(primitive.indices)) {
        // Point clouds
        return;
      }

      const posData = readPositionData(primitive, frameState);
      const indexData = readIndices(primitive, frameState);

      if (!defined(indexData) || !defined(posData)) {
        return;
      }

      const indices = indexData.typedArray;
      const indicesLength = indexData.count;
      for (let i = 0; i < indicesLength; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        for (const instanceTransform of transforms) {
          decodePosition(
            posData.typedArray,
            i0,
            posData.offset,
            posData.elementStride,
            posData.quantization,
            scratchV0,
          );
          const v0 = Matrix4.multiplyByPoint(
            instanceTransform,
            scratchV0,
            scratchV0,
          );
          decodePosition(
            posData.typedArray,
            i1,
            posData.offset,
            posData.elementStride,
            posData.quantization,
            scratchV1,
          );
          const v1 = Matrix4.multiplyByPoint(
            instanceTransform,
            scratchV1,
            scratchV1,
          );
          decodePosition(
            posData.typedArray,
            i2,
            posData.offset,
            posData.elementStride,
            posData.quantization,
            scratchV2,
          );
          const v2 = Matrix4.multiplyByPoint(
            instanceTransform,
            scratchV2,
            scratchV2,
          );

          if (verticalExaggeration !== 1.0) {
            VerticalExaggeration.getPosition(
              v0,
              ellipsoid,
              verticalExaggeration,
              relativeHeight,
              v0,
            );
            VerticalExaggeration.getPosition(
              v1,
              ellipsoid,
              verticalExaggeration,
              relativeHeight,
              v1,
            );
            VerticalExaggeration.getPosition(
              v2,
              ellipsoid,
              verticalExaggeration,
              relativeHeight,
              v2,
            );
          }

          const t = IntersectionTests.rayTriangleParametric(
            ray,
            v0,
            v1,
            v2,
            model.backFaceCulling ?? true,
          );

          if (defined(t)) {
            if (t < minT && t >= 0.0) {
              minT = t;
            }
          }
        }
      }
    },
  );

  if (minT === Number.MAX_VALUE) {
    return undefined;
  }

  result = Ray.getPoint(ray, minT, result);
  if (frameState.mode !== SceneMode.SCENE3D) {
    Cartesian3.fromElements(result.y, result.z, result.x, result);

    const projection = frameState.mapProjection;
    const ellipsoid = projection.ellipsoid;

    const cartographic = projection.unproject(result, scratchPickCartographic);
    ellipsoid.cartographicToCartesian(cartographic, result);
  }

  return result;
}
