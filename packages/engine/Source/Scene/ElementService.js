import { DeveloperError } from "@cesium/core";

/**
 * The geographic location of an {@link ElementService.Element}, present
 * only when the element is geolocated.
 *
 * @typedef {object} ElementService.ElementLocation
 * @property {object} center The center of the element.
 * @property {number} center.longitude The longitude in degrees.
 * @property {number} center.latitude The latitude in degrees.
 * @property {number} center.height The height in meters above the ellipsoid.
 * @property {number} radius The radius, in meters, of a sphere centered on <code>center</code> that bounds the element.
 */

/**
 * An element and its metadata.
 *
 * Implementations may include additional provider-specific fields.
 *
 * @typedef {object} ElementService.Element
 * @property {string} id The element identifier.
 * @property {string} [label] The user-friendly label of the element, if any.
 * @property {ElementService.ElementLocation} [location] The geographic location of this element, or <code>undefined</code> when the element has no location (e.g. conceptual elements, or assets with no geographic coordinate system).
 */

/**
 * A page of elements returned by {@link ElementService#listElements}.
 *
 * @typedef {object} ElementService.ElementPage
 * @property {ElementService.Element[]} items The elements on this page.
 * @property {number|null} total The total number of matching elements, or <code>null</code> when the total is unavailable.
 */

/**
 * Aggregate statistics for an element property.
 *
 * @typedef {object} ElementService.Aggregation
 * @property {string} [key] The property key these statistics describe.
 * @property {number} count The number of elements included in the statistics.
 * @property {number|null} min The minimum value, or <code>null</code> when unavailable.
 * @property {number|null} max The maximum value, or <code>null</code> when unavailable.
 * @property {number|null} avg The average value, or <code>null</code> when unavailable.
 * @property {number} sum The sum of the values.
 */

/**
 * A node in an element tree.
 *
 * @typedef {object} ElementService.ElementTreeNode
 * @property {string} label The user-friendly label of this node.
 * @property {boolean} hasChildren Whether this node has any children.
 * @property {string} id The identifier of the element represented by this node.
 */

/**
 * An entry in a root-first element tree path.
 *
 * @typedef {object} ElementService.ElementTreePathEntry
 * @property {string} id The identifier represented by this entry.
 */

/**
 * Provides access to elements and their metadata in a model. This type
 * describes an interface and is not intended to be instantiated directly.
 *
 * @abstract
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see IonAssetElementService
 */
class ElementService {
  constructor() {
    // Permit derived service construction while preventing direct use of this
    // abstract base class.
    if (new.target === ElementService) {
      DeveloperError.throwInstantiationError();
    }
  }

  /**
   * Retrieves a page of elements, optionally filtered.
   *
   * @param {object} [options] Provider-specific query options.
   * @returns {Promise<ElementService.ElementPage>} A promise that resolves to a page of elements.
   */
  async listElements(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Retrieves a single element.
   *
   * @param {string} elementId The element identifier.
   * @returns {Promise<ElementService.Element>} A promise that resolves to the element.
   */
  async getElement(elementId) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Computes aggregate statistics for element properties.
   *
   * @param {object} options Provider-specific aggregation options.
   * @returns {Promise<{aggregations: ElementService.Aggregation[], total: number}>} A promise that resolves to the aggregate statistics.
   */
  async aggregate(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Lists the children of a node in the element tree.
   *
   * @param {object} [options] Provider-specific tree query options.
   * @returns {Promise<{nodes: ElementService.ElementTreeNode[]}>} A promise that resolves to the child nodes.
   */
  async getElementTreeChildren(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Retrieves the path from the root of the element tree to an element.
   *
   * @param {string} elementId The element identifier.
   * @returns {Promise<{path: ElementService.ElementTreePathEntry[]}>} A promise that resolves to the root-first path.
   */
  async getElementTreeParents(elementId) {
    DeveloperError.throwInstantiationError();
  }
}

export default ElementService;
