import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import EventHelper from "../Core/EventHelper.js";
import GroundPolylinePrimitive from "../Scene/GroundPolylinePrimitive.js";
import GroundPrimitive from "../Scene/GroundPrimitive.js";
import OrderedGroundPrimitiveCollection from "../Scene/OrderedGroundPrimitiveCollection.js";
import PrimitiveCollection from "../Scene/PrimitiveCollection.js";
import BillboardVisualizer from "./BillboardVisualizer.js";
import BoundingSphereState from "./BoundingSphereState.js";
import CustomDataSource from "./CustomDataSource.js";
import GeometryVisualizer from "./GeometryVisualizer.js";
import LabelVisualizer from "./LabelVisualizer.js";
import ModelVisualizer from "./ModelVisualizer.js";
import Cesium3DTilesetVisualizer from "./Cesium3DTilesetVisualizer.js";
import PathVisualizer from "./PathVisualizer.js";
import PointVisualizer from "./PointVisualizer.js";
import PolylineVisualizer from "./PolylineVisualizer.js";

/**
 * Visualizes a collection of {@link DataSource} instances.
 * @alias DataSourceDisplay
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Scene} options.scene The scene in which to display the data.
 * @param {DataSourceCollection} options.dataSourceCollection The data sources to display.
 * @param {DataSourceDisplay.VisualizersCallback} [options.visualizersCallback=DataSourceDisplay.defaultVisualizersCallback]
 *        A function which creates an array of visualizers used for visualization.
 *        If undefined, all standard visualizers are used.
 */
function DataSourceDisplay(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.scene", options.scene);
  Check.typeOf.object(
    "options.dataSourceCollection",
    options.dataSourceCollection
  );
  //>>includeEnd('debug');

  GroundPrimitive.initializeTerrainHeights();
  GroundPolylinePrimitive.initializeTerrainHeights();

  const scene = options.scene;
  const dataSourceCollection = options.dataSourceCollection;

  this._eventHelper = new EventHelper();
  this._eventHelper.add(
    dataSourceCollection.dataSourceAdded,
    this._onDataSourceAdded,
    this
  );
  this._eventHelper.add(
    dataSourceCollection.dataSourceRemoved,
    this._onDataSourceRemoved,
    this
  );
  this._eventHelper.add(
    dataSourceCollection.dataSourceMoved,
    this._onDataSourceMoved,
    this
  );
  this._eventHelper.add(scene.postRender, this._postRender, this);

  this._dataSourceCollection = dataSourceCollection;
  this._scene = scene;
  this._visualizersCallback = defaultValue(
    options.visualizersCallback,
    DataSourceDisplay.defaultVisualizersCallback
  );

  let primitivesAdded = false;
  const primitives = new PrimitiveCollection();
  const groundPrimitives = new PrimitiveCollection();

  if (dataSourceCollection.length > 0) {
    scene.primitives.add(primitives);
    scene.groundPrimitives.add(groundPrimitives);
    primitivesAdded = true;
  }

  this._primitives = primitives;
  this._groundPrimitives = groundPrimitives;

  for (let i = 0, len = dataSourceCollection.length; i < len; i++) {
    this._onDataSourceAdded(dataSourceCollection, dataSourceCollection.get(i));
  }

  const defaultDataSource = new CustomDataSource();
  this._onDataSourceAdded(undefined, defaultDataSource);
  this._defaultDataSource = defaultDataSource;

  let removeDefaultDataSourceListener;
  let removeDataSourceCollectionListener;
  if (!primitivesAdded) {
    const that = this;
    const addPrimitives = function () {
      scene.primitives.add(primitives);
      scene.groundPrimitives.add(groundPrimitives);
      removeDefaultDataSourceListener();
      removeDataSourceCollectionListener();
      that._removeDefaultDataSourceListener = undefined;
      that._removeDataSourceCollectionListener = undefined;
    };
    removeDefaultDataSourceListener = defaultDataSource.entities.collectionChanged.addEventListener(
      addPrimitives
    );
    removeDataSourceCollectionListener = dataSourceCollection.dataSourceAdded.addEventListener(
      addPrimitives
    );
  }

  this._removeDefaultDataSourceListener = removeDefaultDataSourceListener;
  this._removeDataSourceCollectionListener = removeDataSourceCollectionListener;

  this._ready = false;
}

