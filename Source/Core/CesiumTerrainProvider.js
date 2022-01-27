import when from "../ThirdParty/when.js";
import AttributeCompression from "./AttributeCompression.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Event from "./Event.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import WebMercatorTilingScheme from "./WebMercatorTilingScheme.js";
import getJsonFromTypedArray from "./getJsonFromTypedArray.js";
import HeightmapTerrainData from "./HeightmapTerrainData.js";
import IndexDatatype from "./IndexDatatype.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import QuantizedMeshTerrainData from "./QuantizedMeshTerrainData.js";
import Request from "./Request.js";
import RequestType from "./RequestType.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";
import TerrainProvider from "./TerrainProvider.js";
import TileAvailability from "./TileAvailability.js";
import TileProviderError from "./TileProviderError.js";

function LayerInformation(layer) {
  this.resource = layer.resource;
  this.version = layer.version;
  this.isHeightmap = layer.isHeightmap;
  this.tileUrlTemplates = layer.tileUrlTemplates;
  this.availability = layer.availability;
  this.hasVertexNormals = layer.hasVertexNormals;
  this.hasWaterMask = layer.hasWaterMask;
  this.hasMetadata = layer.hasMetadata;
  this.availabilityLevels = layer.availabilityLevels;
  this.availabilityTilesLoaded = layer.availabilityTilesLoaded;
  this.littleEndianExtensionSize = layer.littleEndianExtensionSize;
  this.availabilityPromiseCache = {};
}

/**
 * A {@link TerrainProvider} that accesses terrain data in a Cesium terrain format.
 *
 * @alias CesiumTerrainProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String|Promise<Resource>|Promise<String>} options.url The URL of the Cesium terrain server.
 * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server, in the form of per vertex normals if available.
 * @param {Boolean} [options.requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server,  if available.
 * @param {Boolean} [options.requestMetadata=true] Flag that indicates if the client should request per tile metadata from the server, if available.
 * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 *
 * @example
 * // Create Arctic DEM terrain with normals.
 * var viewer = new Cesium.Viewer('cesiumContainer', {
 *     terrainProvider : new Cesium.CesiumTerrainProvider({
 *         url : Cesium.IonResource.fromAssetId(3956),
 *         requestVertexNormals : true
 *     })
 * });
 *
 * @see createWorldTerrain
 * @see TerrainProvider
 */
