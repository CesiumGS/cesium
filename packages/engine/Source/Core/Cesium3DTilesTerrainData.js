import parseGlb from "../Scene/GltfPipeline/parseGlb.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cesium3DTilesTerrainGeometryProcessor from "./Cesium3DTilesTerrainGeometryProcessor.js";
import CesiumMath from "./Math.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Intersections2D from "./Intersections2D.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Rectangle from "./Rectangle.js";
import TaskProcessor from "./TaskProcessor.js";
import TerrainData from "./TerrainData.js";
import TerrainEncoding from "./TerrainEncoding.js";
import TerrainMesh from "./TerrainMesh.js";

/**
 * Terrain data for a single tile where the terrain data is represented as a glb (binary glTF).
 *
 * @alias Cesium3DTilesTerrainData
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ArrayBuffer} options.buffer The glb buffer.
 * @param {Number} options.minimumHeight The minimum terrain height within the tile, in meters above the ellipsoid.
 * @param {Number} options.maximumHeight The maximum terrain height within the tile, in meters above the ellipsoid.
 * @param {BoundingSphere} options.boundingSphere A sphere bounding all of the vertices in the mesh.
 * @param {OrientedBoundingBox} options.orientedBoundingBox An oriented bounding box containing all of the vertices in the mesh.
 * @param {Cartesian3} options.horizonOcclusionPoint The horizon occlusion point of the mesh. If this point
 *                      is below the horizon, the entire tile is assumed to be below the horizon as well.
 *                      The point is expressed in ellipsoid-scaled coordinates.
 * @param {Number} options.skirtHeight The height of the skirt to add on the edges of the tile.
 * @param {Boolean} [options.requestVertexNormals=false] Indicates whether normals should be loaded.
 * @param {Credit[]} [options.credits] Array of credits for this tile.
 * @param {Number} [options.childTileMask=15] A bit mask indicating which of this tile's four children exist.
 * If a child's bit is set, geometry will be requested for that tile as well when it
 * is needed.  If the bit is cleared, the child tile is not requested and geometry is
 * instead upsampled from the parent.  The bit values are as follows:
 * <table>
 *  <tr><th>Bit Position</th><th>Bit Value</th><th>Child Tile</th></tr>
 *  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
 *  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
 *  <tr><td>2</td><td>4</td><td>Northwest</td></tr>
 *  <tr><td>3</td><td>8</td><td>Northeast</td></tr>
 * </table>
 * @see TerrainData
 * @see QuantizedMeshTerrainData
 * @see HeightmapTerrainData
 * @see GoogleEarthEnterpriseTerrainData
 */

function Cesium3DTilesTerrainData(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug)
  Check.defined("options.buffer", options.buffer);
  Check.typeOf.number("options.minimumHeight", options.minimumHeight);
  Check.typeOf.number("options.maximumHeight", options.maximumHeight);
  Check.typeOf.object("options.boundingSphere", options.boundingSphere);
  Check.typeOf.object(
    "option.orientedBoundingBox",
    options.orientedBoundingBox
  );
  Check.typeOf.object(
    "options.horizonOcclusionPoint",
    options.horizonOcclusionPoint
  );
  Check.typeOf.number("options.skirtHeight", options.skirtHeight);
  //>>includeEnd('debug');

  /** @type {Number} */
  this._minimumHeight = options.minimumHeight;

  /** @type {Number} */
  this._maximumHeight = options.maximumHeight;

  /** @type {Number} */
  this._skirtHeight = options.skirtHeight;

  /** @type {BoundingSphere} */
  this._boundingSphere = BoundingSphere.clone(
    options.boundingSphere,
    new BoundingSphere()
  );

  /** @type {OrientedBoundingBox} */
  this._orientedBoundingBox = OrientedBoundingBox.clone(
    options.orientedBoundingBox,
    new OrientedBoundingBox()
  );

  /** @type {Cartesian3} */
  this._horizonOcclusionPoint = Cartesian3.clone(
    options.horizonOcclusionPoint,
    new Cartesian3()
  );

  /** @type {Boolean} */
  this._hasVertexNormals = defaultValue(options.requestVertexNormals, false);

  /** @type {Boolean} */
  this._hasWebMercatorT = true;

  /** @type {Credit[]|undefined} */
  this._credits = options.credits;

  /** @type {Number} */
  this._childTileMask = defaultValue(options.childTileMask, 15);

  const glbBuffer = new Uint8Array(options.buffer);
  // @ts-ignore
  const gltf = parseGlb(glbBuffer);
  /** @type {Object.<string,*>} */
  this._gltf = gltf;

  /** @type {TerrainMesh|undefined} */
  this._mesh = undefined;
}

