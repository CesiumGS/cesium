import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import IndexDatatype from "./IndexDatatype.js";
import Intersections2D from "./Intersections2D.js";
import CesiumMath from "./Math.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import QuantizedMeshTerrainData from "./QuantizedMeshTerrainData.js";
import Rectangle from "./Rectangle.js";
import TaskProcessor from "./TaskProcessor.js";
import TerrainData from "./TerrainData.js";
import TerrainEncoding from "./TerrainEncoding.js";
import TerrainMesh from "./TerrainMesh.js";

/**
 * Terrain data for a single tile from a Google Earth Enterprise server.
 *
 * @alias GoogleEarthEnterpriseTerrainData
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ArrayBuffer} options.buffer The buffer containing terrain data.
 * @param {Number} options.negativeAltitudeExponentBias Multiplier for negative terrain heights that are encoded as very small positive values.
 * @param {Number} options.negativeElevationThreshold Threshold for negative values
 * @param {Number} [options.childTileMask=15] A bit mask indicating which of this tile's four children exist.
 *                 If a child's bit is set, geometry will be requested for that tile as well when it
 *                 is needed.  If the bit is cleared, the child tile is not requested and geometry is
 *                 instead upsampled from the parent.  The bit values are as follows:
 *                 <table>
 *                  <tr><th>Bit Position</th><th>Bit Value</th><th>Child Tile</th></tr>
 *                  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
 *                  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
 *                  <tr><td>2</td><td>4</td><td>Northeast</td></tr>
 *                  <tr><td>3</td><td>8</td><td>Northwest</td></tr>
 *                 </table>
 * @param {Boolean} [options.createdByUpsampling=false] True if this instance was created by upsampling another instance;
 *                  otherwise, false.
 * @param {Credit[]} [options.credits] Array of credits for this tile.
 *
 *
 * @example
 * var buffer = ...
 * var childTileMask = ...
 * var terrainData = new Cesium.GoogleEarthEnterpriseTerrainData({
 *   buffer : heightBuffer,
 *   childTileMask : childTileMask
 * });
 *
 * @see TerrainData
 * @see HeightmapTerrainData
 * @see QuantizedMeshTerrainData
 */
function GoogleEarthEnterpriseTerrainData(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.buffer", options.buffer);
  Check.typeOf.number(
    "options.negativeAltitudeExponentBias",
    options.negativeAltitudeExponentBias
  );
  Check.typeOf.number(
    "options.negativeElevationThreshold",
    options.negativeElevationThreshold
  );
  //>>includeEnd('debug');

  this._buffer = options.buffer;
  this._credits = options.credits;
  this._negativeAltitudeExponentBias = options.negativeAltitudeExponentBias;
  this._negativeElevationThreshold = options.negativeElevationThreshold;

  // Convert from google layout to layout of other providers
  // 3 2 -> 2 3
  // 0 1 -> 0 1
  const googleChildTileMask = defaultValue(options.childTileMask, 15);
  let childTileMask = googleChildTileMask & 3; // Bottom row is identical
  childTileMask |= googleChildTileMask & 4 ? 8 : 0; // NE
  childTileMask |= googleChildTileMask & 8 ? 4 : 0; // NW

  this._childTileMask = childTileMask;

  this._createdByUpsampling = defaultValue(options.createdByUpsampling, false);

  this._skirtHeight = undefined;
  this._bufferType = this._buffer.constructor;
  this._mesh = undefined;
  this._minimumHeight = undefined;
  this._maximumHeight = undefined;
}

Object.defineProperties(GoogleEarthEnterpriseTerrainData.prototype, {
  /**
   * An array of credits for this tile
   * @memberof GoogleEarthEnterpriseTerrainData.prototype
   * @type {Credit[]}
   */
  credits: {
    get: function () {
      return this._credits;
    },
  },
  /**
   * The water mask included in this terrain data, if any.  A water mask is a rectangular
   * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
   * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
   * @memberof GoogleEarthEnterpriseTerrainData.prototype
   * @type {Uint8Array|HTMLImageElement|HTMLCanvasElement}
   */
  waterMask: {
    get: function () {
      return undefined;
    },
  },
});

const createMeshTaskName = "createVerticesFromGoogleEarthEnterpriseBuffer";
const createMeshTaskProcessorNoThrottle = new TaskProcessor(createMeshTaskName);
const createMeshTaskProcessorThrottle = new TaskProcessor(
  createMeshTaskName,
  TerrainData.maximumAsynchronousTasks
);