function CesiumTerrainProvider(options) {
  //>>includeStart('debug', pragmas.debug)
  if (!defined(options) || !defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  //>>includeEnd('debug');

  this._heightmapWidth = 65;
  this._heightmapStructure = undefined;
  this._hasWaterMask = false;
  this._hasVertexNormals = false;
  this._ellipsoid = options.ellipsoid;

  /**
   * Boolean flag that indicates if the client should request vertex normals from the server.
   * @type {Boolean}
   * @default false
   * @private
   */
  this._requestVertexNormals = defaultValue(
    options.requestVertexNormals,
    false
  );

  /**
   * Boolean flag that indicates if the client should request tile watermasks from the server.
   * @type {Boolean}
   * @default false
   * @private
   */
  this._requestWaterMask = defaultValue(options.requestWaterMask, false);

  /**
   * Boolean flag that indicates if the client should request tile metadata from the server.
   * @type {Boolean}
   * @default true
   * @private
   */
  this._requestMetadata = defaultValue(options.requestMetadata, true);

  this._errorEvent = new Event();

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._availability = undefined;

  const deferred = when.defer();
  this._ready = false;
  this._readyPromise = deferred;
  this._tileCredits = undefined;

  const that = this;
  let lastResource;
  let layerJsonResource;
  let metadataError;

  const layers = (this._layers = []);
  let attribution = "";
  const overallAvailability = [];
  let overallMaxZoom = 0;
  when(options.url)
    .then(function (url) {
      const resource = Resource.createIfNeeded(url);
      resource.appendForwardSlash();
      lastResource = resource;
      layerJsonResource = lastResource.getDerivedResource({
        url: "layer.json",
      });

      // ion resources have a credits property we can use for additional attribution.
      that._tileCredits = resource.credits;

      requestLayerJson();
    })
    .otherwise(function (e) {
      deferred.reject(e);
    });

  function parseMetadataSuccess(data) {
    let message;

    if (!data.format) {
      message = "The tile format is not specified in the layer.json file.";
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestLayerJson
      );
      return;
    }

    if (!data.tiles || data.tiles.length === 0) {
      message = "The layer.json file does not specify any tile URL templates.";
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestLayerJson
      );
      return;
    }

    let hasVertexNormals = false;
    let hasWaterMask = false;
    let hasMetadata = false;
    let littleEndianExtensionSize = true;
    let isHeightmap = false;
    if (data.format === "heightmap-1.0") {
      isHeightmap = true;
      if (!defined(that._heightmapStructure)) {
        that._heightmapStructure = {
          heightScale: 1.0 / 5.0,
          heightOffset: -1000.0,
          elementsPerHeight: 1,
          stride: 1,
          elementMultiplier: 256.0,
          isBigEndian: false,
          lowestEncodedHeight: 0,
          highestEncodedHeight: 256 * 256 - 1,
        };
      }
      hasWaterMask = true;
      that._requestWaterMask = true;
    } else if (data.format.indexOf("quantized-mesh-1.") !== 0) {
      message =
        'The tile format "' + data.format + '" is invalid or not supported.';
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestLayerJson
      );
      return;
    }

    const tileUrlTemplates = data.tiles;

    const maxZoom = data.maxzoom;
    overallMaxZoom = Math.max(overallMaxZoom, maxZoom);
    // Keeps track of which of the availablity containing tiles have been loaded

    if (!data.projection || data.projection === "EPSG:4326") {
      that._tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 1,
        ellipsoid: that._ellipsoid,
      });
    } else if (data.projection === "EPSG:3857") {
      that._tilingScheme = new WebMercatorTilingScheme({
        numberOfLevelZeroTilesX: 1,
        numberOfLevelZeroTilesY: 1,
        ellipsoid: that._ellipsoid,
      });
    } else {
      message =
        'The projection "' + data.projection + '" is invalid or not supported.';
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestLayerJson
      );
      return;
    }

    that._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
      that._tilingScheme.ellipsoid,
      that._heightmapWidth,
      that._tilingScheme.getNumberOfXTilesAtLevel(0)
    );
    if (!data.scheme || data.scheme === "tms" || data.scheme === "slippyMap") {
      that._scheme = data.scheme;
    } else {
      message = 'The scheme "' + data.scheme + '" is invalid or not supported.';
      metadataError = TileProviderError.handleError(
        metadataError,
        that,
        that._errorEvent,
        message,
        undefined,
        undefined,
        undefined,
        requestLayerJson
      );
      return;
    }

    let availabilityTilesLoaded;

    // The vertex normals defined in the 'octvertexnormals' extension is identical to the original
    // contents of the original 'vertexnormals' extension.  'vertexnormals' extension is now
    // deprecated, as the extensionLength for this extension was incorrectly using big endian.
    // We maintain backwards compatibility with the legacy 'vertexnormal' implementation
    // by setting the _littleEndianExtensionSize to false. Always prefer 'octvertexnormals'
    // over 'vertexnormals' if both extensions are supported by the server.
    if (
      defined(data.extensions) &&
      data.extensions.indexOf("octvertexnormals") !== -1
    ) {
      hasVertexNormals = true;
    } else if (
      defined(data.extensions) &&
      data.extensions.indexOf("vertexnormals") !== -1
    ) {
      hasVertexNormals = true;
      littleEndianExtensionSize = false;
    }
    if (
      defined(data.extensions) &&
      data.extensions.indexOf("watermask") !== -1
    ) {
      hasWaterMask = true;
    }
    if (
      defined(data.extensions) &&
      data.extensions.indexOf("metadata") !== -1
    ) {
      hasMetadata = true;
    }

    const availabilityLevels = data.metadataAvailability;
    const availableTiles = data.available;
    let availability;
    if (defined(availableTiles) && !defined(availabilityLevels)) {
      availability = new TileAvailability(
        that._tilingScheme,
        availableTiles.length
      );
      for (let level = 0; level < availableTiles.length; ++level) {
        const rangesAtLevel = availableTiles[level];
        const yTiles = that._tilingScheme.getNumberOfYTilesAtLevel(level);
        if (!defined(overallAvailability[level])) {
          overallAvailability[level] = [];
        }

        for (
          let rangeIndex = 0;
          rangeIndex < rangesAtLevel.length;
          ++rangeIndex
        ) {
          const range = rangesAtLevel[rangeIndex];
          const yStart = yTiles - range.endY - 1;
          const yEnd = yTiles - range.startY - 1;
          overallAvailability[level].push([
            range.startX,
            yStart,
            range.endX,
            yEnd,
          ]);
          availability.addAvailableTileRange(
            level,
            range.startX,
            yStart,
            range.endX,
            yEnd
          );
        }
      }
    } else if (defined(availabilityLevels)) {
      availabilityTilesLoaded = new TileAvailability(
        that._tilingScheme,
        maxZoom
      );
      availability = new TileAvailability(that._tilingScheme, maxZoom);
      overallAvailability[0] = [[0, 0, 1, 0]];
      availability.addAvailableTileRange(0, 0, 0, 1, 0);
    }

    that._hasWaterMask = that._hasWaterMask || hasWaterMask;
    that._hasVertexNormals = that._hasVertexNormals || hasVertexNormals;
    that._hasMetadata = that._hasMetadata || hasMetadata;
    if (defined(data.attribution)) {
      if (attribution.length > 0) {
        attribution += " ";
      }
      attribution += data.attribution;
    }

    layers.push(
      new LayerInformation({
        resource: lastResource,
        version: data.version,
        isHeightmap: isHeightmap,
        tileUrlTemplates: tileUrlTemplates,
        availability: availability,
        hasVertexNormals: hasVertexNormals,
        hasWaterMask: hasWaterMask,
        hasMetadata: hasMetadata,
        availabilityLevels: availabilityLevels,
        availabilityTilesLoaded: availabilityTilesLoaded,
        littleEndianExtensionSize: littleEndianExtensionSize,
      })
    );

    const parentUrl = data.parentUrl;
    if (defined(parentUrl)) {
      if (!defined(availability)) {
        console.log(
          "A layer.json can't have a parentUrl if it does't have an available array."
        );
        return when.resolve();
      }
      lastResource = lastResource.getDerivedResource({
        url: parentUrl,
      });
      lastResource.appendForwardSlash(); // Terrain always expects a directory
      layerJsonResource = lastResource.getDerivedResource({
        url: "layer.json",
      });
      const parentMetadata = layerJsonResource.fetchJson();
      return when(parentMetadata, parseMetadataSuccess, parseMetadataFailure);
    }

    return when.resolve();
  }

  function parseMetadataFailure(data) {
    const message =
      "An error occurred while accessing " + layerJsonResource.url + ".";
    metadataError = TileProviderError.handleError(
      metadataError,
      that,
      that._errorEvent,
      message,
      undefined,
      undefined,
      undefined,
      requestLayerJson
    );
  }

  function metadataSuccess(data) {
    parseMetadataSuccess(data).then(function () {
      if (defined(metadataError)) {
        return;
      }

      const length = overallAvailability.length;
      if (length > 0) {
        const availability = (that._availability = new TileAvailability(
          that._tilingScheme,
          overallMaxZoom
        ));
        for (let level = 0; level < length; ++level) {
          const levelRanges = overallAvailability[level];
          for (let i = 0; i < levelRanges.length; ++i) {
            const range = levelRanges[i];
            availability.addAvailableTileRange(
              level,
              range[0],
              range[1],
              range[2],
              range[3]
            );
          }
        }
      }

      if (attribution.length > 0) {
        const layerJsonCredit = new Credit(attribution);

        if (defined(that._tileCredits)) {
          that._tileCredits.push(layerJsonCredit);
        } else {
          that._tileCredits = [layerJsonCredit];
        }
      }

      that._ready = true;
      that._readyPromise.resolve(true);
    });
  }

  function metadataFailure(data) {
    // If the metadata is not found, assume this is a pre-metadata heightmap tileset.
    if (defined(data) && data.statusCode === 404) {
      metadataSuccess({
        tilejson: "2.1.0",
        format: "heightmap-1.0",
        version: "1.0.0",
        scheme: "tms",
        tiles: ["{z}/{x}/{y}.terrain?v={version}"],
      });
      return;
    }
    parseMetadataFailure(data);
  }

  function requestLayerJson() {
    when(layerJsonResource.fetchJson())
      .then(metadataSuccess)
      .otherwise(metadataFailure);
  }
}