Object.defineProperties(Cesium3DTilesTerrainData.prototype, {
  /**
   * An array of credits for this tile.
   * @memberof Cesium3DTilesTerrainData.prototype
   * @type {Credit[]|undefined}
   */
  // @ts-ignore
  credits: {
    // @ts-ignore
    get: function () {
      return this._credits;
    },
  },
  /**
   * The water mask included in this terrain data, if any. A water mask is a rectangular
   * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
   * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
   * @memberof Cesium3DTilesTerrainData.prototype
   * @type {Uint8Array|HTMLImageElement|HTMLCanvasElement|ImageBitmap|undefined}
   */
  // @ts-ignore
  waterMask: {
    // @ts-ignore
    get: function () {
      // Not supported currently
      return undefined;
    },
  },
});

/**
 * Computes the terrain height at a specified longitude and latitude.
 * @function
 *
 * @param {Rectangle} rectangle The rectangle covered by this terrain data.
 * @param {Number} longitude The longitude in radians.
 * @param {Number} latitude The latitude in radians.
 * @returns {Number|undefined} The terrain height at the specified position or undefined if the mesh hasn't been created yet. If the position is outside the rectangle, this method will extrapolate the height, which is likely to be wildly incorrect for positions far outside the rectangle.
 */
Cesium3DTilesTerrainData.prototype.interpolateHeight = function (
  rectangle,
  longitude,
  latitude
) {
  const mesh = this._mesh;
  if (mesh === undefined) {
    return undefined;
  }

  const height = interpolateMeshHeight(mesh, rectangle, longitude, latitude);
  return height;
};

/**
 * Determines if a given child tile is available, based on the
 * {@link TerrainData#childTileMask}. The given child tile coordinates are assumed
 * to be one of the four children of this tile. If non-child tile coordinates are
 * given, the availability of the southeast child tile is returned.
 * @function
 *
 * @param {Number} thisX The tile X coordinate of this (the parent) tile.
 * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
 * @param {Number} childX The tile X coordinate of the child tile to check for availability.
 * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
 * @returns {Boolean} True if the child tile is available; otherwise, false.
 */
Cesium3DTilesTerrainData.prototype.isChildAvailable = function (
  thisX,
  thisY,
  childX,
  childY
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("thisX", thisX);
  Check.typeOf.number("thisY", thisY);
  Check.typeOf.number("childX", childX);
  Check.typeOf.number("childY", childY);
  //>>includeEnd('debug');

  let bitNumber = 2; // northwest child
  if (childX !== thisX * 2) {
    ++bitNumber; // east child
  }
  if (childY !== thisY * 2) {
    bitNumber -= 2; // south child
  }

  return (this._childTileMask & (1 << bitNumber)) !== 0;
};

const createMeshTaskName = "createVerticesFromCesium3DTilesTerrain";
const createMeshTaskProcessorNoThrottle = new TaskProcessor(createMeshTaskName);
const createMeshTaskProcessorThrottle = new TaskProcessor(
  createMeshTaskName,
  // @ts-ignore
  TerrainData.maximumAsynchronousTasks
);

