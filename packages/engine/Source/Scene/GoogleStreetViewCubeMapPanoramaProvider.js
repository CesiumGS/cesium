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
 * Creates a {@link PanoramaProvider} which provides imagery from {@link https://developers.google.com/maps/documentation/streetview|Google Street View Static API} to be displayed in a panorama.
 *
 * @alias GoogleStreetViewCubeMapPanoramaProvider
 * @constructor
 *
 * @see CubeMapPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=google-streetview-panorama|Cesium Sandcastle Google Streetview Panorama}
 *
 */
function GoogleStreetViewCubeMapPanoramaProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
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
 * @param {string} [options.signature] - Optional signature for signed URLs. See {@link https://developers.google.com/maps/documentation/streetview/digital-signature} for more information.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {CubeMapPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Static api key'
 * })
 *
 * const panoIdObject = provider.getNearestPanoId(position);
 * const position = Cartographic.fromDegrees(panoIdObject.location.lng, panoIdObject.location.lat, 0);
 *
 * const primitive = await provider.loadPanorama({
 *   cartographic: position,
 *   panoId: panoIdObject.panoId
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

    const signature = options.signature;

    let { panoId } = options;

    if (!defined(panoId)) {
      const panoIdObject = await this.getNearestPanoId(cartographic);
      panoId = panoIdObject.panoId;
    }

    const credit = GoogleMaps.getDefaultCredit();

    const posObj = Cartesian3.fromDegrees(
      CesiumMath.toDegrees(cartographic.longitude),
      CesiumMath.toDegrees(cartographic.latitude),
      0,
    );

    const positiveX = this._buildFaceUrl({
      heading: 0,
      pitch: 0,
      tileSizeString,
      panoId,
      signature,
    });
    const negativeX = this._buildFaceUrl({
      heading: 180,
      pitch: 0,
      tileSizeString,
      panoId,
      signature,
    });
    const positiveZ = this._buildFaceUrl({
      heading: 270,
      pitch: 0,
      tileSizeString,
      panoId,
      signature,
    });
    const negativeZ = this._buildFaceUrl({
      heading: 90,
      pitch: 0,
      tileSizeString,
      panoId,
      signature,
    });
    const positiveY = this._buildFaceUrl({
      heading: -90,
      pitch: -90,
      tileSizeString,
      panoId,
      signature,
    });
    const negativeY = this._buildFaceUrl({
      heading: -90,
      pitch: 90,
      tileSizeString,
      panoId,
      signature,
    });

    const northDownEastToFixedFrameTransform =
      Transforms.localFrameToFixedFrameGenerator("north", "down");

    const transform = Matrix4.getMatrix3(
      northDownEastToFixedFrameTransform(posObj, Ellipsoid.default),
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
 * Gets the panoIds for the given cartographic location. See {@link https://developers.google.com/maps/documentation/tile/streetview#panoid-search}.

 * @param {Cartographic} position The position to search for the nearest panoId.
 * 
 * @returns {Object} an object containing a panoId, latitude, and longitude of the closest panorama
 * 
 * @example
 * 
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Static api key'
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

    const pos = [
      CesiumMath.toDegrees(position.latitude),
      CesiumMath.toDegrees(position.longitude),
    ];
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
        `GoogleStreetViewCubeMapPanoramaProvider metadata error: ${panoIdObject.status}`,
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
        `GoogleStreetViewCubeMapPanoramaProvider metadata error: ${panoIdObject.status}`,
      );
    }
    return panoIdObject;
  };

GoogleStreetViewCubeMapPanoramaProvider.prototype._buildFaceUrl = function (
  options,
) {
  const { heading, pitch, tileSizeString, panoId, signature } = options;
  const resource = this._baseResource.getDerivedResource({
    queryParameters: {
      size: tileSizeString,
      pano: panoId,
      heading,
      pitch,
      key: this._key,
      ...(defined(signature) && { signature }),
    },
  });

  return resource.url;
};

/**
 * Creates a {@link PanoramaProvider} which provides cube face images from the {@link https://developers.google.com/maps/documentation/streetview|Google Street View Static API}.
 * @param {object} options Object with the following properties:
 * @param {string} [options.apiKey=GoogleMaps.defaultApiKey] Your API key to access Google Street View Static API. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {string|Resource} [options.url=GoogleMaps.streetViewStaticApiEndpoint] The URL to access Google Street View Static API. See {@link https://developers.google.com/maps/documentation/streetview/overview} for more information.
 * @param {number} [options.tileSize=600] Default width and height (in pixels) of each square tile.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<GoogleStreetViewCubeMapPanoramaProvider>} A promise that resolves to the created GoogleStreetViewCubeMapPanoramaProvider.'
 *
 * @example
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Static api key'
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
