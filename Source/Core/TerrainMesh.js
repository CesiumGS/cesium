import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import SceneMode from "../Scene/SceneMode.js";
import Cartesian3 from "./Cartesian3.js";
import TriangleSearchIntersectionTester from "./TriangleSearchIntersectionTester.js";

/**
 * A mesh plus related metadata for a single tile of terrain.  Instances of this type are
 * usually created from raw {@link TerrainData}.
 *
 * @alias TerrainMesh
 * @constructor
 *
 * @param {Cartesian3} center The center of the tile.  Vertex positions are specified relative to this center.
 * @param {Float32Array} vertices The vertex data, including positions, texture coordinates, and heights.
 *                       The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
 *                       the Cartesian position of the vertex, H is the height above the ellipsoid, and
 *                       U and V are the texture coordinates.
 * @param {Uint8Array|Uint16Array|Uint32Array} indices The indices describing how the vertices are connected to form triangles.
 * @param {Number} indexCountWithoutSkirts The index count of the mesh not including skirts.
 * @param {Number} vertexCountWithoutSkirts The vertex count of the mesh not including skirts.
 * @param {Number} minimumHeight The lowest height in the tile, in meters above the ellipsoid.
 * @param {Number} maximumHeight The highest height in the tile, in meters above the ellipsoid.
 * @param {BoundingSphere} boundingSphere3D A bounding sphere that completely contains the tile.
 * @param {Cartesian3} occludeePointInScaledSpace The occludee point of the tile, represented in ellipsoid-
 *                     scaled space, and used for horizon culling.  If this point is below the horizon,
 *                     the tile is considered to be entirely below the horizon.
 * @param {Number} [vertexStride=6] The number of components in each vertex.
 * @param {OrientedBoundingBox} [orientedBoundingBox] A bounding box that completely contains the tile.
 * @param {TerrainEncoding} encoding Information used to decode the mesh.
 * @param {Number} exaggeration The amount that this mesh was exaggerated.
 * @param {Number[]} westIndicesSouthToNorth The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
 * @param {Number[]} southIndicesEastToWest The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
 * @param {Number[]} eastIndicesNorthToSouth The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
 * @param {Number[]} northIndicesWestToEast The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
 * @param {TrianglePicking} trianglePicking The triangle picking instance to use.
 *
 * @private
 */
function TerrainMesh(
  center,
  vertices,
  indices,
  indexCountWithoutSkirts,
  vertexCountWithoutSkirts,
  minimumHeight,
  maximumHeight,
  boundingSphere3D,
  occludeePointInScaledSpace,
  vertexStride,
  orientedBoundingBox,
  encoding,
  exaggeration,
  westIndicesSouthToNorth,
  southIndicesEastToWest,
  eastIndicesNorthToSouth,
  northIndicesWestToEast,
  trianglePicking
) {
  /**
   * The center of the tile.  Vertex positions are specified relative to this center.
   * @type {Cartesian3}
   */
  this.center = center;

  /**
   * The vertex data, including positions, texture coordinates, and heights.
   * The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
   * the Cartesian position of the vertex, H is the height above the ellipsoid, and
   * U and V are the texture coordinates.  The vertex data may have additional attributes after those
   * mentioned above when the {@link TerrainMesh#stride} is greater than 6.
   * @type {Float32Array}
   */
  this.vertices = vertices;

  /**
   * The number of components in each vertex.  Typically this is 6 for the 6 components
   * [X, Y, Z, H, U, V], but if each vertex has additional data (such as a vertex normal), this value
   * may be higher.
   * @type {Number}
   */
  this.stride = defaultValue(vertexStride, 6);

  /**
   * The indices describing how the vertices are connected to form triangles.
   * @type {Uint8Array|Uint16Array|Uint32Array}
   */
  this.indices = indices;

  /**
   * The index count of the mesh not including skirts.
   * @type {Number}
   */
  this.indexCountWithoutSkirts = indexCountWithoutSkirts;

  /**
   * The vertex count of the mesh not including skirts.
   * @type {Number}
   */
  this.vertexCountWithoutSkirts = vertexCountWithoutSkirts;

  /**
   * The lowest height in the tile, in meters above the ellipsoid.
   * @type {Number}
   */
  this.minimumHeight = minimumHeight;

  /**
   * The highest height in the tile, in meters above the ellipsoid.
   * @type {Number}
   */
  this.maximumHeight = maximumHeight;

  /**
   * A bounding sphere that completely contains the tile.
   * @type {BoundingSphere}
   */
  this.boundingSphere3D = boundingSphere3D;

  /**
   * The occludee point of the tile, represented in ellipsoid-
   * scaled space, and used for horizon culling.  If this point is below the horizon,
   * the tile is considered to be entirely below the horizon.
   * @type {Cartesian3}
   */
  this.occludeePointInScaledSpace = occludeePointInScaledSpace;

  /**
   * A bounding box that completely contains the tile.
   * @type {OrientedBoundingBox}
   */
  this.orientedBoundingBox = orientedBoundingBox;

  /**
   * Information for decoding the mesh vertices.
   * @type {TerrainEncoding}
   */
  this.encoding = encoding;

  /**
   * The amount that this mesh was exaggerated.
   * @type {Number}
   */
  this.exaggeration = exaggeration;

  /**
   * The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
   * @type {Number[]}
   */
  this.westIndicesSouthToNorth = westIndicesSouthToNorth;

  /**
   * The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
   * @type {Number[]}
   */
  this.southIndicesEastToWest = southIndicesEastToWest;

  /**
   * The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
   * @type {Number[]}
   */
  this.eastIndicesNorthToSouth = eastIndicesNorthToSouth;

  /**
   * The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
   * @type {Number[]}
   */
  this.northIndicesWestToEast = northIndicesWestToEast;

  /**
   * Used when calling {@link TerrainMesh#getPickRay}
   * @type {TrianglePicking}
   * @private
   */
  this._trianglePicking = trianglePicking;

  this._defaultPickStrategy = new TriangleSearchIntersectionTester(
    encoding,
    indices,
    vertices
  );
  if (!this._trianglePicking) {
    this._trianglePicking = this._defaultPickStrategy;
  }
}