/**
 * Creates a {@link TerrainMesh} from this terrain data.
 *
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {TilingScheme} options.tilingScheme The tiling scheme to which this tile belongs.
 * @param {Number} options.x The X coordinate of the tile for which to create the terrain data.
 * @param {Number} options.y The Y coordinate of the tile for which to create the terrain data.
 * @param {Number} options.level The level of the tile for which to create the terrain data.
 * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {Number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 * @param {Boolean} [options.throttle=true] If true, indicates that this operation will need to be retried if too many asynchronous mesh creations are already in progress.
 * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
 *          asynchronous mesh creations are already in progress and the operation should
 *          be retried later.
 */
Cesium3DTilesTerrainData.prototype.createMesh = function (options) {
  // Uncomment to force synchronous
  // return this._createMeshSync(options);

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug)
  Check.typeOf.object("options.tilingScheme", options.tilingScheme);
  Check.typeOf.number("options.x", options.x);
  Check.typeOf.number("options.y", options.y);
  Check.typeOf.number("options.level", options.level);
  //>>includeEnd('debug');

  const throttle = defaultValue(options.throttle, true);
  const createMeshTaskProcessor = throttle
    ? createMeshTaskProcessorThrottle
    : createMeshTaskProcessorNoThrottle;

  const tilingScheme = options.tilingScheme;
  // @ts-ignore
  const ellipsoid = tilingScheme.ellipsoid;
  const x = options.x;
  const y = options.y;
  const level = options.level;
  // @ts-ignore
  const rectangle = tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    new Rectangle()
  );

  const verticesPromise = createMeshTaskProcessor.scheduleTask({
    ellipsoid: ellipsoid,
    rectangle: rectangle,
    hasVertexNormals: this._hasVertexNormals,
    hasWebMercatorT: this._hasWebMercatorT,
    gltf: this._gltf,
    minimumHeight: this._minimumHeight,
    maximumHeight: this._maximumHeight,
    boundingSphere: this._boundingSphere,
    orientedBoundingBox: this._orientedBoundingBox,
    horizonOcclusionPoint: this._horizonOcclusionPoint,
    skirtHeight: this._skirtHeight,
    exaggeration: options.exaggeration,
    exaggerationRelativeHeight: options.exaggerationRelativeHeight,
  });

  if (!defined(verticesPromise)) {
    // Too many active requests. Postponed.
    return undefined;
  }

  const that = this;
  // @ts-ignore
  return Promise.resolve(verticesPromise).then(function (result) {
    const taskResult = result;

    // Need to re-clone and re-wrap all buffers and complex ojects to put them back into their normal state
    const encoding = TerrainEncoding.clone(
      taskResult.encoding,
      new TerrainEncoding()
    );
    const vertices = new Float32Array(taskResult.verticesBuffer);
    const vertexCount = vertices.length / encoding.stride;
    const vertexCountWithoutSkirts = taskResult.vertexCountWithoutSkirts;
    // For consistency with glTF spec, 16 bit index buffer can't contain 65535
    const SizedIndexType = vertexCount <= 65535 ? Uint16Array : Uint32Array;
    const indices = new SizedIndexType(taskResult.indicesBuffer);
    const westIndices = new SizedIndexType(taskResult.westIndicesBuffer);
    const eastIndices = new SizedIndexType(taskResult.eastIndicesBuffer);
    const southIndices = new SizedIndexType(taskResult.southIndicesBuffer);
    const northIndices = new SizedIndexType(taskResult.northIndicesBuffer);
    const indexCountWithoutSkirts = taskResult.indexCountWithoutSkirts;
    const minimumHeight = that._minimumHeight;
    const maximumHeight = that._maximumHeight;
    const center = Cartesian3.clone(encoding.center, new Cartesian3());
    const boundingSphere = BoundingSphere.clone(
      that._boundingSphere,
      new BoundingSphere()
    );
    const horizonOcclusionPoint = Cartesian3.clone(
      that._horizonOcclusionPoint,
      new Cartesian3()
    );
    const orientedBoundingBox = OrientedBoundingBox.clone(
      that._orientedBoundingBox,
      new OrientedBoundingBox()
    );

    const mesh = new TerrainMesh(
      center,
      vertices,
      indices,
      indexCountWithoutSkirts,
      vertexCountWithoutSkirts,
      minimumHeight,
      maximumHeight,
      boundingSphere,
      horizonOcclusionPoint,
      encoding.stride,
      orientedBoundingBox,
      encoding,
      westIndices,
      southIndices,
      eastIndices,
      northIndices
    );

    that._mesh = mesh;
    return Promise.resolve(mesh);
  });
};

