import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import IntersectionTests from "../../Core/IntersectionTests.js";
import Ray from "../../Core/Ray.js";
import Matrix4 from "../../Core/Matrix4.js";
import Transforms from "../../Core/Transforms.js";
import AttributeType from "../AttributeType.js";
import SceneMode from "../SceneMode.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelUtility from "./ModelUtility.js";

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();
const scratchModelMatrix = new Matrix4();
const scratchPickCartographic = new Cartographic();
const scratchInstanceMatrix = new Matrix4();

/**
 * Find an intersection between a ray and the model surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Model} model The model to pick.
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {boolean} [cullBackFaces=true] If false, back faces are not culled and will return an intersection if picked.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
export default function pickModel(
  model,
  ray,
  frameState,
  cullBackFaces,
  result
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

    let nodeComputedTransform = runtimeNode.computedTransform;
    let modelMatrix = sceneGraph.computedModelMatrix;

    const instances = node.instances;
    if (defined(instances)) {
      if (instances.transformInWorldSpace) {
        // Replicate the multiplication order in LegacyInstancingStageVS.
        modelMatrix = Matrix4.multiplyTransformation(
          model.modelMatrix,
          sceneGraph.components.transform,
          modelMatrix
        );

        nodeComputedTransform = Matrix4.multiplyTransformation(
          sceneGraph.axisCorrectionMatrix,
          runtimeNode.computedTransform,
          nodeComputedTransform
        );
      } else {
        // The node transform should be pre-multiplied with the instancing transform.
        modelMatrix = Matrix4.clone(
          sceneGraph.computedModelMatrix,
          modelMatrix
        );
        modelMatrix = Matrix4.multiplyTransformation(
          modelMatrix,
          runtimeNode.computedTransform,
          modelMatrix
        );

        nodeComputedTransform = Matrix4.clone(
          Matrix4.IDENTITY,
          nodeComputedTransform
        );
      }
    }

    let computedModelMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      nodeComputedTransform,
      scratchModelMatrix
    );
    if (frameState.mode !== SceneMode.SCENE3D) {
      computedModelMatrix = Transforms.basisTo2D(
        frameState.mapProjection,
        computedModelMatrix,
        computedModelMatrix
      );
    }

    const transforms = [];
    if (defined(instances)) {
      const transformsCount = instances.attributes[0].count;
      const instanceComponentDatatype =
        instances.attributes[0].componentDatatype;

      const transformElements = 12;
      let transformsTypedArray;
      if (!defined(transformsTypedArray)) {
        const instanceTransformsBuffer = runtimeNode.instancingTransformsBuffer;
        if (defined(instanceTransformsBuffer) && frameState.context.webgl2) {
          transformsTypedArray = ComponentDatatype.createTypedArray(
            instanceComponentDatatype,
            transformsCount * transformElements
          );
          instanceTransformsBuffer.getBufferData(transformsTypedArray);
        }
      }

      for (let i = 0; i < transformsCount; i++) {
        const transform = Matrix4.unpack(
          transformsTypedArray,
          i * transformElements,
          scratchInstanceMatrix
        );
        transform[12] = 0.0;
        transform[13] = 0.0;
        transform[14] = 0.0;
        transform[15] = 1.0;
        transforms.push(transform);
      }
    }

    if (transforms.length === 0) {
      transforms.push(Matrix4.IDENTITY);
    }

    for (let j = 0; j < node.primitives.length; j++) {
      const primitive = node.primitives[j];
      const positionAttribute = ModelUtility.getAttributeBySemantic(
        primitive,
        VertexAttributeSemantic.POSITION
      );
      const vertexCount = positionAttribute.count;

      if (!defined(primitive.indices)) {
        // Point clouds
        continue;
      }

      let indices = primitive.indices.typedArray;
      if (!defined(indices)) {
        const indicesBuffer = primitive.indices.buffer;
        const indicesCount = primitive.indices.count;
        if (defined(indicesBuffer) && frameState.context.webgl2) {
          const useUint8Array = indicesBuffer.sizeInBytes === indicesCount;
          indices = useUint8Array
            ? new Uint8Array(indicesCount)
            : IndexDatatype.createTypedArray(vertexCount, indicesCount);
          indicesBuffer.getBufferData(indices, 0, 0, indicesCount);
        }
        primitive.indices.typedArray = indices;
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
      const elementCount = vertexCount * numComponents;

      if (!defined(vertices)) {
        const verticesBuffer = positionAttribute.buffer;

        if (defined(verticesBuffer) && frameState.context.webgl2) {
          vertices = ComponentDatatype.createTypedArray(
            componentDatatype,
            elementCount
          );
          verticesBuffer.getBufferData(
            vertices,
            positionAttribute.byteOffset,
            0,
            elementCount
          );
        }

        if (quantization && positionAttribute.normalized) {
          vertices = AttributeCompression.dequantize(
            vertices,
            componentDatatype,
            attributeType,
            vertexCount
          );
        }

        positionAttribute.typedArray = vertices;
      }

      const indicesLength = indices.length;
      for (let i = 0; i < indicesLength; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        for (const instanceTransform of transforms) {
          const v0 = getVertexPosition(
            vertices,
            i0,
            numComponents,
            quantization,
            instanceTransform,
            computedModelMatrix,
            scratchV0
          );
          const v1 = getVertexPosition(
            vertices,
            i1,
            numComponents,
            quantization,
            instanceTransform,
            computedModelMatrix,
            scratchV1
          );
          const v2 = getVertexPosition(
            vertices,
            i2,
            numComponents,
            quantization,
            instanceTransform,
            computedModelMatrix,
            scratchV2
          );

          const t = IntersectionTests.rayTriangleParametric(
            ray,
            v0,
            v1,
            v2,
            defaultValue(cullBackFaces, true)
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

    const cart = projection.unproject(result, scratchPickCartographic);
    ellipsoid.cartographicToCartesian(cart, result);
  }

  return result;
}

function getVertexPosition(
  vertices,
  index,
  numComponents,
  quantization,
  instanceTransform,
  computedModelMatrix,
  result
) {
  const i = index * numComponents;
  result.x = vertices[i];
  result.y = vertices[i + 1];
  result.z = vertices[i + 2];

  if (defined(quantization)) {
    if (quantization.octEncoded) {
      result = AttributeCompression.octDecodeInRange(
        result,
        quantization.normalizationRange,
        result
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
        result
      );

      result = Cartesian3.add(
        result,
        quantization.quantizedVolumeOffset,
        result
      );
    }
  }

  result = Matrix4.multiplyByPoint(instanceTransform, result, result);
  result = Matrix4.multiplyByPoint(computedModelMatrix, result, result);

  return result;
}
