/**
 * @import FrameState from "../Scene/FrameState";
 * @import FeatureLayer from "./FeatureLayer";
 */

/**
 * A class for things
 * @constructor
 * @param {Object} options
 */
function FeatureLayerCollection(options) {
  this.id = options.id;
  /** @type {FeatureLayer[]} */
  this._layers = [];
}

Object.defineProperties(FeatureLayerCollection.prototype, {
  layers: {
    get: function () {
      return this._layers;
    },
  },
});

// TODO: create all the add/remove functions and events

// TODO: manage z-index in this collection?

/**
 * @param {FrameState} frameState
 */
FeatureLayerCollection.prototype.update = function (frameState) {
  this._layers.forEach((layer) => {
    layer.update(frameState);
  });
};

export default FeatureLayerCollection;
