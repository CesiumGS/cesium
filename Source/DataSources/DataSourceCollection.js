import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import CesiumMath from "../Core/Math.js";
import when from "../ThirdParty/when.js";

/**
 * A collection of {@link DataSource} instances.
 * @alias DataSourceCollection
 * @constructor
 */
function DataSourceCollection() {
  this._dataSources = [];
  this._dataSourceAdded = new Event();
  this._dataSourceRemoved = new Event();
  this._dataSourceMoved = new Event();
}

Object.defineProperties(DataSourceCollection.prototype, {
  /**
   * Gets the number of data sources in this collection.
   * @memberof DataSourceCollection.prototype
   * @type {Number}
   * @readonly
   */
  length: {
    get: function () {
      return this._dataSources.length;
    },
  },

  /**
   * An event that is raised when a data source is added to the collection.
   * Event handlers are passed the data source that was added.
   * @memberof DataSourceCollection.prototype
   * @type {Event}
   * @readonly
   */
  dataSourceAdded: {
    get: function () {
      return this._dataSourceAdded;
    },
  },

  /**
   * An event that is raised when a data source is removed from the collection.
   * Event handlers are passed the data source that was removed.
   * @memberof DataSourceCollection.prototype
   * @type {Event}
   * @readonly
   */
  dataSourceRemoved: {
    get: function () {
      return this._dataSourceRemoved;
    },
  },

  /**
   * An event that is raised when a data source changes position in the collection.  Event handlers are passed the data source
   * that was moved, its new index after the move, and its old index prior to the move.
   * @memberof DataSourceCollection.prototype
   * @type {Event}
   * @readonly
   */
  dataSourceMoved: {
    get: function () {
      return this._dataSourceMoved;
    },
  },
});

/**
 * Adds a data source to the collection.
 *
 * @param {DataSource|Promise.<DataSource>} dataSource A data source or a promise to a data source to add to the collection.
 *                                        When passing a promise, the data source will not actually be added
 *                                        to the collection until the promise resolves successfully.
 * @returns {Promise.<DataSource>} A Promise that resolves once the data source has been added to the collection.
 */
DataSourceCollection.prototype.add = function (dataSource) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(dataSource)) {
    throw new DeveloperError("dataSource is required.");
  }
  //>>includeEnd('debug');

  var that = this;
  var dataSources = this._dataSources;
  return when(dataSource, function (value) {
    //Only add the data source if removeAll has not been called
    //Since it was added.
    if (dataSources === that._dataSources) {
      that._dataSources.push(value);
      that._dataSourceAdded.raiseEvent(that, value);
    }
    return value;
  });
};

/**
 * Removes a data source from this collection, if present.
 *
 * @param {DataSource} dataSource The data source to remove.
 * @param {Boolean} [destroy=false] Whether to destroy the data source in addition to removing it.
 * @returns {Boolean} true if the data source was in the collection and was removed,
 *                    false if the data source was not in the collection.
 */
DataSourceCollection.prototype.remove = function (dataSource, destroy) {
  destroy = defaultValue(destroy, false);

  var index = this._dataSources.indexOf(dataSource);
  if (index !== -1) {
    this._dataSources.splice(index, 1);
    this._dataSourceRemoved.raiseEvent(this, dataSource); //(remove comment after debugging) this line causes an error

    if (destroy && typeof dataSource.destroy === "function") {
      dataSource.destroy();
    }

    return true;
  }

  return false;
};

/**
 * Removes all data sources from this collection.
 *
 * @param {Boolean} [destroy=false] whether to destroy the data sources in addition to removing them.
 */
DataSourceCollection.prototype.removeAll = function (destroy) {
  destroy = defaultValue(destroy, false);

  var dataSources = this._dataSources;
  for (var i = 0, len = dataSources.length; i < len; ++i) {
    var dataSource = dataSources[i];
    this._dataSourceRemoved.raiseEvent(this, dataSource); //(remove comment after debugging) this line causes an error

    if (destroy && typeof dataSource.destroy === "function") {
      dataSource.destroy();
    }
  }
  this._dataSources = [];
};

/**
 * Checks to see if the collection contains a given data source.
 *
 * @param {DataSource} dataSource The data source to check for.
 * @returns {Boolean} true if the collection contains the data source, false otherwise.
 */
