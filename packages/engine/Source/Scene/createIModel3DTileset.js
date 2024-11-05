import Cesium3DTileset from "./Cesium3DTileset.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import ITwin from "../Core/ITwin.js";
import DeveloperError from "../Core/DeveloperError.js";

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

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
  GLFT: "GLTF",
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
async function createIModel3DTileset(exportId, options) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }

  options = options ?? {};

  const timeoutAfter = 300000;
  const start = Date.now();
  let result = await createIModel3DTileset.getExport(exportId);
  let status = result.export.status;

  if (result.export.request.exportType !== ExportType.CESIUM) {
    // This is an undocumented value but I think it's the only one we want to load
    // TODO: should we even be checking this?
    throw new Error(`Wrong export type ${result.export.request.exportType}`);
  }

  // wait until the export is complete
  while (status !== ExportStatus.Complete) {
    await delay(5000);
    result = await createIModel3DTileset.getExport(exportId);
    status = result.export.status;
    console.log(`Export is ${status}`);

    if (Date.now() - start > timeoutAfter) {
      throw new Error("Export did not complete in time.");
    }
  }

  // This link is only valid 1 hour
  let tilesetUrl = result.export._links.mesh.href;
  const splitStr = tilesetUrl.split("?");
  // is there a cleaner way to do this?
  tilesetUrl = `${splitStr[0]}/tileset.json?${splitStr[1]}`;

  const resource = new Resource({
    url: tilesetUrl,
  });

  return Cesium3DTileset.fromUrl(resource, options);
}

/**
 * @param {string} exportId
 */
createIModel3DTileset.getExport = async function (exportId) {
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
      throw new Error(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 404) {
      throw new Error(`Requested export is not available ${exportId}`);
    } else if (response.status === 429) {
      throw new Error("Too many requests");
    }
    throw new Error(`Unknown request failure ${response.status}`);
  }

  /** @type {ExportResponse} */
  const result = await response.json();
  return result;
};

/**
 * Get the list of exports for the given iModel + changeset
 *
 * @param {string} iModelId
 * @param {string} changesetId
 */
createIModel3DTileset.getExports = async function (iModelId, changesetId) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  const headers = {
    Authorization: ITwin.defaultAccessToken,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
    Prefer: "return=representation", // or return=minimal (the default)
  };

  // obtain export for specified export id
  let url = `${ITwin.apiEndpoint}mesh-export/?iModelId=${iModelId}`;
  if (defined(changesetId) && changesetId !== "") {
    url += `&changesetId=${changesetId}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      throw new Error(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 422) {
      throw new Error(
        `Unprocessable Entity:${result.error.code} ${result.error.message}`,
      );
    } else if (response.status === 429) {
      throw new Error("Too many requests");
    }
    throw new Error(`Unknown request failure ${response.status}`);
  }

  /** @type {{exports: Export[]}} */
  const result = await response.json();
  return result;
};

/**
 * Check the exports for the given iModel + changeset combination for any that
 * have the desired CESIUM type and return that one
 *
 * @param {string} iModelId
 * @param {string} changesetId
 */
createIModel3DTileset.checkForCesiumExport = async function (
  iModelId,
  changesetId,
) {
  const { exports } = await createIModel3DTileset.getExports(
    iModelId,
    changesetId,
  );
  const cesiumExport = exports.find(
    (e) => e.request.exportType === ExportType.CESIUM,
  );
  return cesiumExport;
};

/**
 * Start the export process for the given iModel + changeset.
 *
 * Pair this with the {@link checkForCesiumExport} function to avoid creating extra exports
 *
 * @example
 * const cesiumExport = await Cesium.createIModel3DTileset.checkForCesiumExport(imodelId, changesetId);
 * let exportId = cesiumExport?.id;
 * if (!Cesium.defined(cesiumExport)) {
 *   exportId = await Cesium.createIModel3DTileset.createExportForModelId(
 *     imodelId,
 *     changesetId,
 *     accessToken,
 *   );
 * }
 *
 * @param {string} iModelId
 * @param {string} changesetId
 */
createIModel3DTileset.createExportForModelId = async function (
  iModelId,
  changesetId,
) {
  if (!defined(ITwin.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }

  console.log("Start Export");

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
    `https://api.bentley.com/mesh-export/`,
    requestOptions,
  );

  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      console.error("Unauthorized, bad token, wrong scopes or headers bad");
      console.error(
        result.error.code,
        result.error.message,
        result.error.details,
      );
    } else if (response.status === 403) {
      console.error("Not allowed, forbidden");
      console.error(result.error.code, result.error.message);
    } else if (response.status === 422) {
      console.error("Unprocessable: Cannot create export job");
      console.error(result.error.code, result.error.message);
      console.error(result.error.details);
    } else if (response.status === 429) {
      console.log(
        "Too many requests, retry after:",
        response.headers.get("retry-after"),
      );
      console.error(result.error.code, result.error.message);
    } else {
      console.error("Bad request, unknown error", response);
    }
    return undefined;
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
createIModel3DTileset.deleteExport = async function (exportId) {
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
      throw new Error(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 404) {
      throw new Error("Export not found");
    } else if (response.status === 422) {
      throw new Error(
        `Unprocessable Entity:${result.error.code} ${result.error.message}`,
      );
    } else if (response.status === 429) {
      throw new Error("Too many requests");
    }
    throw new Error(`Unknown request failure ${response.status}`);
  }
};

export default createIModel3DTileset;
