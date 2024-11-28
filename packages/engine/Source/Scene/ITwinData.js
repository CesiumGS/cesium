import Cesium3DTileset from "./Cesium3DTileset.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import ITwinPlatform from "../Core/ITwinPlatform.js";
import RuntimeError from "../Core/RuntimeError.js";
import Check from "../Core/Check.js";

/**
 * Methods for loading iTwin platform data into CesiumJS
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see ITwinPlatform
 * @namespace ITwinData
 */
const ITwinData = {};

/**
 * Create a {@link Cesium3DTileset} for the given iModel id using iTwin's Mesh Export API.
 *
 * If there is not a completed export available for the given iModel id, the returned promise will resolve to <code>undefined</code>.
 * We recommend waiting 10-20 seconds and trying to load the tileset again.
 * If all exports are Invalid this will throw an error.
 *
 * @example
 * const tileset = await Cesium.ITwinData.createTilesetFromIModelId(iModelId);
 * if (Cesium.defined(tileset)) {
 *   viewer.scene.primitives.add(tileset);
 * }
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId The id of the iModel to load
 * @param {Cesium3DTileset.ConstructorOptions} [options] Object containing options to pass to the internally created {@link Cesium3DTileset}.
 * @returns {Promise<Cesium3DTileset | undefined>} A promise that will resolve to the created 3D tileset or <code>undefined</code> if there is no completed export for the given iModel id
 *
 * @throws {RuntimeError} If all exports for the given iModel are Invalid
 * @throws {RuntimeError} If the iTwin API request is not successful
 */
ITwinData.createTilesetFromIModelId = async function (iModelId, options) {
  const { exports } = await ITwinPlatform.getExports(iModelId);

  if (
    exports.length > 0 &&
    exports.every((exportObj) => {
      return exportObj.status === ITwinPlatform.ExportStatus.Invalid;
    })
  ) {
    throw new RuntimeError(
      `All exports for this iModel are Invalid: ${iModelId}`,
    );
  }

  const completeExport = exports.find((exportObj) => {
    return exportObj.status === ITwinPlatform.ExportStatus.Complete;
  });

  if (!defined(completeExport)) {
    return;
  }

  // Convert the link to the tileset url while preserving the search paramaters
  // This link is only valid 1 hour
  const baseUrl = new URL(completeExport._links.mesh.href);
  baseUrl.pathname = `${baseUrl.pathname}/tileset.json`;
  const tilesetUrl = baseUrl.toString();

  const resource = new Resource({
    url: tilesetUrl,
  });

  return Cesium3DTileset.fromUrl(resource, options);
};

/**
 * Create a tileset for the specified reality data id. This function only works
 * with 3D Tiles meshes and point clouds.
 *
 * If the <code>type</code> or <code>rootDocument</code> are not provided this function
 * will first request the full metadata for the specified reality data to fill these values.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iTwinId The id of the iTwin to load data from
 * @param {string} realityDataId The id of the reality data to load
 * @param {ITwinPlatform.RealityDataType} [type] The type of this reality data
 * @param {string} [rootDocument] The path of the root document for this reality data
 * @returns {Promise<Cesium3DTileset>}
 */
ITwinData.createTilesetForRealityDataId = async function (
  iTwinId,
  realityDataId,
  type,
  rootDocument,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iTwinId", iTwinId);
  Check.typeOf.string("realityDataId", realityDataId);
  if (defined(type)) {
    Check.typeOf.string("type", type);
  }
  if (defined(rootDocument)) {
    Check.typeOf.string("rootDocument", rootDocument);
  }
  //>>includeEnd('debug')

  if (!defined(type) || !defined(rootDocument)) {
    const metadata = await ITwinPlatform.getRealityDataMetadata(
      iTwinId,
      realityDataId,
    );
    rootDocument = metadata.rootDocument;
    type = metadata.type;
  }

  const supportedRealityDataTypes = [
    ITwinPlatform.RealityDataType.Cesium3DTiles,
    ITwinPlatform.RealityDataType.PNTS,
    ITwinPlatform.RealityDataType.RealityMesh3DTiles,
    ITwinPlatform.RealityDataType.Terrain3DTiles,
  ];

  if (!supportedRealityDataTypes.includes(type)) {
    throw new RuntimeError(`Reality data type is not a mesh type: ${type}`);
  }

  const tilesetAccessUrl = await ITwinPlatform.getRealityDataURL(
    iTwinId,
    realityDataId,
    rootDocument,
  );

  return Cesium3DTileset.fromUrl(tilesetAccessUrl, {
    maximumScreenSpaceError: 4,
  });
};

export default ITwinData;
