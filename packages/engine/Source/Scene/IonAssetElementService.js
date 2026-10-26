import {
  Check,
  Cartesian3,
  DeveloperError,
  BoundingSphere,
  defined,
  Frozen,
} from "@cesium/core";
import Ion from "../Core/Ion.js";
import IonResource from "../Core/IonResource.js";
import Resource from "../Core/Resource.js";

function checkPositiveInteger(name, value, maximum = Infinity) {
  if (
    defined(value) &&
    (!Number.isInteger(value) || value < 1 || value > maximum)
  ) {
    throw new DeveloperError(
      `${name} must be a positive integer no greater than ${maximum}.`,
    );
  }
}

function checkPagination(options) {
  checkPositiveInteger("options.limit", options.limit, 1000);
  checkPositiveInteger("options.page", options.page);
}

/**
 * Converts an id (bigint, number, or string) to a decimal string, or
 * undefined if not defined.
 * @private
 */
function toIdString(value) {
  if (!defined(value)) {
    return undefined;
  }
  return String(value);
}

/**
 * Adapt an API element to the public result, preserving integer ID precision.
 * Each property is mapped to its documented fields; only its arbitrary value
 * payload is passed through unchanged.
 * @private
 */
function elementFromResponse(response) {
  const result = {
    id: toIdString(response.id),
    label: response.label,
  };
  if (defined(response.properties)) {
    result.properties = Object.fromEntries(
      Object.entries(response.properties).map(function ([name, property]) {
        return [
          name,
          {
            value: property.value,
            displayValue: property.displayValue,
            units: property.units,
          },
        ];
      }),
    );
  }
  const location = locationFromResponse(response.location);
  if (defined(location)) {
    result.location = location;
  }
  return result;
}

/** @private */
function locationFromResponse(location) {
  if (!defined(location) || !defined(location.center)) {
    return undefined;
  }
  return {
    center: {
      longitude: location.center.longitude,
      latitude: location.center.latitude,
      height: location.center.height,
    },
    radius: location.radius,
  };
}

/** @private */
function treeNodeFromResponse(response) {
  const result = {
    key: response.key,
    label: response.label,
    hasChildren: response.hasChildren,
    id: toIdString(response.id),
    kind: response.kind,
  };
  if (defined(response.className)) {
    result.className = response.className;
  }
  return result;
}

/**
 * A property exposed by the property-discovery endpoint.
 * @typedef {object} IonAssetElementService.PropertyInfo
 * @property {string} name The property name.
 * @property {string} type The property's primitive type.
 */

/**
 * A page of property names and types.
 * @typedef {object} IonAssetElementService.PropertyNamePage
 * @property {IonAssetElementService.PropertyInfo[]} items The properties on this page.
 * @property {number} total The total number of properties.
 */

/**
 * A page of distinct primitive property values.
 * @typedef {object} IonAssetElementService.PropertyValuePage
 * @property {Array<string|number|boolean|null>} items The distinct values on this page.
 * @property {number|string} total The total number of distinct values, which the server may encode as a string.
 */

/**
 * A single property of an {@link IonAssetElementService.Element}.
 *
 * @typedef {object} IonAssetElementService.ElementProperty
 * @property {*} value The raw value of this property.
 * @property {string} [displayValue] The human-readable, pre-formatted value, including any unit suffix (e.g. <code>"0.6208 m³"</code>).
 * @property {string|null} [units] The unit of <code>value</code>, or <code>null</code> or <code>undefined</code> when the property is unitless.
 */

/**
 * The geographic location of an {@link IonAssetElementService.Element}, present
 * only when the element is geolocated.
 *
 * @typedef {object} IonAssetElementService.ElementLocation
 * @property {object} center The center of the element.
 * @property {number} center.longitude The longitude in degrees.
 * @property {number} center.latitude The latitude in degrees.
 * @property {number} center.height The height in meters above the ellipsoid.
 * @property {number} radius The radius, in meters, of a sphere centered on <code>center</code> that bounds the element.
 */

/**
 * A single element of a Cesium ion asset, such as a wall or column in a
 * BIM/CAD model.
 *
 * @typedef {object} IonAssetElementService.Element
 * @property {string} id The unique integer identifier of this element, as a decimal string, e.g. <code>"3298534886898"</code>.
 * @property {string} [label] The user-friendly label of this element, if any.
 * @property {IonAssetElementService.ElementLocation} [location] The geographic location of this element, or <code>undefined</code> when the element has no location (e.g. conceptual elements, or assets with no geographic coordinate system).
 * @property {Object<string, IonAssetElementService.ElementProperty>} [properties] The properties of this element, keyed by property name. List results may omit properties; use {@link IonAssetElementService#getElement} to retrieve the element's details. Property names are kept verbatim, including any dotted namespaces (e.g. <code>"Volume Aspect.Net Volume"</code>).
 */

