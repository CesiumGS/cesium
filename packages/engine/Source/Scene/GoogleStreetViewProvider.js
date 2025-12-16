import DeveloperError from "../Core/DeveloperError.js";
import EquirectangularPanorama from "./EquirectangularPanorama.js";
import PanoramaCollection from "./PanoramaCollection.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import CesiumMath from "../Core/Math.js";
import Transforms from "../Core/Transforms.js";
import Frozen from "../Core/Frozen.js";

// Maps API tile level to number of partitions in sphere
const GOOGLE_STREETVIEW_PARTITION_REFERENCE = {
  2: 2,
  3: 4,
  4: 8,
};

const getGoogleStreetViewTileUrls = async (options) => {
  const { z, p, panoId, key, session } = options;
  const tileIds = {};
  let tileIdKey, tileResource, tileApiUrl;
  for (let x = 0; x < p * 2; x++) {
    for (let y = 0; y < p; y++) {
      tileApiUrl = `https://tile.googleapis.com/v1/streetview/tiles/${z}/${x}/${y}`;

      tileResource = new Resource({
        url: tileApiUrl,
        queryParameters: {
          key: key,
          session: session,
          panoId: panoId,
        },
        data: JSON.stringify({}),
      });

      tileIdKey = `${z}/${x}/${y}`;
      tileIds[tileIdKey] = tileResource.url;
    }
  }
  return tileIds;
};

const getTilesfromUrls = (options) => {
  const { tileIds, transform, p } = options;
  let panoramaTiles = [];
  let tileUrl, partitionSize, minClock, maxClock, minCone, maxCone;
  let tx, ty;

  for (const tileId in tileIds) {
    if (tileId in tileIds) {
      [, tx, ty] = tileId.split("/");
      tileUrl = tileIds[tileId];

      partitionSize = 180 / p;

      minClock = 360 - (+tx + 1) * partitionSize;
      maxClock = 360 - tx * partitionSize;
      minCone = ty * partitionSize;
      maxCone = (+ty + 1) * partitionSize;

      const panoTile = new EquirectangularPanorama({
        image: tileUrl,
        transform,
        minimumClock: minClock,
        maximumClock: maxClock,
        minimumCone: minCone,
        maximumCone: maxCone,
        repeatHorizontal: -p * 2,
        repeatVertical: p,
      });

      panoramaTiles = [...panoramaTiles, panoTile];
    }
  }
  return panoramaTiles;
};

/**
 * Provides imagery to be displayed in a panorama.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias GoogleStreetViewProvider
 * @constructor
 *
 * @see EquirectangularPanorama
 * @see SkyBoxPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers.html|Cesium Sandcastle Imagery Layers Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
 */
function GoogleStreetViewProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._session = options.session;
  this._key = options.apiKey;
}

Object.defineProperties(GoogleStreetViewProvider.prototype, {});

/**
 * Gets the panorama collection containing the panorama primitive for the given cartographic location
 *
 * @returns {PanoramaCollection} The panorama collection containing imagery.
 */
GoogleStreetViewProvider.prototype.loadPanorama = async function (options) {
  const { cartographic } = options;

  const zInput = options.zInput || 1;
  const heading = options.heading || 0;
  let panoId = options.panoId;

  if (!defined(panoId)) {
    const panoIds = await this.getPanoIds({
      cartographic,
    });
    panoId = panoIds[0];
  }

  const panoCollection = new PanoramaCollection();

  const position = Cartesian3.fromDegrees(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
  );
  const enuTransform = Transforms.eastNorthUpToFixedFrame(position);

  const headingRad = CesiumMath.toRadians(-heading - 90);
  const headingRotation = Matrix3.fromRotationZ(headingRad);
  const headingRotation4 = Matrix4.fromRotationTranslation(
    headingRotation,
    Cartesian3.ZERO,
  );

  const transform = Matrix4.multiply(
    enuTransform,
    headingRotation4,
    new Matrix4(),
  );

  const p = GOOGLE_STREETVIEW_PARTITION_REFERENCE[zInput];

  const tileIds = await getGoogleStreetViewTileUrls({
    z: zInput,
    p,
    panoId,
    key: this._key,
    session: this._session,
  });

  const panoramaTiles = getTilesfromUrls({
    tileIds,
    transform: transform,
    p,
  });

  for (const panoramaTileIndex in panoramaTiles) {
    if (panoramaTileIndex in panoramaTiles) {
      panoCollection.add(panoramaTiles[panoramaTileIndex]);
    }
  }

  return panoCollection;
};

/**
 * Gets the panorama collection with the panorama primitive for the given panoId and zoom level
 *
 * @returns {PanoramaCollection} The panorama collection containing the panorama primitive.
 */
GoogleStreetViewProvider.prototype.loadPanoramafromPanoId = async function (
  options,
) {
  const { panoId, zInput } = options;

  console.log("loadPanoraramafromPanoId ", panoId);

  // get position of panoId to calculate transform
  const panoIdMetadata = await this.getPanoIdMetadata({ panoId });

  const cartographic = new Cartographic(
    panoIdMetadata.lng,
    panoIdMetadata.lat,
    panoIdMetadata.originalElevationAboveEgm96,
  );

  return this.loadPanorama({
    cartographic,
    zInput,
    panoId,
    heading: panoIdMetadata.heading,
  });
};

/**
 * Gets the panoIds for the given cartographic location
 */
GoogleStreetViewProvider.prototype.getPanoIds = async function (options) {
  const { cartographic } = options;

  const longitude = CesiumMath.toDegrees(cartographic.longitude);
  const latitude = CesiumMath.toDegrees(cartographic.latitude);

  const panoIdsResponse = await Resource.post({
    url: "https://tile.googleapis.com/v1/streetview/panoIds",
    queryParameters: {
      key: this._key,
      session: this._session,
    },
    data: JSON.stringify({
      locations: [{ lat: latitude, lng: longitude }],
      radius: 100,
    }),
  });

  return JSON.parse(panoIdsResponse);
};

/**
 * Gets metadata for panoId
 *
 */
GoogleStreetViewProvider.prototype.getPanoIdMetadata = async function (
  options,
) {
  const { panoId } = options;
  console.log("getPanoIdMetadata ", panoId);
  const metadataResponse = await Resource.fetch({
    url: "https://tile.googleapis.com/v1/streetview/metadata",
    queryParameters: {
      key: this._key,
      session: this._session,
      panoId,
    },
    data: JSON.stringify({}),
  });

  return JSON.parse(metadataResponse);
};

/**
 * Creates an {@link PanoramaProvider} which provides image tiles from {@link https://developers.google.com/maps/documentation/tile/streetview|Google Street View Tiles}.
 * @param {object} options Object with the following properties:
 * @param {string} [options.apiKey=GoogleMaps.defaultApiKey] Your API key to access Google Street View Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<GoogleStreetViewProvider>} A promise that resolves to the created GoogleStreetViewProvider.
 */
GoogleStreetViewProvider.fromUrl = async function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.apiKey)) {
    throw new DeveloperError("options.apiKey is required.");
  }
  //>>includeEnd('debug');

  const response = await Resource.post({
    url: "https://tile.googleapis.com/v1/createSession",
    queryParameters: { key: options.apiKey },
    data: JSON.stringify({
      mapType: "streetview",
      language: "en-US",
      region: "US",
    }),
  });
  const responseJson = JSON.parse(response);

  return new GoogleStreetViewProvider({
    ...responseJson,
    ...options,
    //credit: options.credit ?? GoogleMaps.getDefaultCredit(),
  });
};

export default GoogleStreetViewProvider;
