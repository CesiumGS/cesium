import SceneMode from "../Scene/SceneMode.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Matrix4 from "./Matrix4.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import TerrainPicker from "./TerrainPicker.js";
import Transforms from "./Transforms.js";
import VerticalExaggeration from "./VerticalExaggeration.js";

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
 * @param {number} indexCountWithoutSkirts The index count of the mesh not including skirts.
 * @param {number} vertexCountWithoutSkirts The vertex count of the mesh not including skirts.
 * @param {number} minimumHeight The lowest height in the tile, in meters above the ellipsoid.
 * @param {number} maximumHeight The highest height in the tile, in meters above the ellipsoid.
 * @param {BoundingSphere} boundingSphere3D A bounding sphere that completely contains the tile.
 * @param {Cartesian3} occludeePointInScaledSpace The occludee point of the tile, represented in ellipsoid-
 *                     scaled space, and used for horizon culling.  If this point is below the horizon,
 *                     the tile is considered to be entirely below the horizon.
 * @param {number} [vertexStride=6] The number of components in each vertex.
 * @param {OrientedBoundingBox} [orientedBoundingBox] A bounding box that completely contains the tile.
 * @param {TerrainEncoding} encoding Information used to decode the mesh.
 * @param {number[]|Uint8Array|Uint16Array|Uint32Array} westIndicesSouthToNorth The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
 * @param {number[]|Uint8Array|Uint16Array|Uint32Array} southIndicesEastToWest The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
 * @param {number[]|Uint8Array|Uint16Array|Uint32Array} eastIndicesNorthToSouth The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
 * @param {number[]|Uint8Array|Uint16Array|Uint32Array} northIndicesWestToEast The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
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
  rectangle,
  boundingSphere3D,
  occludeePointInScaledSpace,
  vertexStride,
  orientedBoundingBox,
  encoding,
  westIndicesSouthToNorth,
  southIndicesEastToWest,
  eastIndicesNorthToSouth,
  northIndicesWestToEast,
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
   * @type {number}
   */
  this.stride = vertexStride ?? 6;

  /**
   * The indices describing how the vertices are connected to form triangles.
   * @type {Uint8Array|Uint16Array|Uint32Array}
   */
  this.indices = indices;

  /**
   * The index count of the mesh not including skirts.
   * @type {number}
   */
  this.indexCountWithoutSkirts = indexCountWithoutSkirts;

  /**
   * The vertex count of the mesh not including skirts.
   * @type {number}
   */
  this.vertexCountWithoutSkirts = vertexCountWithoutSkirts;

  /**
   * The lowest height in the tile, in meters above the ellipsoid.
   * @type {number}
   */
  this.minimumHeight = minimumHeight;

  /**
   * The highest height in the tile, in meters above the ellipsoid.
   * @type {number}
   */
  this.maximumHeight = maximumHeight;

  /**
   * The rectangle, in radians, covered by this tile.
   * @type {Rectangle}
   */
  this.rectangle = rectangle;

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
   * @type {number[]|Uint8Array|Uint16Array|Uint32Array}
   */
  this.westIndicesSouthToNorth = westIndicesSouthToNorth;

  /**
   * The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
   * @type {number[]|Uint8Array|Uint16Array|Uint32Array}
   */
  this.southIndicesEastToWest = southIndicesEastToWest;

  /**
   * The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
   * @type {number[]|Uint8Array|Uint16Array|Uint32Array}
   */
  this.eastIndicesNorthToSouth = eastIndicesNorthToSouth;

  /**
   * The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
   * @type {number[]|Uint8Array|Uint16Array|Uint32Array}
   */
  this.northIndicesWestToEast = northIndicesWestToEast;

  /**
   * The transform from model to world coordinates based on the terrain mesh's oriented bounding box.
   * Currently, only computed when needed for picking.
   * @type {Matrix4}
   */
  this._transform = new Matrix4();

  /**
   * True if the transform needs to be recomputed (due to changes in exaggeration or scene mode).
   * @type {boolean}
   */
  this._recomputeTransform = true;

  /**
   * The terrain picker for this mesh, used for ray intersection tests.
   * @type {TerrainPicker}
   */
  this._terrainPicker = new TerrainPicker(
    vertices,
    indices,
    encoding,
    this._transform,
  );
}

TerrainMesh.prototype.getTransform = function (mode, projection) {
  if (this._recomputeTransform && defined(mode) && defined(projection)) {
    computeTransform(this, mode, projection, this._transform);
    this._recomputeTransform = false;
  }
  return this._transform;
};

function computeTransform(mesh, mode, projection, result) {
  const exaggeration = mesh.encoding.exaggeration;
  const exaggerationRelativeHeight = mesh.encoding.exaggerationRelativeHeight;

  const exaggeratedMinHeight = VerticalExaggeration.getHeight(
    mesh.minimumHeight,
    exaggeration,
    exaggerationRelativeHeight,
  );

  const exaggeratedMaxHeight = VerticalExaggeration.getHeight(
    mesh.maximumHeight,
    exaggeration,
    exaggerationRelativeHeight,
  );

  const obb = OrientedBoundingBox.fromRectangle(
    mesh.rectangle,
    exaggeratedMinHeight,
    exaggeratedMaxHeight,
    Ellipsoid.default,
    mesh.orientedBoundingBox,
  );

  OrientedBoundingBox.computeTransformation(obb, result);

  return mode === SceneMode.SCENE3D
    ? result
    : Transforms.basisTo2D(projection, result, result);
}

/**
 * Gives the point on the mesh where the give ray intersects
 * @param {Ray} ray The ray to test for intersection.
 * @param {boolean} cullBackFaces Whether to consider back-facing triangles as intersections.
 * @param {SceneMode} mode The scene mode (3D, 2D, or Columbus View).
 * @param {MapProjection} projection The map projection.
 * @returns {Cartesian3} The point on the mesh where the ray intersects, or undefined if there is no intersection.
 * @private
 */
TerrainMesh.prototype.pickRay = function (
  ray,
  cullBackFaces,
  mode,
  projection,
) {
  this.getTransform(mode, projection); // Ensure transform is up to date
  return this._terrainPicker.rayIntersect(ray, cullBackFaces, mode, projection);
};

/**
 * Updates the terrain mesh to account for changes in vertical exaggeration.
 * @param {Number} exaggeration A scalar used to exaggerate terrain.
 * @param {Number} exaggerationRelativeHeight The relative height from which terrain is exaggerated.
 * @private
 */
TerrainMesh.prototype.updateExaggeration = function (
  exaggeration,
  exaggerationRelativeHeight,
) {
  // The encoding stored on the TerrainMesh references the updated exaggeration values already. This is just used
  // to trigger a rebuild on the terrain picker.
  this._terrainPicker._vertices = this.vertices;
  this._terrainPicker.needsRebuild = true;
  this._recomputeTransform = true;
};

/**
 * Updates the terrain mesh to account for changes in scene mode.
 * @param {SceneMode} mode The scene mode (3D, 2D, or Columbus View).
 * @private
 */
TerrainMesh.prototype.updateSceneMode = function (mode) {
  this._terrainPicker.needsRebuild = true;
  this._recomputeTransform = true;
};

export default TerrainMesh;
