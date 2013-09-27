/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defined,
        defineProperties,
        DeveloperError,
        EventHelper,
        knockout) {
    "use strict";

    var DataSourceViewModel = function(name, rootViewModel, dataSource) {
        if (!defined(rootViewModel)) {
            throw new DeveloperError('rootViewModel is required.');
        }
        if (!defined(dataSource)) {
            throw new DeveloperError('dataSource is required.');
        }

        this._rootViewModel = rootViewModel;
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

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return that.children.length > 0;
        });

        this.isSelected = undefined;
        knockout.defineProperty(this, 'isSelected', function() {
            return that._rootViewModel.selectedItem === that;
        });

        this.isFilteredOut = undefined;
        knockout.defineProperty(this, 'isFilteredOut', function() {
            var rootViewModel = that._rootViewModel;
            if (rootViewModel.searchText.length < 1) {
                // No filtering in progress, nothing filtered out.
                return false;
            }

            // If any child is visible, we must be visible.
            var len = that.children.length;
            for ( var i = 0; i < len; ++i) {
                var kidFilteredOut = that.children[i].isFilteredOut;
                if (!kidFilteredOut) {
                    return false;
                }
            }

            // No visible kids, return actual match against filter.
            return that.name.toLowerCase().indexOf(rootViewModel.searchText.toLowerCase()) < 0;
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
            return that._rootViewModel.clockTrackedDataSource === that._dataSource;
        });

        /**
         * True if this is the only data source loaded.
         * @type {Boolean}
         */
        this.isSoleSource = undefined;
        knockout.defineProperty(this, 'isSoleSource', function() {
            var rootViewModel = that._rootViewModel;
            return rootViewModel.dataSourcesLength === 1 && rootViewModel.dataSources.get(0) === that._dataSource;
        });
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
        rootViewModel : {
            get : function() {
                return this._rootViewModel;
            }
        }
    });

    DataSourceViewModel.prototype.select = function() {
        this._rootViewModel.selectedItem = this;
    };

    DataSourceViewModel.prototype.trackClock = function() {
        this._rootViewModel.clockTrackedDataSource = this._dataSource;
    };

    DataSourceViewModel.prototype.toggleExpanded = function() {
        this.expanded = !this.expanded;
    };

    DataSourceViewModel.prototype.remove = function() {
        this._rootViewModel.dataSources.remove(this._dataSource);
    };

    DataSourceViewModel.prototype.destroy = function() {
        this._eventHelper.removeAll();
        if (typeof this._dataSource.destroy === 'function') {
            this._dataSource.destroy();
        }
    };

    return DataSourceViewModel;
});