import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import DataSource from "./DataSource.js";
import EntityCluster from "./EntityCluster.js";
import EntityCollection from "./EntityCollection.js";

/**
 * A {@link DataSource} implementation which can be used to manually manage a group of entities.
 *
 * @alias CustomDataSource
 * @constructor
 *
 * @param {String} [name] A human-readable name for this instance.
 *
 * @example
 * var dataSource = new Cesium.CustomDataSource('myData');
 *
 * var entity = dataSource.entities.add({
 *    position : Cesium.Cartesian3.fromDegrees(1, 2, 0),
 *    billboard : {
 *        image : 'image.png'
 *    }
 * });
 *
 * viewer.dataSources.add(dataSource);
 */
function CustomDataSource(name) {
  this._name = name;
  this._clock = undefined;
  this._changed = new Event();
  this._error = new Event();
  this._isLoading = false;
  this._loading = new Event();
  this._entityCollection = new EntityCollection(this);
  this._entityCluster = new EntityCluster();
}

Object.defineProperties(CustomDataSource.prototype, {
  /**
   * Gets or sets a human-readable name for this instance.
   * @memberof CustomDataSource.prototype
   * @type {String}
   */
  name: {
    get: function () {
      return this._name;
    },
    set: function (value) {
      if (this._name !== value) {
        this._name = value;
        this._changed.raiseEvent(this);
      }
    },
  },
  /**
   * Gets or sets the clock for this instance.
   * @memberof CustomDataSource.prototype
   * @type {DataSourceClock}
   */
  clock: {
    get: function () {
      return this._clock;
    },
    set: function (value) {
      if (this._clock !== value) {
        this._clock = value;
        this._changed.raiseEvent(this);
      }
    },
  },
  /**
   * Gets the collection of {@link Entity} instances.
   * @memberof CustomDataSource.prototype
   * @type {EntityCollection}
   */
  entities: {
    get: function () {
      return this._entityCollection;
    },
  },
  /**
   * Gets or sets whether the data source is currently loading data.
   * @memberof CustomDataSource.prototype
   * @type {Boolean}
   */
  isLoading: {
    get: function () {
      return this._isLoading;
    },
    set: function (value) {
      DataSource.setLoading(this, value);
    },
  },
  /**
   * Gets an event that will be raised when the underlying data changes.
   * @memberof CustomDataSource.prototype
   * @type {Event}
   */
  changedEvent: {
    get: function () {
      return this._changed;
    },
  },
  /**
   * Gets an event that will be raised if an error is encountered during processing.
   * @memberof CustomDataSource.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._error;
    },
  },
  /**
   * Gets an event that will be raised when the data source either starts or stops loading.
   * @memberof CustomDataSource.prototype
   * @type {Event}
   */
  loadingEvent: {
    get: function () {
      return this._loading;
    },
  },
  /**
   * Gets whether or not this data source should be displayed.
   * @memberof CustomDataSource.prototype
   * @type {Boolean}
   */
  show: {
    get: function () {
      return this._entityCollection.show;
    },
    set: function (value) {
      this._entityCollection.show = value;
    },
  },

  /**
   * Gets or sets the clustering options for this data source. This object can be shared between multiple data sources.
   *
   * @memberof CustomDataSource.prototype
   * @type {EntityCluster}
   */
  clustering: {
    get: function () {
      return this._entityCluster;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value must be defined.");
      }
      //>>includeEnd('debug');
      this._entityCluster = value;
    },
  },
});

/**
 * Updates the data source to the provided time.  This function is optional and
 * is not required to be implemented.  It is provided for data sources which
 * retrieve data based on the current animation time or scene state.
 * If implemented, update will be called by {@link DataSourceDisplay} once a frame.
 *
 * @param {JulianDate} time The simulation time.
 * @returns {Boolean} True if this data source is ready to be displayed at the provided time, false otherwise.
 */
CustomDataSource.prototype.update = function (time) {
  return true;
};

export default CustomDataSource;