const ExtraVisualizers = [];
/**
 * Add the provided Visualizer to the default visualizers callback if not already included
 * @private
 * @param {Visualizer} visualizer Visualizer class to add
 */
DataSourceDisplay.registerVisualizer = function (visualizer) {
  if (!ExtraVisualizers.includes(visualizer)) {
    ExtraVisualizers.push(visualizer);
  }
};

/**
 * Remove the provided Visualizer from the default visualizers callback if it's already included
 * @private
 * @param {Visualizer} visualizer Visualizer class to remove
 */
DataSourceDisplay.unregisterVisualizer = function (visualizer) {
  if (ExtraVisualizers.includes(visualizer)) {
    const index = ExtraVisualizers.indexOf(visualizer);
    ExtraVisualizers.splice(index, 1);
  }
};

/**
 * Gets or sets the default function which creates an array of visualizers used for visualization.
 * By default, this function uses all standard visualizers.
 *
 * @type {DataSourceDisplay.VisualizersCallback}
 */
DataSourceDisplay.defaultVisualizersCallback = function (
  scene,
  entityCluster,
  dataSource
) {
  const entities = dataSource.entities;
  return [
    new BillboardVisualizer(entityCluster, entities),
    new GeometryVisualizer(
      scene,
      entities,
      dataSource._primitives,
      dataSource._groundPrimitives
    ),
    new LabelVisualizer(entityCluster, entities),
    new ModelVisualizer(scene, entities),
    new Cesium3DTilesetVisualizer(scene, entities),
    new PointVisualizer(entityCluster, entities),
    new PathVisualizer(scene, entities),
    new PolylineVisualizer(
      scene,
      entities,
      dataSource._primitives,
      dataSource._groundPrimitives
    ),
    ...ExtraVisualizers.map(
      (VisualizerClass) => new VisualizerClass(scene, entities)
    ),
  ];
};

