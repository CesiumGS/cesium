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
 * @see EquirectangularPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=google-streetview-panorama-2|Cesium Sandcastle Google Streetview Panorama}
 *
 */
function GoogleStreetViewCubeMapPanoramaProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._signature = options.signature;
  this._key = options.apiKey;
  this._skipColorSpaceConversion = options.skipColorSpaceConversion;
}

Object.defineProperties(GoogleStreetViewCubeMapPanoramaProvider.prototype, {});

/**
 * Gets the panorama primitive for a requested position and orientation.
 * @param {object} options Object with the following properties:
 * @param {Cartographic} options.cartographic The position to place the panorama in the scene.
 * @param {string} [options.panoId] The panoramaId identifier for the image in the Google API. If not provided this will be looked up for the provided cartographic location.
 * @param {string} [options.zoom=1] The zoom level for which to load panorama tiles. Valid values are 2 to 4. See {@link https://developers.google.com/maps/documentation/tile/streetview#street_view_image_tiles}
 * @param {boolean} [options.heading=0] The heading to orient the panorama in the scene in degrees. Valid values are 0 to 360.
 * @param {boolean} [options.tilt=0] The tilt to orient the panorama in the scene in degrees. Valid values are -180 to 180.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {EquirectangularPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getPanoIds(position);
 * const panoId = panoIds[0];
 * const primitive = await provider.loadPanorama({
 *   position,
 *   zoom: 3,
 *   panoId
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
    
    let { panoId } = options;

    if (!defined(panoId)) {
      const panoIdObject = await this.getPanoIds(cartographic);
      panoId = panoIdObject.panoId;
      // const panoIdMetadata = this.getPanoIdMetadata(panoId);
      // ({ heading, tilt } =
      //   GoogleStreetViewCubeMapPanoramaProvider._parseMetadata(panoIdMetadata));
    }

    const credit = GoogleMaps.getDefaultCredit();

    const panoLat = CesiumMath.toDegrees(cartographic.latitude);
    const panoLng = CesiumMath.toDegrees(cartographic.longitude);
    //const height = cartographic.height;
    const pos = [panoLat, panoLng]; //lat,lng Aukland
    const posObj = Cartesian3.fromDegrees(pos[1], pos[0], 0);

    const baseUrl = "https://maps.googleapis.com/maps/api/streetview";
    function pUrl(that, h, p) {
      const r = new Resource({
        url: baseUrl,
        queryParameters: {
          size: "600x600",
          pano: panoId,
          heading: h,
          pitch: p,
          key: that._key,
          ...(defined(that._signature) && { signature: that._signature }),
        },
      });
      return r.url;
    }

    const positiveX = pUrl(this, 0, 0);
    const negativeX = pUrl(this, 180, 0);
    const positiveZ = pUrl(this, 270, 0);
    const negativeZ = pUrl(this, 90, 0);
    const positiveY = pUrl(this, -90, -90);
    const negativeY = pUrl(this, -90, 90);

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
      credit
    });

    return panorama;
  };

/**
 * Gets the panorama primitive for a given panoId. Lookup a panoId using {@link GoogleStreetViewCubeMapPanoramaProvider#getPanoId}.
 *
 * @param {string} panoId
 * @param {string} zoom
 *
 * @returns {EquirectangularPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getPanoIds(position);
 * const primitive = await provider.loadPanoramaFromPanoId(panoIds[0]);
 * viewer.scene.primitive.add(primitive);
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.loadPanoramaFromPanoId =
  async function (panoId) {
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

 * @param {Cartographic} position
 * 
 * @returns {string[]} an array of panoIds ordered by decreasing distance to the target position 
 * 
 * @example
 * 
 * const provider = await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getPanoIds(position);
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.getPanoIds = async function (
  position,
) {
  const longitude = CesiumMath.toDegrees(position.longitude);
  const latitude = CesiumMath.toDegrees(position.latitude);

  const pos = [latitude, longitude]; //lat,lng Aukland
  const posString = pos.join(",");

  const panoIdsResponse = await Resource.post({
    url: "https://maps.googleapis.com/maps/api/streetview/metadata",
    queryParameters: {
      key: this._key,
      location: posString,
    },
    data: JSON.stringify({
      // location: [{ lat: latitude, lng: longitude }],
      // radius: 100,
    }),
  });

  const panoIdObject = JSON.parse(panoIdsResponse);
  return {
    panoId: panoIdObject.pano_id,
    latitude: panoIdObject.location.lat,
    longitude: panoIdObject.location.lng
  };
};

/**
 * Gets metadata for panoId. See {@link https://developers.google.com/maps/documentation/tile/streetview#metadata_response} for response object.
 * @param {string} panoId
 *
 * @returns {object} object containing metadata for the panoId.
 *
 * @example
 * const panoIds = provider.getPanoIds(position);
 * const panoIdMetadata = provider.getPanoIdMetadata(panoIds[0]);
 *
 */
GoogleStreetViewCubeMapPanoramaProvider.prototype.getPanoIdMetadata =
  async function (panoId) {
    const metadataResponse = await Resource.fetch({
      url: "https://maps.googleapis.com/maps/api/streetview/metadata",
      queryParameters: {
        key: this._key,
        pano: panoId,
      },
      data: JSON.stringify({}),
    });

    return JSON.parse(metadataResponse);
  };

/**
 * Creates a {@link PanoramaProvider} which provides image tiles from the {@link https://developers.google.com/maps/documentation/tile/streetview|Google Street View Tiles API}.
 * @param {object} options Object with the following properties:
 * @param {string} [options.apiKey=GoogleMaps.defaultApiKey] Your API key to access Google Street View Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored.
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
  const cartographic = new Cartographic.fromDegrees(
    panoIdMetadata.location.lng,
    panoIdMetadata.location.lat,
    0,
  );
  return {
    cartographic,
  };
};

GoogleStreetViewCubeMapPanoramaProvider._computePanoramaTransform = function (
  cartographic,
  heading,
  tilt,
) {
  const position = Cartesian3.fromDegrees(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
  );
  const enuTransform = Transforms.eastNorthUpToFixedFrame(position);

  const headingRad = CesiumMath.toRadians(-heading - 90);
  const headingRotation = Matrix3.fromRotationZ(headingRad);

  const tiltRad = CesiumMath.toRadians(tilt);
  const tiltRotation = Matrix3.fromRotationY(tiltRad);
  const combinedRotation = Matrix3.multiply(
    headingRotation,
    tiltRotation,
    new Matrix3(),
  );

  const headingRotation4 = Matrix4.fromRotationTranslation(
    combinedRotation, //headingRotation,
    Cartesian3.ZERO,
  );

  const transform = Matrix4.multiply(
    enuTransform,
    headingRotation4,
    new Matrix4(),
  );
  return transform;
};

export default GoogleStreetViewCubeMapPanoramaProvider;
