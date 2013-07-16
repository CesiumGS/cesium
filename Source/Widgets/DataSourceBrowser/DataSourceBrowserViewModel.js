/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../createCommand',
        './DataSourceViewModel',
        './DataSourcePanelViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createCommand,
        DataSourceViewModel,
        DataSourcePanelViewModel,
        knockout) {
    "use strict";

    /**
     * The view model for {@link DataSourceBrowser}.
     * @alias DataSourceBrowserViewModel
     * @constructor
     *
     * @param {DataSourceCollection} dataSourceCollection The data source collection to use.
     * @param {Array} [dataSourcePanels=DataSourcePanelViewModel.defaultDataSourcePanels] An array of panels that will be presented as options when adding a data source.
     *
     * @exception {DeveloperError} dataSourceCollection is required.
     */
    var DataSourceBrowserViewModel = function(dataSourceCollection, dataSourcePanels) {
        if (!defined(dataSourceCollection)) {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        var that = this;

        dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);
        this._dataSourceCollection = dataSourceCollection;

        this._dataSourcePanelViewModel = new DataSourcePanelViewModel(this, dataSourcePanels);
        this._onObjectSelected = new Event();

        this._addDataSourceCommand = createCommand(function() {
            that._dataSourcePanelViewModel.activeDataSourcePanel = undefined;
            that._dataSourcePanelViewModel.visible = true;
        });

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

        knockout.track(this, ['dataSources', 'addDataSourceTooltip']);

        this.selectedItem = undefined;
        var selectedViewModel = knockout.observable();
        knockout.defineProperty(this, 'selectedItem', {
            get : function() {
                return selectedViewModel();
            },
            set : function(value) {
                selectedViewModel(value);
                if (defined(value) && defined(value.dynamicObject)) {
                    that._onObjectSelected.raiseEvent(value.dynamicObject);
                }
            }
        });
    };

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
         * Gets the view model for the data source panel.
         * @memberof DataSourceBrowserViewModel.prototype
         *
         * @type {DataSourcePanelViewModel}
         */
        dataSourcePanelViewModel : {
            get : function() {
                return this._dataSourcePanelViewModel;
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