/**
 * Gives the point on the mesh where the give ray intersects
 * @param ray
 * @param cullBackFaces
 * @param mode
 * @param projection
 * @returns {Cartesian3}
 */
TerrainMesh.prototype.pickRay = function (
  ray,
  cullBackFaces,
  mode,
  projection
) {
  var trace = window.showPickDetails;

  var traceDetails;
  if (trace) {
    traceDetails = {};
  }
  var oldPickValue = this._defaultPickStrategy.rayIntersect(
    ray,
    cullBackFaces,
    mode,
    projection,
    traceDetails
  );

  /**/
  if (
    traceDetails &&
    oldPickValue &&
    this._trianglePicking &&
    this._trianglePicking._triangles &&
    this._trianglePicking._unpackedOctree
  ) {
    var triangleCount = this._trianglePicking._triangles.length / 6;
    var triangleIdx = -1;
    for (var idx = 0; idx < triangleCount; idx++) {
      var v0 = new Cartesian3();
      var v1 = new Cartesian3();
      var v2 = new Cartesian3();
      this._trianglePicking._triangleVerticesCallback(idx, v0, v1, v2);

      var isV0Match = Cartesian3.equals(
        traceDetails.intersectedTriangle[0],
        v0
      );
      var isV1Match = Cartesian3.equals(
        traceDetails.intersectedTriangle[1],
        v1
      );
      var isV2Match = Cartesian3.equals(
        traceDetails.intersectedTriangle[2],
        v2
      );

      if (isV0Match && isV1Match && isV2Match) {
        triangleIdx = idx;
        break;
      }
    }

    traceDetails.foundTriangleIdx = triangleIdx;
    var foundNodes = this._trianglePicking._unpackedOctree.filter(function (u) {
      return u.triangles.includes(triangleIdx);
    });
    traceDetails.foundNodes = foundNodes;
  }

  /**/

  var canNewPick = mode === SceneMode.SCENE3D && defined(this._trianglePicking);
  var newPickValue;
  if (canNewPick) {
    // console.time("new pick");
    newPickValue = this._trianglePicking.rayIntersect(
      ray,
      cullBackFaces,
      null,
      traceDetails
    );
    // console.timeEnd("new pick");
  }

  // whoops
  if (canNewPick && !Cartesian3.equals(newPickValue, oldPickValue)) {
    // console.error("pick values are different", newPickValue, oldPickValue);
    window.mytraceDetails = traceDetails;
    newPickValue = this._trianglePicking.rayIntersect(
      ray,
      cullBackFaces,
      null,
      null
    );
  }

  // record details on the window
  if (trace) {
    window.lastPickDetails = {
      ray: ray,
      newPickValue: newPickValue,
      oldPickValue: oldPickValue,
      mesh: this,
      traceDetails: traceDetails,
    };
  }

  return newPickValue || oldPickValue;
};

export default TerrainMesh;
