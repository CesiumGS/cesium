/*global define*/
define(['./DataSourceCollection',
        './VisualizerCollection',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Iso8601'
        ], function(
                DataSourceCollection,
                VisualizerCollection,
                destroyObject,
                DeveloperError,
                Iso8601) {
    "use strict";

    /**
     * Visualizes a collection of  {@link DataSource} instances.
     *
     * @alias DataSourceDisplay
     * @constructor
     */
    var DataSourceDisplay = function(visualizerCreator) {
        /**
         * Gets the collection of data sources.
         * @type {DataSourceCollection}
         */
        this.dataSourceCollection = new DataSourceCollection();
        this.dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        this.dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);

        this._visualizerCreator = visualizerCreator;

        this._temporalSources = [];
        this._staticSourcesToUpdate = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DataSourceDisplay
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DataSourceDisplay#destroy
     */
    DataSourceDisplay.prototype.isDestroyed = function() {
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
     * @memberof DataSourceDisplay
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DataSourceDisplay#isDestroyed
     *
     * @example
     * dataSourceDisplay = dataSourceDisplay.destroy();
     */
    DataSourceDisplay.prototype.destroy = function() {
        var dataSources = this.dataSourceCollection;
        dataSources.dataSourceAdded.removeEventListener(this._onDataSourceAdded, this);
        dataSources.dataSourceRemoved.removeEventListener(this._onDataSourceRemoved, this);

        var length = dataSources.getLength();
        for ( var i = 0; i < length; i++) {
            var dataSource = dataSources.get(i);
            this._onDataSourceRemoved(dataSource);
            if (typeof dataSource.destroy === 'function') {
                dataSource.destroy();
            }
        }
        return destroyObject(this);
    };

    /**
     * Updates time-varying data sources to the provided time and also
     * updates static data sources that have changed since the last
     * call to update.
     *
     * @param {JulianDate} time The time to updated to.
     */
    DataSourceDisplay.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        var temporalSources = this._temporalSources;
        var staticSourcesToUpdate = this._staticSourcesToUpdate;
        var length;
        var i;

        length = temporalSources.length;
        for (i = 0; i < length; i++) {
            temporalSources[i]._visualizerCollection.update(time);
        }

        length = staticSourcesToUpdate.length;
        if (length > 0) {
            for (i = 0; i < length; i++) {
                staticSourcesToUpdate[i]._visualizerCollection.update(Iso8601.MINIMUM_VALUE);
            }
            staticSourcesToUpdate = [];
        }
    };

    DataSourceDisplay.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var vCollection = new VisualizerCollection(this._visualizerCreator(), dataSource.getDynamicObjectCollection());
        dataSource._visualizerCollection = vCollection;
        dataSource.getChangedEvent().addEventListener(this._onDataSourceChanged, this);
        this._onDataSourceChanged(dataSource);
    };

    DataSourceDisplay.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        dataSource.getChangedEvent().removeEventListener(this._onDataSourceChanged, this);

        var temporalIndex = this._temporalSources.indexOf(dataSource);
        if (temporalIndex !== -1) {
            this._temporalSources.splice(temporalIndex, 1);
        }

        var staticIndex = this._staticSourcesToUpdate.indexOf(dataSource);
        if (staticIndex !== -1) {
            this._staticSourcesToUpdate.splice(staticIndex, 1);
        }

        dataSource._visualizerCollection.destroy();
        dataSource._visualizerCollection = undefined;
    };

    DataSourceDisplay.prototype._onDataSourceChanged = function(dataSource) {
        var temporalIndex = this._temporalSources.indexOf(dataSource);
        var staticIndex = this._staticSourcesToUpdate.indexOf(dataSource);
        if (dataSource.getIsReady()) {
            if (dataSource.getIsTemporal()) {
                if (temporalIndex === -1) {
                    this._temporalSources.push(dataSource);
                }
                if (staticIndex !== -1) {
                    this._staticSourcesToUpdate.splice(staticIndex, 1);
                }
            } else {
                if (staticIndex === -1) {
                    this._staticSourcesToUpdate.push(dataSource);
                }
                if (temporalIndex !== -1) {
                    this._temporalSources.splice(staticIndex, 1);
                }
            }
        } else {
            if (staticIndex !== -1) {
                this._staticSourcesToUpdate.splice(staticIndex, 1);
            }
            if (temporalIndex !== -1) {
                this._temporalSources.splice(staticIndex, 1);
            }
        }
    };

    return DataSourceDisplay;
});