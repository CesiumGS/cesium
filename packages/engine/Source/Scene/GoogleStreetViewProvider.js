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
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link GoogleStreetViewProvider.fromUrl}.
 * </div>
 *
 *
 * Creates a {@link PanoramaProvider} which provides panoramic images from the {@link https://developers.google.com/maps/documentation/tile/streetview|Google Street View Tiles API}.
 *
 * @alias GoogleStreetViewProvider
 * @constructor
 *
 * @see EquirectangularPanorama
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?id=google-streetview-panorama-2|Cesium Sandcastle Google Streetview Panorama}
 *
 */
function GoogleStreetViewProvider(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._session = options.session;
  this._key = options.apiKey;
  this._skipColorSpaceConversion = options.skipColorSpaceConversion;
}

Object.defineProperties(GoogleStreetViewProvider.prototype, {});

/**
 * Gets the panorama primitive for a requested position and orientation.
 * @param {object} options Object with the following properties:
 * @param {Cartographic} options.cartographic The position to place the panorama in the scene.
 * @param {string} [options.panoId] The panoramaId identifier for the image in the Google API. If not provided this will be looked up for the provided cartographic location.
 * @param {string} [options.zInput=1] The zoom level for which to load panorama tiles. Valid values are 2 to 4. See {@link https://developers.google.com/maps/documentation/tile/streetview#street_view_image_tiles}
 * @param {boolean} [options.heading=0] The heading to orient the panorama in the scene in degrees. Valid values are 0 to 360.
 * @param {boolean} [options.tilt=0] The tilt to orient the panorama in the scene in degrees. Valid values are -180 to 180.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {EquirectangularPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getPanoIds(position);
 * const panoId = panoIds[0];
 * const panoIdMetadata = provider.getPanoIdMetadata(panoId);
 * const { heading, tilt } = panoIdMetadata;
 * const primitive = await provider.loadPanorama({
 *   position,
 *   zInput: 3,
 *   heading,
 *   tilt,
 *   panoId
 * });
 * viewer.scene.primitive.add(primitive);
 *
 */
GoogleStreetViewProvider.prototype.loadPanorama = async function (options) {
  const cartographic = options.cartographic;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.cartographic)) {
    throw new DeveloperError("options.cartographic is required.");
  }
  //>>includeEnd('debug');
  const zInput = options.zInput || 1;
  let heading = options.heading || 0;
  let tilt = options.tilt || 0;

  let panoId = options.panoId;
  if (!defined(panoId)) {
    const panoIds = await this.getPanoIds(cartographic);
    panoId = panoIds[0];
    const panoIdMetadata = this.getPanoIdMetadata(panoId);
    ({ heading, tilt } =
      GoogleStreetViewProvider.parseMetadata(panoIdMetadata));
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

  if (!partition) {
    throw new DeveloperError(`Unsupported Street View zoom level: ${zInput}`);
  }

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
 * Gets the panorama primitive for a given panoId. Lookup a panoId using {@link GoogleStreetViewProvider#getPanoId}.
 *
 * @param {string} panoId
 * @param {string} zInput
 *
 * @returns {EquirectangularPanorama} The panorama primitive textured with imagery.
 *
 * @example
 *
 * const provider = await Cesium.GoogleStreetViewProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getPanoIds(position);
 * const primitive = await provider.loadPanoramafromPanoId(panoIds[0]);
 * viewer.scene.primitive.add(primitive);
 */
GoogleStreetViewProvider.prototype.loadPanoramafromPanoId = async function (
  panoId,
  zInput,
) {
  const panoIdMetadata = await this.getPanoIdMetadata(panoId);

  const { heading, tilt, cartographic } =
    GoogleStreetViewProvider.parseMetadata(panoIdMetadata);

  return this.loadPanorama({
    cartographic,
    zInput,
    heading,
    tilt,
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
 * const provider = await Cesium.GoogleStreetViewProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
 * const panoIds = provider.getPanoIds(position);
 */
GoogleStreetViewProvider.prototype.getPanoIds = async function (position) {
  const longitude = CesiumMath.toDegrees(position.longitude);
  const latitude = CesiumMath.toDegrees(position.latitude);

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

  const panoIdJson = JSON.parse(panoIdsResponse);
  return panoIdJson.panoIds;
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
GoogleStreetViewProvider.prototype.getPanoIdMetadata = async function (panoId) {
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
 * Creates a {@link PanoramaProvider} which provides image tiles from the {@link https://developers.google.com/maps/documentation/tile/streetview|Google Street View Tiles API}.
 * @param {object} options Object with the following properties:
 * @param {string} [options.apiKey=GoogleMaps.defaultApiKey] Your API key to access Google Street View Tiles. See {@link https://developers.google.com/maps/documentation/javascript/get-api-key} for instructions on how to create your own key.
 * @param {boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @returns {Promise<GoogleStreetViewProvider>} A promise that resolves to the created GoogleStreetViewProvider.'
 *
 * @example
 * const provider = await Cesium.GoogleStreetViewProvider.fromUrl({
 *   apiKey: 'your Google Streetview Tiles api key'
 * })
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

GoogleStreetViewProvider.parseMetadata = function (panoIdMetadata) {
  const cartographic = new Cartographic(
    panoIdMetadata.lng,
    panoIdMetadata.lat,
    panoIdMetadata.originalElevationAboveEgm96,
  );

  const tilt = -90 + panoIdMetadata.tilt;
  const heading = panoIdMetadata.heading;
  return {
    cartographic,
    heading,
    tilt,
  };
};

export default GoogleStreetViewProvider;