/**
 * When using the Quantized-Mesh format, a tile may be returned that includes additional extensions, such as PerVertexNormals, watermask, etc.
 * This enumeration defines the unique identifiers for each type of extension data that has been appended to the standard mesh data.
 *
 * @namespace QuantizedMeshExtensionIds
 * @see CesiumTerrainProvider
 * @private
 */
const QuantizedMeshExtensionIds = {
  /**
   * Oct-Encoded Per-Vertex Normals are included as an extension to the tile mesh
   *
   * @type {Number}
   * @constant
   * @default 1
   */
  OCT_VERTEX_NORMALS: 1,
  /**
   * A watermask is included as an extension to the tile mesh
   *
   * @type {Number}
   * @constant
   * @default 2
   */
  WATER_MASK: 2,
  /**
   * A json object contain metadata about the tile
   *
   * @type {Number}
   * @constant
   * @default 4
   */
  METADATA: 4,
};

function getRequestHeader(extensionsList) {
  if (!defined(extensionsList) || extensionsList.length === 0) {
    return {
      Accept:
        "application/vnd.quantized-mesh,application/octet-stream;q=0.9,*/*;q=0.01",
    };
  }
  const extensions = extensionsList.join("-");
  return {
    Accept:
      "application/vnd.quantized-mesh;extensions=" +
      extensions +
      ",application/octet-stream;q=0.9,*/*;q=0.01",
  };
}

