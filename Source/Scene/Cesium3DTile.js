/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Rectangle',
        './Cesium3DTileContentProvider',
        './TileBoundingBox',
        '../ThirdParty/when'
    ], function(
        BoundingSphere,
        defined,
        destroyObject,
        Rectangle,
        Cesium3DTileContentProvider,
        TileBoundingBox,
        when) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTile = function(baseUrl, tile, parent) {
// TODO: Need to use minimumHeight and maximumHeight to get the correct sphere
        var b = tile.box;
        var rectangle = new Rectangle(b.west, b.south, b.east, b.north);

        this._tileBoundingBox = new TileBoundingBox({
            rectangle : rectangle,
            minimumHeight : b.minimumHeight,
            maximumHeight : b.maximumHeight
        });

        /**
         * @readonly
         */
        this.boundingSphere = BoundingSphere.fromRectangle3D(rectangle);

        var rs;
        if (defined(tile.renderBox)) {
            // Non-leaf tiles may have a render-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            var rb = tile.renderBox;
            rs = BoundingSphere.fromRectangle3D(new Rectangle(rb.west, rb.south, rb.east, rb.north));
//TODO: Need to use minimumHeight and maximumHeight to get the correct sphere
        }

        /**
         * @readonly
         */
        this.renderBoundingSphere = rs;

        /**
         * @readonly
         */
        this.geometricError = tile.geometricError;

        /**
         * @type {Array}
         */
        this.children = [];

        /**
         * @readonly
         */
        this.parent = parent;

        /**
         * @readonly
         */
        this.numberOfChildrenWithoutContent = tile.children.length;

        this.processingPromise = when.defer();
        this.readyPromise = when.defer();

// TODO: how to know which content provider to use, e.g., a property in tree.json
// TODO: contents may come from a different server than tree.json
        var content = new Cesium3DTileContentProvider(baseUrl + tile.url);
        this._content = content;

        var that = this;

        // Content enters the PROCESSING state
        when(content.processingPromise).then(function(content) {
            that.processingPromise.resolve(that);
        }).otherwise(function(error) {
            that.processingPromise.reject(error);
        });

        // Content enters the READY state
        when(content.readyPromise).then(function(content) {
            if (defined(that.parent)) {
                --that.parent.numberOfChildrenWithoutContent;
            }

            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.readyPromise.reject(error);
// TODO: that.parent.numberOfChildrenWithoutContent will never reach zero and therefore that.parent will never refine
        });

        // Members that are updated every frame for rendering optimizations
        this.distanceToCamera = 0;
        this.parentFullyVisible = false;
    };

    Cesium3DTile.prototype.request = function() {
        return this._content.request();
    };

    Cesium3DTile.prototype.distanceToTile = function(frameState) {
        return this._tileBoundingBox.distanceToCamera(frameState);
    };

    Cesium3DTile.prototype.update = function(context, frameState, commandList) {
        this._content.update(context, frameState, commandList);
    };

    Cesium3DTile.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTile.prototype.destroy = function() {
        this._content = this._content && this._content.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});