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
        this._onClockSelected = new Event();
        this._maxHeight = 500;

        this._addDataSourceCommand = createCommand(function() {
            that._dataSourcePanelViewModel.visible = true;
        });

        this.dataSourceViewModels = [];

        /**
         * Gets or sets the tooltip for the "add data source" button.  This property is observable.
         *
         * @type String
         */
        this.addDataSourceTooltip = 'Add Data Source';

        /**
         * Gets or sets the visibility of the Data Source Browser panel.  This can be hidden and revealed
         * by the user with a button.
         *
         * @type Boolean
         */
        this.visible = true;

        this._dataSourceViewModels = [];
        this._dataSourcesLength = 0;

        knockout.track(this, ['dataSourceViewModels', 'addDataSourceTooltip', '_dataSourceViewModels',
                              '_maxHeight', 'visible', '_dataSourcesLength']);

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

        this.clockTrackedDataSource = undefined;
        var clockTrackViewModel = knockout.observable();
        knockout.defineProperty(this, 'clockTrackedDataSource', {
            get : function() {
                return clockTrackViewModel();
            },
            set : function(value) {
                clockTrackViewModel(value);
                if (defined(value)) {
                    that._onClockSelected.raiseEvent(value);
                }
            }
        });

        /**
         * Gets the view models for the currently loaded data sources.  This property is observable.
         *
         * @type Array
         */
        this.dataSourceViewModels = undefined;
        knockout.defineProperty(this, 'dataSourceViewModels', function() {
            return that._dataSourceViewModels;
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
        },

        /**
         * Gets an event that will be raised when a data source's clock icon is selected.
         * @memberof DataSourceBrowserViewModel.prototype
         *
         * @type {Event}
         */
        onClockSelected : {
            get : function() {
                return this._onClockSelected;
            }
        },

        /**
         * Gets the set of {@link DataSource} instances to be visualized.
         * @memberof DataSourceBrowserViewModel.prototype
         * @type {DataSourceCollection}
         */
        dataSources : {
            get : function() {
                return this._dataSourceCollection;
            }
        },

        /**
         * Gets the number of data sources.  This is an observable copy of dataSources.getLength().
         * @memberof DataSourceBrowserViewModel.prototype
         * @type {Number}
         */
        dataSourcesLength : {
            get : function() {
                return this._dataSourcesLength;
            }
        },

        /**
         * Gets or sets the maximum height of the widget in pixels.
         * @memberof DataSourceBrowserViewModel.prototype
         * @type {Number}
         */
        maxHeight : {
            get : function() {
                return this._maxHeight;
            },
            set : function(value) {
                this._maxHeight = value;
            }
        },

        /**
         * Gets a message if there are no data sources.
         * @memberof DataSourceBrowserViewModel.prototype
         * @type {string}
         */
        infoText : {
            get : function() {
                return this._dataSourceViewModels.length ? '' : 'Empty globe.';
            }
        }
    });

    /**
     * Gets the maximum height of panels within the widget, minus an offset, in CSS-ready form.
     * @param {Number} offset The offset in pixels.
     * @memberof DataSourceBrowserViewModel.prototype
     * @returns {String}
     */
    DataSourceBrowserViewModel.prototype.maxHeightOffset = function(offset) {
        return (this._maxHeight - offset).toString() + 'px';
    };

    /**
     * Toggle visibility
     * @memberof DataSourceBrowserViewModel.prototype
     */
    DataSourceBrowserViewModel.prototype.toggleVisibility = function() {
        this.visible = !this.visible;
    };

    DataSourceBrowserViewModel.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var dataSourceViewModel = new DataSourceViewModel(dataSource.getName(), this, dataSource);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        var objects = dynamicObjectCollection.getObjects();
        for ( var i = 0, len = objects.length; i < len; ++i) {
            var object = objects[i];
            if (defined(object.position)) {
                var name = object.id;
                if (defined(object.label) && defined(object.label.text)) {
                    // TODO: Check if text is a ConstantProperty.
                    name = object.label.text.getValue(0);
                } else if (object.id.substring(0, 16) === '/Application/STK') {
                    name = object.id.substring(object.id.lastIndexOf('/') + 1);
                }
                var dynamicObjectViewModel = new DataSourceViewModel(name, this, dataSource, object);
                dataSourceViewModel.children.push(dynamicObjectViewModel);
            }
        }

        this._dataSourceViewModels.push(dataSourceViewModel);
        this._dataSourcesLength = this.dataSources.getLength();
        this.clockTrackedDataSource = dataSource;
    };

    DataSourceBrowserViewModel.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        var dataSourceViewModels = this._dataSourceViewModels;
        for ( var i = 0, len = dataSourceViewModels.length; i < len; ++i) {
            var dataSourceViewModel = dataSourceViewModels[i];
            if (dataSourceViewModel.dataSource === dataSource) {
                dataSourceViewModels.splice(i, 1);
                this._dataSourcesLength = this.dataSources.getLength();
                return;
            }
        }
    };

    return DataSourceBrowserViewModel;
});