import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import Cesium3DTileset from "../Scene/Cesium3DTileset.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";

const modelMatrixScratch = new Matrix4();

/**
 * A {@link Visualizer} which maps {@link Entity#tileset} to a {@link Cesium3DTileset}.
 * @alias Cesium3DTilesetVisualizer
 * @constructor
 *
 * @param {Scene} scene The scene the primitives will be rendered in.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
function Cesium3DTilesetVisualizer(scene, entityCollection) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  if (!defined(entityCollection)) {
    throw new DeveloperError("entityCollection is required.");
  }
  //>>includeEnd('debug');

  entityCollection.collectionChanged.addEventListener(
    Cesium3DTilesetVisualizer.prototype._onCollectionChanged,
    this
  );

  this._scene = scene;
  this._primitives = scene.primitives;
  this._entityCollection = entityCollection;
  this._tilesetHash = {};
  this._entitiesToVisualize = new AssociativeArray();
  this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
}

/**
 * Updates models created this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {boolean} This function always returns true.
 */
Cesium3DTilesetVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  const entities = this._entitiesToVisualize.values;
  const tilesetHash = this._tilesetHash;
  const primitives = this._primitives;

  for (let i = 0, len = entities.length; i < len; i++) {
    const entity = entities[i];
    const tilesetGraphics = entity._tileset;

    let resource;
    const tilesetData = tilesetHash[entity.id];
    const show =
      entity.isShowing &&
      entity.isAvailable(time) &&
      Property.getValueOrDefault(tilesetGraphics._show, time, true);

    let modelMatrix;
    if (show) {
      modelMatrix = entity.computeModelMatrix(time, modelMatrixScratch);
      resource = Resource.createIfNeeded(
        Property.getValueOrUndefined(tilesetGraphics._uri, time)
      );
    }

    if (!show) {
      if (defined(tilesetData)) {
        tilesetData.tilesetPrimitive.show = false;
      }
      continue;
    }

    const tileset = defined(tilesetData)
      ? tilesetData.tilesetPrimitive
      : undefined;
    if (!defined(tilesetData) || resource.url !== tilesetData.url) {
      if (defined(tileset)) {
        primitives.removeAndDestroy(tileset);
      }

      delete tilesetHash[entity.id];

      createTileset(resource, tilesetHash, entity, primitives);
    }

    if (!defined(tileset)) {
      continue;
    }

    tileset.show = true;
    if (defined(modelMatrix)) {
      tileset.modelMatrix = modelMatrix;
    }
    tileset.maximumScreenSpaceError = Property.getValueOrDefault(
      tilesetGraphics.maximumScreenSpaceError,
      time,
      tileset.maximumScreenSpaceError
    );
  }

  return true;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 */
Cesium3DTilesetVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
Cesium3DTilesetVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    Cesium3DTilesetVisualizer.prototype._onCollectionChanged,
    this
  );
  const entities = this._entitiesToVisualize.values;
  const tilesetHash = this._tilesetHash;
  const primitives = this._primitives;
  for (let i = entities.length - 1; i > -1; i--) {
    removeTileset(this, entities[i], tilesetHash, primitives);
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
Cesium3DTilesetVisualizer.prototype.getBoundingSphere = function (
  entity,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entity)) {
    throw new DeveloperError("entity is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  const tilesetData = this._tilesetHash[entity.id];
  if (!defined(tilesetData) || tilesetData.loadFail) {
    return BoundingSphereState.FAILED;
  }

  const primitive = tilesetData.tilesetPrimitive;
  if (!defined(primitive)) {
    return BoundingSphereState.PENDING;
  }

  if (!primitive.show) {
    return BoundingSphereState.FAILED;
  }

  BoundingSphere.clone(primitive.boundingSphere, result);

  return BoundingSphereState.DONE;
};

/**
 * @private
 */
Cesium3DTilesetVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed,
  changed
) {
  let i;
  let entity;
  const entities = this._entitiesToVisualize;
  const tilesetHash = this._tilesetHash;
  const primitives = this._primitives;

  for (i = added.length - 1; i > -1; i--) {
    entity = added[i];
    if (defined(entity._tileset)) {
      entities.set(entity.id, entity);
    }
  }

  for (i = changed.length - 1; i > -1; i--) {
    entity = changed[i];
    if (defined(entity._tileset)) {
      entities.set(entity.id, entity);
    } else {
      removeTileset(this, entity, tilesetHash, primitives);
      entities.remove(entity.id);
    }
  }

  for (i = removed.length - 1; i > -1; i--) {
    entity = removed[i];
    removeTileset(this, entity, tilesetHash, primitives);
    entities.remove(entity.id);
  }
};

function removeTileset(visualizer, entity, tilesetHash, primitives) {
  const tilesetData = tilesetHash[entity.id];
  if (defined(tilesetData)) {
    if (defined(tilesetData.tilesetPrimitive)) {
      primitives.removeAndDestroy(tilesetData.tilesetPrimitive);
    }
    delete tilesetHash[entity.id];
  }
}

async function createTileset(resource, tilesetHash, entity, primitives) {
  tilesetHash[entity.id] = {
    url: resource.url,
    loadFail: false,
  };

  try {
    const tileset = await Cesium3DTileset.fromUrl(resource);
    tileset.id = entity;
    primitives.add(tileset);

    if (!defined(tilesetHash[entity.id])) {
      return;
    }

    tilesetHash[entity.id].tilesetPrimitive = tileset;
  } catch (error) {
    console.error(error);
    tilesetHash[entity.id].loadFail = true;
  }
}

export default Cesium3DTilesetVisualizer;
