import AttributeCompression from "../../Core/AttributeCompression.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
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
const scratchNodeComputedTransform = new Matrix4();
const scratchModelMatrix = new Matrix4();
const scratchcomputedModelMatrix = new Matrix4();
const scratchPickCartographic = new Cartographic();
const scratchBoundingSphere = new BoundingSphere();

// Scratch matrix for computeInverseTransformedRay
const scratchInverseTransform = new Matrix4();

/**
 * Find an intersection between a ray and the model surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Model} model The model to pick.
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
export default function pickModelNew(model, ray, frameState, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  Check.typeOf.object("ray", ray);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (!model._ready || frameState.mode === SceneMode.MORPHING) {
    return;
  }

  const sceneGraph = model.sceneGraph;
  const runtimeNodes = sceneGraph._runtimeNodes;
  const numRuntimeNodes = runtimeNodes.length;
  if (numRuntimeNodes === 0) {
    return undefined;
  }

  // Fetch the values that are constant throughout this
  // function, or assign default values to them
  const backfaceCulling = model.backFaceCulling ?? true;
  const usesWebgl2 = frameState.context.webgl2;

  let minT = Number.MAX_VALUE;
  let closestTransform;

  const nodes = sceneGraph._runtimeNodes;
  for (let i = 0; i < numRuntimeNodes; i++) {
    const runtimeNode = nodes[i];
    const primitivesLength = runtimeNode.runtimePrimitives.length;
    if (primitivesLength === 0) {
      continue;
    }

    const runtimeNodeMatrices = computeRuntimeNodeMatrices(
      model,
      runtimeNode,
      frameState,
    );

    const transforms = computeInstancesTransforms(
      runtimeNode,
      runtimeNodeMatrices,
      usesWebgl2,
    );

    const computedModelMatrix = runtimeNodeMatrices.computedModelMatrix;

    const node = runtimeNode.node;
    const instances = node.instances;

    for (let j = 0; j < primitivesLength; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];
      const primitive = runtimePrimitive.primitive;

      if (!defined(primitive.indices)) {
        // Point clouds
        continue;
      }

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

      const pickedGeometry = obtainPickedGeometry(primitive, usesWebgl2);
      if (!defined(pickedGeometry)) {
        continue;
      }

      const closest = computeClosest(
        ray,
        pickedGeometry,
        transforms,
        backfaceCulling,
      );
      if (closest.minT < minT && closest.minT >= 0.0) {
        minT = closest.minT;
        closestTransform = closest.closestTransform;
      }
    }
  }

  if (minT === Number.MAX_VALUE) {
    return undefined;
  }

  const transformedRay = computeInverseTransformedRay(ray, closestTransform);
  result = Ray.getPoint(transformedRay, minT, result);
  Matrix4.multiplyByPoint(closestTransform, result, result);
  if (frameState.mode !== SceneMode.SCENE3D) {
    // XXX TODO What the ... does this line do?
    Cartesian3.fromElements(result.y, result.z, result.x, result);

    const projection = frameState.mapProjection;
    const ellipsoid = projection.ellipsoid;
    const cartographic = projection.unproject(result, scratchPickCartographic);
    ellipsoid.cartographicToCartesian(cartographic, result);
  }
  return result;
}

/**
 * Computes the matrices that are defined by the given runtime node.
 *
 * These will be used for computing the transforms that are applied
 * (e.g. via instancing) to the primitives. The transforms will be
 * computed in `computeInstancesTransforms`, and when there is
 * no instancing, then this will only be the `computedModelMatrix`.
 *
 * The difference between these matrices has to be looked up in
 * the runtime node, but they are related to different transform
 * methods in I3DM vs. EXT_mesh_gpu_instancing.
 *
 * - computedModelMatrix
 * - modelMatrix
 * - nodeComputedTransform
 *
 * @param {Model} model The model
 * @param {ModelRuntimeNode} runtimeNode The runtime node
 * @param {FrameState} frameState The frame state
 * @returns The matrices
 */
