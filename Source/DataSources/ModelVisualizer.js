import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import ColorBlendMode from "../Scene/ColorBlendMode.js";
import HeightReference from "../Scene/HeightReference.js";
import Model from "../Scene/Model.js";
import ModelAnimationLoop from "../Scene/ModelAnimationLoop.js";
import ShadowMode from "../Scene/ShadowMode.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";

var defaultScale = 1.0;
var defaultMinimumPixelSize = 0.0;
var defaultIncrementallyLoadTextures = true;
var defaultClampAnimations = true;
var defaultShadows = ShadowMode.ENABLED;
var defaultHeightReference = HeightReference.NONE;
var defaultSilhouetteColor = Color.RED;
var defaultSilhouetteSize = 0.0;
var defaultColor = Color.WHITE;
var defaultColorBlendMode = ColorBlendMode.HIGHLIGHT;
var defaultColorBlendAmount = 0.5;
var defaultImageBasedLightingFactor = new Cartesian2(1.0, 1.0);

var modelMatrixScratch = new Matrix4();
var nodeMatrixScratch = new Matrix4();

/**
 * A {@link Visualizer} which maps {@link Entity#model} to a {@link Model}.
 * @alias ModelVisualizer
 * @constructor
 *
 * @param {Scene} scene The scene the primitives will be rendered in.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
function ModelVisualizer(scene, entityCollection) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  if (!defined(entityCollection)) {
    throw new DeveloperError("entityCollection is required.");
  }
  //>>includeEnd('debug');

  entityCollection.collectionChanged.addEventListener(
    ModelVisualizer.prototype._onCollectionChanged,
    this
  );

  this._scene = scene;
  this._primitives = scene.primitives;
  this._entityCollection = entityCollection;
  this._modelHash = {};
  this._entitiesToVisualize = new AssociativeArray();
  this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
}

/**
 * Updates models created this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {Boolean} This function always returns true.
 */
ModelVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  var entities = this._entitiesToVisualize.values;
  var modelHash = this._modelHash;
  var primitives = this._primitives;

  for (var i = 0, len = entities.length; i < len; i++) {
    var entity = entities[i];
    var modelGraphics = entity._model;

    var resource;
    var modelData = modelHash[entity.id];
    var show =
      entity.isShowing &&
      entity.isAvailable(time) &&
      Property.getValueOrDefault(modelGraphics._show, time, true);

    var modelMatrix;
    if (show) {
      modelMatrix = entity.computeModelMatrix(time, modelMatrixScratch);
      resource = Resource.createIfNeeded(
        Property.getValueOrUndefined(modelGraphics._uri, time)
      );
      show = defined(modelMatrix) && defined(resource);
    }

    if (!show) {
      if (defined(modelData)) {
        modelData.modelPrimitive.show = false;
      }
      continue;
    }

    var model = defined(modelData) ? modelData.modelPrimitive : undefined;
    if (!defined(model) || resource.url !== modelData.url) {
      if (defined(model)) {
        primitives.removeAndDestroy(model);
        delete modelHash[entity.id];
      }
      model = Model.fromGltf({
        url: resource,
        incrementallyLoadTextures: Property.getValueOrDefault(
          modelGraphics._incrementallyLoadTextures,
          time,
          defaultIncrementallyLoadTextures
        ),
        scene: this._scene,
      });
      model.id = entity;
      primitives.add(model);

      modelData = {
        modelPrimitive: model,
        url: resource.url,
        animationsRunning: false,
        nodeTransformationsScratch: {},
        articulationsScratch: {},
        loadFail: false,
      };
      modelHash[entity.id] = modelData;

      checkModelLoad(model, entity, modelHash);
    }

    model.show = true;
    model.scale = Property.getValueOrDefault(
      modelGraphics._scale,
      time,
      defaultScale
    );
    model.minimumPixelSize = Property.getValueOrDefault(
      modelGraphics._minimumPixelSize,
      time,
      defaultMinimumPixelSize
    );
    model.maximumScale = Property.getValueOrUndefined(
      modelGraphics._maximumScale,
      time
    );
    model.modelMatrix = Matrix4.clone(modelMatrix, model.modelMatrix);
    model.shadows = Property.getValueOrDefault(
      modelGraphics._shadows,
      time,
      defaultShadows
    );
    model.heightReference = Property.getValueOrDefault(
      modelGraphics._heightReference,
      time,
      defaultHeightReference
    );
    model.distanceDisplayCondition = Property.getValueOrUndefined(
      modelGraphics._distanceDisplayCondition,
      time
    );
    model.silhouetteColor = Property.getValueOrDefault(
      modelGraphics._silhouetteColor,
      time,
      defaultSilhouetteColor,
      model._silhouetteColor
    );
    model.silhouetteSize = Property.getValueOrDefault(
      modelGraphics._silhouetteSize,
      time,
      defaultSilhouetteSize
    );
    model.color = Property.getValueOrDefault(
      modelGraphics._color,
      time,
      defaultColor,
      model._color
    );
    model.colorBlendMode = Property.getValueOrDefault(
      modelGraphics._colorBlendMode,
      time,
      defaultColorBlendMode
    );
    model.colorBlendAmount = Property.getValueOrDefault(
      modelGraphics._colorBlendAmount,
      time,
      defaultColorBlendAmount
    );
    model.clippingPlanes = Property.getValueOrUndefined(
      modelGraphics._clippingPlanes,
      time
    );
    model.clampAnimations = Property.getValueOrDefault(
      modelGraphics._clampAnimations,
      time,
      defaultClampAnimations
    );
    model.imageBasedLightingFactor = Property.getValueOrDefault(
      modelGraphics._imageBasedLightingFactor,
      time,
      defaultImageBasedLightingFactor
    );
    model.lightColor = Property.getValueOrUndefined(
      modelGraphics._lightColor,
      time
    );

    if (model.ready) {
      var runAnimations = Property.getValueOrDefault(
        modelGraphics._runAnimations,
        time,
        true
      );
      if (modelData.animationsRunning !== runAnimations) {
        if (runAnimations) {
          model.activeAnimations.addAll({
            loop: ModelAnimationLoop.REPEAT,
          });
        } else {
          model.activeAnimations.removeAll();
        }
        modelData.animationsRunning = runAnimations;
      }

      // Apply node transformations
      var nodeTransformations = Property.getValueOrUndefined(
        modelGraphics._nodeTransformations,
        time,
        modelData.nodeTransformationsScratch
      );
      if (defined(nodeTransformations)) {
        var nodeNames = Object.keys(nodeTransformations);
        for (
          var nodeIndex = 0, nodeLength = nodeNames.length;
          nodeIndex < nodeLength;
          ++nodeIndex
        ) {
          var nodeName = nodeNames[nodeIndex];

          var nodeTransformation = nodeTransformations[nodeName];
          if (!defined(nodeTransformation)) {
            continue;
          }

          var modelNode = model.getNode(nodeName);
          if (!defined(modelNode)) {
            continue;
          }

          var transformationMatrix = Matrix4.fromTranslationRotationScale(
            nodeTransformation,
            nodeMatrixScratch
          );
          modelNode.matrix = Matrix4.multiply(
            modelNode.originalMatrix,
            transformationMatrix,
            transformationMatrix
          );
        }
      }

      // Apply articulations
      var anyArticulationUpdated = false;
      var articulations = Property.getValueOrUndefined(
        modelGraphics._articulations,
        time,
        modelData.articulationsScratch
      );
      if (defined(articulations)) {
        var articulationStageKeys = Object.keys(articulations);
        for (
          var s = 0, numKeys = articulationStageKeys.length;
          s < numKeys;
          ++s
        ) {
          var key = articulationStageKeys[s];

          var articulationStageValue = articulations[key];
          if (!defined(articulationStageValue)) {
            continue;
          }

          anyArticulationUpdated = true;
          model.setArticulationStage(key, articulationStageValue);
        }
      }

      if (anyArticulationUpdated) {
        model.applyArticulations();
      }
    }
  }

  return true;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 */
ModelVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
ModelVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    ModelVisualizer.prototype._onCollectionChanged,
    this
  );
  var entities = this._entitiesToVisualize.values;
  var modelHash = this._modelHash;
  var primitives = this._primitives;
  for (var i = entities.length - 1; i > -1; i--) {
    removeModel(this, entities[i], modelHash, primitives);
  }
  return destroyObject(this);
};

/**
 * Computes a bounding sphere which encloses the visualization produced for the specified entity.
 * The bounding sphere is in the fixed frame of the scene's globe.
 *
 * @param {Entity} entity The entity whose bounding sphere to compute.
 * @param {BoundingSphere} result The bounding sphere onto which to store the result.
 * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
 *                       BoundingSphereState.PENDING if the result is still being computed, or
 *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
 * @private
 */
ModelVisualizer.prototype.getBoundingSphere = function (entity, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entity)) {
    throw new DeveloperError("entity is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  var modelData = this._modelHash[entity.id];
  if (!defined(modelData) || modelData.loadFail) {
    return BoundingSphereState.FAILED;
  }

  var model = modelData.modelPrimitive;
  if (!defined(model) || !model.show) {
    return BoundingSphereState.FAILED;
  }

  if (!model.ready) {
    return BoundingSphereState.PENDING;
  }

  if (model.heightReference === HeightReference.NONE) {
    BoundingSphere.transform(model.boundingSphere, model.modelMatrix, result);
  } else {
    if (!defined(model._clampedModelMatrix)) {
      return BoundingSphereState.PENDING;
    }
    BoundingSphere.transform(
      model.boundingSphere,
      model._clampedModelMatrix,
      result
    );
  }
  return BoundingSphereState.DONE;
};

/**
 * @private
 */
ModelVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed,
  changed
) {
  var i;
  var entity;
  var entities = this._entitiesToVisualize;
  var modelHash = this._modelHash;
  var primitives = this._primitives;

  for (i = added.length - 1; i > -1; i--) {
    entity = added[i];
    if (defined(entity._model) && defined(entity._position)) {
      entities.set(entity.id, entity);
    }
  }

  for (i = changed.length - 1; i > -1; i--) {
    entity = changed[i];
    if (defined(entity._model) && defined(entity._position)) {
      clearNodeTransformationsArticulationsScratch(entity, modelHash);
      entities.set(entity.id, entity);
    } else {
      removeModel(this, entity, modelHash, primitives);
      entities.remove(entity.id);
    }
  }

  for (i = removed.length - 1; i > -1; i--) {
    entity = removed[i];
    removeModel(this, entity, modelHash, primitives);
    entities.remove(entity.id);
  }
};

function removeModel(visualizer, entity, modelHash, primitives) {
  var modelData = modelHash[entity.id];
  if (defined(modelData)) {
    primitives.removeAndDestroy(modelData.modelPrimitive);
    delete modelHash[entity.id];
  }
}

function clearNodeTransformationsArticulationsScratch(entity, modelHash) {
  var modelData = modelHash[entity.id];
  if (defined(modelData)) {
    modelData.nodeTransformationsScratch = {};
    modelData.articulationsScratch = {};
  }
}

function checkModelLoad(model, entity, modelHash) {
  model.readyPromise.otherwise(function (error) {
    console.error(error);
    modelHash[entity.id].loadFail = true;
  });
}
export default ModelVisualizer;
