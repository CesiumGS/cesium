/*global define*/
define([
        '../Core/RectangleOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/SphereOutlineGeometry',
        '../Core/Rectangle',
        './Cesium3DTileContentProvider',
        './Cesium3DTileContentState',
        './PerInstanceColorAppearance',
        './Primitive',
        './TileBoundingBox',
        '../ThirdParty/when'
    ], function(
        RectangleOutlineGeometry,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        GeometryInstance,
        BoundingSphere,
        defined,
        defineProperties,
        destroyObject,
        Intersect,
        Matrix4,
        SphereOutlineGeometry,
        Rectangle,
        Cesium3DTileContentProvider,
        Cesium3DTileContentState,
        PerInstanceColorAppearance,
        Primitive,
        TileBoundingBox,
        when) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTile = function(baseUrl, tile, parent) {
        this._header = tile;

        var b = tile.box;
        var rectangle = new Rectangle(b.west, b.south, b.east, b.north);

        this._tileBoundingBox = new TileBoundingBox({
            rectangle : rectangle,
            minimumHeight : b.minimumHeight,
            maximumHeight : b.maximumHeight
        });
        this._boundingSphere = BoundingSphere.fromRectangleWithHeights3D(rectangle, undefined, b.minimumHeight, b.maximumHeight);

        var rs;
        if (defined(tile.contentsBox)) {
            // Non-leaf tiles may have a render-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            var cb = tile.contentsBox;
            rs = BoundingSphere.fromRectangleWithHeights3D(new Rectangle(cb.west, cb.south, cb.east, cb.north), undefined, cb.minimumHeight, cb.maximumHeight);
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

        this._debugBox = undefined;
        this._debugContentsBox = undefined;
        this._debugSphere = undefined;
        this._debugContentsSphere = undefined;
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

    function createDebugPrimitive(geometry, color, modelMatrix) {
        var instance = new GeometryInstance({
            geometry : geometry,
            modelMatrix : modelMatrix,
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(color)
            }
        });

        return new Primitive({
            geometryInstances : instance,
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });
    }

    function createDebugBox(box, color) {
        var geometry = new RectangleOutlineGeometry({
            rectangle : new Rectangle(box.west, box.south, box.east, box.north),
            height : box.minimumHeight,
            extrudedHeight: box.maximumHeight
         });
        return createDebugPrimitive(geometry, color);
    }

    function createDebugSphere(sphere, color) {
        var geometry = new SphereOutlineGeometry({
            radius : sphere.radius
        });
        return createDebugPrimitive(geometry, color, Matrix4.fromTranslation(sphere.center));
    }

    function applyDebugSettings(tile, owner, context, frameState, commandList) {
        // Tiles do not have a contentsBox if it is the same as the tile's box.
        var hasContentsBox = defined(tile._header.contentsBox);

        if (owner.debugShowBox) {
            if (!defined(tile._debugBox)) {
                tile._debugBox = createDebugBox(tile._header.box, hasContentsBox ? Color.WHITE : Color.RED);
            }
            tile._debugBox.update(context, frameState, commandList);
        } else if (!owner.debugShowBox && defined(tile._debugBox)) {
            tile._debugBox = tile._debugBox.destroy();
        }

        if (owner.debugShowContentsBox && hasContentsBox) {
            if (!defined(tile._debugContentsBox)) {
                tile._debugContentsBox = createDebugBox(tile._header.contentsBox, Color.BLUE);
            }
            tile._debugContentsBox.update(context, frameState, commandList);
        } else if (!owner.debugShowContentsBox && defined(tile._debugContentsBox)) {
            tile._debugContentsBox = tile._debugContentsBox.destroy();
        }

        if (owner.debugShowBoundingVolume) {
            if (!defined(tile._debugSphere)) {
                tile._debugSphere = createDebugSphere(tile._boundingSphere, hasContentsBox ? Color.WHITE : Color.RED);
            }
            tile._debugSphere.update(context, frameState, commandList);
        } else if (!owner.debugShowBoundingVolume && defined(tile._debugSphere)) {
            tile._debugSphere = tile._debugSphere.destroy();
        }

        if (owner.debugShowContentsBoundingVolume && hasContentsBox) {
            if (!defined(tile._debugContentsSphere)) {
                tile._debugContentsSphere = createDebugSphere(tile._contentsBoundingSphere, Color.BLUE);
            }
            tile._debugContentsSphere.update(context, frameState, commandList);
        } else if (!owner.debugShowContentsBoundingVolume && defined(tile._debugContentsSphere)) {
            tile._debugContentsSphere = tile._debugContentsSphere.destroy();
        }
    }

    Cesium3DTile.prototype.update = function(owner, context, frameState, commandList) {
        applyDebugSettings(this, owner, context, frameState, commandList);
        this._content.update(owner, context, frameState, commandList);
    };

    var scratchCommandList = [];

    Cesium3DTile.prototype.process = function(owner, context, frameState) {
        this._content.update(owner, context, frameState, scratchCommandList);
    };

    Cesium3DTile.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTile.prototype.destroy = function() {
        this._content = this._content && this._content.destroy();
        this._debugBox = this._debugBox && this._debugBox.destroy();
        this._debugContentsBox = this._debugContentsBox && this._debugContentsBox.destroy();
        this._debugSphere = this._debugSphere && this._debugSphere.destroy();
        this._debugContentsSphere = this._debugContentsSphere && this._debugContentsSphere.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});