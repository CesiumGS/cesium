/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        EventHelper,
        createCommand,
        knockout) {
    "use strict";

    var DataSourceViewModel = function(dataSourceBrowserViewModel, dataSource) {
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
        this.name = dataSource.getName();
        this.children = [];
        this.expanded = true;
        this._isLoading = false;
        this._uiShow = true;

        knockout.track(this, ['name', 'children', 'expanded', '_isLoading', '_uiShow']);

        /**
         * Gets whether the data source is currently loading.  This property is observable.
         * @type {Boolean}
         */
        this.isLoading = undefined;
        knockout.defineProperty(this, 'isLoading', function() {
            return this._isLoading;
        });

        this.displayName = undefined;
        knockout.defineProperty(this, 'displayName', function() {
            var name = defaultValue(this.name, '');
            // allow break after slash
            name = name.replace(/\//g, '/\u200b');
            // replace empty string with non-breaking space
            if (name === '') {
                name = '\xA0';
            }
            return name;
        });

        this.uiShow = undefined;
        knockout.defineProperty(this, 'uiShow', {
            get : function() {
                return this._uiShow;
            },
            set : function(newValue) {
                this._uiShow = newValue;
                var len = this.children.length;
                for (var i = 0; i < len; ++i) {
                    this.children[i].uiShow = newValue;
                }
            }
        });

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return this.children.length > 0;
        });

        this.isSelected = undefined;
        knockout.defineProperty(this, 'isSelected', function() {
            return this._dataSourceBrowserViewModel.selectedViewModel === this;
        });

        this.isFilteredOut = undefined;
        knockout.defineProperty(this, 'isFilteredOut', function() {
            return dataSourceBrowserViewModel.isNodeFiltered(this);
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
            return this.expanded ? '&#9660;' : '&#9658;';
        });

        /**
         * True if the clock icon is selected.
         * @type {Boolean}
         */
        this.clockTracking = undefined;
        knockout.defineProperty(this, 'clockTracking', function() {
            return this._dataSourceBrowserViewModel.clockTrackedDataSource === this._dataSource;
        });

        /**
         * True if this is the only data source loaded.
         * @type {Boolean}
         */
        this.isSoleSource = undefined;
        knockout.defineProperty(this, 'isSoleSource', function() {
            var dataSourceBrowserViewModel = this._dataSourceBrowserViewModel;
            return dataSourceBrowserViewModel.dataSourcesLength === 1 && dataSourceBrowserViewModel.dataSources.get(0) === this._dataSource;
        });

        /**
         * True if this data source is being configured.
         * @type {Boolean}
         */
        this.isConfiguring = undefined;
        knockout.defineProperty(this, 'isConfiguring', function() {
            var dataSourceConfigurationPanelViewModel = this._dataSourceBrowserViewModel.dataSourceConfigurationPanelViewModel;
            return defined(this._dataSource.getConfigurationPanel) &&
                   dataSourceConfigurationPanelViewModel.visible &&
                   dataSourceConfigurationPanelViewModel.activeDataSourceConfigurationPanel === this._dataSource.getConfigurationPanel();
        });

        var that = this;
        this._eventHelper = new EventHelper();
        this._eventHelper.add(dataSource.getLoadingEvent(), function(isLoading) {
            that._isLoading = isLoading;
        });
        this._eventHelper.add(dataSource.getChangedEvent(), function(dataSource) {
            that.name = dataSource.getName();
        });

        this._trackClock = createCommand(function() {
            that._dataSourceBrowserViewModel.clockTrackedDataSource = that._dataSource;
        });

        this._toggleExpanded = createCommand(function() {
            that.expanded = !that.expanded;
        });

        this._select = createCommand(function() {
            that._dataSourceBrowserViewModel.selectedViewModel = that;
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