const nativeRectangleScratch = new Rectangle();
const rectangleScratch = new Rectangle();

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
 * @param {Number} [options.exaggerationRelativeHeight=0.0] The height from which terrain is exaggerated.
 * @param {Boolean} [options.throttle=true] If true, indicates that this operation will need to be retried if too many asynchronous mesh creations are already in progress.
 * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
 *          asynchronous mesh creations are already in progress and the operation should
 *          be retried later.
 */
GoogleEarthEnterpriseTerrainData.prototype.createMesh = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.tilingScheme", options.tilingScheme);
  Check.typeOf.number("options.x", options.x);
  Check.typeOf.number("options.y", options.y);
  Check.typeOf.number("options.level", options.level);
  //>>includeEnd('debug');

  const tilingScheme = options.tilingScheme;
  const x = options.x;
  const y = options.y;
  const level = options.level;
  const exaggeration = defaultValue(options.exaggeration, 1.0);
  const exaggerationRelativeHeight = defaultValue(
    options.exaggerationRelativeHeight,
    0.0
  );
  const throttle = defaultValue(options.throttle, true);

  const ellipsoid = tilingScheme.ellipsoid;
  tilingScheme.tileXYToNativeRectangle(x, y, level, nativeRectangleScratch);
  tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);

  // Compute the center of the tile for RTC rendering.
  const center = ellipsoid.cartographicToCartesian(
    Rectangle.center(rectangleScratch)
  );

  const levelZeroMaxError = 40075.16; // From Google's Doc
  const thisLevelMaxError = levelZeroMaxError / (1 << level);
  this._skirtHeight = Math.min(thisLevelMaxError * 8.0, 1000.0);

  const createMeshTaskProcessor = throttle
    ? createMeshTaskProcessorThrottle
    : createMeshTaskProcessorNoThrottle;

  const verticesPromise = createMeshTaskProcessor.scheduleTask({
    buffer: this._buffer,
    nativeRectangle: nativeRectangleScratch,
    rectangle: rectangleScratch,
    relativeToCenter: center,
    ellipsoid: ellipsoid,
    skirtHeight: this._skirtHeight,
    exaggeration: exaggeration,
    exaggerationRelativeHeight: exaggerationRelativeHeight,
    includeWebMercatorT: true,
    negativeAltitudeExponentBias: this._negativeAltitudeExponentBias,
    negativeElevationThreshold: this._negativeElevationThreshold,
  });

  if (!defined(verticesPromise)) {
    // Postponed
    return undefined;
  }

  const that = this;
  return verticesPromise.then(function (result) {
    // Clone complex result objects because the transfer from the web worker
    // has stripped them down to JSON-style objects.
    that._mesh = new TerrainMesh(
      center,
      new Float32Array(result.vertices),
      new Uint16Array(result.indices),
      result.indexCountWithoutSkirts,
      result.vertexCountWithoutSkirts,
      result.minimumHeight,
      result.maximumHeight,
      BoundingSphere.clone(result.boundingSphere3D),
      Cartesian3.clone(result.occludeePointInScaledSpace),
      result.numberOfAttributes,
      OrientedBoundingBox.clone(result.orientedBoundingBox),
      TerrainEncoding.clone(result.encoding),
      result.westIndicesSouthToNorth,
      result.southIndicesEastToWest,
      result.eastIndicesNorthToSouth,
      result.northIndicesWestToEast
    );

    that._minimumHeight = result.minimumHeight;
    that._maximumHeight = result.maximumHeight;

    // Free memory received from server after mesh is created.
    that._buffer = undefined;
    return that._mesh;
  });
};

/**
 * Computes the terrain height at a specified longitude and latitude.
 *
 * @param {Rectangle} rectangle The rectangle covered by this terrain data.
 * @param {Number} longitude The longitude in radians.
 * @param {Number} latitude The latitude in radians.
 * @returns {Number} The terrain height at the specified position.  If the position
 *          is outside the rectangle, this method will extrapolate the height, which is likely to be wildly
 *          incorrect for positions far outside the rectangle.
 */
GoogleEarthEnterpriseTerrainData.prototype.interpolateHeight = function (
  rectangle,
  longitude,
  latitude
) {
  const u = CesiumMath.clamp(
    (longitude - rectangle.west) / rectangle.width,
    0.0,
    1.0
  );
  const v = CesiumMath.clamp(
    (latitude - rectangle.south) / rectangle.height,
    0.0,
    1.0
  );

  if (!defined(this._mesh)) {
    return interpolateHeight(this, u, v, rectangle);
  }

  return interpolateMeshHeight(this, u, v);
};

const upsampleTaskProcessor = new TaskProcessor(
  "upsampleQuantizedTerrainMesh",
  TerrainData.maximumAsynchronousTasks
);

