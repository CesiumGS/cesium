import AttributeCompression from "../../Core/AttributeCompression.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import IntersectionTests from "../../Core/IntersectionTests.js";
import Ray from "../../Core/Ray.js";
import Matrix4 from "../../Core/Matrix4.js";
import Transforms from "../../Core/Transforms.js";
import VerticalExaggeration from "../../Core/VerticalExaggeration.js";
import AttributeType from "../AttributeType.js";
import SceneMode from "../SceneMode.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelUtility from "./ModelUtility.js";

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();
const scratchNodeComputedTransform = new Matrix4();
const scratchModelMatrix = new Matrix4();
const scratchcomputedModelMatrix = new Matrix4();
const scratchPickCartographic = new Cartographic();
const scratchBoundingSphere = new BoundingSphere();

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
  const sceneGraph = model.sceneGraph;

  const nodes = sceneGraph._runtimeNodes;
  for (let i = 0; i < nodes.length; i++) {
    const runtimeNode = nodes[i];
    const node = runtimeNode.node;

    let nodeComputedTransform = Matrix4.clone(
      runtimeNode.computedTransform,
      scratchNodeComputedTransform,
    );
    let modelMatrix = Matrix4.clone(
      sceneGraph.computedModelMatrix,
      scratchModelMatrix,
    );

    const instances = node.instances;
    if (defined(instances)) {
      if (instances.transformInWorldSpace) {
        // Replicate the multiplication order in LegacyInstancingStageVS.
        modelMatrix = Matrix4.multiplyTransformation(
          model.modelMatrix,
          sceneGraph.components.transform,
          modelMatrix,
        );

        nodeComputedTransform = Matrix4.multiplyTransformation(
          sceneGraph.axisCorrectionMatrix,
          runtimeNode.computedTransform,
          nodeComputedTransform,
        );
      }
    }

    let computedModelMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      nodeComputedTransform,
      scratchcomputedModelMatrix,
    );

    if (frameState.mode !== SceneMode.SCENE3D) {
      computedModelMatrix = Transforms.basisTo2D(
        frameState.mapProjection,
        computedModelMatrix,
        computedModelMatrix,
      );
    }

    const transforms = [];
    if (defined(instances)) {
      const transformsCount = instances.attributes[0].count;
      const instanceComponentDatatype =
        instances.attributes[0].componentDatatype;

      const transformElements = 12;
      let transformsTypedArray = runtimeNode.transformsTypedArray;
      if (!defined(transformsTypedArray)) {
        const instanceTransformsBuffer = runtimeNode.instancingTransformsBuffer;
        if (defined(instanceTransformsBuffer) && frameState.context.webgl2) {
          transformsTypedArray = ComponentDatatype.createTypedArray(
            instanceComponentDatatype,
            transformsCount * transformElements,
          );
          instanceTransformsBuffer.getBufferData(transformsTypedArray);
        }
      }

      if (defined(transformsTypedArray)) {
        for (let i = 0; i < transformsCount; i++) {
          const index = i * transformElements;

          const transform = new Matrix4(
            transformsTypedArray[index],
            transformsTypedArray[index + 1],
            transformsTypedArray[index + 2],
            transformsTypedArray[index + 3],
            transformsTypedArray[index + 4],
            transformsTypedArray[index + 5],
            transformsTypedArray[index + 6],
            transformsTypedArray[index + 7],
            transformsTypedArray[index + 8],
            transformsTypedArray[index + 9],
            transformsTypedArray[index + 10],
            transformsTypedArray[index + 11],
            0,
            0,
            0,
            1,
          );

          if (instances.transformInWorldSpace) {
            Matrix4.multiplyTransformation(
              transform,
              nodeComputedTransform,
              transform,
            );
            Matrix4.multiplyTransformation(modelMatrix, transform, transform);
          } else {
            Matrix4.multiplyTransformation(
              transform,
              computedModelMatrix,
              transform,
            );
          }
          transforms.push(transform);
        }
      }
    }

    if (transforms.length === 0) {
      transforms.push(computedModelMatrix);
    }

    const primitivesLength = runtimeNode.runtimePrimitives.length;
    for (let j = 0; j < primitivesLength; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];
      const primitive = runtimePrimitive.primitive;

      if (defined(runtimePrimitive.boundingSphere) && !defined(instances)) {
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
          continue;
        }
      }

      const positionAttribute = ModelUtility.getAttributeBySemantic(
        primitive,
        VertexAttributeSemantic.POSITION,
      );
      const byteOffset = positionAttribute.byteOffset;
      const byteStride = positionAttribute.byteStride;
      const vertexCount = positionAttribute.count;

      if (!defined(primitive.indices)) {
        // Point clouds
        continue;
      }

      let indices = primitive.indices.typedArray;
      if (!defined(indices)) {
        const indicesBuffer = primitive.indices.buffer;
        const indicesCount = primitive.indices.count;
        const indexDatatype = primitive.indices.indexDatatype;
        if (defined(indicesBuffer) && frameState.context.webgl2) {
          if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
            indices = new Uint8Array(indicesCount);
          } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
            indices = new Uint16Array(indicesCount);
          } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
            indices = new Uint32Array(indicesCount);
          }

          indicesBuffer.getBufferData(indices);
        }
      }

      let vertices = positionAttribute.typedArray;
      let componentDatatype = positionAttribute.componentDatatype;
      let attributeType = positionAttribute.type;

      const quantization = positionAttribute.quantization;
      if (defined(quantization)) {
        componentDatatype = positionAttribute.quantization.componentDatatype;
        attributeType = positionAttribute.quantization.type;
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

        if (defined(verticesBuffer) && frameState.context.webgl2) {
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

      if (!defined(indices) || !defined(vertices)) {
        return;
      }

      ellipsoid = defaultValue(ellipsoid, Ellipsoid.default);
      verticalExaggeration = defaultValue(verticalExaggeration, 1.0);
      relativeHeight = defaultValue(relativeHeight, 0.0);

      const indicesLength = indices.length;
      for (let i = 0; i < indicesLength; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        for (const instanceTransform of transforms) {
          const v0 = getVertexPosition(
            vertices,
            i0,
            offset,
            elementStride,
            quantization,
            instanceTransform,
            verticalExaggeration,
            relativeHeight,
            ellipsoid,
            scratchV0,
          );
          const v1 = getVertexPosition(
            vertices,
            i1,
            offset,
            elementStride,
            quantization,
            instanceTransform,
            verticalExaggeration,
            relativeHeight,
            ellipsoid,
            scratchV1,
          );
          const v2 = getVertexPosition(
            vertices,
            i2,
            offset,
            elementStride,
            quantization,
            instanceTransform,
            verticalExaggeration,
            relativeHeight,
            ellipsoid,
            scratchV2,
          );

          const t = IntersectionTests.rayTriangleParametric(
            ray,
            v0,
            v1,
            v2,
            defaultValue(model.backFaceCulling, true),
          );

          if (defined(t)) {
            if (t < minT && t >= 0.0) {
              minT = t;
            }
          }
        }
      }
    }
  }

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

function getVertexPosition(
  vertices,
  index,
  offset,
  numElements,
  quantization,
  instanceTransform,
  verticalExaggeration,
  relativeHeight,
  ellipsoid,
  result,
) {
  const i = offset + index * numElements;
  result.x = vertices[i];
  result.y = vertices[i + 1];
  result.z = vertices[i + 2];

  if (defined(quantization)) {
    if (quantization.octEncoded) {
      result = AttributeCompression.octDecodeInRange(
        result,
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

  result = Matrix4.multiplyByPoint(instanceTransform, result, result);

  if (verticalExaggeration !== 1.0) {
    VerticalExaggeration.getPosition(
      result,
      ellipsoid,
      verticalExaggeration,
      relativeHeight,
      result,
    );
  }

  return result;
}
