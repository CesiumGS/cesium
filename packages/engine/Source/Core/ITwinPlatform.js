import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

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
 * Status states for a mesh-export export
 * @enum {string}
 */
ITwinPlatform.ExportStatus = Object.freeze({
  NotStarted: "NotStarted",
  InProgress: "InProgress",
  Complete: "Complete",
  Invalid: "Invalid",
});

/**
 * Types of mesh-export exports. CesiumJS only supports loading <code>3DTILES</code> type exports
 * @enum {string}
 */
ITwinPlatform.ExportType = Object.freeze({
  IMODEL: "IMODEL",
  CESIUM: "CESIUM",
  "3DTILES": "3DTILES",
});

/**
 * Gets or sets the default iTwin access token. This token should have the <code>itwin-platform</code> scope.
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
 * @typedef {Object} ExportRequest
 * @property {string} iModelId
 * @property {string} changesetId
 * @property {ITwinPlatform.ExportType} exportType Type of the export. CesiumJS only supports the 3DTILES type
 */

/**
 * @typedef {Object} Link
 * @property {string} href
 */

/**
 * @typedef {Object} ExportRepresentation
 * The export objects from get-exports when using return=representation
 * @property {string} id Export id
 * @property {string} displayName Name of the iModel
 * @property {ITwinPlatform.ExportStatus} status Status of this export
 * @property {string} lastModified
 * @property {ExportRequest} request Object containing info about the export itself
 * @property {{mesh: Link}} _links Object containing relevant links. For Exports this includes the access url for the mesh itself
 */

/**
 * @typedef {Object} GetExportsResponse
 * @property {ExportRepresentation[]} exports The list of exports for the current page
 * @property {{self: Link, next: Link | undefined, prev: Link | undefined}} _links Pagination links
 */

/**
 * Get the list of exports for the specified iModel at it's most current version. This will only return exports with {@link ITwinPlatform.ExportType} of <code>3DTILES</code>.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @private
 *
 * @param {string} iModelId iModel id
 *
 * @throws {RuntimeError} Unauthorized, bad token, wrong scopes or headers bad.
 * @throws {RuntimeError} Not allowed, forbidden
 * @throws {RuntimeError} Unprocessable Entity
 * @throws {RuntimeError} Too many requests
 * @throws {RuntimeError} Unknown request failure
 * @returns {Promise<GetExportsResponse>}
 */
ITwinPlatform.getExports = async function (iModelId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iModelId", iModelId);
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  const resource = new Resource({
    url: `${ITwinPlatform.apiEndpoint}mesh-export`,
    headers: {
      Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
      Prefer: "return=representation",
    },
    queryParameters: {
      iModelId: iModelId,
      exportType: ITwinPlatform.ExportType["3DTILES"],
      // TODO: If we're only requesting the top 1 is there a chance it's `Invalid` instead of `Complete`
      // and never possible to load it?
      $top: "1",
      client: "CesiumJS",
    },
  });
  /* global CESIUM_VERSION */
  if (typeof CESIUM_VERSION !== "undefined") {
    resource.appendQueryParameters({ clientVersion: CESIUM_VERSION });
  }

  try {
    const response = await resource.fetchJson();
    return response;
  } catch (error) {
    const result = JSON.parse(error.response);
    if (error.statusCode === 401) {
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (error.statusCode === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (error.statusCode === 422) {
      throw new RuntimeError(
        `Unprocessable Entity:${result.error.code} ${result.error.message}`,
      );
    } else if (error.statusCode === 429) {
      throw new RuntimeError("Too many requests");
    }
    throw new RuntimeError(`Unknown request failure ${error.statusCode}`);
  }
};

export default ITwinPlatform;
