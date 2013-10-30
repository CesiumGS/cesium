/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defined,
        defineProperties,
        DeveloperError,
        EventHelper,
        createCommand,
        knockout) {
    "use strict";

    var DataSourceViewModel = function(name, dataSourceBrowserViewModel, dataSource) {
        if (!defined(dataSourceBrowserViewModel)) {
            throw new DeveloperError('dataSourceBrowserViewModel is required.');
        }
        if (!defined(dataSource)) {
            throw new DeveloperError('dataSource is required.');
        }

        this._dataSourceBrowserViewModel = dataSourceBrowserViewModel;
        this._dataSource = dataSource;

        this.id = 'cesium-dataSourceBrowser-node-' + createGuid();

        /**
         * Gets or sets the name of this data source.  This property is observable.
         * @type {String}
         */
        this.name = name;
        this.children = [];
        this.expanded = false;
        this._isLoading = false;

        knockout.track(this, ['name', 'children', 'expanded', '_isLoading']);

        var that = this;

        this._eventHelper = new EventHelper();
        this._eventHelper.add(dataSource.getLoadingEvent(), function(isLoading) {
            that._isLoading = isLoading;
        });

        /**
         * Gets whether the data source is currently loading.  This property is observable.
         * @type {Boolean}
         */
        this.isLoading = undefined;
        knockout.defineProperty(this, 'isLoading', function() {
            return that._isLoading;
        });

        this.displayName = undefined;
        knockout.defineProperty(this, 'displayName', function() {
            return that.name.replace(/\//g, '/\u200b');
        });

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return that.children.length > 0;
        });

        this.isSelected = undefined;
        knockout.defineProperty(this, 'isSelected', function() {
            return that._dataSourceBrowserViewModel.selectedItem === that;
        });

        this.isFilteredOut = undefined;
        knockout.defineProperty(this, 'isFilteredOut', function() {
            return dataSourceBrowserViewModel.isNodeFiltered(that);
        });

        knockout.getObservable(this, 'isFilteredOut').extend({
            throttle : 10
        });

        /**
         * Gets an HTML arrow indicating expand status.
         * @type {String}
         */
        this.expandIndicator = undefined;
        knockout.defineProperty(this, 'expandIndicator', function() {
            return that.expanded ? '&#9660;' : '&#9658;';
        });

        /**
         * True if the clock icon is selected.
         * @type {Boolean}
         */
        this.clockTracking = undefined;
        knockout.defineProperty(this, 'clockTracking', function() {
            return that._dataSourceBrowserViewModel.clockTrackedDataSource === that._dataSource;
        });

        /**
         * True if this is the only data source loaded.
         * @type {Boolean}
         */
        this.isSoleSource = undefined;
        knockout.defineProperty(this, 'isSoleSource', function() {
            var dataSourceBrowserViewModel = that._dataSourceBrowserViewModel;
            return dataSourceBrowserViewModel.dataSourcesLength === 1 && dataSourceBrowserViewModel.dataSources.get(0) === that._dataSource;
        });

        /**
         * True if this data source is being configured.
         * @type {Boolean}
         */
        this.isConfiguring = undefined;
        knockout.defineProperty(this, 'isConfiguring', function() {
            var dataSourceConfigurationPanelViewModel = that._dataSourceBrowserViewModel.dataSourceConfigurationPanelViewModel;
            return defined(that._dataSource.getConfigurationPanel) &&
                   dataSourceConfigurationPanelViewModel.visible &&
                   dataSourceConfigurationPanelViewModel.activeDataSourceConfigurationPanel === that._dataSource.getConfigurationPanel();
        });

        this._trackClock = createCommand(function() {
            that._dataSourceBrowserViewModel.clockTrackedDataSource = that._dataSource;
        });

        this._toggleExpanded = createCommand(function() {
            that.expanded = !that.expanded;
        });

        this._select = createCommand(function() {
            that._dataSourceBrowserViewModel.selectedItem = that;
        });

        this._remove = createCommand(function() {
            that._dataSourceBrowserViewModel.dataSources.remove(that._dataSource);
        });

        this._configure = createCommand(function() {
            var dataSourceConfigurationPanelViewModel = that._dataSourceBrowserViewModel.dataSourceConfigurationPanelViewModel;
            dataSourceConfigurationPanelViewModel.visible = true;
            dataSourceConfigurationPanelViewModel.activeDataSourceConfigurationPanel = that._dataSource.getConfigurationPanel();
        }, defined(that._dataSource.getConfigurationPanel));
    };

    defineProperties(DataSourceViewModel.prototype, {
        /**
         * Gets the {@link DataSource} that this view model represents.
         * @memberof DataSourceViewModel.prototype
         * @type {DataSource}
         */
        dataSource : {
            get : function() {
                return this._dataSource;
            }
        },

        /**
         * Gets the root view model for this view model.
         * @memberof DataSourceViewModel.prototype
         * @type {DataSourceBrowserViewModel}
         */
        dataSourceBrowserViewModel : {
            get : function() {
                return this._dataSourceBrowserViewModel;
            }
        },

        trackClock : {
            get : function() {
                return this._trackClock;
            }
        },

        toggleExpanded : {
            get : function() {
                return this._toggleExpanded;
            }
        },

        select : {
            get : function() {
                return this._select;
            }
        },

        remove : {
            get : function() {
                return this._remove;
            }
        },

        configure : {
            get : function() {
                return this._configure;
            }
        }
    });

    DataSourceViewModel.prototype.destroy = function() {
        this._eventHelper.removeAll();
        if (typeof this._dataSource.destroy === 'function') {
            this._dataSource.destroy();
        }
    };

    return DataSourceViewModel;
});