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

  if (this._parent._nodeIndex) {
    this._resource = this._parent._layer.resource.getDerivedResource({
      url: `nodes/${this._parent._data.mesh.attribute.resource}/${uri}`,
    });
  } else {
    this._resource = this._parent.resource.getDerivedResource({ url: uri });
  }
}

Object.defineProperties(I3SFeature.prototype, {
  /**
   * Gets the resource for the feature
   * @memberof I3SFeature.prototype
   * @type {Resource}
   */
  resource: {
    get: function () {
      return this._resource;
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
  return this._dataProvider._loadJson(this._resource).then(function (data) {
    that._data = data;
    return data;
  });
};

export default I3SFeature;
