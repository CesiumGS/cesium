import DeveloperError from "../Core/DeveloperError.js";
import EquirectangularPanorama from "./EquirectangularPanorama.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import CesiumMath from "../Core/Math.js";
import Transforms from "../Core/Transforms.js";
import Frozen from "../Core/Frozen.js";
import GoogleMaps from "../Core/GoogleMaps.js";

// Maps API tile level to number of partitions in sphere
const GOOGLE_STREETVIEW_PARTITION_REFERENCE = {
  2: 2,
  3: 4,
  4: 8,
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
  this._skipColorSpaceConversion = options.skipColorSpaceConversion;
}

Object.defineProperties(GoogleStreetViewProvider.prototype, {});

/**
 * Gets the panorama collection containing the panorama primitive for the given cartographic location
 *
 * @returns {EquirectangularPanorama} The panorama collection containing imagery.
 */
GoogleStreetViewProvider.prototype.loadPanorama = async function (options) {
  const { cartographic } = options;

  const zInput = options.zInput || 1;
  const heading = options.heading || 0;
  const tilt = options.tilt || 0;
  let panoId = options.panoId;

  if (!defined(panoId)) {
    const panoIds = await this.getPanoIds({
      cartographic,
    });
    panoId = panoIds[0];
  }

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

  const partition = GOOGLE_STREETVIEW_PARTITION_REFERENCE[zInput];

  const tileMap = await GoogleStreetViewProvider.getGoogleStreetViewTileUrls({
    z: zInput,
    partition,
    panoId,
    key: this._key,
    session: this._session,
  });

  const canvas = await GoogleStreetViewProvider.stitchBitmapsFromTileMap(
    tileMap,
    this._skipColorSpaceConversion,
  );

  const credit = GoogleMaps.getDefaultCredit();

  const panorama = new EquirectangularPanorama({
    image: canvas,
    transform,
    repeatHorizontal: -1,
    credit,
  });

  return panorama;
};

/**
 * Gets the panorama collection with the panorama primitive for the given panoId and zoom level
 *
 * @returns {EquirectangularPanorama} The panorama collection containing the panorama primitive.
 */
GoogleStreetViewProvider.prototype.loadPanoramafromPanoId = async function (
  options,
) {
  const { panoId, zInput } = options;

  // get position of panoId to calculate transform
  const panoIdMetadata = await this.getPanoIdMetadata({ panoId });

  const cartographic = new Cartographic(
    panoIdMetadata.lng,
    panoIdMetadata.lat,
    panoIdMetadata.originalElevationAboveEgm96,
  );

  const panoTilt = -90 + panoIdMetadata.tilt;

  return this.loadPanorama({
    cartographic,
    zInput,
    panoId,
    heading: panoIdMetadata.heading,
    tilt: panoTilt,
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
 * @param {boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored.
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

GoogleStreetViewProvider.getGoogleStreetViewTileUrls = async function (
  options,
) {
  const { z, partition, panoId, key, session } = options;
  const tileIds = {};
  let tileIdKey, tileResource, tileApiUrl;
  for (let x = 0; x < partition * 2; x++) {
    for (let y = 0; y < partition; y++) {
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

GoogleStreetViewProvider.loadBitmaps = async function (tiles) {
  const flipOptions = {
    flipY: false,
    skipColorSpaceConversion: true,
    preferImageBitmap: true,
  };

  try {
    const loaded = await Promise.all(
      tiles.map(async (t) => ({
        ...t,
        bitmap: await Resource.createIfNeeded(t.src).fetchImage(flipOptions),
      })),
    );
    return loaded.filter((t) => t.bitmap);
  } catch {
    return null;
  }
};

GoogleStreetViewProvider.stitchBitmapsFromTileMap = async function (
  tileMap,
  skipColorSpaceConversion,
) {
  // tileMap: Record<"z/x/y", string>

  const tiles = Object.entries(tileMap).map(([key, src]) => {
    const [z, x, y] = key.split("/").map(Number);
    return { z, x, y, src };
  });

  if (tiles.length === 0) {
    throw new DeveloperError("No tiles provided");
  }

  // Ensure all tiles have the same zoom level
  const zoom = tiles[0].z;
  for (const t of tiles) {
    if (t.z !== zoom) {
      throw new DeveloperError("All tiles must have the same zoom level");
    }
  }

  const bitmaps = await GoogleStreetViewProvider.loadBitmaps(tiles);

  if (!defined(bitmaps)) {
    throw new DeveloperError("No tiles could be loaded");
  }

  // Ensure all tiles have the same dimensions
  const first = bitmaps[0].bitmap;
  for (const t of bitmaps) {
    if (t.bitmap.width !== first.width || t.bitmap.height !== first.height) {
      throw new DeveloperError("All tiles must have the same dimensions");
    }
  }

  const minX = Math.min(...bitmaps.map((t) => t.x));
  const maxX = Math.max(...bitmaps.map((t) => t.x));
  const minY = Math.min(...bitmaps.map((t) => t.y));
  const maxY = Math.max(...bitmaps.map((t) => t.y));

  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;

  const colWidths = Array(cols).fill(0);
  const rowHeights = Array(rows).fill(0);

  for (const t of bitmaps) {
    const col = t.x - minX;
    const row = t.y - minY;
    colWidths[col] = Math.max(colWidths[col], t.bitmap.width);
    rowHeights[row] = Math.max(rowHeights[row], t.bitmap.height);
  }

  const width = colWidths.reduce((a, b) => a + b, 0);
  const height = rowHeights.reduce((a, b) => a + b, 0);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const xOffsets = [];
  const yOffsets = [];

  colWidths.reduce((acc, w, i) => {
    xOffsets[i] = acc;
    return acc + w;
  }, 0);

  rowHeights.reduce((acc, h, i) => {
    yOffsets[i] = acc;
    return acc + h;
  }, 0);

  for (const t of bitmaps) {
    const col = t.x - minX;
    const row = t.y - minY;
    ctx.drawImage(t.bitmap, xOffsets[col], yOffsets[row]);
  }

  for (const t of bitmaps) {
    t.bitmap.close();
  }

  return canvas;
};

export default GoogleStreetViewProvider;
