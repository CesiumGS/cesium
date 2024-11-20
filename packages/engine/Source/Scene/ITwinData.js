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
 * @see ITwinPlatform to set the API token and base api url
 * @namespace ITwinData
 */
const ITwinData = {};

/**
 * @param {ExportRepresentation} exportObj
 * @param {Cesium3DTileset.ConstructorOptions} [options] Object containing options to pass to an internally created {@link Cesium3DTileset}.
 * @returns {Promise<Cesium3DTileset>}
 */
async function loadExport(exportObj, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("exportObj", exportObj);
  //>>includeEnd('debug')

  if (exportObj.request.exportType !== ITwinPlatform.ExportType["3DTILES"]) {
    throw new RuntimeError(`Wrong export type ${exportObj.request.exportType}`);
  }
  if (exportObj.status !== ITwinPlatform.ExportStatus.Complete) {
    throw new RuntimeError(
      `Export is not completed. ${exportObj.id} - ${exportObj.status}`,
    );
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
 * Loads the export for the specified iModel with the export type that CesiumJS can load and returns
 * a tileset created from that export.
 *
 * If the export is not finished processing this will throw an error. It is up to the caller
 * to re-attempt loading at a later time
 *
 * @example
 * const tileset = await Cesium.ITwinData.createTilesetFromModelId(imodelId);
 * viewer.scene.primitives.add(tileset);
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId The id of the iModel to load
 * @param {Cesium3DTileset.ConstructorOptions} [options] Object containing options to pass to an internally created {@link Cesium3DTileset}.
 * @returns {Promise<Cesium3DTileset | undefined>} Will return <code>undefined</code> if there is no export for the given iModel id
 *
 * @throws {RuntimeError} Wrong export type [type]
 * @throws {RuntimeError} Export is not completed. [id] - [status]
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
