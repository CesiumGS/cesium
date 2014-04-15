/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        knockout) {
    "use strict";

    var DataSourceItemViewModel = function(name, rootViewModel, dataSource, dynamicObject) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rootViewModel)) {
            throw new DeveloperError('rootViewModel is required.');
        }
        if (!defined(dataSource)) {
            throw new DeveloperError('dataSource is required.');
        }
        //>>includeEnd('debug');

        this._dataSource = dataSource;
        this._rootViewModel = rootViewModel;
        this._dynamicObject = dynamicObject;

        this.id = 'cesium-dataSourceBrowser-node-' + createGuid();
        this.name = name;
        this.children = [];
        this.expanded = false;
        this._uiShow = dynamicObject.uiShow;

        knockout.track(this, ['name', 'children', 'expanded', '_uiShow']);

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

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return this.children.length > 0;
        });

        this.isSelected = undefined;
        knockout.defineProperty(this, 'isSelected', function() {
            return rootViewModel.selectedViewModel === this;
        });

        this.uiShow = undefined;
        knockout.defineProperty(this, 'uiShow', {
            get : function() {
                return this._uiShow;
            },
            set : function(newValue) {
                this.dynamicObject.uiShow = newValue;
                this._uiShow = newValue;
                var len = this.children.length;
                for (var i = 0; i < len; ++i) {
                    this.children[i].uiShow = newValue;
                }
            }
        });

        this.isFilteredOut = undefined;
        knockout.defineProperty(this, 'isFilteredOut', function() {
            return rootViewModel.isNodeFiltered(this);
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

    //TODO What happens when we double click on an item not being displayed?
    //Or not available at the current time?
    DataSourceItemViewModel.prototype.doubleClick = function() {
        this._rootViewModel.onObjectDoubleClick.raiseEvent(this._dynamicObject);
    };

    DataSourceItemViewModel.prototype.select = function() {
        this._rootViewModel.selectedViewModel = this;
    };

    DataSourceItemViewModel.prototype.toggleExpanded = function() {
        this.expanded = !this.expanded;
    };

    return DataSourceItemViewModel;
});