/**
 * Creates a {@link TerrainMesh} from this terrain data synchronously.
 *
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {TilingScheme} options.tilingScheme The tiling scheme to which this tile belongs.
 * @param {Number} options.x The X coordinate of the tile for which to create the terrain data.
 * @param {Number} options.y The Y coordinate of the tile for which to create the terrain data.
 * @param {Number} options.level The level of the tile for which to create the terrain data.
 * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {Number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 * @returns {Promise.<TerrainMesh>} A promise for the terrain mesh.
 */
Cesium3DTilesTerrainData.prototype._createMeshSync = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug)
  Check.typeOf.object("options.tilingScheme", options.tilingScheme);
  Check.typeOf.number("options.x", options.x);
  Check.typeOf.number("options.y", options.y);
  Check.typeOf.number("options.level", options.level);
  //>>includeEnd('debug');

  const tilingScheme = options.tilingScheme;
  // @ts-ignore
  const ellipsoid = tilingScheme.ellipsoid;
  const x = options.x;
  const y = options.y;
  const level = options.level;
  // @ts-ignore
  const rectangle = tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    new Rectangle()
  );

  const meshPromise = Cesium3DTilesTerrainGeometryProcessor.createMesh({
    ellipsoid: ellipsoid,
    rectangle: rectangle,
    hasVertexNormals: this._hasVertexNormals,
    hasWebMercatorT: this._hasWebMercatorT,
    gltf: this._gltf,
    minimumHeight: this._minimumHeight,
    maximumHeight: this._maximumHeight,
    boundingSphere: this._boundingSphere,
    orientedBoundingBox: this._orientedBoundingBox,
    horizonOcclusionPoint: this._horizonOcclusionPoint,
    skirtHeight: this._skirtHeight,
    exaggeration: options.exaggeration,
    exaggerationRelativeHeight: options.exaggerationRelativeHeight,
  });

  const that = this;
  return Promise.resolve(meshPromise).then(
    // @ts-ignore
    function (result) {
      const mesh = result;
      that._mesh = mesh;
      return Promise.resolve(mesh);
    }
  );
};

/**
 * Upsamples this terrain data for use by a descendant tile.
 *
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {Number} thisLevel The level of this tile in the tiling scheme.
 * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise.<TerrainData>|undefined} A promise for upsampled terrain data for the descendant tile, or undefined if createMesh has not been called yet or too many asynchronous upsample operations are in progress and the request has been deferred.
 */
Cesium3DTilesTerrainData.prototype.upsample = function (
  tilingScheme,
  thisX,
  thisY,
  thisLevel,
  descendantX,
  descendantY,
  descendantLevel
) {
  // mesh is not defined, so there are no UVs yet, so exit early
  const mesh = this._mesh;
  if (mesh === undefined) {
    return undefined;
  }

  const isSynchronous = false;
  const upsampledTerrainData = upsampleMesh(
    isSynchronous,
    mesh,
    this._skirtHeight,
    this._credits,
    tilingScheme,
    thisX,
    thisY,
    thisLevel,
    descendantX,
    descendantY,
    descendantLevel
  );
  return upsampledTerrainData;
};

/**
 * Upsamples this terrain data for use by a descendant tile synchronously.
 *
 * @private
 *
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {Number} thisLevel The level of this tile in the tiling scheme.
 * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise.<TerrainData>|undefined} A promise for upsampled terrain data for the descendant tile, or undefined if createMesh has not been called yet.
 */
