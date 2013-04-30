/*global define*/
define(['./DataSourceCollection',
        './VisualizerCollection'
        ], function(
                DataSourceCollection,
                VisualizerCollection) {
    "use strict";

    /**
     * asd
     * @alias DataSourceDisplay
     * @constructor
     */
    var DataSourceDisplay = function(visualizerCreator) {
        /**
         *
         */
        this.dataSourceCollection = new DataSourceCollection();

        this._visualizerCreator = visualizerCreator;
        this._visualizerCollections = [];

        this.dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        this.dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);
    };

    DataSourceDisplay.prototype.destroy = function() {
        this.dataSourceCollection.dataSourceAdded.removeEventListener(DataSourceDisplay._onDataSourceAdded, this);
        this.dataSourceCollection.dataSourceRemoved.removeEventListener(DataSourceDisplay._onDataSourceRemoved, this);
    };

    DataSourceDisplay.prototype.update = function(time) {
        var collections = this._visualizerCollections;
        var length = collections.length;
        for ( var i = 0; i < length; i++) {
            collections[i].update(time);
        }
    };

    DataSourceDisplay.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var vCollection = new VisualizerCollection(this._visualizerCreator(), dataSource.getDynamicObjectCollection());
        dataSource._visualizerCollection = vCollection;
        this._visualizerCollections.push(vCollection);
    };

    DataSourceDisplay.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        var vCollection = dataSource._visualizerCollection;
        var vCollections = this._visualizerCollections;
        var index = vCollections.indexOf(vCollection);
        vCollections.splice(index, 1);
        vCollection.destroy();
        dataSource._visualizerCollection = undefined;
    };

    return DataSourceDisplay;
});