/**
 * A page of results from {@link IonAssetElementService#listElements}.
 *
 * @typedef {object} IonAssetElementService.ElementPage
 * @property {IonAssetElementService.Element[]} items The elements on this page.
 * @property {number} total The total number of elements matching the query across all pages.
 * @property {string} [continuationToken] A token to pass as <code>options.continuationToken</code> to retrieve the next page, or <code>undefined</code> when there are no more results.
 */

/**
 * Aggregate statistics for a single numeric property across a set of elements,
 * as returned by {@link IonAssetElementService#aggregate}.
 *
 * Non-numeric properties come back with a <code>count</code> of 0,
 * <code>null</code> for min, max, and avg, and a sum of 0.
 *
 * @typedef {object} IonAssetElementService.Aggregation
 * @property {string} key The qualified property key these statistics describe.
 * @property {number} count The number of elements that had a numeric value for this key.
 * @property {number|null} min The minimum value across the matched elements, or <code>null</code> when there are no numeric values.
 * @property {number|null} max The maximum value across the matched elements, or <code>null</code> when there are no numeric values.
 * @property {number|null} avg The mean value across the matched elements, or <code>null</code> when there are no numeric values.
 * @property {number} sum The sum of values across the matched elements.
 */

/**
 * The result of {@link IonAssetElementService#aggregate}.
 *
 * @typedef {object} IonAssetElementService.AggregateResult
 * @property {IonAssetElementService.Aggregation[]} aggregations The per-property aggregate statistics, one entry per requested property key.
 * @property {number} total The number of elements matched by the query.
 */

/**
 * A node in a Cesium ion asset's element tree, as returned by
 * {@link IonAssetElementService#getElementTreeChildren}.
 *
 * @typedef {object} IonAssetElementService.ElementTreeNode
 * @property {string} key The opaque key of this node. Pass it as <code>options.nodeKey</code> to {@link IonAssetElementService#getElementTreeChildren} to list this node's children.
 * @property {string} label The user-friendly label of this node.
 * @property {boolean} hasChildren Whether this node has any children.
 * @property {string} [className] The name of the class this node represents, when included.
 * @property {string} id The integer instance id represented by this node, as a decimal string.
 * @property {"subject"|"model"|"category"|"element"} kind The kind of node.
 */

/**
 * An entry in the root-first path returned by
 * {@link IonAssetElementService#getElementTreeParents}. Entries include the
 * target element as well as its ancestors.
 *
 * @typedef {object} IonAssetElementService.ElementTreePathEntry
 * @property {"subject"|"model"|"category"|"element"} kind The kind of path entry.
 * @property {string} id The integer instance id for this subject, model, category, or element, as a decimal string.
 */

/**
 * Queries the individual elements within a Cesium ion asset backed by a
 * BIM/CAD Database model, using the ion REST API's
 * <a href="https://cesium.com/learn/ion/ion-rest-api/">Asset Elements</a> endpoints.
 *
 * Element ids are typically obtained by picking a {@link Cesium3DTileFeature}
 * and reading its <code>element</code> property.
 *
 * This object is normally not instantiated directly, use {@link IonAssetElementService.fromAssetId}.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Ion
 *
 * @example
 * const elements = Cesium.IonAssetElementService.fromAssetId(123456);
 * const page = await elements.listElements({
 *   filter: { "IFC Attributes.name": { $like: "%Rebar%" } },
 *   top: 50,
 * });
 * console.log(`${page.items.length} of ${page.total} elements`);
 */
class IonAssetElementService {
  /**
   * @param {object} options Object with the following properties:
   * @param {number} options.assetId The ion asset id.
   * @param {Resource} options.resource The asset's ion API resource.
   * @param {Resource} options.treeResource The asset's versioned tree API resource.
   */
  constructor(options) {
    this._assetId = options.assetId;
    this._resource = options.resource;
    this._treeResource = options.treeResource;
  }

  /**
   * The ion asset id this service operates on.
   * @type {number}
   * @readonly
   */
  get assetId() {
    return this._assetId;
  }

