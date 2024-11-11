import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

/**
 * @enum {string}
 */
const ExportStatus = Object.freeze({
  NotStarted: "NotStarted",
  InProgress: "InProgress",
  Complete: "Complete",
  Invalid: "Invalid",
});

/**
 * Type of an export currently, only GLTF and 3DFT are documented
 * The CESIUM option is what we were told to use with Sandcastle
 * I've also seen the IMODEL one but don't know where it's from
 * @enum {string}
 */
const ExportType = Object.freeze({
  "3DFT": "3DFT",
  GLTF: "GLTF",
  IMODEL: "IMODEL",
  CESIUM: "CESIUM",
});

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
 * @property {ExportType} exportType Type of mesh to create. Currently, only GLTF and 3DFT are supported and undocumented CESIUM option
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
 * @property {ExportStatus} status
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
 * @see createIModel3DTileset
 * @namespace ITwin
 */
const ITwin = {};

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
 * @type {string|undefined}
 */
ITwin.defaultAccessToken = undefined;

/**
 * Gets or sets the default iTwin API endpoint.
 *
 * @type {string|Resource}
 * @default https://api.bentley.com
 */
ITwin.apiEndpoint = new Resource({
  url: "https://api.bentley.com",
});

/**
 * @param {string} exportId
 */
ITwin.getExport = async function (exportId) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }

  const headers = {
    Authorization: ITwin.defaultAccessToken,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
  };

  // obtain export for specified export id
  const url = `${ITwin.apiEndpoint}mesh-export/${exportId}`;

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
 * @param {string} iModelId
 * @param {string} [changesetId]
 */
ITwin.getExports = async function (iModelId, changesetId) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }

  const headers = {
    Authorization: ITwin.defaultAccessToken,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
    Prefer: "return=representation", // or return=minimal (the default)
  };

  // obtain export for specified export id
  let url = `${ITwin.apiEndpoint}mesh-export/?iModelId=${iModelId}&exportType=CESIUM&$top=1`;
  if (defined(changesetId) && changesetId !== "") {
    url += `&changesetId=${changesetId}`;
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
 * @param {string} iModelId
 * @param {string} [changesetId]
 */
ITwin.createExportForModelId = async function (iModelId, changesetId) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }

  changesetId = changesetId ?? "";

  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: ITwin.defaultAccessToken,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iModelId,
      changesetId,
      exportType: "CESIUM",
    }),
  };

  // initiate mesh export
  const response = await fetch(
    `${ITwin.apiEndpoint}mesh-export/`,
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

/**
 * Delete the specified export
 *
 * TODO: I'm not sure if we want this or not. Might belong better as an APP level function
 * I just started creating helpers for all the routes under the `mesh-export` API
 * for ease of access during testing
 *
 * @param {string} exportId
 */
ITwin.deleteExport = async function (exportId) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  const headers = {
    Authorization: ITwin.defaultAccessToken,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
  };

  // obtain export for specified export id
  const url = `${ITwin.apiEndpoint}mesh-export/${exportId}`;

  const response = await fetch(url, { method: "DELETE", headers });
  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 404) {
      throw new RuntimeError("Export not found");
    } else if (response.status === 422) {
      throw new RuntimeError(
        `Unprocessable Entity: ${result.error.code} ${result.error.message}`,
      );
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }
    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }
};

export default ITwin;
export { ExportStatus, ExportType };
