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
 * @see ITwinData
 * @namespace ITwinPlatform
 */
const ITwinPlatform = {};

/**
 * Status states for a mesh-export export.
 * Valid values are: <code>NotStarted</code>, <code>InProgress</code>, <code>Complete</code>, <code>Invalid</code>
 * @enum {string}
 */
ITwinPlatform.ExportStatus = Object.freeze({
  NotStarted: "NotStarted",
  InProgress: "InProgress",
  Complete: "Complete",
  Invalid: "Invalid",
});

/**
 * Types of mesh-export exports. CesiumJS only supports loading <code>3DTILES</code> type exports.
 * Valid values are: <code>IMODEL</code>, <code>CESIUM</code>, <code>3DTILES</code>
 * @enum {string}
 */
ITwinPlatform.ExportType = Object.freeze({
  IMODEL: "IMODEL",
  CESIUM: "CESIUM",
  "3DTILES": "3DTILES",
});

/**
 * Types of Reality data. This is a partial list of types we know we can support
 *
 * @see https://developer.bentley.com/apis/reality-management/rm-rd-details/#types
 * @enum {string}
 */
ITwinPlatform.RealityDataType = Object.freeze({
  Cesium3DTiles: "Cesium3DTiles",
  PNTS: "PNTS",
  RealityMesh3DTiles: "RealityMesh3DTiles",
  Terrain3DTiles: "Terrain3DTiles",
  KML: "KML",
  GeoJSON: "GeoJSON",
  Unstructured: "Unstructured",
});

/**
 * Gets or sets the default iTwin access token. This token should have the <code>itwin-platform</code> scope.
 *
 * This value will be ignored if {@link ITwinPlatform.defaultShareKey} is defined.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|undefined}
 */
ITwinPlatform.defaultAccessToken = undefined;

/**
 * Gets or sets the default iTwin share key. If this value is provided it will override {@link ITwinPlatform.defaultAccessToken} in all requests.
 *
 * Share keys can be generated using the iTwin Shares api
 * https://developer.bentley.com/apis/access-control-v2/operations/create-itwin-share/
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|undefined}
 */
ITwinPlatform.defaultShareKey = undefined;

/**
 * Create the necessary Authorization header based on which key/token is set.
 * If the {@link ITwinPlatform.defaultShareKey} is set it takes precedence and
 * will be used regardless if the {@link ITwinPlatform.defaultAccessToken} is set
 * @private
 * @returns {string} full auth header with basic/bearer method
 */
ITwinPlatform._getAuthorizationHeader = function () {
  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(ITwinPlatform.defaultAccessToken) &&
    !defined(ITwinPlatform.defaultShareKey)
  ) {
    throw new DeveloperError(
      "Must set ITwinPlatform.defaultAccessToken or ITwinPlatform.defaultShareKey first",
    );
  }
  //>>includeEnd('debug');

  if (defined(ITwinPlatform.defaultShareKey)) {
    return `Basic ${ITwinPlatform.defaultShareKey}`;
  }
  return `Bearer ${ITwinPlatform.defaultAccessToken}`;
};

/**
 * Gets or sets the default iTwin API endpoint.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|Resource}
 * @default "https://api.bentley.com"
 */
ITwinPlatform.apiEndpoint = new Resource({
  url: "https://api.bentley.com",
});

/**
 * @typedef {Object} ExportRequest
 * @private
 * @property {string} iModelId
 * @property {string} changesetId
 * @property {ITwinPlatform.ExportType} exportType Type of the export. CesiumJS only supports the 3DTILES type
 */

/**
 * @typedef {Object} Link
 * @private
 * @property {string} href
 */

/**
 * @typedef {Object} ExportRepresentation
 * The export objects from get-exports when using return=representation
 * @private
 * @property {string} id Export id
 * @property {string} displayName Name of the iModel
 * @property {ITwinPlatform.ExportStatus} status Status of this export
 * @property {string} lastModified
 * @property {ExportRequest} request Object containing info about the export itself
 * @property {{mesh: Link}} _links Object containing relevant links. For Exports this includes the access url for the mesh itself
 */

/**
 * @typedef {Object} GetExportsResponse
 * @private
 * @property {ExportRepresentation[]} exports The list of exports for the current page
 * @property {{self: Link, next: Link | undefined, prev: Link | undefined}} _links Pagination links
 */

/**
 * Get the list of exports for the specified iModel at it's most current version.
 * This will only return the top 5 exports with {@link ITwinPlatform.ExportType} of <code>3DTILES</code>.
 *
 * @private
 *
 * @param {string} iModelId iModel id
 * @param {string} [changesetId] The id of the changeset to filter results by. If not provided, exports from the latest available changesets will be returned.
 * @returns {Promise<GetExportsResponse>}
 *
 * @throws {RuntimeError} If the iTwin API request is not successful
 */