function createHeightmapTerrainData(provider, buffer, level, x, y) {
  const heightBuffer = new Uint16Array(
    buffer,
    0,
    provider._heightmapWidth * provider._heightmapWidth
  );
  return new HeightmapTerrainData({
    buffer: heightBuffer,
    childTileMask: new Uint8Array(buffer, heightBuffer.byteLength, 1)[0],
    waterMask: new Uint8Array(
      buffer,
      heightBuffer.byteLength + 1,
      buffer.byteLength - heightBuffer.byteLength - 1
    ),
    width: provider._heightmapWidth,
    height: provider._heightmapWidth,
    structure: provider._heightmapStructure,
    credits: provider._tileCredits,
  });
}

function createQuantizedMeshTerrainData(provider, buffer, level, x, y, layer) {
  const littleEndianExtensionSize = layer.littleEndianExtensionSize;
  let pos = 0;
  const cartesian3Elements = 3;
  const boundingSphereElements = cartesian3Elements + 1;
  const cartesian3Length = Float64Array.BYTES_PER_ELEMENT * cartesian3Elements;
  const boundingSphereLength =
    Float64Array.BYTES_PER_ELEMENT * boundingSphereElements;
  const encodedVertexElements = 3;
  const encodedVertexLength =
    Uint16Array.BYTES_PER_ELEMENT * encodedVertexElements;
  const triangleElements = 3;
  let bytesPerIndex = Uint16Array.BYTES_PER_ELEMENT;
  let triangleLength = bytesPerIndex * triangleElements;

  const view = new DataView(buffer);
  const center = new Cartesian3(
    view.getFloat64(pos, true),
    view.getFloat64(pos + 8, true),
    view.getFloat64(pos + 16, true)
  );
  pos += cartesian3Length;

  const minimumHeight = view.getFloat32(pos, true);
  pos += Float32Array.BYTES_PER_ELEMENT;
  const maximumHeight = view.getFloat32(pos, true);
  pos += Float32Array.BYTES_PER_ELEMENT;

  const boundingSphere = new BoundingSphere(
    new Cartesian3(
      view.getFloat64(pos, true),
      view.getFloat64(pos + 8, true),
      view.getFloat64(pos + 16, true)
    ),
    view.getFloat64(pos + cartesian3Length, true)
  );
  pos += boundingSphereLength;

  const horizonOcclusionPoint = new Cartesian3(
    view.getFloat64(pos, true),
    view.getFloat64(pos + 8, true),
    view.getFloat64(pos + 16, true)
  );
  pos += cartesian3Length;

  const vertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  const encodedVertexBuffer = new Uint16Array(buffer, pos, vertexCount * 3);
  pos += vertexCount * encodedVertexLength;

  if (vertexCount > 64 * 1024) {
    // More than 64k vertices, so indices are 32-bit.
    bytesPerIndex = Uint32Array.BYTES_PER_ELEMENT;
    triangleLength = bytesPerIndex * triangleElements;
  }

  // Decode the vertex buffer.
  const uBuffer = encodedVertexBuffer.subarray(0, vertexCount);
  const vBuffer = encodedVertexBuffer.subarray(vertexCount, 2 * vertexCount);
  const heightBuffer = encodedVertexBuffer.subarray(
    vertexCount * 2,
    3 * vertexCount
  );

  AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

  // skip over any additional padding that was added for 2/4 byte alignment
  if (pos % bytesPerIndex !== 0) {
    pos += bytesPerIndex - (pos % bytesPerIndex);
  }

  const triangleCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  const indices = IndexDatatype.createTypedArrayFromArrayBuffer(
    vertexCount,
    buffer,
    pos,
    triangleCount * triangleElements
  );
  pos += triangleCount * triangleLength;

  // High water mark decoding based on decompressIndices_ in webgl-loader's loader.js.
  // https://code.google.com/p/webgl-loader/source/browse/trunk/samples/loader.js?r=99#55
  // Copyright 2012 Google Inc., Apache 2.0 license.
  let highest = 0;
  const length = indices.length;
  for (let i = 0; i < length; ++i) {
    const code = indices[i];
    indices[i] = highest - code;
    if (code === 0) {
      ++highest;
    }
  }

  const westVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  const westIndices = IndexDatatype.createTypedArrayFromArrayBuffer(
    vertexCount,
    buffer,
    pos,
    westVertexCount
  );
  pos += westVertexCount * bytesPerIndex;

  const southVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  const southIndices = IndexDatatype.createTypedArrayFromArrayBuffer(
    vertexCount,
    buffer,
    pos,
    southVertexCount
  );
  pos += southVertexCount * bytesPerIndex;

  const eastVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  const eastIndices = IndexDatatype.createTypedArrayFromArrayBuffer(
    vertexCount,
    buffer,
    pos,
    eastVertexCount
  );
  pos += eastVertexCount * bytesPerIndex;

  const northVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  const northIndices = IndexDatatype.createTypedArrayFromArrayBuffer(
    vertexCount,
    buffer,
    pos,
    northVertexCount
  );
  pos += northVertexCount * bytesPerIndex;

  let encodedNormalBuffer;
  let waterMaskBuffer;
  while (pos < view.byteLength) {
    const extensionId = view.getUint8(pos, true);
    pos += Uint8Array.BYTES_PER_ELEMENT;
    const extensionLength = view.getUint32(pos, littleEndianExtensionSize);
    pos += Uint32Array.BYTES_PER_ELEMENT;

    if (
      extensionId === QuantizedMeshExtensionIds.OCT_VERTEX_NORMALS &&
      provider._requestVertexNormals
    ) {
      encodedNormalBuffer = new Uint8Array(buffer, pos, vertexCount * 2);
    } else if (
      extensionId === QuantizedMeshExtensionIds.WATER_MASK &&
      provider._requestWaterMask
    ) {
      waterMaskBuffer = new Uint8Array(buffer, pos, extensionLength);
    } else if (
      extensionId === QuantizedMeshExtensionIds.METADATA &&
      provider._requestMetadata
    ) {
      const stringLength = view.getUint32(pos, true);
      if (stringLength > 0) {
        const metadata = getJsonFromTypedArray(
          new Uint8Array(buffer),
          pos + Uint32Array.BYTES_PER_ELEMENT,
          stringLength
        );
        const availableTiles = metadata.available;
        if (defined(availableTiles)) {
          for (let offset = 0; offset < availableTiles.length; ++offset) {
            const availableLevel = level + offset + 1;
            const rangesAtLevel = availableTiles[offset];
            const yTiles = provider._tilingScheme.getNumberOfYTilesAtLevel(
              availableLevel
            );

            for (
              let rangeIndex = 0;
              rangeIndex < rangesAtLevel.length;
              ++rangeIndex
            ) {
              const range = rangesAtLevel[rangeIndex];
              const yStart = yTiles - range.endY - 1;
              const yEnd = yTiles - range.startY - 1;
              provider.availability.addAvailableTileRange(
                availableLevel,
                range.startX,
                yStart,
                range.endX,
                yEnd
              );
              layer.availability.addAvailableTileRange(
                availableLevel,
                range.startX,
                yStart,
                range.endX,
                yEnd
              );
            }
          }
        }
      }
      layer.availabilityTilesLoaded.addAvailableTileRange(level, x, y, x, y);
    }
    pos += extensionLength;
  }

  const skirtHeight = provider.getLevelMaximumGeometricError(level) * 5.0;

  // The skirt is not included in the OBB computation. If this ever
  // causes any rendering artifacts (cracks), they are expected to be
  // minor and in the corners of the screen. It's possible that this
  // might need to be changed - just change to `minimumHeight - skirtHeight`
  // A similar change might also be needed in `upsampleQuantizedTerrainMesh.js`.
  const rectangle = provider._tilingScheme.tileXYToRectangle(x, y, level);
  const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    provider._tilingScheme.ellipsoid
  );

  return new QuantizedMeshTerrainData({
    center: center,
    minimumHeight: minimumHeight,
    maximumHeight: maximumHeight,
    boundingSphere: boundingSphere,
    orientedBoundingBox: orientedBoundingBox,
    horizonOcclusionPoint: horizonOcclusionPoint,
    quantizedVertices: encodedVertexBuffer,
    encodedNormals: encodedNormalBuffer,
    indices: indices,
    westIndices: westIndices,
    southIndices: southIndices,
    eastIndices: eastIndices,
    northIndices: northIndices,
    westSkirtHeight: skirtHeight,
    southSkirtHeight: skirtHeight,
    eastSkirtHeight: skirtHeight,
    northSkirtHeight: skirtHeight,
    childTileMask: provider.availability.computeChildMaskForTile(level, x, y),
    waterMask: waterMaskBuffer,
    credits: provider._tileCredits,
  });
}