/**
 * Upsamples this terrain data for use by a descendant tile.  The resulting instance will contain a subset of the
 * height samples in this instance, interpolated if necessary.
 *
 * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
 * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
 * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
 * @param {Number} thisLevel The level of this tile in the tiling scheme.
 * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
 * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
 * @returns {Promise.<HeightmapTerrainData>|undefined} A promise for upsampled heightmap terrain data for the descendant tile,
 *          or undefined if too many asynchronous upsample operations are in progress and the request has been
 *          deferred.
 */
GoogleEarthEnterpriseTerrainData.prototype.upsample = function (
  tilingScheme,
  thisX,
  thisY,
  thisLevel,
  descendantX,
  descendantY,
  descendantLevel
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("tilingScheme", tilingScheme);
  Check.typeOf.number("thisX", thisX);
  Check.typeOf.number("thisY", thisY);
  Check.typeOf.number("thisLevel", thisLevel);
  Check.typeOf.number("descendantX", descendantX);
  Check.typeOf.number("descendantY", descendantY);
  Check.typeOf.number("descendantLevel", descendantLevel);
  const levelDifference = descendantLevel - thisLevel;
  if (levelDifference > 1) {
    throw new DeveloperError(
      "Upsampling through more than one level at a time is not currently supported."
    );
  }
  //>>includeEnd('debug');

  const mesh = this._mesh;
  if (!defined(this._mesh)) {
    return undefined;
  }

  const isEastChild = thisX * 2 !== descendantX;
  const isNorthChild = thisY * 2 === descendantY;

  const ellipsoid = tilingScheme.ellipsoid;
  const childRectangle = tilingScheme.tileXYToRectangle(
    descendantX,
    descendantY,
    descendantLevel
  );

  const upsamplePromise = upsampleTaskProcessor.scheduleTask({
    vertices: mesh.vertices,
    indices: mesh.indices,
    indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
    vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
    encoding: mesh.encoding,
    minimumHeight: this._minimumHeight,
    maximumHeight: this._maximumHeight,
    isEastChild: isEastChild,
    isNorthChild: isNorthChild,
    childRectangle: childRectangle,
    ellipsoid: ellipsoid,
  });

  if (!defined(upsamplePromise)) {
    // Postponed
    return undefined;
  }

  const that = this;
  return upsamplePromise.then(function (result) {
    const quantizedVertices = new Uint16Array(result.vertices);
    const indicesTypedArray = IndexDatatype.createTypedArray(
      quantizedVertices.length / 3,
      result.indices
    );

    const skirtHeight = that._skirtHeight;

    // Use QuantizedMeshTerrainData since we have what we need already parsed
    return new QuantizedMeshTerrainData({
      quantizedVertices: quantizedVertices,
      indices: indicesTypedArray,
      minimumHeight: result.minimumHeight,
      maximumHeight: result.maximumHeight,
      boundingSphere: BoundingSphere.clone(result.boundingSphere),
      orientedBoundingBox: OrientedBoundingBox.clone(
        result.orientedBoundingBox
      ),
      horizonOcclusionPoint: Cartesian3.clone(result.horizonOcclusionPoint),
      westIndices: result.westIndices,
      southIndices: result.southIndices,
      eastIndices: result.eastIndices,
      northIndices: result.northIndices,
      westSkirtHeight: skirtHeight,
      southSkirtHeight: skirtHeight,
      eastSkirtHeight: skirtHeight,
      northSkirtHeight: skirtHeight,
      childTileMask: 0,
      createdByUpsampling: true,
      credits: that._credits,
    });
  });
};

/**
 * Determines if a given child tile is available, based on the
 * {@link HeightmapTerrainData.childTileMask}.  The given child tile coordinates are assumed
 * to be one of the four children of this tile.  If non-child tile coordinates are
 * given, the availability of the southeast child tile is returned.
 *
 * @param {Number} thisX The tile X coordinate of this (the parent) tile.
 * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
 * @param {Number} childX The tile X coordinate of the child tile to check for availability.
 * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
 * @returns {Boolean} True if the child tile is available; otherwise, false.
 */
