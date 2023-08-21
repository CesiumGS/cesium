import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import decodeGoogleEarthEnterpriseData from "../Core/decodeGoogleEarthEnterpriseData.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import GoogleEarthEnterpriseMetadata from "../Core/GoogleEarthEnterpriseMetadata.js";
import loadImageFromTypedArray from "../Core/loadImageFromTypedArray.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import Request from "../Core/Request.js";
import RuntimeError from "../Core/RuntimeError.js";
import * as protobuf from "protobufjs/dist/minimal/protobuf.js";

/**
 * @private
 */
function GoogleEarthEnterpriseDiscardPolicy() {
  this._image = new Image();
}

/**
 * Determines if the discard policy is ready to process images.
 * @returns {boolean} True if the discard policy is ready to process images; otherwise, false.
 */
GoogleEarthEnterpriseDiscardPolicy.prototype.isReady = function () {
  return true;
};

/**
 * Given a tile image, decide whether to discard that image.
 *
 * @param {HTMLImageElement} image An image to test.
 * @returns {boolean} True if the image should be discarded; otherwise, false.
 */
GoogleEarthEnterpriseDiscardPolicy.prototype.shouldDiscardImage = function (
  image
) {
  return image === this._image;
};

/**
 * @typedef {object} GoogleEarthEnterpriseImageryProvider.ConstructorOptions
 *
 * Initialization options for the GoogleEarthEnterpriseImageryProvider constructor
 *
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {TileDiscardPolicy} [tileDiscardPolicy] The policy that determines if a tile
 *        is invalid and should be discarded. If this value is not specified, a default
 *        is to discard tiles that fail to download.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * <div class="notice">
 * To construct a GoogleEarthEnterpriseImageryProvider, call {@link GoogleEarthEnterpriseImageryProvider.fromMetadata}. Do not call the constructor directly.
 * </div>
 *
 * Provides tiled imagery using the Google Earth Enterprise REST API.
 *
 * Notes: This provider is for use with the 3D Earth API of Google Earth Enterprise,
 *        {@link GoogleEarthEnterpriseMapsProvider} should be used with 2D Maps API.
 *
 * @alias GoogleEarthEnterpriseImageryProvider
 * @constructor
 *
 * @param {GoogleEarthEnterpriseImageryProvider.ConstructorOptions} [options] Object describing initialization options
 *
 * @see GoogleEarthEnterpriseImageryProvider.fromMetadata
 * @see GoogleEarthEnterpriseTerrainProvider
 * @see ArcGisMapServerImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 * @see UrlTemplateImageryProvider
 *
 *
 * @example
 * const geeMetadata = await GoogleEarthEnterpriseMetadata.fromUrl("http://www.example.com");
 * const gee = Cesium.GoogleEarthEnterpriseImageryProvider.fromMetadata(geeMetadata);
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 */
function GoogleEarthEnterpriseImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._defaultAlpha = undefined;
  this._defaultNightAlpha = undefined;
  this._defaultDayAlpha = undefined;
  this._defaultBrightness = undefined;
  this._defaultContrast = undefined;
  this._defaultHue = undefined;
  this._defaultSaturation = undefined;
  this._defaultGamma = undefined;
  this._defaultMinificationFilter = undefined;
  this._defaultMagnificationFilter = undefined;

  this._tileDiscardPolicy = options.tileDiscardPolicy;

  this._tilingScheme = new GeographicTilingScheme({
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 2,
    rectangle: new Rectangle(
      -CesiumMath.PI,
      -CesiumMath.PI,
      CesiumMath.PI,
      CesiumMath.PI
    ),
    ellipsoid: options.ellipsoid,
  });

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._tileWidth = 256;
  this._tileHeight = 256;
  this._maximumLevel = 23;

  // Install the default tile discard policy if none has been supplied.
  if (!defined(this._tileDiscardPolicy)) {
    this._tileDiscardPolicy = new GoogleEarthEnterpriseDiscardPolicy();
  }

  this._errorEvent = new Event();
}

Object.defineProperties(GoogleEarthEnterpriseImageryProvider.prototype, {
  /**
   * Gets the name of the Google Earth Enterprise server url hosting the imagery.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {string}
   * @readonly
   */
  url: {
    get: function () {
      return this._metadata.url;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._metadata.proxy;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      return this._tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      return this._tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return 0;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._tilingScheme.rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      return this._tileDiscardPolicy;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  Setting this property to false reduces memory usage
   * and texture upload time.
   * @memberof GoogleEarthEnterpriseImageryProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return false;
    },
  },
});

/**
 * Creates a tiled imagery provider using the Google Earth Enterprise REST API.
 * @param {GoogleEarthEnterpriseMetadata} metadata A metadata object that can be used to share metadata requests with a GoogleEarthEnterpriseTerrainProvider.
 * @param {GoogleEarthEnterpriseImageryProvider.ConstructorOptions} options Object describing initialization options.
 * @returns {GoogleEarthEnterpriseImageryProvider}
 *
 * @exception {RuntimeError} The metadata url does not have imagery
 *
 * @example
 * const geeMetadata = await GoogleEarthEnterpriseMetadata.fromUrl("http://www.example.com");
 * const gee = Cesium.GoogleEarthEnterpriseImageryProvider.fromMetadata(geeMetadata);
 */
