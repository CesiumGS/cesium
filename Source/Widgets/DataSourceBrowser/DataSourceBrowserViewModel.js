/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        DeveloperError,
        knockout) {
    "use strict";

    function DataSourceViewModel(name) {
        var that = this;

        this.id = 'cesium-dataSourceBrowser-node-' + createGuid();
        this.name = name;
        this.children = [];
        this.expanded = false;

        knockout.track(this, ['name', 'children', 'expanded']);

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return that.children.length > 0;
        });
    }

    var DataSourceBrowserViewModel = function(dataSourceCollection) {
        if (typeof dataSourceCollection === 'undefined') {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);
        this._dataSourceCollection = dataSourceCollection;

        this.dataSources = [];

        knockout.track(this, ['dataSources']);
    };

    DataSourceBrowserViewModel.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var dataSourceViewModel = new DataSourceViewModel(dataSource.getName());
        dataSourceViewModel._dataSource = dataSource;

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        var objects = dynamicObjectCollection.getObjects();
        for ( var i = 0, len = objects.length; i < len; ++i) {
            var object = objects[i];
            var dynamicObjectViewModel = new DataSourceViewModel(object.id);
            dynamicObjectViewModel._object = object;
            dataSourceViewModel.children.push(dynamicObjectViewModel);
        }

        this.dataSources.push(dataSourceViewModel);
    };

    DataSourceBrowserViewModel.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        var dataSources = this.dataSources;
        for ( var i = 0, len = dataSources.length; i < len; ++i) {
            var dataSourceViewModel = dataSources[i];
            if (dataSourceViewModel._dataSource === dataSource) {
                dataSources.splice(i, 1);
                return;
            }
        }
    };

    return DataSourceBrowserViewModel;
});