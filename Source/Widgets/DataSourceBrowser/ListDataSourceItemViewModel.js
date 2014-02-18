/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defineProperties',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defineProperties,
        knockout) {
    "use strict";

    var ListDataSourceItemViewModel = function(name, rootViewModel, description, url, format) {
        this.rootViewModel = rootViewModel;

        this.id = 'cesium-dataSourceBrowser-listNode-' + createGuid();
        this.name = name;
        this.description = description;
        this.url = url;
        this.format = format;
        this.children = [];
        this.expanded = false;

        knockout.track(this, ['name', 'description', 'url', 'format', 'children', 'expanded']);

        this.hasChildren = undefined;
        knockout.defineProperty(this, 'hasChildren', function() {
            return this.children.length > 0;
        });

        this.isSelected = undefined;
        knockout.defineProperty(this, 'isSelected', function() {
            return rootViewModel.selectedItem === this;
        });
    };

    defineProperties(ListDataSourceItemViewModel.prototype, {
        /**
         * Gets an HTML arrow indicating expand status.
         * @memberof DataSourceBrowserViewModel.prototype
         * @type {string}
         */
        expandIndicator : {
            get : function() {
                return this.expanded ? '&#9660;' : '&#9658;';
            }
        }
    });

    ListDataSourceItemViewModel.prototype.select = function() {
        this.rootViewModel.selectedItem = this;
    };

    ListDataSourceItemViewModel.prototype.toggleExpanded = function() {
        this.expanded = !this.expanded;
    };

    return ListDataSourceItemViewModel;
});