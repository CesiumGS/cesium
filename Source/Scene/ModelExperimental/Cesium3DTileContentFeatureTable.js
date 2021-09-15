import BatchTexture from "../BatchTexture.js";
import Cesium3DTileFeature from "../Cesium3DTileFeature.js";

export default function Cesium3DTileContentFeatureTable(options) {
  this._content = options.content;
  this._featureTable = options.featureTable;

  this._featuresLength = 0;
  this._features = undefined;

  this._batchTexture = undefined;

  initialize(this);
}

Object.defineProperties(Cesium3DTileContentFeatureTable.prototype, {
  batchTexture: {
    get: function () {
      return this._batchTexture;
    },
  },
  featuresLength: {
    get: function () {
      return this._featuresLength;
    },
  },
});

function initialize(contentFeatureTable) {
  var featuresLength = contentFeatureTable._featureTable.count;
  if (featuresLength === 0) {
    return;
  }

  var content = contentFeatureTable._content;

  var features = new Array(featuresLength);
  for (var i = 0; i < featuresLength; i++) {
    features[i] = new Cesium3DTileFeature(content, i);
  }

  contentFeatureTable._featuresLength = featuresLength;
  contentFeatureTable._features = features;

  contentFeatureTable._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    owner: content,
    statistics: content.tileset.statistics,
  });
}

Cesium3DTileContentFeatureTable.prototype.getFeature = function (featureId) {
  return this._features[featureId];
};

Cesium3DTileContentFeatureTable.prototype.getProperty = function (
  featureId,
  name
) {
  return this._featureTable.getProperty(featureId, name);
};

Cesium3DTileContentFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(this._content.tileset, frameState);
};
