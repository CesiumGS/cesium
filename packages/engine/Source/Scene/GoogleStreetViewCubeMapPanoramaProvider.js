import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import CesiumMath from "../Core/Math.js";
import Transforms from "../Core/Transforms.js";
import Frozen from "../Core/Frozen.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import GoogleMaps from "../Core/GoogleMaps.js";
import CubeMapPanorama from "./CubeMapPanorama.js";

const DEFAULT_TILE_SIZE = 600;

/**
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link GoogleStreetViewCubeMapPanoramaProvider.fromUrl}.
 * </div>
 *
 *
 * Creates a {@link PanoramaProvider} which provides imagery from {@link https://developers.google.com/maps/documentation/tile/streetview|Google Street View Tiles API} to be displayed in a panorama.
 *
 * @alias GoogleStreetViewCubeMapPanoramaProvider
 * @constructor
 *
 * @see CubeMapPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=google-streetview-panorama-2|Cesium Sandcastle Google Streetview Panorama}
 *
 */
function GoogleStreetViewCubeMapPanoramaProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._signature = options.signature;
  this._key = defined(options.apiKey)
    ? options.apiKey
    : GoogleMaps.defaultApiKey;

  this._baseResource = Resource.createIfNeeded(
    options.url ?? GoogleMaps.streetViewStaticApiEndpoint,
  );

  this._metadataResource = this._baseResource.getDerivedResource({
    url: "streetview/metadata",
  });

  this._tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
}

Object.defineProperties(GoogleStreetViewCubeMapPanoramaProvider.prototype, {});