/**
 * Requests the geometry for a given tile.  This function should not be called before
 * {@link CesiumTerrainProvider#ready} returns true.  The result must include terrain data and
 * may optionally include a water mask and an indication of which child tiles are available.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @param {Request} [request] The request object. Intended for internal use only.
 *
 * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry.  If this method
 *          returns undefined instead of a promise, it is an indication that too many requests are already
 *          pending and the request will be retried later.
 *
 * @exception {DeveloperError} This function must not be called before {@link CesiumTerrainProvider#ready}
 *            returns true.
 */
CesiumTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  //>>includeStart('debug', pragmas.debug)
  if (!this._ready) {
    throw new DeveloperError(
      "requestTileGeometry must not be called before the terrain provider is ready."
    );
  }
  //>>includeEnd('debug');

  const layers = this._layers;
  let layerToUse;
  const layerCount = layers.length;

  if (layerCount === 1) {
    // Optimized path for single layers
    layerToUse = layers[0];
  } else {
    for (let i = 0; i < layerCount; ++i) {
      const layer = layers[i];
      if (
        !defined(layer.availability) ||
        layer.availability.isTileAvailable(level, x, y)
      ) {
        layerToUse = layer;
        break;
      }
    }
  }

  return requestTileGeometry(this, x, y, level, layerToUse, request);
};