function computeRuntimeNodeMatrices(model, runtimeNode, frameState) {
  const sceneGraph = model.sceneGraph;
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

  const computedModelMatrix = Matrix4.multiplyTransformation(
    modelMatrix,
    nodeComputedTransform,
    scratchcomputedModelMatrix,
  );

  if (frameState.mode !== SceneMode.SCENE3D) {
    Transforms.basisTo2D(
      frameState.mapProjection,
      computedModelMatrix,
      computedModelMatrix,
    );
  }
  return {
    computedModelMatrix: computedModelMatrix,
    modelMatrix: modelMatrix,
    nodeComputedTransform: nodeComputedTransform,
  };
}

/**
 * Compute the transform matrices for the instances that are defined
 * by the given runtime node.
 *
 * If the node of the given runtime node does not define `instances`
 * information, then this will an array that only contains the
 * `computedModelMatrix` from the given runtime node matrices.
 *
 * Otherwise, it will be an array that contains one transform
 * for each instance that is rendered.
 *
 * @param {ModelRuntimeNode} runtimeNode The runtime node
 * @param {object} runtimeNodeMatrices The runtime node matrices,
 * as computed with computeRuntimeNodeMatrices
 * @param {boolean} usesWebgl2 Whether the rendering context
 * uses WebGL 2
 * @returns The instance transforms
 */
