/*global define*/
define([
        '../../Core/createGuid',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        knockout) {
    "use strict";

    var DataSourceViewModel = function(name, rootViewModel, dynamicObject) {
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
    };

    DataSourceViewModel.prototype.select = function() {
        this.rootViewModel.selectedItem = this;
    };

    return DataSourceViewModel;
});