/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defineProperties,
        DeveloperError,
        Event,
        knockout) {
    "use strict";

    function DataSourceViewModel(name, rootViewModel, dynamicObject) {
        var that = this;

        this.rootViewModel = rootViewModel;
        this.dynamicObject = dynamicObject;

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

    DataSourceViewModel.prototype.select = function() {
        this.rootViewModel.selectedItem = this;
    };

    var DataSourceBrowserViewModel = function(dataSourceCollection) {
        if (typeof dataSourceCollection === 'undefined') {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);
        this._dataSourceCollection = dataSourceCollection;

        this.dataSources = [];

        knockout.track(this, ['dataSources']);

        var that = this;

        this.selectedItem = undefined;
        var selectedViewModel = knockout.observable();
        knockout.defineProperty(this, 'selectedItem', {
            get : function() {
                return selectedViewModel();
            },
            set : function(value) {
                selectedViewModel(value);
                if (typeof value !== 'undefined' && typeof value.dynamicObject !== 'undefined') {
                    that._onObjectSelected.raiseEvent(value.dynamicObject);
                }
            }
        });

        this._onObjectSelected = new Event();
    };

    defineProperties(DataSourceBrowserViewModel.prototype, {
        /**
         * Gets an event that will be raised when an object is selected in the browser.
         * @memberof DataSourceBrowserViewModel.prototype
         *
         * @type {Event}
         */
        onObjectSelected : {
            get : function() {
                return this._onObjectSelected;
            }
        }
    });

    DataSourceBrowserViewModel.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var dataSourceViewModel = new DataSourceViewModel(dataSource.getName(), this);
        dataSourceViewModel._dataSource = dataSource;

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        var objects = dynamicObjectCollection.getObjects();
        for ( var i = 0, len = objects.length; i < len; ++i) {
            var object = objects[i];
            var dynamicObjectViewModel = new DataSourceViewModel(object.id, this, object);
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