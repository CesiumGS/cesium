/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defined,
        defineProperties,
        DeveloperError,
        knockout) {
    "use strict";

    var DataSourceItemViewModel = function(name, rootViewModel, dataSource, dynamicObject) {
        if (!defined(rootViewModel)) {
            throw new DeveloperError('rootViewModel is required.');
        }
        if (!defined(dataSource)) {
            throw new DeveloperError('dataSource is required.');
        }

        var that = this;

        this._dataSource = dataSource;
        this._rootViewModel = rootViewModel;
        this._dynamicObject = dynamicObject;

        this.id = 'cesium-dataSourceBrowser-node-' + createGuid();
        this.name = name;
        this.children = [];
        this.expanded = false;

        knockout.track(this, ['name', 'children', 'expanded']);

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return that.children.length > 0;
        });

        this.isSelected = undefined;
        knockout.defineProperty(this, 'isSelected', function() {
            return rootViewModel.selectedItem === that;
        });

        this.isFilteredOut = undefined;
        knockout.defineProperty(this, 'isFilteredOut', function() {
            return rootViewModel.isNodeFiltered(that);
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
    };

    defineProperties(DataSourceItemViewModel.prototype, {
        /**
         * Gets the {@link DataSource} that contains this item.
         * @memberof DataSourceItemViewModel.prototype
         * @type {DataSource}
         */
        dataSource : {
            get : function() {
                return this._dataSource;
            }
        },

        /**
         * Gets the root view model for this view model.
         * @memberof DataSourceItemViewModel.prototype
         * @type {DataSourceBrowserViewModel}
         */
        rootViewModel : {
            get : function() {
                return this._rootViewModel;
            }
        },

        /**
         * Gets the {@link DynamicObject} for this item.
         * @memberof DataSourceItemViewModel.prototype
         * @type {DynamicObject}
         */
        dynamicObject : {
            get : function() {
                return this._dynamicObject;
            }
        }
    });

    DataSourceItemViewModel.prototype.doubleClick = function(){
        this._rootViewModel.onObjectDoubleClick.raiseEvent(this._dynamicObject);
    };

    DataSourceItemViewModel.prototype.select = function() {
        this._rootViewModel.selectedItem = this;
    };

    DataSourceItemViewModel.prototype.toggleExpanded = function() {
        this.expanded = !this.expanded;
    };

    return DataSourceItemViewModel;
});