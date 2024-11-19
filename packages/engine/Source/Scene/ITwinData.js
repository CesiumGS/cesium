import Cesium3DTileset from "./Cesium3DTileset.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import ITwinPlatform from "../Core/ITwinPlatform.js";
import RuntimeError from "../Core/RuntimeError.js";
import Check from "../Core/Check.js";

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * @param {Export} exportObj
 * @param {Cesium3DTileset.ConstructorOptions} [options] Object containing options to pass to an internally created {@link Cesium3DTileset}.
 * @returns {Promise<Cesium3DTileset>}
 */
async function loadExport(exportObj, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("exportObj", exportObj);
  //>>includeEnd('debug')

  let status = exportObj.status;

  if (exportObj.request.exportType !== ITwinPlatform.ExportType["3DTILES"]) {
    throw new RuntimeError(`Wrong export type ${exportObj.request.exportType}`);
  }

  const timeoutAfter = 300000;
  const start = Date.now();
  // wait until the export is complete
  while (status !== ITwinPlatform.ExportStatus.Complete) {
    await delay(5000);
    exportObj = (await ITwinPlatform.getExport(exportObj.id)).export;
    status = exportObj.status;
    console.log(`Export is ${status}`);

    if (Date.now() - start > timeoutAfter) {
      throw new RuntimeError("Export did not complete in time.");
    }
  }

  // Convert the link to the tileset url while preserving the search paramaters
  // This link is only valid 1 hour
  const baseUrl = new URL(exportObj._links.mesh.href);
  baseUrl.pathname = `${baseUrl.pathname}/tileset.json`;
  const tilesetUrl = baseUrl.toString();

  const resource = new Resource({
    url: tilesetUrl,
  });

  return Cesium3DTileset.fromUrl(resource, options);
}

/**
 * Methods for loading iTwin platform data into CesiumJS
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see ITwinPlatform to set the API token and access api functions
 * @namespace ITwinData
 */
const ITwinData = {};

/**
 * Creates a {@link Cesium3DTileset} instance for the given export id.
 *
 * @function
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} exportId
 * @param {Cesium3DTileset.ConstructorOptions} [options] Object containing options to pass to an internally created {@link Cesium3DTileset}.
 * @returns {Promise<Cesium3DTileset>}
 *
 * @throws {RuntimeError} Wrong export type
 * @throws {RuntimeError} Export did not complete in time.
 *
 * @example
 * TODO: example after API finalized
 * @deprecated
 */
ITwinData.createTilesetFromExportId = async function (exportId, options) {
  const result = await ITwinPlatform.getExport(exportId);
  const tileset = await loadExport(result.export, options);
  return tileset;
};

/**
 * Loads the export for the specified iModel with the export type that CesiumJS can load and returns
 * a tileset created from that export.
 *
 * @example
 * TODO: example after API finalized
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId The id of the iModel to load
 * @param {Cesium3DTileset.ConstructorOptions} [options] Object containing options to pass to an internally created {@link Cesium3DTileset}.
 * @returns {Promise<Cesium3DTileset | undefined>} Will return <code>undefined</code> if there is no export for the given iModel id
 *
 * @throws {RuntimeError} Wrong export type
 * @throws {RuntimeError} Export did not complete in time.
 */
ITwinData.createTilesetFromModelId = async function (iModelId, options) {
  const { exports } = await ITwinPlatform.getExports(iModelId);
  const cesiumExport = exports[0];
  if (!defined(cesiumExport)) {
    return;
  }
  return loadExport(cesiumExport, options);
};

export default ITwinData;
