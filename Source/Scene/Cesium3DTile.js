/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Intersect',
        '../Core/Rectangle',
        './Cesium3DTileContentProvider',
        './Cesium3DTileContentState',
        './TileBoundingBox',
        '../ThirdParty/when'
    ], function(
        BoundingSphere,
        defined,
        defineProperties,
        destroyObject,
        Intersect,
        Rectangle,
        Cesium3DTileContentProvider,
        Cesium3DTileContentState,
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
        this._boundingSphere = BoundingSphere.fromRectangle3D(rectangle);

        var rs;
        if (defined(tile.contentsBox)) {
            // Non-leaf tiles may have a render-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            var cb = tile.contentsBox;
            rs = BoundingSphere.fromRectangle3D(new Rectangle(cb.west, cb.south, cb.east, cb.north));
//TODO: Need to use minimumHeight and maximumHeight to get the correct sphere
        }

        this._contentsBoundingSphere = rs;

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

        /**
         * @type {Promise}
         * @readonly
         */
        this.readyPromise = when.defer();

// TODO: how to know which content provider to use, e.g., a property in tree.json
// TODO: contents may come from a different server than tree.json
        var content = new Cesium3DTileContentProvider(baseUrl + tile.url);
        this._content = content;

        var that = this;

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

    defineProperties(Cesium3DTile.prototype, {
        /**
         * @type {Promise}
         * @readonly
         */
        processingPromise : {
            get : function() {
                return this._content.processingPromise;
            }
        }
    });

    Cesium3DTile.prototype.isReady = function() {
        return this._content.state === Cesium3DTileContentState.READY;
    };

    Cesium3DTile.prototype.isContentUnloaded = function() {
        return this._content.state === Cesium3DTileContentState.UNLOADED;
    };

    Cesium3DTile.prototype.requestContent = function() {
        this._content.request();
    };

    Cesium3DTile.prototype.visibility = function(cullingVolume) {
       // TODO: some 3D tiles would benefit from horizon culling (like global vector data), but
       // more local 3D tiles, like cities and point clouds, will not.
        return cullingVolume.computeVisibility(this._boundingSphere);
    };

    Cesium3DTile.prototype.contentsVisibility = function(cullingVolume) {
        if (!defined(this._contentsBoundingSphere)) {
            return Intersect.INSIDE;
        }

        return cullingVolume.computeVisibility(this._contentsBoundingSphere);
    };

    Cesium3DTile.prototype.distanceToTile = function(frameState) {
        return this._tileBoundingBox.distanceToCamera(frameState);
    };

    Cesium3DTile.prototype.update = function(context, frameState, commandList) {
        this._content.update(context, frameState, commandList);
    };

    var scratchCommandList = [];

    Cesium3DTile.prototype.process = function(context, frameState) {
        this._content.update(context, frameState, scratchCommandList);
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