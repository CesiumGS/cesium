/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Event'
    ], function(
        DeveloperError,
        defined,
        defineProperties,
        destroyObject,
        Event) {
    "use strict";

    /**
     * A collection of {@link DataSource} instances.
     * @alias DataSourceCollection
     * @constructor
     */
    var DataSourceCollection = function() {
        this._dataSources = [];

        /**
         * An event that is raised when a data source is added to the collection.  Event handlers are passed the data source that
         * was added.
         * @type {Event}
         */
        this.dataSourceAdded = new Event();

        /**
         * An event that is raised when a data source is removed from the collection.  Event handlers are passed the data source that
         * was removed.
         * @type {Event}
         */
        this.dataSourceRemoved = new Event();
    };

    defineProperties(DataSourceCollection.prototype, {
        /**
         * Gets the number of data sources in this collection.
         * @memberof DataSourceCollection.prototype
         * @type {Event}
         */
        length : {
            get : function() {
                return this._dataSources.length;
            }
        }
    });

    /**
     * Adds a data source to the collection.
     * @memberof DataSourceCollection
     *
     * @param {DataSource} dataSource The data source to add.
     */
    DataSourceCollection.prototype.add = function(dataSource) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(dataSource)) {
            throw new DeveloperError('dataSource is required.');
        }
        //>>includeEnd('debug');

        this._dataSources.push(dataSource);
        this.dataSourceAdded.raiseEvent(this, dataSource);
    };

    /**
     * Removes a data source from this collection, if present.
     *
     * @memberof DataSourceCollection
     *
     * @param {DataSource} dataSource The data source to remove.
     * @param {Boolean} [destroy=true] whether to destroy the data sources in addition to removing them.
     *
     * @returns {Boolean} true if the data source was in the collection and was removed,
     *                    false if the data source was not in the collection.
     */
    DataSourceCollection.prototype.remove = function(dataSource, destroy) {
        var index = this._dataSources.indexOf(dataSource);
        if (index !== -1) {
            this._dataSources.splice(index, 1);
            this.dataSourceRemoved.raiseEvent(this, dataSource);

            if (typeof dataSource.destroy === 'function' && destroy) {
                dataSource.destroy();
            }

            return true;
        }

        return false;
    };

    /**
     * Removes all data sources from this collection.
     *
     * @memberof DataSourceCollection
     *
     * @param {Boolean} [destroy=true] whether to destroy the data sources in addition to removing them.
     */
    DataSourceCollection.prototype.removeAll = function(destroy) {
        var dataSources = this._dataSources;
        for ( var i = dataSources.length - 1; i >= 0; i--) {
            this.remove(dataSources[i], destroy);
        }
    };

    /**
     * Checks to see if the collection contains a given data source.
     *
     * @memberof DataSourceCollection
     *
     * @param {DataSource} dataSource The data source to check for.
     *
     * @returns {Boolean} true if the collection contains the data source, false otherwise.
     */
    DataSourceCollection.prototype.contains = function(dataSource) {
        return this.indexOf(dataSource) !== -1;
    };

    /**
     * Determines the index of a given data source in the collection.
     *
     * @memberof DataSourceCollection
     *
     * @param {DataSource} dataSource The data source to find the index of.
     *
     * @returns {Number} The index of the data source in the collection, or -1 if the data source does not exist in the collection.
     */
    DataSourceCollection.prototype.indexOf = function(dataSource) {
        return this._dataSources.indexOf(dataSource);
    };

    /**
     * Gets a data source by index from the collection.
     *
     * @memberof DataSourceCollection
     *
     * @param {Number} index the index to retrieve.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    DataSourceCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._dataSources[index];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DataSourceCollection
     *
     * @returns {Boolean} true if this object was destroyed; otherwise, false.
     *
     * @see DataSourceCollection#destroy
     */
    DataSourceCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by all data sources in this collection.  Explicitly destroying this
     * object allows for deterministic release of WebGL resources, instead of relying on the garbage
     * collector.
     * <br /><br />
     * Once this object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof DataSourceCollection
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DataSourceCollection#isDestroyed
     *
     * @example
     * dataSourceCollection = dataSourceCollection && dataSourceCollection.destroy();
     */
    DataSourceCollection.prototype.destroy = function() {
        this.removeAll(true);
        return destroyObject(this);
    };

    return DataSourceCollection;
});