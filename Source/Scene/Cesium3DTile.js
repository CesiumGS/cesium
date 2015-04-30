/*global define*/
define([
        '../Core/RectangleOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/SphereOutlineGeometry',
        '../Core/Rectangle',
        './Cesium3DTileContentProviderFactory',
        './Cesium3DTileContentState',
        './Cesium3DTileRefine',
        './PerInstanceColorAppearance',
        './Primitive',
        './TileBoundingBox',
        '../ThirdParty/Uri',
        '../ThirdParty/when'
    ], function(
        RectangleOutlineGeometry,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        DeveloperError,
        GeometryInstance,
        BoundingSphere,
        defined,
        defineProperties,
        destroyObject,
        Intersect,
        Matrix4,
        SphereOutlineGeometry,
        Rectangle,
        Cesium3DTileContentProviderFactory,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        PerInstanceColorAppearance,
        Primitive,
        TileBoundingBox,
        Uri,
        when) {
    "use strict";

    /**
     * @private
     */
    var Cesium3DTile = function(baseUrl, header, parent) {
        this._header = header;

        var b = header.box;
        var rectangle = new Rectangle(b[0], b[1], b[2], b[3]);

        this._tileBoundingBox = new TileBoundingBox({
            rectangle : rectangle,
            minimumHeight : b[4],
            maximumHeight : b[5]
        });
        this._boundingSphere = BoundingSphere.fromRectangleWithHeights3D(rectangle, undefined, b[4], b[5]);

        var rs;
        if (defined(header.content.box)) {
            // Non-leaf tiles may have a render-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            var cb = header.content.box;
            rs = BoundingSphere.fromRectangleWithHeights3D(new Rectangle(cb[0], cb[1], cb[2], cb[3]), undefined, cb[4], cb[5]);
        }

        this._contentsBoundingSphere = rs;

        /**
         * @readonly
         */
        this.geometricError = header.geometricError;

// TODO: use default for a smaller tree.json?  Or inherit from parent.  Same for "type" and others.
        /**
         * @readonly
         */
        this.refine = (header.refine === 'replace') ? Cesium3DTileRefine.REPLACE : Cesium3DTileRefine.ADD;

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
        this.numberOfChildrenWithoutContent = defined(header.children) ? header.children.length : 0;

        /**
         * @type {Promise}
         * @readonly
         */
        this.readyPromise = when.defer();

// TODO: contents may come from a different server than tree.json
        var contentUrl = header.content.url;
        var url = (new Uri(contentUrl).isAbsolute()) ? contentUrl : baseUrl + contentUrl;
        var contentFactory = Cesium3DTileContentProviderFactory[header.content.type];
        var content;

        if (defined(contentFactory)) {
            content = contentFactory(url);
        } else {
            throw new DeveloperError('Unknown tile content type, ' + header.content.type + ', for ' + url);
        }
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
        this._debugcontentBox = undefined;
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
            rectangle : new Rectangle(box[0], box[1], box[2], box[3]),
            height : box[4],
            extrudedHeight: box[5]
         });
        return createDebugPrimitive(geometry, color);
    }

    function createDebugSphere(sphere, color) {
        var geometry = new SphereOutlineGeometry({
            radius : sphere.radius
        });
        return createDebugPrimitive(geometry, color, Matrix4.fromTranslation(sphere.center));
    }

// TODO: remove workaround for https://github.com/AnalyticalGraphicsInc/cesium/issues/2657
    function workaround2657(rectangle) {
        return (rectangle[1] !== rectangle[3]) || (rectangle[0] !== rectangle[2]);
    }

    function applyDebugSettings(tile, owner, context, frameState, commandList) {
        // Tiles do not have a content.box if it is the same as the tile's box.
        var hascontentBox = defined(tile._header.content.box);

        if (owner.debugShowBox && workaround2657(tile._header.box)) {
            if (!defined(tile._debugBox)) {
                tile._debugBox = createDebugBox(tile._header.box, hascontentBox ? Color.WHITE : Color.RED);
            }
            tile._debugBox.update(context, frameState, commandList);
        } else if (!owner.debugShowBox && defined(tile._debugBox)) {
            tile._debugBox = tile._debugBox.destroy();
        }

        if (owner.debugShowcontentBox && hascontentBox && workaround2657(tile._header.content.box)) {
            if (!defined(tile._debugcontentBox)) {
                tile._debugcontentBox = createDebugBox(tile._header.content.box, Color.BLUE);
            }
            tile._debugcontentBox.update(context, frameState, commandList);
        } else if (!owner.debugShowcontentBox && defined(tile._debugcontentBox)) {
            tile._debugcontentBox = tile._debugcontentBox.destroy();
        }

        if (owner.debugShowBoundingVolume) {
            if (!defined(tile._debugSphere)) {
                tile._debugSphere = createDebugSphere(tile._boundingSphere, hascontentBox ? Color.WHITE : Color.RED);
            }
            tile._debugSphere.update(context, frameState, commandList);
        } else if (!owner.debugShowBoundingVolume && defined(tile._debugSphere)) {
            tile._debugSphere = tile._debugSphere.destroy();
        }

        if (owner.debugShowContentsBoundingVolume && hascontentBox) {
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
        this._debugcontentBox = this._debugcontentBox && this._debugcontentBox.destroy();
        this._debugSphere = this._debugSphere && this._debugSphere.destroy();
        this._debugContentsSphere = this._debugContentsSphere && this._debugContentsSphere.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});