Cesium3DTilesTerrainData.prototype._upsampleSync = function (
  tilingScheme,
  thisX,
  thisY,
  thisLevel,
  descendantX,
  descendantY,
  descendantLevel
) {
  // mesh is not defined, so there are no UVs yet, so exit early
  const mesh = this._mesh;
  if (mesh === undefined) {
    return undefined;
  }

  const isSynchronous = true;
  const upsampledTerrainData = upsampleMesh(
    isSynchronous,
    mesh,
    this._skirtHeight,
    this._credits,
    tilingScheme,
    thisX,
    thisY,
    thisLevel,
    descendantX,
    descendantY,
    descendantLevel
  );
  return upsampledTerrainData;
};

/**
 * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
 * terrain data. If this value is false, the data was obtained from some other source, such
 * as by downloading it from a remote server. This method should return true for instances
 * returned from a call to {@link TerrainData#upsample}.
 * @function
 *
 * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
 */
Cesium3DTilesTerrainData.prototype.wasCreatedByUpsampling = function () {
  return false;
};

/**
 * @private
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {TerrainMesh} options.terrainMesh The terrain mesh.
 * @param {Number} options.skirtHeight The height of the skirt to add on the edges of the tile.
 * @param {Credit[]} [options.credits] Array of credits for this tile.
 */
function Cesium3DTilesUpsampleTerrainData(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug)
  Check.defined("options.terrainMesh", options.terrainMesh);
  Check.defined("options.skirtHeight", options.skirtHeight);
  //>>includeEnd('debug');

  this._mesh = options.terrainMesh;
  this._skirtHeight = options.skirtHeight;
  this._credits = options.credits;
}

/**
 * Creates a {@link TerrainMesh} from this terrain data.
 * @function
 *
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {TilingScheme} options.tilingScheme The tiling scheme to which this tile belongs.
 * @param {Number} options.x The X coordinate of the tile for which to create the terrain data.
 * @param {Number} options.y The Y coordinate of the tile for which to create the terrain data.
 * @param {Number} options.level The level of the tile for which to create the terrain data.
 * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {Number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 * @param {Boolean} [options.throttle=true] If true, indicates that this operation will need to be retried if too many asynchronous mesh creations are already in progress.
 * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many asynchronous mesh creations are already in progress and the operation should be retried later.
 */
Cesium3DTilesUpsampleTerrainData.prototype.createMesh = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.tilingScheme", options.tilingScheme);
  Check.typeOf.number("options.x", options.x);
  Check.typeOf.number("options.y", options.y);
  Check.typeOf.number("options.level", options.level);
  //>>includeEnd('debug');

  return Promise.resolve(this._mesh);
};

/**
 * Upsamples this terrain data for use by a descendant tile.
 *
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {Number} thisLevel The level of this tile in the tiling scheme.
 * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise.<TerrainData>|undefined} A promise for upsampled terrain data for the descendant tile, or undefined if too many asynchronous upsample operations are in progress and the request has been deferred.
 */
Cesium3DTilesUpsampleTerrainData.prototype.upsample = function (
  tilingScheme,
  thisX,
  thisY,
  thisLevel,
  descendantX,
  descendantY,
  descendantLevel
) {
  const isSynchronous = false;
  const upsampledTerrainData = upsampleMesh(
    isSynchronous,
    this._mesh,
    this._skirtHeight,
    this._credits,
    tilingScheme,
    thisX,
    thisY,
    thisLevel,
    descendantX,
    descendantY,
    descendantLevel
  );
  return upsampledTerrainData;
};

/**
 * Upsamples this terrain data for use by a descendant tile synchronously.
 *
 * @private
 *
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {Number} thisLevel The level of this tile in the tiling scheme.
 * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise.<TerrainData>} A promise for upsampled terrain data for the descendant tile.
 */
Cesium3DTilesUpsampleTerrainData.prototype._upsampleSync = function (
  tilingScheme,
  thisX,
  thisY,
  thisLevel,
  descendantX,
  descendantY,
  descendantLevel
) {
  const isSynchronous = true;
  const upsampledTerrainData = upsampleMesh(
    isSynchronous,
    this._mesh,
    this._skirtHeight,
    this._credits,
    tilingScheme,
    thisX,
    thisY,
    thisLevel,
    descendantX,
    descendantY,
    descendantLevel
  );
  // @ts-ignore
  return upsampledTerrainData;
};

