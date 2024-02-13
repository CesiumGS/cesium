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
const scratchInverseTransform = new Matrix4();

/**
 * Find an intersection between a ray and the model surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Model} model The model to pick.
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {number} [verticalExaggeration=1.0] A scalar used to exaggerate the height of a position relative to the ellipsoid. If the value is 1.0 there will be no effect.
 * @param {number} [relativeHeight=0.0] The ellipsoid height relative to which a position is exaggerated. If the value is 0.0 the position will be exaggerated relative to the ellipsoid surface.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to which the exaggerated position is relative.
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
  result
) {
  const before = performance.now();
  const r = pickModelImpl(
    model,
    ray,
    frameState,
    verticalExaggeration,
    relativeHeight,
    ellipsoid,
    result
  );
  const after = performance.now();
  console.log(`took ${after - before}ms`);
  return r;
}

/**
 * Computes the matrices that are defined by the given runtime node
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

  const nodeComputedTransform = Matrix4.clone(
    runtimeNode.computedTransform,
    scratchNodeComputedTransform
  );
  const modelMatrix = Matrix4.clone(
    sceneGraph.computedModelMatrix,
    scratchModelMatrix
  );

  const instances = node.instances;
  if (defined(instances)) {
    if (instances.transformInWorldSpace) {
      // Replicate the multiplication order in LegacyInstancingStageVS.
      Matrix4.multiplyTransformation(
        model.modelMatrix,
        sceneGraph.components.transform,
        modelMatrix
      );

      Matrix4.multiplyTransformation(
        sceneGraph.axisCorrectionMatrix,
        runtimeNode.computedTransform,
        nodeComputedTransform
      );
    }
  }

  const computedModelMatrix = Matrix4.multiplyTransformation(
    modelMatrix,
    nodeComputedTransform,
    scratchcomputedModelMatrix
  );

  if (frameState.mode !== SceneMode.SCENE3D) {
    Transforms.basisTo2D(
      frameState.mapProjection,
      computedModelMatrix,
      computedModelMatrix
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
  usesWebgl2
) {
  const node = runtimeNode;
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
        transformsCount * transformElements
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
        1
      );

      if (instances.transformInWorldSpace) {
        Matrix4.multiplyTransformation(
          transform,
          nodeComputedTransform,
          transform
        );
        Matrix4.multiplyTransformation(modelMatrix, transform, transform);
      } else {
        Matrix4.multiplyTransformation(
          transform,
          computedModelMatrix,
          transform
        );
      }
      transforms.push(transform);
    }
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
    VertexAttributeSemantic.POSITION
  );
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
    }
  }
  if (!indices) {
    return undefined;
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

  if (!defined(vertices)) {
    const verticesBuffer = positionAttribute.buffer;

    if (defined(verticesBuffer) && usesWebgl2) {
      const elementCount = vertexCount * numComponents;
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
  }
  if (!vertices) {
    return undefined;
  }

  return {
    indices: indices,
    vertices: vertices,
    numComponents: numComponents,
    quantization: quantization,
  };
}

function pickModelImpl(
  model,
  ray,
  frameState,
  verticalExaggeration,
  relativeHeight,
  ellipsoid,
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

  const sceneGraph = model.sceneGraph;
  const runtimeNodes = sceneGraph._runtimeNodes;
  const numRuntimeNodes = runtimeNodes.length;
  if (numRuntimeNodes === 0) {
    return undefined;
  }

  // Fetch the values that are constant throughout this
  // function, ot assign default values to them
  const backfaceCulling = defaultValue(model.backFaceCulling, true);
  const usesWebgl2 = frameState.context.webgl2;

  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  verticalExaggeration = defaultValue(verticalExaggeration, 1.0);
  relativeHeight = defaultValue(relativeHeight, 0.0);

  let minT = Number.MAX_VALUE;
  for (let i = 0; i < numRuntimeNodes; i++) {
    const runtimeNode = runtimeNodes[i];
    const primitivesLength = runtimeNode.runtimePrimitives.length;
    if (primitivesLength === 0) {
      continue;
    }

    const runtimeNodeMatrices = computeRuntimeNodeMatrices(
      model,
      runtimeNode,
      frameState
    );
    const transforms = computeInstancesTransforms(
      runtimeNode,
      runtimeNodeMatrices,
      usesWebgl2
    );

    const computedModelMatrix = runtimeNodeMatrices.computedModelMatrix;

    const node = runtimeNode.node;
    const instances = node.instances;

    for (let j = 0; j < primitivesLength; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];
      if (defined(runtimePrimitive.boundingSphere) && !defined(instances)) {
        const boundingSphere = BoundingSphere.transform(
          runtimePrimitive.boundingSphere,
          computedModelMatrix,
          scratchBoundingSphere
        );
        const boundsIntersection = IntersectionTests.raySphere(
          ray,
          boundingSphere
        );
        if (!defined(boundsIntersection)) {
          continue;
        }
      }

      const primitive = runtimePrimitive.primitive;
      if (!defined(primitive.indices)) {
        // Point clouds
        continue;
      }

      const pickedGeometry = obtainPickedGeometry(primitive, usesWebgl2);
      if (!defined(pickedGeometry)) {
        return;
      }
      const indices = pickedGeometry.indices;
      const vertices = pickedGeometry.vertices;
      const numComponents = pickedGeometry.numComponents;
      const quantization = pickedGeometry.quantization;

      const TRANSFORM_FIX = true;

      if (TRANSFORM_FIX) {
        const numTransforms = transforms.length;
        for (let t = 0; t < numTransforms; t++) {
          const transform = transforms[t];
          const inverseTransform = Matrix4.inverse(
            transform,
            scratchInverseTransform
          );
          const transformedRay = new Ray();
          transformedRay.origin = Matrix4.multiplyByPoint(
            inverseTransform,
            ray.origin,
            transformedRay.origin
          );
          transformedRay.direction = Matrix4.multiplyByPointAsVector(
            inverseTransform,
            ray.direction,
            transformedRay.direction
          );

          const indicesLength = indices.length;
          for (let i = 0; i < indicesLength; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];

            const v0 = getVertexPositionRaw(
              vertices,
              i0,
              numComponents,
              quantization,
              verticalExaggeration,
              relativeHeight,
              ellipsoid,
              scratchV0
            );
            const v1 = getVertexPositionRaw(
              vertices,
              i1,
              numComponents,
              quantization,
              verticalExaggeration,
              relativeHeight,
              ellipsoid,
              scratchV1
            );
            const v2 = getVertexPositionRaw(
              vertices,
              i2,
              numComponents,
              quantization,
              verticalExaggeration,
              relativeHeight,
              ellipsoid,
              scratchV2
            );

            //console.log(`Got ${v0} ${v1} ${v2} for ${i0} ${i1} ${i2} with transform\n${transform}\nray ${transformedRay.origin} ${transformedRay.direction}`);

            const t = IntersectionTests.rayTriangleParametric(
              transformedRay,
              v0,
              v1,
              v2,
              backfaceCulling
            );

            if (defined(t)) {
              //console.log(`Got one at index ${i}`);
              if (t < minT && t >= 0.0) {
                minT = t;
              }
            }
          }
        }
      } else {
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
              verticalExaggeration,
              relativeHeight,
              ellipsoid,
              scratchV0
            );
            const v1 = getVertexPosition(
              vertices,
              i1,
              numComponents,
              quantization,
              instanceTransform,
              verticalExaggeration,
              relativeHeight,
              ellipsoid,
              scratchV1
            );
            const v2 = getVertexPosition(
              vertices,
              i2,
              numComponents,
              quantization,
              instanceTransform,
              verticalExaggeration,
              relativeHeight,
              ellipsoid,
              scratchV2
            );

            //console.log(`Got ${v0} ${v1} ${v2} for ${i0} ${i1} ${i2} with transform\n${instanceTransform}\nray ${ray.origin} ${ray.direction}`);

            const t = IntersectionTests.rayTriangleParametric(
              ray,
              v0,
              v1,
              v2,
              backfaceCulling
            );

            if (defined(t)) {
              //console.log(`Got one at index ${i}`);
              if (t < minT && t >= 0.0) {
                minT = t;
              }
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
  numComponents,
  quantization,
  instanceTransform,
  verticalExaggeration,
  relativeHeight,
  ellipsoid,
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
  if (verticalExaggeration !== 1.0) {
    VerticalExaggeration.getPosition(
      result,
      ellipsoid,
      verticalExaggeration,
      relativeHeight,
      result
    );
  }

  return result;
}

function getVertexPositionRaw(
  vertices,
  index,
  numComponents,
  quantization,
  verticalExaggeration,
  relativeHeight,
  ellipsoid,
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
  if (verticalExaggeration !== 1.0) {
    VerticalExaggeration.getPosition(
      result,
      ellipsoid,
      verticalExaggeration,
      relativeHeight,
      result
    );
  }

  return result;
}
