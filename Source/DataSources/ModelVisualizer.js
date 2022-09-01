import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import ColorBlendMode from "../Scene/ColorBlendMode.js";
import HeightReference from "../Scene/HeightReference.js";
import Model from "../Scene/Model/Model.js";
import ModelAnimationLoop from "../Scene/ModelAnimationLoop.js";
import ShadowMode from "../Scene/ShadowMode.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";
import sampleTerrainMostDetailed from "../Core/sampleTerrainMostDetailed.js";
import Cartographic from "../Core/Cartographic.js";

const defaultScale = 1.0;
const defaultMinimumPixelSize = 0.0;
const defaultIncrementallyLoadTextures = true;
const defaultClampAnimations = true;
const defaultShadows = ShadowMode.ENABLED;
const defaultHeightReference = HeightReference.NONE;
const defaultSilhouetteColor = Color.RED;
const defaultSilhouetteSize = 0.0;
const defaultColor = Color.WHITE;
const defaultColorBlendMode = ColorBlendMode.HIGHLIGHT;
const defaultColorBlendAmount = 0.5;
const defaultImageBasedLightingFactor = new Cartesian2(1.0, 1.0);

const modelMatrixScratch = new Matrix4();
const nodeMatrixScratch = new Matrix4();

const scratchColor = new Color();
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
  Check.typeOf.object("scene", scene);
  Check.typeOf.object("entityCollection", entityCollection);
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

  const entities = this._entitiesToVisualize.values;
  const modelHash = this._modelHash;
  const primitives = this._primitives;

  for (let i = 0, len = entities.length; i < len; i++) {
    const entity = entities[i];
    const modelGraphics = entity._model;

    let resource;
    let modelData = modelHash[entity.id];
    let show =
      entity.isShowing &&
      entity.isAvailable(time) &&
      Property.getValueOrDefault(modelGraphics._show, time, true);

    let modelMatrix;
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

    let model = defined(modelData) ? modelData.modelPrimitive : undefined;
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
        awaitingSampleTerrain: false,
        clampedBoundingSphere: undefined,
        sampleTerrainFailed: false,
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
      scratchColor
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
      scratchColor
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
    model.imageBasedLighting.imageBasedLightingFactor = Property.getValueOrDefault(
      modelGraphics._imageBasedLightingFactor,
      time,
      defaultImageBasedLightingFactor
    );
    model.lightColor = Property.getValueOrUndefined(
      modelGraphics._lightColor,
      time
    );
    model.customShader = Property.getValueOrUndefined(
      modelGraphics._customShader
    );

    if (model.ready) {
      const runAnimations = Property.getValueOrDefault(
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
      const nodeTransformations = Property.getValueOrUndefined(
        modelGraphics._nodeTransformations,
        time,
        modelData.nodeTransformationsScratch
      );
      if (defined(nodeTransformations)) {
        const nodeNames = Object.keys(nodeTransformations);
        for (
          let nodeIndex = 0, nodeLength = nodeNames.length;
          nodeIndex < nodeLength;
          ++nodeIndex
        ) {
          const nodeName = nodeNames[nodeIndex];

          const nodeTransformation = nodeTransformations[nodeName];
          if (!defined(nodeTransformation)) {
            continue;
          }

          const modelNode = model.getNode(nodeName);
          if (!defined(modelNode)) {
            continue;
          }

          const transformationMatrix = Matrix4.fromTranslationRotationScale(
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
      let anyArticulationUpdated = false;
      const articulations = Property.getValueOrUndefined(
        modelGraphics._articulations,
        time,
        modelData.articulationsScratch
      );
      if (defined(articulations)) {
        const articulationStageKeys = Object.keys(articulations);
        for (
          let s = 0, numKeys = articulationStageKeys.length;
          s < numKeys;
          ++s
        ) {
          const key = articulationStageKeys[s];

          const articulationStageValue = articulations[key];
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
  const entities = this._entitiesToVisualize.values;
  const modelHash = this._modelHash;
  const primitives = this._primitives;
  for (let i = entities.length - 1; i > -1; i--) {
    removeModel(this, entities[i], modelHash, primitives);
  }
  return destroyObject(this);
};

// Used for testing.
ModelVisualizer._sampleTerrainMostDetailed = sampleTerrainMostDetailed;

const scratchPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
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

  const modelData = this._modelHash[entity.id];
  if (!defined(modelData) || modelData.loadFail) {
    return BoundingSphereState.FAILED;
  }

  const model = modelData.modelPrimitive;
  if (!defined(model) || !model.show) {
    return BoundingSphereState.FAILED;
  }

  if (!model.ready) {
    return BoundingSphereState.PENDING;
  }
  const scene = this._scene;
  const globe = scene.globe;
  const ellipsoid = globe.ellipsoid;
  const terrainProvider = globe.terrainProvider;

  const hasHeightReference = model.heightReference !== HeightReference.NONE;
  if (hasHeightReference) {
    // We cannot query the availability of the terrain provider till its ready, so the
    // bounding sphere state will remain pending till the terrain provider is ready.
    if (!terrainProvider.ready) {
      return BoundingSphereState.PENDING;
    }

    const modelMatrix = model.modelMatrix;
    scratchPosition.x = modelMatrix[12];
    scratchPosition.y = modelMatrix[13];
    scratchPosition.z = modelMatrix[14];
    const cartoPosition = ellipsoid.cartesianToCartographic(scratchPosition);

    // For a terrain provider that does not have availability, like the EllipsoidTerrainProvider,
    // we can directly assign the bounding sphere's center from model matrix's translation.
    if (!defined(terrainProvider.availability)) {
      // Regardless of what the original model's position is set to, for CLAMP_TO_GROUND, we reset it to 0
      // when computing the position to zoom/fly to.
      if (model.heightReference === HeightReference.CLAMP_TO_GROUND) {
        cartoPosition.height = 0;
      }

      const scratchPosition = ellipsoid.cartographicToCartesian(cartoPosition);
      BoundingSphere.clone(model.boundingSphere, result);
      result.center = scratchPosition;

      return BoundingSphereState.DONE;
    }

    // Otherwise, in the case of terrain providers with availability,
    // since the model's bounding sphere may be clamped to a lower LOD tile if
    // the camera is initially far away, we use sampleTerrainMostDetailed to estimate
    // where the bounding sphere should be and set that as the target bounding sphere
    // for the camera.
    let clampedBoundingSphere = this._modelHash[entity.id]
      .clampedBoundingSphere;

    // Check if the sample terrain function has failed.
    const sampleTerrainFailed = this._modelHash[entity.id].sampleTerrainFailed;
    if (sampleTerrainFailed) {
      this._modelHash[entity.id].sampleTerrainFailed = false;
      return BoundingSphereState.FAILED;
    }

    if (!defined(clampedBoundingSphere)) {
      clampedBoundingSphere = new BoundingSphere();

      // Since this function is called per-frame, we set a flag when sampleTerrainMostDetailed
      // is called and check for it to avoid calling it again.
      const awaitingSampleTerrain = this._modelHash[entity.id]
        .awaitingSampleTerrain;
      if (!awaitingSampleTerrain) {
        Cartographic.clone(cartoPosition, scratchCartographic);
        this._modelHash[entity.id].awaitingSampleTerrain = true;
        ModelVisualizer._sampleTerrainMostDetailed(terrainProvider, [
          scratchCartographic,
        ])
          .then((result) => {
            this._modelHash[entity.id].awaitingSampleTerrain = false;

            const updatedCartographic = result[0];
            if (model.heightReference === HeightReference.RELATIVE_TO_GROUND) {
              updatedCartographic.height += cartoPosition.height;
            }
            ellipsoid.cartographicToCartesian(
              updatedCartographic,
              scratchPosition
            );

            // Update the bounding sphere with the updated position.
            BoundingSphere.clone(model.boundingSphere, clampedBoundingSphere);
            clampedBoundingSphere.center = scratchPosition;

            this._modelHash[
              entity.id
            ].clampedBoundingSphere = BoundingSphere.clone(
              clampedBoundingSphere
            );
          })
          .catch((e) => {
            this._modelHash[entity.id].sampleTerrainFailed = true;
            this._modelHash[entity.id].awaitingSampleTerrain = false;
          });
      }

      // We will return the state as pending until the clamped bounding sphere is defined,
      // which happens when the sampleTerrainMostDetailed promise returns.
      return BoundingSphereState.PENDING;
    }

    BoundingSphere.clone(clampedBoundingSphere, result);
    return BoundingSphereState.DONE;
  }

  BoundingSphere.clone(model.boundingSphere, result);
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
  let i;
  let entity;
  const entities = this._entitiesToVisualize;
  const modelHash = this._modelHash;
  const primitives = this._primitives;

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
  const modelData = modelHash[entity.id];
  if (defined(modelData)) {
    primitives.removeAndDestroy(modelData.modelPrimitive);
    delete modelHash[entity.id];
  }
}

function clearNodeTransformationsArticulationsScratch(entity, modelHash) {
  const modelData = modelHash[entity.id];
  if (defined(modelData)) {
    modelData.nodeTransformationsScratch = {};
    modelData.articulationsScratch = {};
  }
}

function checkModelLoad(model, entity, modelHash) {
  model.readyPromise.catch(function (error) {
    console.error(error);
    modelHash[entity.id].loadFail = true;
  });
}
export default ModelVisualizer;
