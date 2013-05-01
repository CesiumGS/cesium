/*global define*/
define(['./DataSourceCollection',
        './VisualizerCollection',
        '../Core/Iso8601'
        ], function(
                DataSourceCollection,
                VisualizerCollection,
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
    };

    DataSourceDisplay.prototype.destroy = function() {
        this.dataSourceCollection.dataSourceAdded.removeEventListener(this._onDataSourceAdded, this);
        this.dataSourceCollection.dataSourceRemoved.removeEventListener(this._onDataSourceRemoved, this);
    };

    DataSourceDisplay.prototype.update = function(time) {
        var dataSources = this.dataSourceCollection;
        var length = dataSources.getLength();
        for ( var i = 0; i < length; i++) {
            var dataSource = dataSources.get(i);
            if (dataSource.getIsReady() && dataSource.getIsTemporal()) {
                dataSource._visualizerCollection.update(time);
            }
        }
    };

    DataSourceDisplay.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var vCollection = new VisualizerCollection(this._visualizerCreator(), dataSource.getDynamicObjectCollection());
        dataSource._visualizerCollection = vCollection;
        dataSource.changed.addEventListener(this._onDataSourceChanged, this);
    };

    DataSourceDisplay.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        dataSource.changed.removeEventListener(this._onDataSourceChanged, this);
        dataSource._visualizerCollection.destroy();
        dataSource._visualizerCollection = undefined;
    };

    DataSourceDisplay.prototype._onDataSourceChanged = function(dataSource) {
        if (dataSource.getIsReady()) {
            dataSource._visualizerCollection.update(Iso8601.MINIMUM_VALUE);
        }
    };

    return DataSourceDisplay;
});