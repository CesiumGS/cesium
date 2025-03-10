import createGuid from "../Core/createGuid.js";

/**
 * A class for things
 * @constructor
 * @param {Object} options
 * @param {string} [options.id]
 * @param {Object} options.geometry
 * @param {Object} [options.metadata]
 */
function Feature(options) {
  this._id = options.id ?? createGuid();
  this._geometry = options.geometry;
  this._metadata = options.metadata;
}

Object.defineProperties(Feature.prototype, {
  id: {
    get: function () {
      return this._id;
    },
  },
  geometry: {
    get: function () {
      return this._geometry;
    },
  },
  metadata: {
    get: function () {
      return this._metadata;
    },
  },
});

export default Feature;
