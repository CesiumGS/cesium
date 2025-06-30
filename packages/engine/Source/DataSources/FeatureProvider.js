import defined from "../Core/defined.js";
import Event from "../Core/Event.js";
import FeatureLayer from "./FeatureLayer.js";

/**
 * A class for things
 * @constructor
 * @param {Object} options
 */
function FeatureProvider(options) {
  this.id = options.id;
  this.credit = undefined;

  this._abortController = undefined;

  this.dataLoaded = new Event();
}

Object.defineProperties(FeatureProvider.prototype, {});

FeatureProvider.prototype.requestFeatures = function (bbox, time) {
  // TODO: or leave blank? throw error? this is really just an interface...
};

FeatureProvider.prototype.createLayer = function (options) {
  return new FeatureLayer(this, {
    ...options,
    id: this.id,
  });
};

FeatureProvider.prototype.cancelRequests = async function () {
  if (defined(this._abortController)) {
    this._abortController.abort();
  }
};

FeatureProvider.prototype.createLayer = function (options) {
  return new FeatureLayer(this, {
    ...options,
    id: this.id,
  });
};

export default FeatureProvider;
