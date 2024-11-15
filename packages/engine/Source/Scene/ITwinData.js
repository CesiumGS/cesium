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
 * @param {Cesium3DTileset.ConstructorOptions} [options]
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

const ITwinData = {};

/**
 * Creates a {@link Cesium3DTileset} instance for the Google Photorealistic 3D Tiles tileset.
 *
 * @function
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} exportId
 * @param {Cesium3DTileset.ConstructorOptions} [options] An object describing initialization options.
 * @returns {Promise<Cesium3DTileset>}
 *
 * @throws {RuntimeError} Wrong export type
 * @throws {RuntimeError} Export did not complete in time.
 *
 * @example
 * TODO: example after API finalized
 */
ITwinData.createTilesetFromExportId = async function (exportId, options) {
  options = options ?? {};

  const result = await ITwinPlatform.getExport(exportId);
  const tileset = await loadExport(result.export, options);
  return tileset;
};

/**
 * Check the exports for the given iModel + changeset combination for any that
 * have the desired CESIUM type and returns the first one that matches as a new tileset.
 *
 * If there is not a CESIUM export you can create it using {@link ITwinPlatform.createExportForModelId}
 *
 * This function assumes one export per type per "iModel id + changeset id". If you need to create
 * multiple exports per "iModel id + changeset id" you should switch to using {@link ITwinData}
 * with the export id directly
 *
 * @example
 * TODO: example after API finalized
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId
 * @param {string} changesetId
 * @param {Cesium3DTileset.ConstructorOptions} options
 *
 * @throws {RuntimeError} Wrong export type
 * @throws {RuntimeError} Export did not complete in time.
 */
ITwinData.createTilesetFromModelId = async function (
  iModelId,
  changesetId,
  options,
) {
  const { exports } = await ITwinPlatform.getExports(iModelId, changesetId);
  const cesiumExport = exports.find(
    (exportObj) =>
      exportObj.request?.exportType === ITwinPlatform.ExportType["3DTILES"],
  );
  if (!defined(cesiumExport)) {
    return;
  }
  return loadExport(cesiumExport, options);
};

export default ITwinData;