function computeInstancesTransforms(
  runtimeNode,
  runtimeNodeMatrices,
  usesWebgl2,
) {
  const node = runtimeNode.node;
  const instances = node.instances;
  const computedModelMatrix = runtimeNodeMatrices.computedModelMatrix;
  if (!defined(instances)) {
    return [computedModelMatrix];
  }

  const modelMatrix = runtimeNodeMatrices.modelMatrix;
  const nodeComputedTransform = runtimeNodeMatrices.nodeComputedTransform;

  const transforms = [];
  const transformsCount = instances.attributes[0].count;
  const instanceComponentDatatype = instances.attributes[0].componentDatatype;

  const transformElements = 12;
  let transformsTypedArray = runtimeNode.transformsTypedArray;
  if (!defined(transformsTypedArray)) {
    const instanceTransformsBuffer = runtimeNode.instancingTransformsBuffer;
    if (defined(instanceTransformsBuffer) && usesWebgl2) {
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

  // Mimic the behavior of the old implementation.
  // The case that there are no transforms here should probably
  // never occur, but it does for `EXT_mesh_gpu_instancing`
  if (transforms.length === 0) {
    transforms.push(computedModelMatrix);
  }
  return transforms;
}

/**
 * Obtains the geometry from the given primitive that will be used
 * for the actual picking intersection tests.
 *
 * This may return `undefined` if the indices or vertices could
 * not be obtained
 *
 * - indices: An array of indices, with three consecutive indices
 *   describing one triangle
 * - vertices: An array of vertices. These might still be quantized
 * - vertexIndexOffset: An offset into the vertices array where
 *   to start reading the vertex positions
 * - numComponents: The number of components per element in the
 *   vertices array (probably 3 or 4...)
 * - quantization: The `ModelComponents.Quantization` info for
 *   the vertices
 *
 * @param {ModelComponents.Primitive} primitive The primitive
 * @param {boolean} usesWebgl2 Whether the context uses WebGL2
 * @returns The picked geometry
 */
function obtainPickedGeometry(primitive, usesWebgl2) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );
  const byteOffset = positionAttribute.byteOffset;
  const byteStride = positionAttribute.byteStride;
  const vertexCount = positionAttribute.count;

  let indices = primitive.indices.typedArray;
  if (!defined(indices)) {
    const indicesBuffer = primitive.indices.buffer;
    const indicesCount = primitive.indices.count;
    const indexDatatype = primitive.indices.indexDatatype;
    if (defined(indicesBuffer) && usesWebgl2) {
      if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
        indices = new Uint8Array(indicesCount);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
        indices = new Uint16Array(indicesCount);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
        indices = new Uint32Array(indicesCount);
      }
      indicesBuffer.getBufferData(indices);

      //console.log("Storing indices");
      primitive.indices.typedArray = indices;
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
  let vertexIndexOffset = 0;
  if (isInterleaved) {
    elementStride = byteStride / bytes;
    vertexIndexOffset = byteOffset / bytes;
  }
  const elementCount = vertexCount * elementStride;

  if (!defined(vertices)) {
    const verticesBuffer = positionAttribute.buffer;

    if (defined(verticesBuffer) && usesWebgl2) {
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

      //console.log("Storing vertices");
      positionAttribute.typedArray = vertices;
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

  return {
    indices: indices,
    vertices: vertices,
    vertexIndexOffset: vertexIndexOffset,
    numComponents: numComponents,
    quantization: quantization,
  };
}

/**
 * Compute information about the intersection of the given ray with
 * the given geometry that is closest to the origin of the ray.
 *
 * The `pickedGeometry` is the geometry that is obtained from a
 * runtime node via `obtainPickedGeometry`.
 *
 * The given transforms are all transforms with which the geometry
 * will be rendered (and therefore, all transforms which should
 * be taken into account during the intersection test).
 *
 * The result will be a structure that contains
 * minT: The minimum parametric distance of an intersection along the ray
 * closestTransform: The transform for which the closest intersection was found
 *
 * @param {Ray} ray The ray
 * @param {object} pickedGeometry The picked geometry
 * @param {Matrix4[]} transforms The transforms
 * @param {boolean} backfaceCulling Whether backface culling is enabled
 * @returns The information about the closest intersection
 */
function computeClosest(ray, pickedGeometry, transforms, backfaceCulling) {
  let minT = Number.MAX_VALUE;
  let closestTransform;

  const indices = pickedGeometry.indices;
  const vertices = pickedGeometry.vertices;
  const vertexIndexOffset = pickedGeometry.vertexIndexOffset;
  const numComponents = pickedGeometry.numComponents;
  const quantization = pickedGeometry.quantization;

  const numTransforms = transforms.length;
  const transformedRays = [];
  for (let t = 0; t < numTransforms; t++) {
    const transform = transforms[t];
    const transformedRay = computeInverseTransformedRay(ray, transform);
    transformedRays.push(transformedRay);
  }

  const indicesLength = indices.length;
  for (let i = 0; i < indicesLength; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const v0 = getVertexPosition(
      vertices,
      i0,
      vertexIndexOffset,
      numComponents,
      quantization,
      scratchV0,
    );
    const v1 = getVertexPosition(
      vertices,
      i1,
      vertexIndexOffset,
      numComponents,
      quantization,
      scratchV1,
    );
    const v2 = getVertexPosition(
      vertices,
      i2,
      vertexIndexOffset,
      numComponents,
      quantization,
      scratchV2,
    );

    for (let r = 0; r < numTransforms; r++) {
      const transformedRay = transformedRays[r];

      const t = IntersectionTests.rayTriangleParametric(
        transformedRay,
        v0,
        v1,
        v2,
        backfaceCulling,
      );

      if (defined(t)) {
        if (t < minT && t >= 0.0) {
          minT = t;
          closestTransform = transforms[r];
        }
      }
    }
  }
  return {
    closestTransform: closestTransform,
    minT: minT,
  };
}

/**
 * Compute the result of transforming the given ray with the inverse
 * of the given transform.
 *
 * Note that the direction vector of the resulting vector may not
 * have unit length.
 *
 * @param {Ray} ray
 * @param {Matrix4} transform
 * @returns The transformed ray
 */
function computeInverseTransformedRay(ray, transform) {
  const inverseTransform = Matrix4.inverse(transform, scratchInverseTransform);
  const transformedRay = new Ray();
  transformedRay.origin = Matrix4.multiplyByPoint(
    inverseTransform,
    ray.origin,
    transformedRay.origin,
  );
  transformedRay.direction = Matrix4.multiplyByPointAsVector(
    inverseTransform,
    ray.direction,
    transformedRay.direction,
  );
  return transformedRay;
}

function getVertexPosition(
  vertices,
  index,
  vertexIndexOffset,
  numElements,
  quantization,
  result,
) {
  const i = vertexIndexOffset + index * numElements;
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
  return result;
}
