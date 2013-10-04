/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../createCommand',
        './DataSourceViewModel',
        './DataSourceItemViewModel',
        './DataSourcePanelViewModel',
        './DataSourceConfigurationPanelViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        EventHelper,
        createCommand,
        DataSourceViewModel,
        DataSourceItemViewModel,
        DataSourcePanelViewModel,
        DataSourceConfigurationPanelViewModel,
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

        this._dataSourceCollection = dataSourceCollection;

        this._eventHelper = new EventHelper();
        this._eventHelper.add(dataSourceCollection.dataSourceAdded, this._onDataSourceAdded, this);
        this._eventHelper.add(dataSourceCollection.dataSourceRemoved, this._onDataSourceRemoved, this);

        this._dynamicObjectCollectionChangedListeners = {};
        this._dataSourceViewModelHash = {};

        this._dataSourcePanelViewModel = new DataSourcePanelViewModel(this, dataSourcePanels);
        this._dataSourceConfigurationPanelViewModel = new DataSourceConfigurationPanelViewModel(this);
        this._onObjectSelected = new Event();
        this._onObjectDoubleClick = new Event();
        this._onClockSelected = new Event();

        var that = this;

        this._addDataSourceCommand = createCommand(function() {
            that._dataSourcePanelViewModel.visible = true;
        });

        this.dataSourceViewModels = [];

        /**
         * Gets or sets the maximum height of the widget in pixels.  This property is observable.
         * @type {Number}
         */
        this.maxHeight = 500;

        /**
         * Gets or sets the tooltip for the "add data source" button.  This property is observable.
         *
         * @type String
         */
        this.addDataSourceTooltip = 'Add Data Source';

        /**
         * Gets or sets the user search/filter text.  This property is observable.
         *
         * @type String
         */
        this.searchText = '';

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
                              'maxHeight', 'visible', '_dataSourcesLength', 'searchText']);

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

        /**
         * Gets he current search text as a regular expression.
         *
         * @type String
         */
        knockout.defineProperty(this, 'searchTextRegex', {
            get : function() {
                if (defined(this.searchText)) {
                    return new RegExp(this.searchText, 'i');
                }
                return undefined;
            }
        });
        knockout.getObservable(this, 'searchTextRegex').extend({
            throttle : 10
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

        /**
         * Gets the number of data sources.  This property is observable.
         * @type {Number}
         */
        this.dataSourcesLength = undefined;
        knockout.defineProperty(this, 'dataSourcesLength', function() {
            return this._dataSourcesLength;
        });

        /**
         * Gets a message if there are no data sources.  This property is observable.
         * @type {String}
         */
        this.infoText = undefined;
        knockout.defineProperty(this, 'infoText', function() {
            return this._dataSourceViewModels.length > 0 ? '' : 'Empty globe.';
        });

        for ( var i = 0, len = dataSourceCollection.getLength(); i < len; i++) {
            this._onDataSourceAdded(dataSourceCollection, dataSourceCollection.get(i));
        }
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
         * Gets the view model for the data source panel.
         * @memberof DataSourceBrowserViewModel.prototype
         *
         * @type {dataSourceConfigurationPanelViewModel}
         */
        dataSourceConfigurationPanelViewModel : {
            get : function() {
                return this._dataSourceConfigurationPanelViewModel;
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

        onObjectDoubleClick : {
            get : function() {
                return this._onObjectDoubleClick;
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
        }
    });

    DataSourceBrowserViewModel.prototype.isNodeFiltered = function(node) {
        var regex = this.searchTextRegex;
        if (!defined(regex)) {
            return false;
        }

        // If any child is visible, we must be visible.
        var len = node.children.length;
        for ( var i = 0; i < len; ++i) {
            var kidFilteredOut = node.children[i].isFilteredOut;
            if (!kidFilteredOut) {
                return false;
            }
        }

        // No visible kids, return actual match against filter.
        return !regex.test(node.name);
    };

    /**
     * Gets the maximum height of panels within the widget, minus an offset, in CSS-ready form.
     * @param {Number} offset The offset in pixels.
     * @memberof DataSourceBrowserViewModel.prototype
     * @returns {String}
     */
    DataSourceBrowserViewModel.prototype.maxHeightOffset = function(offset) {
        return (this.maxHeight - offset).toString() + 'px';
    };

    /**
     * Toggle visibility
     * @memberof DataSourceBrowserViewModel.prototype
     */
    DataSourceBrowserViewModel.prototype.toggleVisibility = function() {
        this.visible = !this.visible;
    };

    DataSourceBrowserViewModel.prototype.destroy = function() {
        this._eventHelper.removeAll();
    };

    function insertIntoTree(browserViewModel, rootViewModel, object, dataSourceViewModelHash, dataSource) {
        var id = object.id;
        var dynamicObjectViewModel = dataSourceViewModelHash[id];
        if (defined(dynamicObjectViewModel)) {
            // already exists
            return dynamicObjectViewModel;
        }

        var name = defaultValue(object.name, id);
        dynamicObjectViewModel = new DataSourceItemViewModel(name, browserViewModel, dataSource, object);
        dataSourceViewModelHash[id] = dynamicObjectViewModel;

        var parent = object.parent;
        if (defined(parent)) {
            var parentViewModel = insertIntoTree(browserViewModel, rootViewModel, parent, dataSourceViewModelHash, dataSource);
            parentViewModel.children.push(dynamicObjectViewModel);
        } else {
            rootViewModel.children.push(dynamicObjectViewModel);
        }

        return dynamicObjectViewModel;
    }

    function removeFromTree(rootViewModel, object, dataSourceViewModelHash) {
        var id = object.id;
        var dynamicObjectViewModel = dataSourceViewModelHash[id];
        if (!defined(dynamicObjectViewModel)) {
            // doesn't exist
            return;
        }

        var parent = object.parent;
        if (defined(parent)) {
            var parentViewModel = dataSourceViewModelHash[parent.id];
            if (defined(parentViewModel)) {
                parentViewModel.children.remove(dynamicObjectViewModel);
            }
        } else {
            rootViewModel.children.remove(dynamicObjectViewModel);
        }
        dataSourceViewModelHash[id] = undefined;
    }

    DataSourceBrowserViewModel.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var dataSourceViewModel = new DataSourceViewModel(dataSource.getName(), this, dataSource);
        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        var dynamicObjectCollectionId = dynamicObjectCollection.id;

        var dataSourceViewModelHash = this._dataSourceViewModelHash[dynamicObjectCollectionId];
        if (!defined(dataSourceViewModelHash)) {
            dataSourceViewModelHash = this._dataSourceViewModelHash[dynamicObjectCollectionId] = {};
        }

        var that = this;

        function onCollectionChanged(collection, added, removed) {
            var i;
            var len;
            for (i = 0, len = added.length; i < len; ++i) {
                insertIntoTree(that, dataSourceViewModel, added[i], dataSourceViewModelHash, dataSource);
            }
            for (i = 0, len = removed.length; i < len; ++i) {
                removeFromTree(dataSourceViewModel, removed[i], dataSourceViewModelHash);
            }
        }

        // add existing
        onCollectionChanged(dynamicObjectCollection, dynamicObjectCollection.getObjects(), []);

        var removalFunc = dynamicObjectCollection.collectionChanged.addEventListener(onCollectionChanged, this);
        this._dynamicObjectCollectionChangedListeners[dynamicObjectCollectionId] = removalFunc;

        this._dataSourceViewModels.push(dataSourceViewModel);
        this._dataSourcesLength = this.dataSources.getLength();
        this.clockTrackedDataSource = dataSource;
    };

    DataSourceBrowserViewModel.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        var dataSourceViewModels = this._dataSourceViewModels;
        for ( var i = 0, len = dataSourceViewModels.length; i < len; ++i) {
            var dataSourceViewModel = dataSourceViewModels[i];
            if (dataSourceViewModel.dataSource === dataSource) {
                // unsubscribe from collectionChanged
                var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
                var dynamicObjectCollectionId = dynamicObjectCollection.id;
                this._dynamicObjectCollectionChangedListeners[dynamicObjectCollectionId]();
                this._dynamicObjectCollectionChangedListeners[dynamicObjectCollectionId] = undefined;

                dataSourceViewModels.splice(i, 1);
                dataSourceViewModel.destroy();

                this._dataSourcesLength = this.dataSources.getLength();

                return;
            }
        }
    };

    return DataSourceBrowserViewModel;
});