Object.defineProperties(DataSourceDisplay.prototype, {
  /**
   * Gets the scene associated with this display.
   * @memberof DataSourceDisplay.prototype
   * @type {Scene}
   */
  scene: {
    get: function () {
      return this._scene;
    },
  },
  /**
   * Gets the collection of data sources to display.
   * @memberof DataSourceDisplay.prototype
   * @type {DataSourceCollection}
   */
  dataSources: {
    get: function () {
      return this._dataSourceCollection;
    },
  },
  /**
   * Gets the default data source instance which can be used to
   * manually create and visualize entities not tied to
   * a specific data source. This instance is always available
   * and does not appear in the list dataSources collection.
   * @memberof DataSourceDisplay.prototype
   * @type {CustomDataSource}
   */
  defaultDataSource: {
    get: function () {
      return this._defaultDataSource;
    },
  },

  /**
   * Gets a value indicating whether or not all entities in the data source are ready
   * @memberof DataSourceDisplay.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },
});

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see DataSourceDisplay#destroy
 */
DataSourceDisplay.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * dataSourceDisplay = dataSourceDisplay.destroy();
 *
 * @see DataSourceDisplay#isDestroyed
 */
DataSourceDisplay.prototype.destroy = function () {
  this._eventHelper.removeAll();

  const dataSourceCollection = this._dataSourceCollection;
  for (let i = 0, length = dataSourceCollection.length; i < length; ++i) {
    this._onDataSourceRemoved(
      this._dataSourceCollection,
      dataSourceCollection.get(i)
    );
  }
  this._onDataSourceRemoved(undefined, this._defaultDataSource);

  if (defined(this._removeDefaultDataSourceListener)) {
    this._removeDefaultDataSourceListener();
    this._removeDataSourceCollectionListener();
  } else {
    this._scene.primitives.remove(this._primitives);
    this._scene.groundPrimitives.remove(this._groundPrimitives);
  }

  return destroyObject(this);
};

/**
 * Updates the display to the provided time.
 *
 * @param {JulianDate} time The simulation time.
 * @returns {boolean} True if all data sources are ready to be displayed, false otherwise.
 */
DataSourceDisplay.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  if (!ApproximateTerrainHeights.initialized) {
    this._ready = false;
    return false;
  }

  let result = true;

  let i;
  let x;
  let visualizers;
  let vLength;
  const dataSources = this._dataSourceCollection;
  const length = dataSources.length;
  for (i = 0; i < length; i++) {
    const dataSource = dataSources.get(i);
    if (defined(dataSource.update)) {
      result = dataSource.update(time) && result;
    }

    visualizers = dataSource._visualizers;
    vLength = visualizers.length;
    for (x = 0; x < vLength; x++) {
      result = visualizers[x].update(time) && result;
    }
  }

  visualizers = this._defaultDataSource._visualizers;
  vLength = visualizers.length;
  for (x = 0; x < vLength; x++) {
    result = visualizers[x].update(time) && result;
  }

  // Request a rendering of the scene when the data source
  // becomes 'ready' for the first time
  if (!this._ready && result) {
    this._scene.requestRender();
  }
  this._ready = result;

  return result;
};

DataSourceDisplay.prototype._postRender = function () {
  // Adds credits for all datasources
  const frameState = this._scene.frameState;
  const dataSources = this._dataSourceCollection;
  const length = dataSources.length;
  for (let i = 0; i < length; i++) {
    const dataSource = dataSources.get(i);

    const credit = dataSource.credit;
    if (defined(credit)) {
      frameState.creditDisplay.addCreditToNextFrame(credit);
    }

    // Credits from the resource that the user can't remove
    const credits = dataSource._resourceCredits;
    if (defined(credits)) {
      const creditCount = credits.length;
      for (let c = 0; c < creditCount; c++) {
        frameState.creditDisplay.addCreditToNextFrame(credits[c]);
      }
    }
  }
};

const getBoundingSphereArrayScratch = [];
const getBoundingSphereBoundingSphereScratch = new BoundingSphere();

/**
 * Computes a bounding sphere which encloses the visualization produced for the specified entity.
 * The bounding sphere is in the fixed frame of the scene's globe.
 *
 * @param {Entity} entity The entity whose bounding sphere to compute.
 * @param {boolean} allowPartial If true, pending bounding spheres are ignored and an answer will be returned from the currently available data.
 *                               If false, the the function will halt and return pending if any of the bounding spheres are pending.
 * @param {BoundingSphere} result The bounding sphere onto which to store the result.
 * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
 *                       BoundingSphereState.PENDING if the result is still being computed, or
 *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
 * @private
 */
DataSourceDisplay.prototype.getBoundingSphere = function (
  entity,
  allowPartial,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("entity", entity);
  Check.typeOf.bool("allowPartial", allowPartial);
  Check.defined("result", result);
  //>>includeEnd('debug');

  if (!this._ready) {
    return BoundingSphereState.PENDING;
  }

  let i;
  let length;
  let dataSource = this._defaultDataSource;
  if (!dataSource.entities.contains(entity)) {
    dataSource = undefined;

    const dataSources = this._dataSourceCollection;
    length = dataSources.length;
    for (i = 0; i < length; i++) {
      const d = dataSources.get(i);
      if (d.entities.contains(entity)) {
        dataSource = d;
        break;
      }
    }
  }

  if (!defined(dataSource)) {
    return BoundingSphereState.FAILED;
  }

  const boundingSpheres = getBoundingSphereArrayScratch;
  const tmp = getBoundingSphereBoundingSphereScratch;

  let count = 0;
  let state = BoundingSphereState.DONE;
  const visualizers = dataSource._visualizers;
  const visualizersLength = visualizers.length;

  for (i = 0; i < visualizersLength; i++) {
    const visualizer = visualizers[i];
    if (defined(visualizer.getBoundingSphere)) {
      state = visualizers[i].getBoundingSphere(entity, tmp);
      if (!allowPartial && state === BoundingSphereState.PENDING) {
        return BoundingSphereState.PENDING;
      } else if (state === BoundingSphereState.DONE) {
        boundingSpheres[count] = BoundingSphere.clone(
          tmp,
          boundingSpheres[count]
        );
        count++;
      }
    }
  }

  if (count === 0) {
    return BoundingSphereState.FAILED;
  }

  boundingSpheres.length = count;
  BoundingSphere.fromBoundingSpheres(boundingSpheres, result);
  return BoundingSphereState.DONE;
};

DataSourceDisplay.prototype._onDataSourceAdded = function (
  dataSourceCollection,
  dataSource
) {
  const scene = this._scene;

  const displayPrimitives = this._primitives;
  const displayGroundPrimitives = this._groundPrimitives;

  const primitives = displayPrimitives.add(new PrimitiveCollection());
  const groundPrimitives = displayGroundPrimitives.add(
    new OrderedGroundPrimitiveCollection()
  );

  dataSource._primitives = primitives;
  dataSource._groundPrimitives = groundPrimitives;

  const entityCluster = dataSource.clustering;
  entityCluster._initialize(scene);

  primitives.add(entityCluster);

  dataSource._visualizers = this._visualizersCallback(
    scene,
    entityCluster,
    dataSource
  );
};

DataSourceDisplay.prototype._onDataSourceRemoved = function (
  dataSourceCollection,
  dataSource
) {
  const displayPrimitives = this._primitives;
  const displayGroundPrimitives = this._groundPrimitives;

  const primitives = dataSource._primitives;
  const groundPrimitives = dataSource._groundPrimitives;

  const entityCluster = dataSource.clustering;
  primitives.remove(entityCluster);

  const visualizers = dataSource._visualizers;
  const length = visualizers.length;
  for (let i = 0; i < length; i++) {
    visualizers[i].destroy();
  }

  displayPrimitives.remove(primitives);
  displayGroundPrimitives.remove(groundPrimitives);

  dataSource._visualizers = undefined;
};

DataSourceDisplay.prototype._onDataSourceMoved = function (
  dataSource,
  newIndex,
  oldIndex
) {
  const displayPrimitives = this._primitives;
  const displayGroundPrimitives = this._groundPrimitives;

  const primitives = dataSource._primitives;
  const groundPrimitives = dataSource._groundPrimitives;

  if (newIndex === oldIndex + 1) {
    displayPrimitives.raise(primitives);
    displayGroundPrimitives.raise(groundPrimitives);
  } else if (newIndex === oldIndex - 1) {
    displayPrimitives.lower(primitives);
    displayGroundPrimitives.lower(groundPrimitives);
  } else if (newIndex === 0) {
    displayPrimitives.lowerToBottom(primitives);
    displayGroundPrimitives.lowerToBottom(groundPrimitives);
    displayPrimitives.raise(primitives); // keep defaultDataSource primitives at index 0 since it's not in the collection
    displayGroundPrimitives.raise(groundPrimitives);
  } else {
    displayPrimitives.raiseToTop(primitives);
    displayGroundPrimitives.raiseToTop(groundPrimitives);
  }
};

/**
 * A function which creates an array of visualizers used for visualization.
 * @callback DataSourceDisplay.VisualizersCallback
 *
 * @param {Scene} scene The scene to create visualizers for.
 * @param {EntityCluster} entityCluster The entity cluster to create visualizers for.
 * @param {DataSource} dataSource The data source to create visualizers for.
 * @returns {Visualizer[]} An array of visualizers used for visualization.
 *
 * @example
 * function createVisualizers(scene, entityCluster, dataSource) {
 *     return [new Cesium.BillboardVisualizer(entityCluster, dataSource.entities)];
 * }
 */
export default DataSourceDisplay;