function requestTileGeometry(provider, x, y, level, layerToUse, request) {
  if (!defined(layerToUse)) {
    return when.reject(new RuntimeError("Terrain tile doesn't exist"));
  }

  const urlTemplates = layerToUse.tileUrlTemplates;
  if (urlTemplates.length === 0) {
    return undefined;
  }

  // The TileMapService scheme counts from the bottom left
  let terrainY;
  if (!provider._scheme || provider._scheme === "tms") {
    const yTiles = provider._tilingScheme.getNumberOfYTilesAtLevel(level);
    terrainY = yTiles - y - 1;
  } else {
    terrainY = y;
  }

  const extensionList = [];
  if (provider._requestVertexNormals && layerToUse.hasVertexNormals) {
    extensionList.push(
      layerToUse.littleEndianExtensionSize
        ? "octvertexnormals"
        : "vertexnormals"
    );
  }
  if (provider._requestWaterMask && layerToUse.hasWaterMask) {
    extensionList.push("watermask");
  }
  if (provider._requestMetadata && layerToUse.hasMetadata) {
    extensionList.push("metadata");
  }

  let headers;
  let query;
  const url = urlTemplates[(x + terrainY + level) % urlTemplates.length];

  const resource = layerToUse.resource;
  if (
    defined(resource._ionEndpoint) &&
    !defined(resource._ionEndpoint.externalType)
  ) {
    // ion uses query paremeters to request extensions
    if (extensionList.length !== 0) {
      query = { extensions: extensionList.join("-") };
    }
    headers = getRequestHeader(undefined);
  } else {
    //All other terrain servers
    headers = getRequestHeader(extensionList);
  }

  const promise = resource
    .getDerivedResource({
      url: url,
      templateValues: {
        version: layerToUse.version,
        z: level,
        x: x,
        y: terrainY,
      },
      queryParameters: query,
      headers: headers,
      request: request,
    })
    .fetchArrayBuffer();

  if (!defined(promise)) {
    return undefined;
  }

  return promise.then(function (buffer) {
    if (defined(provider._heightmapStructure)) {
      return createHeightmapTerrainData(provider, buffer, level, x, y);
    }
    return createQuantizedMeshTerrainData(
      provider,
      buffer,
      level,
      x,
      y,
      layerToUse
    );
  });
}