DataSourceCollection.prototype.contains = function (dataSource) {
  return this.indexOf(dataSource) !== -1;
};

/**
 * Determines the index of a given data source in the collection.
 *
 * @param {DataSource} dataSource The data source to find the index of.
 * @returns {Number} The index of the data source in the collection, or -1 if the data source does not exist in the collection.
 */
DataSourceCollection.prototype.indexOf = function (dataSource) {
  return this._dataSources.indexOf(dataSource);
};

/**
 * Gets a data source by index from the collection.
 *
 * @param {Number} index the index to retrieve.
 * @returns {DataSource} The data source at the specified index.
 */
DataSourceCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
  //>>includeEnd('debug');

  return this._dataSources[index];
};

/**
 * Gets a data source by name from the collection.
 *
 * @param {String} name The name to retrieve.
 * @returns {DataSource[]} A list of all data sources matching the provided name.
 */
DataSourceCollection.prototype.getByName = function (name) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(name)) {
    throw new DeveloperError("name is required.");
  }
  //>>includeEnd('debug');

  return this._dataSources.filter(function (dataSource) {
    return dataSource.name === name;
  });
};

function getIndex(dataSources, dataSource) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(dataSource)) {
    throw new DeveloperError("dataSource is required.");
  }
  //>>includeEnd('debug');

  var index = dataSources.indexOf(dataSource);

  //>>includeStart('debug', pragmas.debug);
  if (index === -1) {
    throw new DeveloperError("dataSource is not in this collection.");
  }
  //>>includeEnd('debug');

  return index;
}

function swapDataSources(collection, i, j) {
  var arr = collection._dataSources;
  var length = arr.length - 1;
  i = CesiumMath.clamp(i, 0, length);
  j = CesiumMath.clamp(j, 0, length);

  if (i === j) {
    return;
  }

  var temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;

  collection.dataSourceMoved.raiseEvent(temp, j, i);
}

/**
 * Raises a data source up one position in the collection.
 *
 * @param {DataSource} dataSource The data source to move.
 *
 * @exception {DeveloperError} dataSource is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
DataSourceCollection.prototype.raise = function (dataSource) {
  var index = getIndex(this._dataSources, dataSource);
  swapDataSources(this, index, index + 1);
};

/**
 * Lowers a data source down one position in the collection.
 *
 * @param {DataSource} dataSource The data source to move.
 *
 * @exception {DeveloperError} dataSource is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
DataSourceCollection.prototype.lower = function (dataSource) {
  var index = getIndex(this._dataSources, dataSource);
  swapDataSources(this, index, index - 1);
};

/**
 * Raises a data source to the top of the collection.
 *
 * @param {DataSource} dataSource The data source to move.
 *
 * @exception {DeveloperError} dataSource is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
DataSourceCollection.prototype.raiseToTop = function (dataSource) {
  var index = getIndex(this._dataSources, dataSource);
  if (index === this._dataSources.length - 1) {
    return;
  }
  this._dataSources.splice(index, 1);
  this._dataSources.push(dataSource);

  this.dataSourceMoved.raiseEvent(
    dataSource,
    this._dataSources.length - 1,
    index
  );
};

/**
 * Lowers a data source to the bottom of the collection.
 *
 * @param {DataSource} dataSource The data source to move.
 *
 * @exception {DeveloperError} dataSource is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
DataSourceCollection.prototype.lowerToBottom = function (dataSource) {
  var index = getIndex(this._dataSources, dataSource);
  if (index === 0) {
    return;
  }
  this._dataSources.splice(index, 1);
  this._dataSources.splice(0, 0, dataSource);

  this.dataSourceMoved.raiseEvent(dataSource, 0, index);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} true if this object was destroyed; otherwise, false.
 *
 * @see DataSourceCollection#destroy
 */
DataSourceCollection.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the resources held by all data sources in this collection.  Explicitly destroying this
 * object allows for deterministic release of WebGL resources, instead of relying on the garbage
 * collector. Once this object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * dataSourceCollection = dataSourceCollection && dataSourceCollection.destroy();
 *
 * @see DataSourceCollection#isDestroyed
 */
DataSourceCollection.prototype.destroy = function () {
  this.removeAll(true);
  return destroyObject(this);
};
export default DataSourceCollection;
