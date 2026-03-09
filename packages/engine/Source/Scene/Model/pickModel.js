import AttributeCompression from "../../Core/AttributeCompression.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import IntersectionTests from "../../Core/IntersectionTests.js";
import Ray from "../../Core/Ray.js";
import Matrix4 from "../../Core/Matrix4.js";
import Transforms from "../../Core/Transforms.js";
import VerticalExaggeration from "../../Core/VerticalExaggeration.js";
import SceneMode from "../SceneMode.js";
import ModelMeshUtility from "./ModelMeshUtility.js";

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();
const scratchPickCartographic = new Cartographic();
const scratchBoundingSphere = new BoundingSphere();
const scratchNodeTransforms = {
  nodeComputedTransform: new Matrix4(),
  modelMatrix: new Matrix4(),
  computedModelMatrix: new Matrix4(),
};

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
    const instances = node.instances;

    const nodeTransforms = ModelMeshUtility.computeNodeTransforms(
      runtimeNode,
      sceneGraph,
      model,
      scratchNodeTransforms,
    );

    let computedModelMatrix = nodeTransforms.computedModelMatrix;

    if (frameState.mode !== SceneMode.SCENE3D) {
      computedModelMatrix = Transforms.basisTo2D(
        frameState.mapProjection,
        computedModelMatrix,
        computedModelMatrix,
      );
    }

    const transforms = ModelMeshUtility.getInstanceTransforms(
      runtimeNode,
      computedModelMatrix,
      nodeTransforms.nodeComputedTransform,
      nodeTransforms.modelMatrix,
      frameState,
    );

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

      if (!defined(primitive.indices)) {
        // Point clouds
        continue;
      }

      const posData = ModelMeshUtility.readPositionData(primitive, frameState);

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

      if (!defined(indices) || !defined(posData)) {
        return;
      }

      ellipsoid = ellipsoid ?? Ellipsoid.default;
      verticalExaggeration = verticalExaggeration ?? 1.0;
      relativeHeight = relativeHeight ?? 0.0;

      const indicesLength = indices.length;
      for (let i = 0; i < indicesLength; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        for (const instanceTransform of transforms) {
          const v0 = getVertexPosition(
            posData.vertices,
            i0,
            posData.offset,
            posData.elementStride,
            posData.quantization,
            instanceTransform,
            verticalExaggeration,
            relativeHeight,
            ellipsoid,
            scratchV0,
          );
          const v1 = getVertexPosition(
            posData.vertices,
            i1,
            posData.offset,
            posData.elementStride,
            posData.quantization,
            instanceTransform,
            verticalExaggeration,
            relativeHeight,
            ellipsoid,
            scratchV1,
          );
          const v2 = getVertexPosition(
            posData.vertices,
            i2,
            posData.offset,
            posData.elementStride,
            posData.quantization,
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
            model.backFaceCulling ?? true,
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
