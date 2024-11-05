import Cesium3DTileset from "./Cesium3DTileset.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import ITwin, { ExportStatus, ExportType } from "../Core/ITwin.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * @param {Export} exportObj
 * @param {Cesium3DTileset.ConstructorOptions} [options]
 */
async function loadExport(exportObj, options) {
  let status = exportObj.status;

  if (exportObj.request.exportType !== ExportType.CESIUM) {
    // This is an undocumented value but I think it's the only one we want to load
    // TODO: should we even be checking this?
    throw new Error(`Wrong export type ${exportObj.request.exportType}`);
  }

  const timeoutAfter = 300000;
  const start = Date.now();
  // wait until the export is complete
  while (status !== ExportStatus.Complete) {
    await delay(5000);
    exportObj = (await ITwin.getExport(exportObj.id)).export;
    status = exportObj.status;
    console.log(`Export is ${status}`);

    if (Date.now() - start > timeoutAfter) {
      throw new RuntimeError("Export did not complete in time.");
    }
  }

  // This link is only valid 1 hour
  let tilesetUrl = exportObj._links.mesh.href;
  const splitStr = tilesetUrl.split("?");
  // is there a cleaner way to do this?
  tilesetUrl = `${splitStr[0]}/tileset.json?${splitStr[1]}`;

  const resource = new Resource({
    url: tilesetUrl,
  });

  return Cesium3DTileset.fromUrl(resource, options);
}

const createIModel3DTileset = {};

/**
 * Creates a {@link Cesium3DTileset} instance for the Google Photorealistic 3D Tiles tileset.
 *
 * @function
 *
 * @param {string} exportId
 * @param {Cesium3DTileset.ConstructorOptions} [options] An object describing initialization options.
 * @returns {Promise<Cesium3DTileset>}
 *
 * @see ITwin
 *
 * @example
 * // Use your own iTwin API key for mesh export
 * Cesium.ITwin.defaultApiKey = "your-api-key";
 *
 * const viewer = new Cesium.Viewer("cesiumContainer");
 *
 * try {
 *   const tileset = await Cesium.createIModel3DTileset();
 *   viewer.scene.primitives.add(tileset));
 * } catch (error) {
 *   console.log(`Error creating tileset: ${error}`);
 * }
 */
createIModel3DTileset.fromExportId = async function (exportId, options) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }

  options = options ?? {};

  const result = await ITwin.getExport(exportId);
  const tileset = await loadExport(result.export, options);
  return tileset;
};

/**
 * Check the exports for the given iModel + changeset combination for any that
 * have the desired CESIUM type and returns the first one that matches as a new tileset.
 *
 * If there is not a CESIUM export you can create it using {@link ITwin.createExportForModelId}
 *
 * This function assumes one export per type per "iModel id + changeset id". If you need to create
 * multiple exports per "iModel id + changeset id" you should switch to using {@link createIModel3DTileset}
 * with the export id directly
 *
 * @example
 * // Try to load the corresponding tileset export or create it if it doesn't exist
 * let tileset = await Cesium.createIModel3DTileset.fromModelIdimodelId, changesetId);
 * if (!Cesium.defined(tileset)) {
 *   const exportId = await Cesium.ITwin.createExportForModelId(imodelId, changesetId, accessToken);
 *   tileset = await Cesium.createIModel3DTileset(exportId);
 * }
 *
 * @param {string} iModelId
 * @param {string} changesetId
 * @param {Cesium3DTileset.ConstructorOptions} options
 */
createIModel3DTileset.fromModelId = async function (
  iModelId,
  changesetId,
  options,
) {
  const { exports } = await ITwin.getExports(iModelId, changesetId);
  const cesiumExport = exports.find(
    (exportObj) => exportObj.request?.exportType === ExportType.CESIUM,
  );
  if (!defined(cesiumExport)) {
    return;
  }
  return loadExport(cesiumExport, options);
};

export default createIModel3DTileset;
