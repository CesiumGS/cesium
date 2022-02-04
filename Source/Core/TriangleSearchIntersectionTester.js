import Cartesian3 from "./Cartesian3.js";
import IntersectionTests from "./IntersectionTests.js";
import defined from "./defined.js";
import Ray from "./Ray.js";
import SceneMode from "../Scene/SceneMode.js";
import Cartographic from "./Cartographic.js";

const scratchCartographic = new Cartographic();

function getPosition(encoding, mode, projection, vertices, index, result) {
  let position = encoding.getExaggeratedPosition(vertices, index, result);

  if (defined(mode) && mode !== SceneMode.SCENE3D) {
    const ellipsoid = projection.ellipsoid;
    const positionCartographic = ellipsoid.cartesianToCartographic(
      position,
      scratchCartographic
    );
    position = projection.project(positionCartographic, result);
    position = Cartesian3.fromElements(
      position.z,
      position.x,
      position.y,
      result
    );
  }

  return position;
}

/**
 *
 * @param encoding
 * @param indices
 * @param vertices
 * @constructor
 */
function TriangleSearchIntersectionTester(encoding, indices, vertices) {
  this._encoding = encoding;
  this._indices = indices;
  this._vertices = vertices;
}

TriangleSearchIntersectionTester.prototype.rayIntersect = function (
  ray,
  cullBackFaces,
  mode,
  projection,
  traceDetails
) {
  const indicesLength = this._indices.length;
  const vertices = this._vertices;
  const encoding = this._encoding;

  const scratchV0 = new Cartesian3();
  const scratchV1 = new Cartesian3();
  const scratchV2 = new Cartesian3();

  let minT = Number.MAX_VALUE;

  for (let i = 0; i < indicesLength; i += 3) {
    const i0 = this._indices[i];
    const i1 = this._indices[i + 1];
    const i2 = this._indices[i + 2];

    const v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
    const v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
    const v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

    const t = IntersectionTests.rayTriangleParametric(
      ray,
      v0,
      v1,
      v2,
      cullBackFaces
    );
    if (defined(t) && t < minT && t >= 0.0) {
      minT = t;
      if (traceDetails) {
        traceDetails.oldIntersectedTriangle = [
          Cartesian3.clone(v0),
          Cartesian3.clone(v1),
          Cartesian3.clone(v2),
        ];
      }
    }
  }
  return minT !== Number.MAX_VALUE ? Ray.getPoint(ray, minT) : undefined;
};

export default TriangleSearchIntersectionTester;