/**
 * Gets the panorama primitive for a requested position and orientation.
 * @param {object} options Object with the following properties:
 * @param {Cartographic} options.cartographic The position to place the panorama in the scene.
 * @param {string} [options.panoId] The panoramaId identifier for the image in the Google API. If not provided this will be looked up for the provided cartographic location.
 * @param {number} [options.tileSize] - Optional tile size override (square).
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {CubeMapPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIdObject = provider.getNearestPanoId(position);
 * const primitive = await provider.loadPanorama({
 *   position,
 *   panoId:panoIdObject.panoId
 * });
 * viewer.scene.primitive.add(primitive);
 *
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.loadPanorama =
  async function (options) {
    const cartographic = options.cartographic;
    //>>includeStart('debug', pragmas.debug);
    if (!defined(options.cartographic)) {
      throw new DeveloperError("options.cartographic is required.");
    }
    //>>includeEnd('debug');

    const tileSize = options.tileSize ?? this._tileSize;
    const tileSizeString = `${tileSize}x${tileSize}`;

    let { panoId } = options;

    if (!defined(panoId)) {
      const panoIdObject = await this.getNearestPanoId(cartographic);
      panoId = panoIdObject.panoId;
    }

    const credit = GoogleMaps.getDefaultCredit();

    const panoLat = CesiumMath.toDegrees(cartographic.latitude);
    const panoLng = CesiumMath.toDegrees(cartographic.longitude);
    //const height = cartographic.height;
    const pos = [panoLat, panoLng];
    const posObj = Cartesian3.fromDegrees(pos[1], pos[0], 0);

    const pUrl = (h, p) => {
      const resource = this._baseResource.getDerivedResource({
        queryParameters: {
          size: tileSizeString,
          pano: panoId,
          heading: h,
          pitch: p,
          key: this._key,
          ...(defined(this._signature) && { signature: this._signature }),
        },
      });

      return resource.url;
    };

    const positiveX = pUrl(0, 0);
    const negativeX = pUrl(180, 0);
    const positiveZ = pUrl(270, 0);
    const negativeZ = pUrl(90, 0);
    const positiveY = pUrl(-90, -90);
    const negativeY = pUrl(-90, 90);

    const ndeToFixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
      "north",
      "down",
    );

    const transform = Matrix4.getMatrix3(
      ndeToFixedFrameTransform(posObj, Ellipsoid.default),
      new Matrix3(),
    );

    const panorama = new CubeMapPanorama({
      sources: {
        positiveX,
        negativeX,
        positiveY,
        negativeY,
        positiveZ,
        negativeZ,
      },
      transform: transform,
      credit,
    });

    return panorama;
  };

/**
 * Gets the panorama primitive for a given panoId. Lookup a panoId using {@link GoogleStreetViewCubeMapPanoramaProvider#getNearestPanoId}.
 *
 * @param {string} panoId The panoramaId identifier for the image in the Google API.
 *
 * @returns {CubeMapPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIdObject = provider.getNearestPanoId(position);
 * const primitive = await provider.loadPanoramaFromPanoId(panoIdObject.panoId);
 * viewer.scene.primitive.add(primitive);
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.loadPanoramaFromPanoId =
  async function (panoId) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(panoId)) {
      throw new DeveloperError("panoId is required.");
    }
    //>>includeEnd('debug');

    const panoIdMetadata = await this.getPanoIdMetadata(panoId);

    const { cartographic } =
      GoogleStreetViewCubeMapPanoramaProvider._parseMetadata(panoIdMetadata);

    return this.loadPanorama({
      cartographic,
      panoId,
    });
  };

/**
 * Gets the panoIds for the given cartographic location. See {@link https://developers.google.com/maps/documentation/tile/streetview#panoid-search}.

 * @param {Cartographic} position The position to search for the nearest panoId.
 * 
 * @returns {Object} an object containing a panoId, latitude, and longitude of the closest panorama
 * 
 * @example
 * 
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getNearestPanoId(position);
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.getNearestPanoId =
  async function (position) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(position)) {
      throw new DeveloperError("position is required.");
    }
    //>>includeEnd('debug');

    const longitude = CesiumMath.toDegrees(position.longitude);
    const latitude = CesiumMath.toDegrees(position.latitude);

    const pos = [latitude, longitude]; //lat,lng Aukland
    const posString = pos.join(",");

    const resource = this._metadataResource.getDerivedResource({
      queryParameters: {
        key: this._key,
        location: posString,
      },
    });

    const panoIdObject = await resource.fetchJson();

    if (panoIdObject.status !== "OK") {
      throw new DeveloperError(
        `StreetView metadata error: ${panoIdObject.status}`,
      );
    }
    return {
      panoId: panoIdObject.pano_id,
      latitude: panoIdObject.location.lat,
      longitude: panoIdObject.location.lng,
    };
  };

/**
 * Gets metadata for panoId. See {@link https://developers.google.com/maps/documentation/tile/streetview#metadata_response} for response object.
 * @param {string} panoId
 *
 * @returns {object} object containing metadata for the panoId.
 *
 * @example
 * const panoIdObject = provider.getNearestPanoId(position);
 * const panoIdMetadata = provider.getPanoIdMetadata(panoIdObject.panoId);
 *
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.getPanoIdMetadata =
  async function (panoId) {
    const resource = this._metadataResource.getDerivedResource({
      queryParameters: {
        key: this._key,
        pano: panoId,
      },
    });

    const panoIdObject = await resource.fetchJson();

    if (panoIdObject.status !== "OK") {
      throw new DeveloperError(
        `StreetView metadata error: ${panoIdObject.status}`,
      );
    }
    return panoIdObject;
  };

/**
 * Creates a {@link PanoramaProvider} which provides image tiles from the {@link https://developers.google.com/maps/documentation/tile/streetview|Google Street View Tiles API}.
 * @param {object} options Object with the following properties:
 * @param {string} [options.apiKey=GoogleMaps.defaultApiKey] Your API key to access Google Street View Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {string|Resource} [options.url=GoogleMaps.streetViewStaticApiEndpoint] The URL to access Google Street View Tiles. See {@link https://developers.google.com/maps/documentation/streetview/overview} for more information.
 * @param {number} [options.tileSize=600] Default width and height (in pixels) of each square tile.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<GoogleStreetViewCubeMapPanoramaProvider>} A promise that resolves to the created GoogleStreetViewCubeMapPanoramaProvider.'
 *
 * @example
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 */
GoogleStreetViewCubeMapPanoramaProvider.fromUrl = async function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.apiKey)) {
    throw new DeveloperError("options.apiKey is required.");
  }
  //>>includeEnd('debug');

  // const response = await Resource.post({
  //   url: "https://tile.googleapis.com/v1/createSession",
  //   queryParameters: { key: options.apiKey },
  //   data: JSON.stringify({
  //     mapType: "streetview",
  //     language: "en-US",
  //     region: "US",
  //   }),
  // });
  // const responseJson = JSON.parse(response);

  return new GoogleStreetViewCubeMapPanoramaProvider({
    // ...responseJson,
    ...options,
  });
};

GoogleStreetViewCubeMapPanoramaProvider.getGoogleStreetViewTileUrls =
  async function (options) {
    const { z, partition, panoId, key, session } = options;
    const tileIds = {};
    let tileIdKey;
    for (let x = 0; x < partition * 2; x++) {
      for (let y = 0; y < partition; y++) {
        tileIdKey = `${z}/${x}/${y}`;
        tileIds[tileIdKey] =
          GoogleStreetViewCubeMapPanoramaProvider._buildTileUrl({
            z,
            x,
            y,
            panoId,
            key,
            session,
          });
      }
    }
    return tileIds;
  };

GoogleStreetViewCubeMapPanoramaProvider._parseMetadata = function (
  panoIdMetadata,
) {
  const cartographic = Cartographic.fromDegrees(
    panoIdMetadata.location.lng,
    panoIdMetadata.location.lat,
    0,
  );
  return {
    cartographic,
  };
};

export default GoogleStreetViewCubeMapPanoramaProvider;