ITwinPlatform.getExports = async function (iModelId, changesetId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iModelId", iModelId);
  if (defined(changesetId)) {
    Check.typeOf.string("changesetId", changesetId);
  }
  if (
    !defined(ITwinPlatform.defaultAccessToken) &&
    !defined(ITwinPlatform.defaultShareKey)
  ) {
    throw new DeveloperError(
      "Must set ITwinPlatform.defaultAccessToken or ITwinPlatform.defaultShareKey first",
    );
  }
  //>>includeEnd('debug');

  const resource = new Resource({
    url: `${ITwinPlatform.apiEndpoint}mesh-export`,
    headers: {
      Authorization: ITwinPlatform._getAuthorizationHeader(),
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
      Prefer: "return=representation",
    },
    queryParameters: {
      iModelId: iModelId,
      exportType: ITwinPlatform.ExportType["3DTILES"],
      // With the export auto-generation it will auto-delete the 6th export so
      // there should never be more than 5 results. Just request them all and parse
      // for ones that are COMPLETE
      $top: "5",
      client: "CesiumJS",
    },
  });
  /* global CESIUM_VERSION */
  if (typeof CESIUM_VERSION !== "undefined") {
    resource.appendQueryParameters({ clientVersion: CESIUM_VERSION });
  }
  if (defined(changesetId) && changesetId !== "") {
    resource.appendQueryParameters({ changesetId: changesetId });
  }

  try {
    const response = await resource.fetchJson();
    return response;
  } catch (error) {
    const result = JSON.parse(error.response);
    if (error.statusCode === 401) {
      const code = result.error.details?.[0].code ?? "";
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${code}`,
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

/**
 * @typedef {Object} RealityDataExtent
 * @private
 * @property {{latitude: number, longitude: number}} southWest
 * @property {{latitude: number, longitude: number}} northEast
 */

/**
 * @typedef {Object} RealityDataRepresentation
 * @private
 * @property {string} id "95d8dccd-d89e-4287-bb5f-3219acbc71ae",
 * @property {string} displayName "Name of reality data",
 * @property {string} dataset "Dataset",
 * @property {string} group "73d09423-28c3-4fdb-ab4a-03a47a5b04f8",
 * @property {string} description "Description of reality data",
 * @property {string} rootDocument "Directory/SubDirectory/realityData.3mx",
 * @property {number} size 6521212,
 * @property {string} classification "Model",
 * @property {ITwinPlatform.RealityDataType} type "3MX",
 * @property {{startDateTime: string, endDateTime: string, acquirer: string}} acquisition
 * @property {RealityDataExtent} extent
 * @property {boolean} authoring false,
 * @property {string} dataCenterLocation "North Europe",
 * @property {string} modifiedDateTime "2021-04-09T19:03:12Z",
 * @property {string} lastAccessedDateTime "2021-04-09T00:00:00Z",
 * @property {string} createdDateTime "2021-02-22T20:03:40Z",
 * @property {string} ownerId "f1d49cc7-f9b3-494f-9c67-563ea5597063",
 */

/**
 * Load the full metadata for the given iTwin id and reality data id.
 *
 * @private
 *
 * @param {string} iTwinId The id of the iTwin to load data from
 * @param {string} realityDataId The id of the reality data to load
 * @returns {Promise<RealityDataRepresentation>}
 */
ITwinPlatform.getRealityDataMetadata = async function (iTwinId, realityDataId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iTwinId", iTwinId);
  Check.typeOf.string("realityDataId", realityDataId);
  if (
    !defined(ITwinPlatform.defaultAccessToken) &&
    !defined(ITwinPlatform.defaultShareKey)
  ) {
    throw new DeveloperError(
      "Must set ITwinPlatform.defaultAccessToken or ITwinPlatform.defaultShareKey first",
    );
  }
  //>>includeEnd('debug');

  const resource = new Resource({
    url: `${ITwinPlatform.apiEndpoint}reality-management/reality-data/${realityDataId}`,
    headers: {
      Authorization: ITwinPlatform._getAuthorizationHeader(),
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
    },
    queryParameters: { iTwinId: iTwinId },
  });

  try {
    const response = await resource.fetchJson();
    return response.realityData;
  } catch (error) {
    const result = JSON.parse(error.response);
    if (error.statusCode === 401) {
      const code = result.error.details?.[0].code ?? "";
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${code}`,
      );
    } else if (error.statusCode === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (error.statusCode === 404) {
      throw new RuntimeError(
        `Reality data not found: ${iTwinId}, ${realityDataId}`,
      );
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

/**
 * Request the access url for the given iTwin id, reality data id and root document.
 * The root document can be requested from the list using <code>return=representation</code>
 * or the metadata route from {@link ITwinPlatform.getRealityDataMetadata}
 *
 * @private
 *
 * @param {string} iTwinId The id of the iTwin to load data from
 * @param {string} realityDataId The id of the reality data to load
 * @param {string} rootDocument The path of the root document for this reality data
 * @returns {Promise<string>}
 */
ITwinPlatform.getRealityDataURL = async function (
  iTwinId,
  realityDataId,
  rootDocument,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iTwinId", iTwinId);
  Check.typeOf.string("realityDataId", realityDataId);
  Check.typeOf.string("rootDocument", rootDocument);
  if (
    !defined(ITwinPlatform.defaultAccessToken) &&
    !defined(ITwinPlatform.defaultShareKey)
  ) {
    throw new DeveloperError(
      "Must set ITwinPlatform.defaultAccessToken or ITwinPlatform.defaultShareKey first",
    );
  }
  //>>includeEnd('debug');

  const resource = new Resource({
    url: `${ITwinPlatform.apiEndpoint}reality-management/reality-data/${realityDataId}/readaccess`,
    headers: {
      Authorization: ITwinPlatform._getAuthorizationHeader(),
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
    },
    queryParameters: { iTwinId: iTwinId },
  });

  try {
    const result = await resource.fetchJson();

    const containerUrl = result._links.containerUrl.href;
    const tilesetUrl = new URL(containerUrl);
    tilesetUrl.pathname = `${tilesetUrl.pathname}/${rootDocument}`;

    return tilesetUrl.toString();
  } catch (error) {
    const result = JSON.parse(error.response);
    if (error.statusCode === 401) {
      const code = result.error.details?.[0].code ?? "";
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${code}`,
      );
    } else if (error.statusCode === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (error.statusCode === 404) {
      throw new RuntimeError(
        `Reality data not found: ${iTwinId}, ${realityDataId}`,
      );
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