GoogleEarthEnterpriseImageryProvider.fromMetadata = function (
  metadata,
  options
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("metadata", metadata);
  //>>includeEnd('debug');

  if (!metadata.imageryPresent) {
    throw new RuntimeError(`The server ${metadata.url} doesn't have imagery`);
  }

  const provider = new GoogleEarthEnterpriseImageryProvider(options);
  provider._metadata = metadata;
  return provider;
};

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
GoogleEarthEnterpriseImageryProvider.prototype.getTileCredits = function (
  x,
  y,
  level
) {
  const metadata = this._metadata;
  const info = metadata.getTileInformation(x, y, level);
  if (defined(info)) {
    const credit = metadata.providers[info.imageryProvider];
    if (defined(credit)) {
      return [credit];
    }
  }

  return undefined;
};

/**
 * Requests the image for a given tile.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise<ImageryTypes>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request should be retried later.
 */
GoogleEarthEnterpriseImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  const invalidImage = this._tileDiscardPolicy._image; // Empty image or undefined depending on discard policy
  const metadata = this._metadata;
  const quadKey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
  const info = metadata.getTileInformation(x, y, level);
  if (!defined(info)) {
    if (metadata.isValid(quadKey)) {
      const metadataRequest = new Request({
        throttle: request.throttle,
        throttleByServer: request.throttleByServer,
        type: request.type,
        priorityFunction: request.priorityFunction,
      });
      metadata.populateSubtree(x, y, level, metadataRequest);
      return undefined; // No metadata so return undefined so we can be loaded later
    }
    return Promise.resolve(invalidImage); // Image doesn't exist
  }

  if (!info.hasImagery()) {
    // Already have info and there isn't any imagery here
    return Promise.resolve(invalidImage);
  }
  const promise = buildImageResource(
    this,
    info,
    x,
    y,
    level,
    request
  ).fetchArrayBuffer();
  if (!defined(promise)) {
    return undefined; // Throttled
  }

  return promise.then(function (image) {
    decodeGoogleEarthEnterpriseData(metadata.key, image);
    let a = new Uint8Array(image);
    let type;

    const protoImagery = metadata.protoImagery;
    if (!defined(protoImagery) || !protoImagery) {
      type = getImageType(a);
    }

    if (!defined(type) && (!defined(protoImagery) || protoImagery)) {
      const message = decodeEarthImageryPacket(a);
      type = message.imageType;
      a = message.imageData;
    }

    if (!defined(type) || !defined(a)) {
      return invalidImage;
    }

    return loadImageFromTypedArray({
      uint8Array: a,
      format: type,
      flipY: true,
    });
  });
};

/**
 * Picking features is not currently supported by this imagery provider, so this function simply returns
 * undefined.
 *
 * @param {number} x The tile X coordinate.
 * @param {number} y The tile Y coordinate.
 * @param {number} level The tile level.
 * @param {number} longitude The longitude at which to pick features.
 * @param {number} latitude  The latitude at which to pick features.
 * @return {undefined} Undefined since picking is not supported.
 */
GoogleEarthEnterpriseImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return undefined;
};

//
// Functions to handle imagery packets
//
function buildImageResource(imageryProvider, info, x, y, level, request) {
  const quadKey = GoogleEarthEnterpriseMetadata.tileXYToQuadKey(x, y, level);
  let version = info.imageryVersion;
  version = defined(version) && version > 0 ? version : 1;

  return imageryProvider._metadata.resource.getDerivedResource({
    url: `flatfile?f1-0${quadKey}-i.${version.toString()}`,
    request: request,
  });
}

// Detects if a Uint8Array is a JPEG or PNG
function getImageType(image) {
  const jpeg = "JFIF";
  if (
    image[6] === jpeg.charCodeAt(0) &&
    image[7] === jpeg.charCodeAt(1) &&
    image[8] === jpeg.charCodeAt(2) &&
    image[9] === jpeg.charCodeAt(3)
  ) {
    return "image/jpeg";
  }

  const png = "PNG";
  if (
    image[1] === png.charCodeAt(0) &&
    image[2] === png.charCodeAt(1) &&
    image[3] === png.charCodeAt(2)
  ) {
    return "image/png";
  }

  return undefined;
}

// Decodes an Imagery protobuf into the message
// Partially generated with the help of protobuf.js static generator
function decodeEarthImageryPacket(data) {
  const reader = protobuf.Reader.create(data);
  const end = reader.len;
  const message = {};
  while (reader.pos < end) {
    const tag = reader.uint32();
    let copyrightIds;
    switch (tag >>> 3) {
      case 1:
        message.imageType = reader.uint32();
        break;
      case 2:
        message.imageData = reader.bytes();
        break;
      case 3:
        message.alphaType = reader.uint32();
        break;
      case 4:
        message.imageAlpha = reader.bytes();
        break;
      case 5:
        copyrightIds = message.copyrightIds;
        if (!defined(copyrightIds)) {
          copyrightIds = message.copyrightIds = [];
        }
        if ((tag & 7) === 2) {
          const end2 = reader.uint32() + reader.pos;
          while (reader.pos < end2) {
            copyrightIds.push(reader.uint32());
          }
        } else {
          copyrightIds.push(reader.uint32());
        }
        break;
      default:
        reader.skipType(tag & 7);
        break;
    }
  }

  const imageType = message.imageType;
  if (defined(imageType)) {
    switch (imageType) {
      case 0:
        message.imageType = "image/jpeg";
        break;
      case 4:
        message.imageType = "image/png";
        break;
      default:
        throw new RuntimeError(
          "GoogleEarthEnterpriseImageryProvider: Unsupported image type."
        );
    }
  }

  const alphaType = message.alphaType;
  if (defined(alphaType) && alphaType !== 0) {
    console.log(
      "GoogleEarthEnterpriseImageryProvider: External alpha not supported."
    );
    delete message.alphaType;
    delete message.imageAlpha;
  }

  return message;
}
export default GoogleEarthEnterpriseImageryProvider;