Object.defineProperties(CesiumTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
   * the source of the terrain.  This function should not be called before {@link CesiumTerrainProvider#ready} returns true.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "credit must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');

      return this._credit;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.  This function should
   * not be called before {@link CesiumTerrainProvider#ready} returns true.
   * @memberof CesiumTerrainProvider.prototype
   * @type {GeographicTilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "tilingScheme must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');

      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.  This function should not be
   * called before {@link CesiumTerrainProvider#ready} returns true.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   * @exception {DeveloperError} This property must not be called before {@link CesiumTerrainProvider#ready}
   */
  hasWaterMask: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "hasWaterMask must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');

      return this._hasWaterMask && this._requestWaterMask;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * This function should not be called before {@link CesiumTerrainProvider#ready} returns true.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   * @exception {DeveloperError} This property must not be called before {@link CesiumTerrainProvider#ready}
   */
  hasVertexNormals: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "hasVertexNormals must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');

      // returns true if we can request vertex normals from the server
      return this._hasVertexNormals && this._requestVertexNormals;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include metadata.
   * This function should not be called before {@link CesiumTerrainProvider#ready} returns true.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   * @exception {DeveloperError} This property must not be called before {@link CesiumTerrainProvider#ready}
   */
  hasMetadata: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "hasMetadata must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');

      // returns true if we can request metadata from the server
      return this._hasMetadata && this._requestMetadata;
    },
  },

  /**
   * Boolean flag that indicates if the client should request vertex normals from the server.
   * Vertex normals data is appended to the standard tile mesh data only if the client requests the vertex normals and
   * if the server provides vertex normals.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  requestVertexNormals: {
    get: function () {
      return this._requestVertexNormals;
    },
  },

  /**
   * Boolean flag that indicates if the client should request a watermask from the server.
   * Watermask data is appended to the standard tile mesh data only if the client requests the watermask and
   * if the server provides a watermask.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  requestWaterMask: {
    get: function () {
      return this._requestWaterMask;
    },
  },

  /**
   * Boolean flag that indicates if the client should request metadata from the server.
   * Metadata is appended to the standard tile mesh data only if the client requests the metadata and
   * if the server provides a metadata.
   * @memberof CesiumTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  requestMetadata: {
    get: function () {
      return this._requestMetadata;
    },
  },

  /**
   * Gets an object that can be used to determine availability of terrain from this provider, such as
   * at points and in rectangles.  This function should not be called before
   * {@link CesiumTerrainProvider#ready} returns true.  This property may be undefined if availability
   * information is not available. Note that this reflects tiles that are known to be available currently.
   * Additional tiles may be discovered to be available in the future, e.g. if availability information
   * exists deeper in the tree rather than it all being discoverable at the root. However, a tile that
   * is available now will not become unavailable in the future.
   * @memberof CesiumTerrainProvider.prototype
   * @type {TileAvailability}
   * @readonly
   */
  availability: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "availability must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._availability;
    },
  },
});

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error.
 */
CesiumTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  return this._levelZeroMaximumGeometricError / (1 << level);
};

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Boolean|undefined} Undefined if not supported or availability is unknown, otherwise true or false.
 */