/**
 * Computes the terrain height at a specified longitude and latitude.
 * @function
 *
 * @param {Rectangle} rectangle The rectangle covered by this terrain data.
 * @param {Number} longitude The longitude in radians.
 * @param {Number} latitude The latitude in radians.
 * @returns {Number} The terrain height at the specified position. If the position is outside the rectangle, this method will extrapolate the height, which is likely to be wildly incorrect for positions far outside the rectangle.
 */
Cesium3DTilesUpsampleTerrainData.prototype.interpolateHeight = function (
  rectangle,
  longitude,
  latitude
) {
  const mesh = this._mesh;
  const height = interpolateMeshHeight(mesh, rectangle, longitude, latitude);
  return height;
};

/**
 * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
 * terrain data. If this value is false, the data was obtained from some other source, such
 * as by downloading it from a remote server. This method should return true for instances
 * returned from a call to {@link TerrainData#upsample}.
 * @function
 *
 * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
 */
Cesium3DTilesUpsampleTerrainData.prototype.wasCreatedByUpsampling = function () {
  return true;
};

/**
 * Determines if a given child tile is available, based on the
 * {@link TerrainData#childTileMask}. The given child tile coordinates are assumed
 * to be one of the four children of this tile. If non-child tile coordinates are
 * given, the availability of the southeast child tile is returned.
 * @function
 *
 * @param {Number} _thisX The tile X coordinate of this (the parent) tile.
 * @param {Number} _thisY The tile Y coordinate of this (the parent) tile.
 * @param {Number} _childX The tile X coordinate of the child tile to check for availability.
 * @param {Number} _childY The tile Y coordinate of the child tile to check for availability.
 * @returns {Boolean} True if the child tile is available; otherwise, false.
 */
Cesium3DTilesUpsampleTerrainData.prototype.isChildAvailable = function (
  _thisX,
  _thisY,
  _childX,
  _childY
) {
  // upsample tiles are dynamic so they don't have children
  return false;
};

Object.defineProperties(Cesium3DTilesUpsampleTerrainData.prototype, {
  /**
   * An array of credits for this tile.
   * @memberof Cesium3DTilesUpsampleTerrainData.prototype
   * @type {Credit[]|undefined}
   */
  // @ts-ignore
  credits: {
    // @ts-ignore
    get: function () {
      return this._credits;
    },
  },
  /**
   * The water mask included in this terrain data, if any. A water mask is a rectangular
   * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
   * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
   * @memberof Cesium3DTilesUpsampleTerrainData.prototype
   * @type {Uint8Array|HTMLImageElement|HTMLCanvasElement|ImageBitmap|undefined}
   */
  // @ts-ignore
  waterMask: {
    // @ts-ignore
    get: function () {
      // Note: watermask not needed because there's a fallback in another file that checks for ancestor tile water mask
      return undefined;
    },
  },
});

const upsampleTaskProcessor = new TaskProcessor(
  "upsampleVerticesFromCesium3DTilesTerrain",
  // @ts-ignore
  TerrainData.maximumAsynchronousTasks
);

/**
 * Upsamples this terrain data for use by a descendant tile.
 *
 * @param {Boolean} synchronous
 * @param {TerrainMesh} thisMesh The mesh that is being upsampled
 * @param {Number} thisSkirtHeight The mesh's skirt height
 * @param {Credit[]|undefined} credits The credits
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {Number} thisLevel The level of this tile in the tiling scheme.
 * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise.<TerrainData>|undefined} A promise for upsampled terrain data for the descendant tile, or undefined if too many asynchronous upsample operations are in progress and the request has been deferred.
 */
