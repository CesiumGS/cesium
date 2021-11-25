import Cartesian3 from "./Cartesian3.js";
import IntersectionTests from "./IntersectionTests.js";
import defined from "./defined.js";
import Ray from "./Ray.js";
import SceneMode from "../Scene/SceneMode.js";
import Cartographic from "./Cartographic.js";

var scratchCartographic = new Cartographic();

function getPosition(encoding, mode, projection, vertices, index, result) {
  var position = encoding.getExaggeratedPosition(vertices, index, result);

  if (defined(mode) && mode !== SceneMode.SCENE3D) {
    var ellipsoid = projection.ellipsoid;
    var positionCartographic = ellipsoid.cartesianToCartographic(
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
  var indicesLength = this._indices.length;
  var vertices = this._vertices;
  var encoding = this._encoding;

  var scratchV0 = new Cartesian3();
  var scratchV1 = new Cartesian3();
  var scratchV2 = new Cartesian3();

  var minT = Number.MAX_VALUE;

  for (var i = 0; i < indicesLength; i += 3) {
    var i0 = this._indices[i];
    var i1 = this._indices[i + 1];
    var i2 = this._indices[i + 2];

    var v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
    var v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
    var v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

    var t = IntersectionTests.rayTriangleParametric(
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