  /**
   * Creates an {@link IonAssetElementService} for the given ion asset.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {number} assetId The ion id of an asset backed by a BIM/CAD Database model.
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.accessToken=Ion.defaultAccessToken] The ion access token to use.
   * @param {string|Resource} [options.server=Ion.defaultServer] The ion API server to use.
   * @returns {IonAssetElementService} A service bound to the asset.
   */
  static fromAssetId(assetId, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("assetId", assetId);
    //>>includeEnd('debug');

    options = options ?? Frozen.EMPTY_OBJECT;
    const accessToken = options.accessToken ?? Ion.defaultAccessToken;
    const server = Resource.createIfNeeded(options.server ?? Ion.defaultServer);
    server.appendForwardSlash();

    const resourceOptions = {
      // Trailing slash so derived resource urls resolve under the asset id.
      url: `assets/${assetId}/`,
      headers: IonResource._addClientHeaders(),
    };
    if (defined(accessToken)) {
      resourceOptions.queryParameters = { access_token: accessToken };
    }
    const resource = server.getDerivedResource(resourceOptions);
    // TODO: Unify the resource bases once endpoint versioning is consistent.
    // Tree endpoints use /v1/assets/; other element endpoints use /assets/.
    const treeResource = server.getDerivedResource({
      ...resourceOptions,
      url: `v1/assets/${assetId}/`,
    });

    return new IonAssetElementService({
      assetId: assetId,
      resource: resource,
      treeResource: treeResource,
    });
  }

  /**
   * Computes a {@link BoundingSphere} enclosing an element from its
   * <code>location</code>, suitable for framing the camera with
   * {@link Camera#flyToBoundingSphere} or {@link Viewer#zoomTo}.
   *
   * @param {IonAssetElementService.Element|IonAssetElementService.SearchResult} element An element returned by {@link IonAssetElementService#getElement}, {@link IonAssetElementService#listElements}, or the iterators.
   * @returns {BoundingSphere|undefined} A bounding sphere for the element, or <code>undefined</code> if the element has no valid location.
   *
   * @example
   * const element = await elements.getElement(elementId);
   * const boundingSphere = Cesium.IonAssetElementService.getBoundingSphere(element);
   * if (Cesium.defined(boundingSphere)) {
   *   viewer.camera.flyToBoundingSphere(boundingSphere);
   * }
   */
  static getBoundingSphere(element) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("element", element);
    //>>includeEnd('debug');

    const center = element.location?.center;
    if (
      !defined(center) ||
      !Number.isFinite(center.longitude) ||
      !Number.isFinite(center.latitude)
    ) {
      return undefined;
    }

    const height = center.height ?? 0;
    const radius = element.location.radius ?? 0;
    if (!Number.isFinite(height) || !Number.isFinite(radius) || radius < 0) {
      return undefined;
    }

