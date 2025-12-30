import SceneMode from "../Scene/SceneMode.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
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
 * @param {Rectangle} rectangle The rectangle, in radians, covered by this tile.
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
   * In 3D mode, this is computed from the oriented bounding box.  In 2D and Columbus View modes,
   * this is computed from the tile's rectangle's projected coordinates.
   * @type {Matrix4}
   */
  this._transform = new Matrix4();

  /**
   * The scene mode used the last time a pick was performed on this terrain mesh.
   * @type {SceneMode}
   */
  this._lastPickSceneMode = undefined;

  /**
   * The terrain picker for this mesh, used for ray intersection tests.
   * @type {TerrainPicker}
   */
  this._terrainPicker = new TerrainPicker(vertices, indices, encoding);
}

/**
 * Get the terrain tile's model-to-world transform matrix for the given scene mode and projection.
 * @param {SceneMode} mode The scene mode (3D, 2D, or Columbus View).
 * @param {MapProjection} projection The map projection.
 * @returns {Matrix4} The transform matrix.
 * @private
 */
TerrainMesh.prototype.getTransform = function (mode, projection) {
  if (this._lastPickSceneMode === mode) {
    return this._transform;
  }
  this._terrainPicker.needsRebuild = true;

  if (!defined(mode) || mode === SceneMode.SCENE3D) {
    return computeTransform(this, this._transform);
  }

  return computeTransform2D(this, projection, this._transform);
};

function computeTransform(mesh, result) {
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

  return OrientedBoundingBox.computeTransformation(obb, result);
}

const scratchSWCartesian = new Cartesian3();
const scratchNECartesian = new Cartesian3();
const scratchSWCartographic = new Cartographic();
const scratchNECartographic = new Cartographic();
const scratchScale2D = new Cartesian3();
const scratchCenter2D = new Cartesian3();

/**
 * Get the terrain tile's model-to-world transform matrix for 2D or Columbus View modes.
 * Assumes tiles in 2D are axis-aligned and still rectangular. (This is true for Web Mercator and Geographic projections.)
 * @param {TerrainMesh} mesh The terrain mesh.
 * @param {MapProjection} projection The map projection.
 * @param {Matrix4} result The object in which to store the result.
 * @returns {Matrix4} The transform matrix.
 * @private
 */
function computeTransform2D(mesh, projection, result) {
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

  const southwest = projection.project(
    Cartographic.fromRadians(
      mesh.rectangle.west,
      mesh.rectangle.south,
      0,
      scratchSWCartographic,
    ),
    scratchSWCartesian,
  );

  const northeast = projection.project(
    Cartographic.fromRadians(
      mesh.rectangle.east,
      mesh.rectangle.north,
      0,
      scratchNECartographic,
    ),
    scratchNECartesian,
  );

  const heightRange = exaggeratedMaxHeight - exaggeratedMinHeight;
  const scale = Cartesian3.fromElements(
    northeast.x - southwest.x,
    northeast.y - southwest.y,
    heightRange > 0 ? heightRange : 1.0, // Avoid zero scale
    scratchScale2D,
  );

  const center = Cartesian3.fromElements(
    southwest.x + scale.x * 0.5,
    southwest.y + scale.y * 0.5,
    exaggeratedMinHeight + scale.z * 0.5,
    scratchCenter2D,
  );

  Matrix4.fromTranslation(center, result);
  Matrix4.setScale(result, scale, result);
  Matrix4.multiply(Transforms.SWIZZLE_3D_TO_2D_MATRIX, result, result);

  return result;
}

/**
 * Gives the point on this terrain tile where the given ray intersects
 * @param {Ray} ray The ray to test for intersection.
 * @param {boolean} cullBackFaces Whether to consider back-facing triangles as intersections.
 * @param {SceneMode} mode The scene mode (3D, 2D, or Columbus View).
 * @param {MapProjection} projection The map projection.
 * @returns {Cartesian3} The point on the mesh where the ray intersects, or undefined if there is no intersection.
 * @private
 */
TerrainMesh.prototype.pick = function (ray, cullBackFaces, mode, projection) {
  const intersection = this._terrainPicker.rayIntersect(
    ray,
    this.getTransform(mode, projection),
    cullBackFaces,
    mode,
    projection,
  );

  this._lastPickSceneMode = mode;
  return intersection;
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
  this._lastPickSceneMode = undefined;
};

/**
 * Updates the terrain mesh to account for changes in scene mode.
 * @param {SceneMode} mode The scene mode (3D, 2D, or Columbus View).
 * @private
 */
TerrainMesh.prototype.updateSceneMode = function (mode) {
  this._terrainPicker.needsRebuild = true;
  this._lastPickSceneMode = undefined;
};

export default TerrainMesh;