CesiumTerrainProvider.prototype.getTileDataAvailable = function (x, y, level) {
  if (!defined(this._availability)) {
    return undefined;
  }
  if (level > this._availability._maximumLevel) {
    return false;
  }

  if (this._availability.isTileAvailable(level, x, y)) {
    // If the tile is listed as available, then we are done
    return true;
  }
  if (!this._hasMetadata) {
    // If we don't have any layers with the metadata extension then we don't have this tile
    return false;
  }

  const layers = this._layers;
  const count = layers.length;
  for (let i = 0; i < count; ++i) {
    const layerResult = checkLayer(this, x, y, level, layers[i], i === 0);
    if (layerResult.result) {
      // There is a layer that may or may not have the tile
      return undefined;
    }
  }

  return false;
};

/**
 * Makes sure we load availability data for a tile
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {undefined|Promise<void>} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
 */
CesiumTerrainProvider.prototype.loadTileDataAvailability = function (
  x,
  y,
  level
) {
  if (
    !defined(this._availability) ||
    level > this._availability._maximumLevel ||
    this._availability.isTileAvailable(level, x, y) ||
    !this._hasMetadata
  ) {
    // We know the tile is either available or not available so nothing to wait on
    return undefined;
  }

  const layers = this._layers;
  const count = layers.length;
  for (let i = 0; i < count; ++i) {
    const layerResult = checkLayer(this, x, y, level, layers[i], i === 0);
    if (defined(layerResult.promise)) {
      return layerResult.promise;
    }
  }
};

function getAvailabilityTile(layer, x, y, level) {
  if (level === 0) {
    return;
  }

  const availabilityLevels = layer.availabilityLevels;
  const parentLevel =
    level % availabilityLevels === 0
      ? level - availabilityLevels
      : ((level / availabilityLevels) | 0) * availabilityLevels;
  const divisor = 1 << (level - parentLevel);
  const parentX = (x / divisor) | 0;
  const parentY = (y / divisor) | 0;

  return {
    level: parentLevel,
    x: parentX,
    y: parentY,
  };
}

function checkLayer(provider, x, y, level, layer, topLayer) {
  if (!defined(layer.availabilityLevels)) {
    // It's definitely not in this layer
    return {
      result: false,
    };
  }

  let cacheKey;
  const deleteFromCache = function () {
    delete layer.availabilityPromiseCache[cacheKey];
  };
  const availabilityTilesLoaded = layer.availabilityTilesLoaded;
  const availability = layer.availability;

  let tile = getAvailabilityTile(layer, x, y, level);
  while (defined(tile)) {
    if (
      availability.isTileAvailable(tile.level, tile.x, tile.y) &&
      !availabilityTilesLoaded.isTileAvailable(tile.level, tile.x, tile.y)
    ) {
      let requestPromise;
      if (!topLayer) {
        cacheKey = tile.level + "-" + tile.x + "-" + tile.y;
        requestPromise = layer.availabilityPromiseCache[cacheKey];
        if (!defined(requestPromise)) {
          // For cutout terrain, if this isn't the top layer the availability tiles
          //  may never get loaded, so request it here.
          const request = new Request({
            throttle: false,
            throttleByServer: true,
            type: RequestType.TERRAIN,
          });
          requestPromise = requestTileGeometry(
            provider,
            tile.x,
            tile.y,
            tile.level,
            layer,
            request
          );
          if (defined(requestPromise)) {
            layer.availabilityPromiseCache[cacheKey] = requestPromise;
            requestPromise.then(deleteFromCache);
          }
        }
      }

      // The availability tile is available, but not loaded, so there
      //  is still a chance that it may become available at some point
      return {
        result: true,
        promise: requestPromise,
      };
    }

    tile = getAvailabilityTile(layer, tile.x, tile.y, tile.level);
  }

  return {
    result: false,
  };
}

// Used for testing
CesiumTerrainProvider._getAvailabilityTile = getAvailabilityTile;
export default CesiumTerrainProvider;