    const position = Cartesian3.fromDegrees(
      center.longitude,
      center.latitude,
      height,
    );
    return new BoundingSphere(position, radius);
  }

  /**
   * Reads the element id from a picked {@link Cesium3DTileFeature}. Rendered
   * features carry the id of the element they belong to in their
   * <code>element</code> property.
   *
   * The returned id can be passed directly to
   * {@link IonAssetElementService#getElement}.
   *
   * @param {Cesium3DTileFeature} feature A feature picked from the asset's tileset.
   * @returns {string|undefined} The element id as a decimal string, e.g. <code>"3298534886898"</code>, or <code>undefined</code> if the feature has no element id.
   *
   * @example
   * const feature = viewer.scene.pick(movement.position);
   * const elementId = Cesium.IonAssetElementService.getElementId(feature);
   * if (Cesium.defined(elementId)) {
   *   const element = await elements.getElement(elementId);
   * }
   */
  static getElementId(feature) {
    if (!defined(feature) || typeof feature.getProperty !== "function") {
      return undefined;
    }
    return toIdString(feature.getProperty("element"));
  }

  /**
   * Retrieves a page of elements for this asset, optionally filtered.
   *
   * Results are paginated with an opaque cursor. Request subsequent pages by
   * passing the returned <code>continuationToken</code> as
   * <code>options.continuationToken</code> until it is <code>undefined</code>.
   *
   * @param {object} [options] Object with the following properties:
   * @param {number} [options.top=100] The maximum number of elements to return per page.
   * @param {string} [options.continuationToken] A token returned from a previous call to retrieve the next page of results.
   * @param {object|string} [options.filter] A <a href="https://www.mongodb.com/docs/manual/reference/operator/query/">MongoDB-style</a> filter, as an object (recommended) or a JSON string.
   * @returns {Promise<IonAssetElementService.ElementPage>} A page of elements.
   *
   * @example
   * const page = await elements.listElements({
   *   filter: {
   *     $or: [{ "IFC Class Name": "ifcwall" }, { "IFC Class Name": "ifccolumn" }],
   *   },
   * });
   */
  async listElements(options) {
    options = options ?? Frozen.EMPTY_OBJECT;

    //>>includeStart('debug', pragmas.debug);
    checkPositiveInteger("options.top", options.top);
    if (defined(options.continuationToken)) {
      Check.typeOf.string(
        "options.continuationToken",
        options.continuationToken,
      );
    }
    //>>includeEnd('debug');

    const queryParameters = { engine: "search", top: options.top ?? 100 };
    if (defined(options.continuationToken)) {
      queryParameters.continuationToken = options.continuationToken;
    }
    if (defined(options.filter)) {
      queryParameters.filter =
        typeof options.filter === "string"
          ? options.filter
          : JSON.stringify(options.filter);
    }

    const response = await this._resource
      .getDerivedResource({
        url: "elements",
        queryParameters: queryParameters,
      })
      .fetchJson();
    return {
      items: response.items.map(elementFromResponse),
      total: response.total,
      continuationToken: response.continuationToken,
    };
  }

  /**
   * Retrieves metadata and location information for a single element.
   *
   * Use {@link IonAssetElementService.getElementId} to obtain the id from a
   * picked {@link Cesium3DTileFeature}.
   *
   * @param {string} elementId The element id as a decimal string, e.g. <code>"3298534886898"</code>.
   * @returns {Promise<IonAssetElementService.Element|undefined>} The element, or <code>undefined</code> if no element with that id exists in the asset.
   */
  async getElement(elementId) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("elementId", elementId);
    //>>includeEnd('debug');

    try {
      const response = await this._resource
        .getDerivedResource({
          url: `elements/${encodeURIComponent(elementId)}`,
          queryParameters: { engine: "search" },
        })
        .fetchJson();
      return defined(response) ? elementFromResponse(response) : undefined;
    } catch (error) {
      if (error?.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Computes aggregate statistics (count, min, max, average, and sum) for one
   * or more numeric properties across the elements of this asset, optionally
   * filtered.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {object} options Object with the following properties:
   * @param {string[]} options.propertyKeys The qualified property keys to aggregate. At least one is required.
   * @param {object|string} [options.filter] A <a href="https://www.mongodb.com/docs/manual/reference/operator/query/">MongoDB-style</a> filter, as an object (recommended) or a JSON string.
   * @returns {Promise<IonAssetElementService.AggregateResult>} The aggregate statistics, one entry per requested property key, and the number of matched elements.
   *
   * @example
   * const { aggregations, total } = await elements.aggregate({
   *   propertyKeys: ["Volume Aspect.Net Volume"],
   *   filter: { "IFC Class Name": "ifcwall" },
   * });
   */
  async aggregate(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("options", options);
    Check.defined("options.propertyKeys", options.propertyKeys);
    if (
      !Array.isArray(options.propertyKeys) ||
      options.propertyKeys.length === 0
    ) {
      throw new DeveloperError(
        "options.propertyKeys must be a non-empty array.",
      );
    }
    for (let i = 0; i < options.propertyKeys.length; i++) {
      Check.typeOf.string(
        `options.propertyKeys[${i}]`,
        options.propertyKeys[i],
      );
    }
    //>>includeEnd('debug');

    // The server parameter is named "aggregations" but carries property keys;
    // suggest renaming it to "propertyKeys" server-side to match the client.
    const queryParameters = { aggregations: options.propertyKeys.join(",") };
    if (defined(options.filter)) {
      queryParameters.filter =
        typeof options.filter === "string"
          ? options.filter
          : JSON.stringify(options.filter);
    }

    const response = await this._resource
      .getDerivedResource({
        url: "elements/aggregate",
        queryParameters: queryParameters,
      })
      .fetchJson();
    return {
      aggregations: response.aggregations.map(function (aggregation) {
        return {
          key: aggregation.key,
          count: aggregation.count,
          min: aggregation.min,
          max: aggregation.max,
          avg: aggregation.avg,
          sum: aggregation.sum,
        };
      }),
      total: response.total,
    };
  }

  /**
   * Lists the children of a node in this asset's element tree, or the root
   * nodes when no key is given.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.nodeKey] The opaque node key returned by the endpoint. Omit it to list root nodes.
   * @returns {Promise<{nodes: IonAssetElementService.ElementTreeNode[]}>} The child nodes. A key for a node that does not exist yields an empty <code>nodes</code> array.
   *
   * @example
   * const { nodes } = await elements.getElementTreeChildren();
   * const { nodes: children } = await elements.getElementTreeChildren({
   *   nodeKey: nodes[0].key,
   * });
   */
  async getElementTreeChildren(options) {
    options = options ?? Frozen.EMPTY_OBJECT;

    //>>includeStart('debug', pragmas.debug);
    if (defined(options.nodeKey)) {
      Check.typeOf.string("options.nodeKey", options.nodeKey);
    }
    //>>includeEnd('debug');

    const queryParameters = {};
    if (defined(options.nodeKey)) {
      queryParameters.nodeKey = options.nodeKey;
    }

    const response = await this._treeResource
      .getDerivedResource({
        url: "tree/children",
        queryParameters: queryParameters,
      })
      .fetchJson();
    return { nodes: response.nodes.map(treeNodeFromResponse) };
  }

  /**
   * Retrieves the parents of an element in this asset's element tree, from the
   * root down to the element, using ion's <code>tree/parents</code> endpoint.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {string} elementId The element id as a decimal string, e.g. <code>"3298534886898"</code>.
   * @returns {Promise<{path: IonAssetElementService.ElementTreePathEntry[]}|undefined>} The root-first path, or <code>undefined</code> if no path is available.
   *
   * @example
   * const { path } = await elements.getElementTreeParents(elementId);
   */
  async getElementTreeParents(elementId) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("elementId", elementId);
    //>>includeEnd('debug');

    try {
      const response = await this._treeResource
        .getDerivedResource({
          url: "tree/parents",
          queryParameters: { elementId: elementId },
        })
        .fetchJson();
      return {
        path: response.path.map(function (entry) {
          return { kind: entry.kind, id: toIdString(entry.id) };
        }),
      };
    } catch (error) {
      if (error?.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Retrieves a page of the property names that exist across the elements of
   * this asset, along with each property's type. Only top-level primitive
   * properties (strings, numbers, booleans) are included.
   *
   * The returned names can be passed to
   * {@link IonAssetElementService#listPropertyValues}.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {object} [options] Object with the following properties:
   * @param {number} [options.limit=1000] The maximum number of property names to return, between 1 and 1000.
   * @param {number} [options.page=1] The 1-based page number to return.
   * @returns {Promise<IonAssetElementService.PropertyNamePage>} A page of property names.
   */
  async listPropertyNames(options) {
    options = options ?? Frozen.EMPTY_OBJECT;

    //>>includeStart('debug', pragmas.debug);
    checkPagination(options);
    //>>includeEnd('debug');

    const queryParameters = {};
    if (defined(options.limit)) {
      queryParameters.limit = options.limit;
    }
    if (defined(options.page)) {
      queryParameters.page = options.page;
    }

    const response = await this._resource
      .getDerivedResource({
        url: "elements/properties",
        queryParameters: queryParameters,
      })
      .fetchJson();
    return {
      items: response.items.map(function (item) {
        return { name: item.name, type: item.type };
      }),
      total: response.total,
    };
  }

  /**
   * Retrieves a page of the distinct values for a single element property
   * across the elements of this asset. Only top-level primitive values
   * (strings, numbers, booleans) are included.
   *
   * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @param {string} propertyName A property name returned by {@link IonAssetElementService#listPropertyNames}.
   * @param {object} [options] Object with the following properties:
   * @param {number} [options.limit=1000] The maximum number of values to return, between 1 and 1000.
   * @param {number} [options.page=1] The 1-based page number to return.
   * @returns {Promise<IonAssetElementService.PropertyValuePage>} A page of distinct values.
   */
  async listPropertyValues(propertyName, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("propertyName", propertyName);
    //>>includeEnd('debug');

    options = options ?? Frozen.EMPTY_OBJECT;

    //>>includeStart('debug', pragmas.debug);
    checkPagination(options);
    //>>includeEnd('debug');

    const queryParameters = {};
    if (defined(options.limit)) {
      queryParameters.limit = options.limit;
    }
    if (defined(options.page)) {
      queryParameters.page = options.page;
    }

    const response = await this._resource
      .getDerivedResource({
        url: `elements/properties/${encodeURIComponent(propertyName)}`,
        queryParameters: queryParameters,
      })
      .fetchJson();
    return { items: response.items.slice(), total: response.total };
  }
}

export default IonAssetElementService;
