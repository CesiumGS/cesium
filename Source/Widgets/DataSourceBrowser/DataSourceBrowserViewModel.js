/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../createCommand',
        './AddCzmlDataSourcePanel',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defaultValue,
        defineProperties,
        DeveloperError,
        Event,
        createCommand,
        AddCzmlDataSourcePanel,
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

    /**
     * The view model for {@link DataSourceBrowser}.
     * @alias DataSourceBrowserViewModel
     * @constructor
     *
     * @param {DataSourceCollection} dataSourceCollection The data source collection to use.
     * @param {Array} [addDataSourcePanels=DataSourceBrowserViewModel.defaultAddDataSourcePanels] An array of handlers that will be used when adding a data source.
     *
     * @exception {DeveloperError} dataSourceCollection is required.
     */
    var DataSourceBrowserViewModel = function(dataSourceCollection, addDataSourcePanels) {
        if (typeof dataSourceCollection === 'undefined') {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);
        this._dataSourceCollection = dataSourceCollection;

        /**
         * Gets or sets the currently loaded data sources.  This property is observable.
         *
         * @type Array
         */
        this.dataSources = [];

        /**
         * Gets or sets the tooltip for the "add data source" button.  This property is observable.
         *
         * @type String
         */
        this.addDataSourceTooltip = 'Add Data Source';

        /**
         * Gets or sets whether the "add data source" panel is visible.  This property is observable.
         *
         * @type Boolean
         */
        this.addDataSourceVisible = false;

        this.addDataSourcePanels = defaultValue(addDataSourcePanels, DataSourceBrowserViewModel.defaultAddDataSourcePanels).slice(0);

        this.activeAddDataSourcePanel = undefined;

        knockout.track(this, ['dataSources', 'addDataSourceTooltip', 'addDataSourceVisible', 'addDataSourcePanels', 'activeAddDataSourcePanel']);

        var that = this;

        this._addDataSourceCommand = createCommand(function() {
            that.addDataSourceVisible = true;
            that.activeAddDataSourcePanel = undefined;
        });

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

    DataSourceBrowserViewModel.defaultAddDataSourcePanels = [AddCzmlDataSourcePanel];

    defineProperties(DataSourceBrowserViewModel.prototype, {
        /**
         * Gets the Command that is executed when the "add data source" button is clicked.
         * @memberof DataSourceBrowserViewModel.prototype
         *
         * @type {Command}
         */
        addDataSourceCommand : {
            get : function() {
                return this._addDataSourceCommand;
            }
        },

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