function upsampleMesh(
  synchronous,
  thisMesh,
  thisSkirtHeight,
  credits,
  tilingScheme,
  thisX,
  thisY,
  thisLevel,
  descendantX,
  descendantY,
  descendantLevel
) {
  //>>includeStart('debug', pragmas.debug)
  Check.typeOf.bool("synchronous", synchronous);
  Check.typeOf.object("thisMesh", thisMesh);
  Check.typeOf.number("thisSkirtHeight", thisSkirtHeight);
  Check.typeOf.object("tilingScheme", tilingScheme);
  Check.typeOf.number("thisX", thisX);
  Check.typeOf.number("thisY", thisY);
  Check.typeOf.number("thisLevel", thisLevel);
  Check.typeOf.number("descendantX", descendantX);
  Check.typeOf.number("descendantY", descendantY);
  Check.typeOf.number("descendantLevel", descendantLevel);
  //>>includeEnd('debug');

  const levelDifference = descendantLevel - thisLevel;
  if (levelDifference > 1) {
    throw new DeveloperError(
      "Upsampling through more than one level at a time is not currently supported."
    );
  }

  const upsampleSkirtHeight = thisSkirtHeight * 0.5;
  const isEastChild = thisX * 2 !== descendantX;
  const isNorthChild = thisY * 2 === descendantY;
  /** @type Rectangle */
  const upsampleRectangle = tilingScheme.tileXYToRectangle(
    // @ts-ignore
    descendantX,
    descendantY,
    descendantLevel,
    new Rectangle()
  );
  /** @type Ellipsoid */
  // @ts-ignore
  const ellipsoid = tilingScheme.ellipsoid;

  const options = {
    isEastChild: isEastChild,
    isNorthChild: isNorthChild,
    rectangle: upsampleRectangle,
    ellipsoid: ellipsoid,
    skirtHeight: upsampleSkirtHeight,
    parentVertices: thisMesh.vertices,
    parentIndices: thisMesh.indices,
    parentVertexCountWithoutSkirts: thisMesh.vertexCountWithoutSkirts,
    parentIndexCountWithoutSkirts: thisMesh.indexCountWithoutSkirts,
    parentMinimumHeight: thisMesh.minimumHeight,
    parentMaximumHeight: thisMesh.maximumHeight,
    parentEncoding: thisMesh.encoding,
  };

  if (synchronous) {
    const upsampledMesh = Cesium3DTilesTerrainGeometryProcessor.upsampleMesh(
      options
    );

    const upsampledTerrainData = new Cesium3DTilesUpsampleTerrainData({
      terrainMesh: upsampledMesh,
      skirtHeight: upsampleSkirtHeight,
      credits: credits,
    });

    return Promise.resolve(upsampledTerrainData);
    // eslint-disable-next-line no-else-return
  } else {
    const upsamplePromise = upsampleTaskProcessor.scheduleTask(options);

    if (upsamplePromise === undefined) {
      // Postponed
      return undefined;
    }

    return upsamplePromise.then(
      /** @param {any} taskResult */
      function (taskResult) {
        // Need to re-clone and re-wrap all buffers and complex ojects to put them back into their normal state
        const encoding = TerrainEncoding.clone(
          taskResult.encoding,
          new TerrainEncoding()
        );
        const stride = encoding.stride;
        const vertices = new Float32Array(taskResult.verticesBuffer);
        const vertexCount = vertices.length / stride;
        const vertexCountWithoutSkirts = taskResult.vertexCountWithoutSkirts;
        // For consistency with glTF spec, 16 bit index buffer can't contain 65535
        const SizedIndexType = vertexCount <= 65535 ? Uint16Array : Uint32Array;
        const indices = new SizedIndexType(taskResult.indicesBuffer);
        const westIndices = new SizedIndexType(taskResult.westIndicesBuffer);
        const eastIndices = new SizedIndexType(taskResult.eastIndicesBuffer);
        const southIndices = new SizedIndexType(taskResult.southIndicesBuffer);
        const northIndices = new SizedIndexType(taskResult.northIndicesBuffer);
        const indexCountWithoutSkirts = taskResult.indexCountWithoutSkirts;
        const minimumHeight = taskResult.minimumHeight;
        const maximumHeight = taskResult.maximumHeight;
        const center = Cartesian3.clone(encoding.center, new Cartesian3());
        const boundingSphere = BoundingSphere.clone(
          taskResult.boundingSphere,
          new BoundingSphere()
        );
        const horizonOcclusionPoint = Cartesian3.clone(
          taskResult.horizonOcclusionPoint,
          new Cartesian3()
        );
        const orientedBoundingBox = OrientedBoundingBox.clone(
          taskResult.orientedBoundingBox,
          new OrientedBoundingBox()
        );

        const upsampledMesh = new TerrainMesh(
          center,
          vertices,
          indices,
          indexCountWithoutSkirts,
          vertexCountWithoutSkirts,
          minimumHeight,
          maximumHeight,
          boundingSphere,
          horizonOcclusionPoint,
          stride,
          orientedBoundingBox,
          encoding,
          westIndices,
          southIndices,
          eastIndices,
          northIndices
        );

        const upsampledTerrainData = new Cesium3DTilesUpsampleTerrainData({
          terrainMesh: upsampledMesh,
          skirtHeight: upsampleSkirtHeight,
          credits: credits,
        });

        return Promise.resolve(upsampledTerrainData);
      }
    );
  }
}

