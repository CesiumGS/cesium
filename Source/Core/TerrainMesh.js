import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import SceneMode from "../Scene/SceneMode.js";
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
 * @param {Number[]} westIndicesSouthToNorth The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
 * @param {Number[]} southIndicesEastToWest The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
 * @param {Number[]} eastIndicesNorthToSouth The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
 * @param {Number[]} northIndicesWestToEast The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
 * @param {OctreeTrianglePicking} octreeTrianglePicking An octree triangle picking instance if you have one, otherwise defaults to a iterative triangle search
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
  westIndicesSouthToNorth,
  southIndicesEastToWest,
  eastIndicesNorthToSouth,
  northIndicesWestToEast,
  octreeTrianglePicking
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

  this._defaultPickStrategy = new TriangleSearchIntersectionTester(
    encoding,
    indices,
    vertices
  );

  this._octreeTrianglePicking = octreeTrianglePicking;
}

function isCartesianAlmostEqual(a, b) {
  if (!a || !b) {
    return !a === !b;
  }
  return (
    Math.abs(a.x - b.x) < 0.1 &&
    Math.abs(a.y - b.y) < 0.1 &&
    Math.abs(a.z - b.z) < 0.1
  );
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

  var newPickValue, oldPickValue;

  if (this._octreeTrianglePicking) {
    newPickValue = this._octreeTrianglePicking.rayIntersect(
      ray,
      cullBackFaces,
      null,
      traceDetails
    );
  }

  if (!window.disableDefaultPickStategy) {
    oldPickValue = this._defaultPickStrategy.rayIntersect(
      ray,
      cullBackFaces,
      mode,
      projection,
      traceDetails
    );
  }

  // whoops
  if (
    !window.disableDefaultPickStategy &&
    this._octreeTrianglePicking &&
    !isCartesianAlmostEqual(newPickValue, oldPickValue)
  ) {
    console.error("pick values are different", newPickValue, oldPickValue);
    var newPickAgain = this._octreeTrianglePicking.rayIntersect(
      ray,
      cullBackFaces,
      null,
      traceDetails
    );
    var oldPickAgain = this._defaultPickStrategy.rayIntersect(
      ray,
      cullBackFaces,
      mode,
      projection,
      traceDetails
    );
    console.error("after running again", newPickAgain, oldPickAgain);
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
