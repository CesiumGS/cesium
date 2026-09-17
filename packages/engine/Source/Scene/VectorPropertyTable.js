// @ts-check

import defined from "../Core/defined.js";

/**
 * Minimal batch-table-compatible wrapper over a plain feature property array,
 * satisfying the interface used by {@link Cesium3DTileVectorFeature}
 * (hasProperty, getProperty, getPropertyIds, featuresLength, etc.) without
 * requiring a Model or Cesium3DTileBatchTable.
 *
 * @ignore
 */
class VectorPropertyTable {
  /**
   * @param {Array<Object.<string, *>|null>} properties Feature properties, indexed by feature ID.
   */
  constructor(properties) {
    this._properties = properties;
    /** @type {number|undefined} */
    this._byteLength = undefined;
  }

  get featuresLength() {
    return this._properties.length;
  }

  /**
   * Estimated memory used by the feature properties, in bytes.
   * @type {number}
   */
  get batchTableByteLength() {
    if (!defined(this._byteLength)) {
      this._byteLength = estimatePropertiesByteLength(this._properties);
    }
    return this._byteLength;
  }

  /**
   * @param {number} featureId
   * @param {string} name
   * @returns {boolean}
   */
  hasProperty(featureId, name) {
    const props = this._properties[featureId];
    return defined(props) && name in props;
  }

  /**
   * @param {number} featureId
   * @param {string} name
   * @returns {*}
   */
  getProperty(featureId, name) {
    return this._properties[featureId]?.[name];
  }

  /**
   * Plain feature properties carry no semantic definitions.
   * @param {number} _featureId
   * @param {string} _name
   * @returns {boolean}
   */
  hasPropertyBySemantic(_featureId, _name) {
    return false;
  }

  /**
   * @param {number} _featureId
   * @param {string} _name
   * @returns {undefined}
   */
  getPropertyBySemantic(_featureId, _name) {
    return undefined;
  }

  /**
   * @param {number} featureId
   * @param {string[]} [results]
   * @returns {string[]}
   */
  getPropertyIds(featureId, results) {
    results = results ?? [];
    results.length = 0;
    const props = this._properties[featureId];
    if (defined(props)) {
      for (const name of Object.keys(props)) {
        results.push(name);
      }
    }
    return results;
  }

  /**
   * @param {number} _featureId
   * @param {string} _className
   * @returns {boolean}
   */
  isClass(_featureId, _className) {
    return false;
  }

  /**
   * @param {number} _featureId
   * @param {string} _className
   * @returns {boolean}
   */
  isExactClass(_featureId, _className) {
    return false;
  }

  /**
   * @param {number} _featureId
   * @returns {string|undefined}
   */
  getExactClassName(_featureId) {
    return undefined;
  }
}

/**
 * Estimates the memory used by an array of feature property objects.
 * Strings are counted at two bytes per character; numbers and booleans
 * at eight bytes each.
 *
 * @param {Array<Object.<string, *>|null>} properties
 * @returns {number} The estimated byte length.
 * @private
 */
function estimatePropertiesByteLength(properties) {
  let byteLength = 0;
  for (let i = 0; i < properties.length; i++) {
    const props = properties[i];
    if (!defined(props)) {
      continue;
    }
    for (const name of Object.keys(props)) {
      byteLength += 2 * name.length;
      const value = props[name];
      if (typeof value === "string") {
        byteLength += 2 * value.length;
      } else {
        byteLength += 8;
      }
    }
  }
  return byteLength;
}

export default VectorPropertyTable;
