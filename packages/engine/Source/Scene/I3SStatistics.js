import defined from "../Core/defined.js";
import I3SDataProvider from "./I3SDataProvider.js";
import Resource from "../Core/Resource.js";

/**
 * This class implements an I3S statistics for Building Scene Layer.
 * <p>
 * Do not construct this directly, instead access statistics through {@link I3SDataProvider}.
 * </p>
 * @alias I3SStatistics
 * @internalConstructor
 */
function I3SStatistics(dataProvider, uri) {
  this._dataProvider = dataProvider;

  this._resource = new Resource({ url: uri });
  this._resource.setQueryParameters(dataProvider.resource.queryParameters);
  this._resource.appendForwardSlash();
}

Object.defineProperties(I3SStatistics.prototype, {
  /**
   * Gets the resource for the statistics
   * @memberof I3SStatistics.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },

  /**
   * Gets the I3S data for this object.
   * @memberof I3SStatistics.prototype
   * @type {object}
   * @readonly
   */
  data: {
    get: function () {
      return this._data;
    },
  },

  /**
   * Gets the collection of attribute names.
   * @memberof I3SStatistics.prototype
   * @type {string[]}
   * @readonly
   */
  names: {
    get: function () {
      const names = [];
      const summary = this._data.summary;
      if (defined(summary)) {
        for (let i = 0; i < summary.length; ++i) {
          names.push(summary[i].fieldName);
        }
      }
      return names;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<object>} A promise that is resolved when the data of the I3S statistics is loaded
 * @private
 */
I3SStatistics.prototype.load = async function () {
  this._data = await I3SDataProvider.loadJson(this._resource);
  return this._data;
};

/**
 * @private
 */
I3SStatistics.prototype._getValues = function (attributeName) {
  const summary = this._data.summary;
  if (defined(summary)) {
    for (let i = 0; i < summary.length; ++i) {
      const attribute = summary[i];
      if (attribute.fieldName === attributeName) {
        if (defined(attribute.mostFrequentValues)) {
          return [...attribute.mostFrequentValues];
        }
        return [];
      }
    }
  }
};

export default I3SStatistics;
