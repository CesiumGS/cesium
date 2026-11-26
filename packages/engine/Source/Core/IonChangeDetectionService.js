import { Check, DeveloperError, Frozen, defined } from "@cesium/core";
import Ion from "./Ion.js";
import IonResource from "./IonResource.js";
import Resource from "./Resource.js";

function checkOperation(name, value) {
  if (
    defined(value) &&
    value !== "Inserted" &&
    value !== "Updated" &&
    value !== "Deleted"
  ) {
    throw new DeveloperError(
      `${name} must be "Inserted", "Updated", or "Deleted".`,
    );
  }
}

/**
 * Adapt an API change to the public result, preserving decimal string IDs.
 * @private
 */
function changeFromResponse(response) {
  return {
    id: defined(response.id) ? String(response.id) : undefined,
    operation: response.operation,
  };
}

/**
 * An operation reported by change detection. The values are case-sensitive.
 *
 * @typedef {"Inserted"|"Updated"|"Deleted"} IonChangeDetectionService.Operation
 */

/**
 * An entry from a change detection report.
 *
 * @typedef {object} IonChangeDetectionService.Change
 * @property {string} id The identifier of the changed BIM/CAD instance. For elements, this matches the ID returned by {@link IonAssetElementService.getElementId}.
 * @property {IonChangeDetectionService.Operation} operation The reported operation.
 */

/**
 * A page of results from {@link IonChangeDetectionService#listChanges}.
 *
 * @typedef {object} IonChangeDetectionService.ChangePage
 * @property {IonChangeDetectionService.Change[]} items The changes on this page.
 * @property {string} [next] The relative URL for the next page, or <code>undefined</code> when there are no more results. Pass it unchanged as <code>options.next</code> to {@link IonChangeDetectionService#listChanges}.
 */

/**
 * Reads paginated results from a completed Cesium ion change detection report asset.
 *
 * This object is normally not instantiated directly, use {@link IonChangeDetectionService.fromAssetId}.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Ion
 *
 * @example
 * const changes = await Cesium.IonChangeDetectionService.fromAssetId(123456);
 * const page = await changes.listChanges({ filter: "Updated" });
 * if (Cesium.defined(page.next)) {
 *   const nextPage = await changes.listChanges({ next: page.next });
 *   console.log(nextPage.items);
 * }
 */
class IonChangeDetectionService {
  /**
   * @param {object} options Object with the following properties:
   * @param {number} options.assetId The ion asset id.
   * @param {Resource} options.resource The report's paginated ion resource.
   */
  constructor(options) {
    this._assetId = options.assetId;
    this._resource = options.resource;
  }

  /**
   * The ion asset ID of the change detection report, not either of the compared assets.
   * @type {number}
   * @readonly
   */
  get assetId() {
    return this._assetId;
  }

  /**
   * Creates an {@link IonChangeDetectionService} for an existing, completed change detection report asset.
   *
   * @param {number} assetId The ion ID of the report asset, not either of the compared assets.
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.accessToken=Ion.defaultAccessToken] The ion access token to use.
   * @param {string|Resource} [options.server=Ion.defaultServer] The ion API server to use.
   * @returns {Promise<IonChangeDetectionService>} A promise that resolves to the service for the report.
   */
  static async fromAssetId(assetId, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("assetId", assetId);
    //>>includeEnd('debug');

    options = options ?? Frozen.EMPTY_OBJECT;
    const accessToken = options.accessToken ?? Ion.defaultAccessToken;
    const server = Resource.createIfNeeded(options.server ?? Ion.defaultServer);
    server.appendForwardSlash();

    const reportResource = await IonResource.fromAssetId(assetId, {
      accessToken: accessToken,
      server: server,
    });
    const resource = reportResource.getDerivedResource({
      // Relative to the asset's report.json, which the pages are served alongside.
      url: "paginated/report.json",
    });

    return new IonChangeDetectionService({
      assetId: assetId,
      resource: resource,
    });
  }

  /**
   * Retrieves a page of changes for this report, optionally filtered.
   *
   * Results are paginated with a link. Request subsequent pages by passing
   * the returned <code>next</code> as <code>options.next</code> until it is
   * <code>undefined</code>. The link already carries the filter of the first
   * request, so do not supply <code>options.filter</code> again.
   *
   * @param {object} [options] Object with the following properties:
   * @param {IonChangeDetectionService.Operation} [options.filter] The operation to include. Omit to include all operations.
   * @param {string} [options.next] A link returned from a previous call to retrieve the next page of results.
   * @returns {Promise<IonChangeDetectionService.ChangePage>} A promise that resolves to a page of changes. The promise rejects with a {@link RequestErrorEvent} if the request fails.
   * @exception {DeveloperError} <code>options.filter</code> must be <code>"Inserted"</code>, <code>"Updated"</code>, or <code>"Deleted"</code>.
   * @exception {DeveloperError} <code>options.next</code> must be a string.
   * @exception {DeveloperError} <code>options.next</code> and <code>options.filter</code> cannot be combined.
   *
   * @example
   * const updated = [];
   * let page = await changes.listChanges({ filter: "Updated" });
   * updated.push(...page.items);
   * while (Cesium.defined(page.next)) {
   *   page = await changes.listChanges({ next: page.next });
   *   updated.push(...page.items);
   * }
   */
  async listChanges(options) {
    options = options ?? Frozen.EMPTY_OBJECT;

    //>>includeStart('debug', pragmas.debug);
    checkOperation("options.filter", options.filter);
    if (defined(options.next)) {
      Check.typeOf.string("options.next", options.next);
      if (defined(options.filter)) {
        throw new DeveloperError(
          "options.next and options.filter cannot be combined.",
        );
      }
    }
    //>>includeEnd('debug');

    const resourceOptions = {};
    if (defined(options.next)) {
      // The link is relative to the report and already includes the filter.
      resourceOptions.url = options.next;
    } else if (defined(options.filter)) {
      resourceOptions.queryParameters = { filter: options.filter };
    }

    const response = await this._resource
      .getDerivedResource(resourceOptions)
      .fetchJson();
    return {
      items: response.items.map(changeFromResponse),
      next: response.next,
    };
  }
}

export default IonChangeDetectionService;
