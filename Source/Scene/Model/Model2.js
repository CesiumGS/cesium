import when from "../../ThirdParty/when.js";
import GltfLoader from "../GltfLoader.js";
import ModelSceneGraph from "./ModelSceneGraph.js";
import DeveloperError from "../../Core/DeveloperError.js";
import defaultValue from "../../Core/defaultValue.js";
import RuntimeError from "../../Core/RuntimeError.js";
import ModelFeatureTable from "./ModelFeatureTable.js";
import Cesium3DTileFeature from "../../Scene/Cesium3DTileFeature.js";
import defined from "../../Core/defined.js";

export default function Model2(options) {
  this._gltfLoader = undefined;
  this._readyPromise = when.defer();
  this._resourcesLoaded = false;
  this._drawCommandsCreated = false;
  this._sceneGraph = undefined;
  this._allowPicking = defaultValue(options.allowPicking, true);
  this._pickIds = [];
  this._features = undefined;
  this._id = options.id;
  // TODO: Rename this to something with featureTable?
  this._batchTable = undefined;
  initialize(
    this,
    options.basePath,
    options.gltf,
    options.releaseGltfJson,
    options.incrementallyLoadTextures,
    options.pickObject
  );
}

Object.defineProperties(Model2.prototype, {
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * @private
   */
  pickIds: {
    get: function () {
      return this._pickIds;
    },
  },

  id: {
    get: function () {
      return this._id;
    },
  },

  batchTable: {
    get: function () {
      return this._batchTable;
    },
  },

  /**
   * @private
   */
  components: {
    get: function () {
      return this._gltfLoader.components;
    },
  },
});

function initialize(
  model,
  gltfResource,
  gltf,
  releaseGltfJson,
  incrementallyLoadTextures,
  pickObject
) {
  var loaderOptions = {
    gltfResource: gltfResource,
    releaseGltfJson: releaseGltfJson,
    incrementallyLoadTextures: incrementallyLoadTextures,
  };

  if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
  } else {
    // TODO
    throw new DeveloperError("GltfLoader does not support glTF yet, only GLB");
  }
  var loader = new GltfLoader(loaderOptions);

  model._gltfLoader = loader;
  loader.load();

  loader.promise
    .then(function (loader) {
      model._readyPromise.resolve();
      model._resourcesLoaded = true;

      model._sceneGraph = new ModelSceneGraph({
        modelComponents: loader.components,
        model: model,
        allowPicking: model._allowPicking,
        pickObject: pickObject,
      });
      createBatchTable(model);
    })
    // TODO: Handle this properly
    .otherwise(console.error);
}

function createBatchTable(model) {
  var featureMetadata = model.components.featureMetadata;
  var featureTableCount = featureMetadata.featureTableCount;
  if (featureTableCount === 0) {
    return undefined;
  }

  if (featureTableCount > 1) {
    throw new RuntimeError(
      "Only one feature table supported for glTF EXT_feature_metadata"
    );
  }

  var featureTable = featureMetadata.getFirstFeatureTable();
  model._batchTable = new ModelFeatureTable(model, featureTable);
}

Model2.prototype.hasProperty = function (batchId, name) {
  return false;
};

Model2.prototype.getFeature = function (batchId) {
  // TODO: bounds checking

  if (!defined(this._features)) {
    createFeatures(this);
  }
  return this._features[batchId];
};

function createFeatures(model) {
  var featuresLength = model._batchTable.featuresLength;
  var features = new Array(featuresLength);
  if (featuresLength > 0) {
    for (var i = 0; i < featuresLength; ++i) {
      // TODO: This isn't quite correct, Cesium3DTileFeature really expects a content
      // so it can access the tile & tileset for 3DTILES_metadata.
      features[i] = new Cesium3DTileFeature(model, i);
    }
  }
  model._features = features;
}

Model2.prototype.update = function (frameState) {
  // TODO: morphing
  // TODO: webp

  // if the loader isn't done processing, process it
  if (!this._resourcesLoaded) {
    this._gltfLoader.process(frameState);
    // TODO: Look for better approach to avoid skipping frame
    return;
  }

  // if done resource loading but we haven't built the draw commands, build them
  if (!this._drawCommandsCreated) {
    this._sceneGraph.createDrawCommands(frameState);
    this._drawCommandsCreated = true;
  }

  this._batchTable.update(frameState);

  // push the draw commands
  this._sceneGraph.pushDrawCommands(frameState);
};
