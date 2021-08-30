export default function ModelFeature(options) {
  this._model = options.model;
  this._featureId = options.featureId;
  this._content = options.content;
}

Object.defineProperties(ModelFeature.prototype, {
  id: {
    get: function () {
      return this._featureId;
    },
  },

  primitive: {
    get: function () {
      return this._model;
    },
  },
});
