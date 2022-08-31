/**
 * This class implements an I3S Feature
 * <p>
 * Do not construct this directly, instead access tiles through {@link I3SDataProvider}.
 * </p>
 * @alias I3SFeature
 * @constructor
 */
function I3SFeature(parent, uri) {
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._layer = parent._layer;
  this._uri = uri;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  this._completeUriWithoutQuery = `${this._parent._completeUriWithoutQuery}/${this._uri}`;
  this._completeUri = this._completeUriWithoutQuery + query;
}

Object.defineProperties(I3SFeature.prototype, {
  /**
   * Gets the uri for the feature.
   * @memberof I3SFeature.prototype
   * @type {String}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the feature.
   * @memberof I3SFeature.prototype
   * @type {String}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SFeature.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<void>} a promise that is resolved when the data of the I3S feature is loaded
 */
I3SFeature.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadJson(
    this._completeUri,
    function (data, resolve) {
      that._data = data;
      resolve();
    },
    function (reject) {
      reject();
    }
  );
};

export default I3SFeature;
