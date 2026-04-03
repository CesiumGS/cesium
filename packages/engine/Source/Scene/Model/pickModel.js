import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
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

  const mapProjection =
    frameState.mode !== SceneMode.SCENE3D
      ? frameState.mapProjection
      : undefined;

  ModelReader.forEachPrimitive(
    model,
    mapProjection,
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

      let vertices;
      let numPosComponents;
      const positionAttribute = ModelUtility.getAttributeBySemantic(
        primitive,
        VertexAttributeSemantic.POSITION,
      );
      if (defined(positionAttribute)) {
        numPosComponents = AttributeType.getNumberOfComponents(
          positionAttribute.type,
        );
        vertices = ModelReader.readAttributeAsTypedArray(positionAttribute);
      }

      let indices;
      if (defined(primitive.indices)) {
        indices = ModelReader.readIndicesAsTypedArray(primitive.indices);
      }

      if (!defined(indices) || !defined(vertices)) {
        return;
      }

      const indicesLength = indices.length;
      for (let i = 0; i < indicesLength; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        for (const instanceTransform of transforms) {
          readPosition(vertices, i0, numPosComponents, scratchV0);
          const v0 = Matrix4.multiplyByPoint(
            instanceTransform,
            scratchV0,
            scratchV0,
          );
          readPosition(vertices, i1, numPosComponents, scratchV1);
          const v1 = Matrix4.multiplyByPoint(
            instanceTransform,
            scratchV1,
            scratchV1,
          );
          readPosition(vertices, i2, numPosComponents, scratchV2);
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