GoogleEarthEnterpriseTerrainData.prototype.isChildAvailable = function (
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

/**
 * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
 * terrain data.  If this value is false, the data was obtained from some other source, such
 * as by downloading it from a remote server.  This method should return true for instances
 * returned from a call to {@link HeightmapTerrainData#upsample}.
 *
 * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
 */
GoogleEarthEnterpriseTerrainData.prototype.wasCreatedByUpsampling = function () {
  return this._createdByUpsampling;
};

const texCoordScratch0 = new Cartesian2();
const texCoordScratch1 = new Cartesian2();
const texCoordScratch2 = new Cartesian2();
const barycentricCoordinateScratch = new Cartesian3();

function interpolateMeshHeight(terrainData, u, v) {
  const mesh = terrainData._mesh;
  const vertices = mesh.vertices;
  const encoding = mesh.encoding;
  const indices = mesh.indices;

  for (let i = 0, len = indices.length; i < len; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const uv0 = encoding.decodeTextureCoordinates(
      vertices,
      i0,
      texCoordScratch0
    );
    const uv1 = encoding.decodeTextureCoordinates(
      vertices,
      i1,
      texCoordScratch1
    );
    const uv2 = encoding.decodeTextureCoordinates(
      vertices,
      i2,
      texCoordScratch2
    );

    const barycentric = Intersections2D.computeBarycentricCoordinates(
      u,
      v,
      uv0.x,
      uv0.y,
      uv1.x,
      uv1.y,
      uv2.x,
      uv2.y,
      barycentricCoordinateScratch
    );
    if (
      barycentric.x >= -1e-15 &&
      barycentric.y >= -1e-15 &&
      barycentric.z >= -1e-15
    ) {
      const h0 = encoding.decodeHeight(vertices, i0);
      const h1 = encoding.decodeHeight(vertices, i1);
      const h2 = encoding.decodeHeight(vertices, i2);
      return barycentric.x * h0 + barycentric.y * h1 + barycentric.z * h2;
    }
  }

  // Position does not lie in any triangle in this mesh.
  return undefined;
}

const sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
const sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
const sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
const sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;

function interpolateHeight(terrainData, u, v, rectangle) {
  const buffer = terrainData._buffer;
  let quad = 0; // SW
  let uStart = 0.0;
  let vStart = 0.0;
  if (v > 0.5) {
    // Upper row
    if (u > 0.5) {
      // NE
      quad = 2;
      uStart = 0.5;
    } else {
      // NW
      quad = 3;
    }
    vStart = 0.5;
  } else if (u > 0.5) {
    // SE
    quad = 1;
    uStart = 0.5;
  }

  const dv = new DataView(buffer);
  let offset = 0;
  for (let q = 0; q < quad; ++q) {
    offset += dv.getUint32(offset, true);
    offset += sizeOfUint32;
  }
  offset += sizeOfUint32; // Skip length of quad
  offset += 2 * sizeOfDouble; // Skip origin

  // Read sizes
  const xSize = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
  offset += sizeOfDouble;
  const ySize = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
  offset += sizeOfDouble;

  // Samples per quad
  const xScale = rectangle.width / xSize / 2;
  const yScale = rectangle.height / ySize / 2;

  // Number of points
  const numPoints = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  // Number of faces
  const numIndices = dv.getInt32(offset, true) * 3;
  offset += sizeOfInt32;

  offset += sizeOfInt32; // Skip Level

  const uBuffer = new Array(numPoints);
  const vBuffer = new Array(numPoints);
  const heights = new Array(numPoints);
  let i;
  for (i = 0; i < numPoints; ++i) {
    uBuffer[i] = uStart + dv.getUint8(offset++) * xScale;
    vBuffer[i] = vStart + dv.getUint8(offset++) * yScale;

    // Height is stored in units of (1/EarthRadius) or (1/6371010.0)
    heights[i] = dv.getFloat32(offset, true) * 6371010.0;
    offset += sizeOfFloat;
  }

  const indices = new Array(numIndices);
  for (i = 0; i < numIndices; ++i) {
    indices[i] = dv.getUint16(offset, true);
    offset += sizeOfUint16;
  }

  for (i = 0; i < numIndices; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const u0 = uBuffer[i0];
    const u1 = uBuffer[i1];
    const u2 = uBuffer[i2];

    const v0 = vBuffer[i0];
    const v1 = vBuffer[i1];
    const v2 = vBuffer[i2];

    const barycentric = Intersections2D.computeBarycentricCoordinates(
      u,
      v,
      u0,
      v0,
      u1,
      v1,
      u2,
      v2,
      barycentricCoordinateScratch
    );
    if (
      barycentric.x >= -1e-15 &&
      barycentric.y >= -1e-15 &&
      barycentric.z >= -1e-15
    ) {
      return (
        barycentric.x * heights[i0] +
        barycentric.y * heights[i1] +
        barycentric.z * heights[i2]
      );
    }
  }

  // Position does not lie in any triangle in this mesh.
  return undefined;
}
export default GoogleEarthEnterpriseTerrainData;