const scratchUv0 = new Cartesian2();
const scratchUv1 = new Cartesian2();
const scratchUv2 = new Cartesian2();
const scratchBary = new Cartesian3();

/**
 * @private
 * @param {TerrainMesh} mesh The terrain mesh.
 * @param {Rectangle} rectangle The rectangle covered by this terrain data.
 * @param {Number} longitude The longitude in radians.
 * @param {Number} latitude The latitude in radians.
 * @returns {Number} The terrain height at the specified position. If the position is outside the rectangle, this method will extrapolate the height, which is likely to be wildly incorrect for positions far outside the rectangle.
 */
function interpolateMeshHeight(mesh, rectangle, longitude, latitude) {
  // Idea: acceleration structure would speed things up

  // @ts-ignore
  const rectangleWidth = rectangle.width;
  const u = CesiumMath.clamp(
    (longitude - rectangle.west) / rectangleWidth,
    0.0,
    1.0
  );

  // @ts-ignore
  const rectangleHeight = rectangle.height;
  const v = CesiumMath.clamp(
    (latitude - rectangle.south) / rectangleHeight,
    0.0,
    1.0
  );

  const vertices = mesh.vertices;
  const encoding = mesh.encoding;
  const indices = mesh.indices;
  const indicesLength = mesh.indexCountWithoutSkirts;

  for (let i = 0, len = indicesLength; i < len; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const uv0 = encoding.decodeTextureCoordinates(vertices, i0, scratchUv0);
    const uv1 = encoding.decodeTextureCoordinates(vertices, i1, scratchUv1);
    const uv2 = encoding.decodeTextureCoordinates(vertices, i2, scratchUv2);

    const minU = Math.min(uv0.x, uv1.x, uv2.x);
    const maxU = Math.max(uv0.x, uv1.x, uv2.x);
    const minV = Math.min(uv0.y, uv1.y, uv2.y);
    const maxV = Math.max(uv0.y, uv1.y, uv2.y);

    if (u >= minU && u <= maxU && v >= minV && v <= maxV) {
      const barycentric = Intersections2D.computeBarycentricCoordinates(
        u,
        v,
        uv0.x,
        uv0.y,
        uv1.x,
        uv1.y,
        uv2.x,
        uv2.y,
        scratchBary
      );
      if (
        barycentric.x >= 0.0 &&
        barycentric.y >= 0.0 &&
        barycentric.z >= 0.0
      ) {
        const h0 = encoding.decodeHeight(vertices, i0);
        const h1 = encoding.decodeHeight(vertices, i1);
        const h2 = encoding.decodeHeight(vertices, i2);
        const height =
          barycentric.x * h0 + barycentric.y * h1 + barycentric.z * h2;
        return height;
      }
    }
  }

  // Position does not lie in any triangle in this mesh.
  return 0.0;
}

export default Cesium3DTilesTerrainData;
