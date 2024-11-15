import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

/**
 * @typedef {Object} GeometryOptions
 * @property {boolean} includeLines
 * @property {number} chordTol
 * @property {number} angleTol
 * @property {number} decimationTol
 * @property {number} maxEdgeLength
 * @property {number} minBRepFeatureSize
 * @property {number} minLineStyleComponentSize
 */

/**
 * @typedef {Object} ViewDefinitionFilter
 * @property {string[]} models Array of included model IDs.
 * @property {string[]} categories Array of included category IDs.
 * @property {string[]} neverDrawn Array of element IDs to filter out.
 */

/**
 * @typedef {Object} StartExport
 * @property {string} iModelId
 * @property {string} changesetId
 * @property {ITwinPlatform.ExportType} exportType Type of mesh to create. Currently, only GLTF and 3DFT are supported and undocumented CESIUM option
 * @property {GeometryOptions} geometryOptions
 * @property {ViewDefinitionFilter} viewDefinitionFilter
 */

/**
 * @typedef {Object} Link
 * @property {string} href
 */

/**
 * @typedef {Object} Export
 * @property {string} id
 * @property {string} displayName
 * @property {ITwinPlatform.ExportStatus} status
 * @property {StartExport} request
 * @property {{mesh: Link}} _links
 */

/**
 * @typedef {Object} ExportResponse
 * @property {Export} export
 */

/**
 * Default settings for accessing the iTwin platform.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see ITwinData for ways to import data
 * @namespace ITwinPlatform
 */
const ITwinPlatform = {};

/**
 * @enum {string}
 */
ITwinPlatform.ExportStatus = Object.freeze({
  NotStarted: "NotStarted",
  InProgress: "InProgress",
  Complete: "Complete",
  Invalid: "Invalid",
});

/**
 * @enum {string}
 */
ITwinPlatform.ExportType = Object.freeze({
  IMODEL: "IMODEL",
  CESIUM: "CESIUM",
  "3DTILES": "3DTILES",
});

/**
 * Gets or sets the default iTwin access token.
 *
 * TODO: I'm not sure we can even do this kind of access token. Each route seems to need it's own scopes
 * and we may not be able to guarantee this "top level token" has them all
 * So far we use
 * `mesh-export:read` for loading meshes GET /mesh-export(s)
 * `mesh-export:modify` if we want to include a function to create an export
 * `itwin-platform` if we want to use the iModel shares ourselves  GET /imodels/{id}/shares
 * Seems the `itwin-platform` scope should apply to everything but the docs are a little unclear
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|undefined}
 */
ITwinPlatform.defaultAccessToken = undefined;

/**
 * Gets or sets the default iTwin API endpoint.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|Resource}
 * @default https://api.bentley.com
 */
ITwinPlatform.apiEndpoint = new Resource({
  url: "https://api.bentley.com",
});

/**
 * Get the export object for the specified export id
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} exportId
 *
 * @throws {RuntimeError} Unauthorized, bad token, wrong scopes or headers bad.
 * @throws {RuntimeError} Requested export is not available
 * @throws {RuntimeError} Too many requests
 * @throws {RuntimeError} Unknown request failure
 */
ITwinPlatform.getExport = async function (exportId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("exportId", exportId);
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  const headers = {
    Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
  };

  // obtain export for specified export id
  const url = `${ITwinPlatform.apiEndpoint}mesh-export/${exportId}`;

  // TODO: this request is _really_ slow, like 7 whole second alone for me
  // Arun said this was kinda normal but to keep track of the `x-correlation-id` of any that take EXTRA long
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 404) {
      throw new RuntimeError(`Requested export is not available ${exportId}`);
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }
    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }

  /** @type {ExportResponse} */
  const result = await response.json();
  return result;
};

/**
 * Get the list of exports for the given iModel + changeset
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId
 * @param {string} [changesetId]
 *
 * @throws {RuntimeError} Unauthorized, bad token, wrong scopes or headers bad.
 * @throws {RuntimeError} Not allowed, forbidden
 * @throws {RuntimeError} Unprocessable Entity
 * @throws {RuntimeError} Too many requests
 * @throws {RuntimeError} Unknown request failure
 */
ITwinPlatform.getExports = async function (iModelId, changesetId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iModelId", iModelId);
  if (defined(changesetId)) {
    Check.typeOf.string("changesetId", changesetId);
  }
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  const headers = {
    Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
    Prefer: "return=representation", // or return=minimal (the default)
  };

  // obtain export for specified export id
  // TODO: if we do include the clientVersion what should it be set to? can we sync it with the package.json?
  const url = new URL(`${ITwinPlatform.apiEndpoint}mesh-export`);
  url.searchParams.set("iModelId", iModelId);
  if (defined(changesetId) && changesetId !== "") {
    url.searchParams.set("changesetId", changesetId);
  }
  url.searchParams.set("exportType", ITwinPlatform.ExportType["3DTILES"]);
  url.searchParams.set("$top", "1");
  url.searchParams.set("client", "CesiumJS");
  /* global CESIUM_VERSION */
  if (typeof CESIUM_VERSION !== "undefined") {
    url.searchParams.set("clientVersion", CESIUM_VERSION);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (response.status === 422) {
      throw new RuntimeError(
        `Unprocessable Entity:${result.error.code} ${result.error.message}`,
      );
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }
    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }

  /** @type {{exports: Export[]}} */
  const result = await response.json();
  return result;
};

/**
 * Start the export process for the given iModel + changeset.
 *
 * TODO: REMOVE THIS FUNCTION! Auto generation of exports for the 3DTILES type is planned very soon
 * and will be the desired way of interacting with iModels through exports. This function is here
 * just while we continue testing during the PR process.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId
 * @param {string} [changesetId]
 *
 * @throws {RuntimeError} Unauthorized, bad token, wrong scopes or headers bad.
 * @throws {RuntimeError} Not allowed, forbidden
 * @throws {RuntimeError} Unprocessable: Cannot create export job
 * @throws {RuntimeError} Too many requests
 * @throws {RuntimeError} Unknown request failure
 */
ITwinPlatform.createExportForModelId = async function (iModelId, changesetId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iModelId", iModelId);
  if (defined(changesetId)) {
    Check.typeOf.string("changesetId", changesetId);
  }
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  changesetId = changesetId ?? "";

  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iModelId,
      changesetId,
      exportType: ITwinPlatform.ExportType["3DTILES"],
    }),
  };

  // initiate mesh export
  const response = await fetch(
    `${ITwinPlatform.apiEndpoint}mesh-export/`,
    requestOptions,
  );

  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      console.error(
        result.error.code,
        result.error.message,
        result.error.details,
      );
      throw new RuntimeError(
        "Unauthorized, bad token, wrong scopes or headers bad",
      );
    } else if (response.status === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (response.status === 422) {
      console.error(result.error.code, result.error.message);
      console.error(result.error.details);
      throw new RuntimeError("Unprocessable: Cannot create export job");
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }

    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }

  /** @type {ExportResponse} */
  const result = await response.json();
  return result.export.id;
};

export default ITwinPlatform;
