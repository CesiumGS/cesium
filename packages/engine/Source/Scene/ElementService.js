import { DeveloperError } from "@cesium/core";

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
   * @returns {Promise<object>} A promise that resolves to a page of elements.
   */
  async listElements(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Retrieves a single element.
   *
   * @param {string} elementId The element identifier.
   * @returns {Promise<object>} A promise that resolves to the element.
   */
  async getElement(elementId) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Computes aggregate statistics for element properties.
   *
   * @param {object} options Provider-specific aggregation options.
   * @returns {Promise<object>} A promise that resolves to the aggregate statistics.
   */
  async aggregate(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Lists the children of a node in the element tree.
   *
   * @param {object} [options] Provider-specific tree query options.
   * @returns {Promise<object>} A promise that resolves to the child nodes.
   */
  async getElementTreeChildren(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Retrieves the path from the root of the element tree to an element.
   *
   * @param {string} elementId The element identifier.
   * @returns {Promise<object>} A promise that resolves to the root-first path.
   */
  async getElementTreeParents(elementId) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Retrieves a page of property names available on elements.
   *
   * @param {object} [options] Provider-specific pagination options.
   * @returns {Promise<object>} A promise that resolves to a page of property names.
   */
  async listPropertyNames(options) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Retrieves a page of distinct values for an element property.
   *
   * @param {string} propertyName The property name.
   * @param {object} [options] Provider-specific pagination options.
   * @returns {Promise<object>} A promise that resolves to a page of property values.
   */
  async listPropertyValues(propertyName, options) {
    DeveloperError.throwInstantiationError();
  }
}

export default ElementService;
