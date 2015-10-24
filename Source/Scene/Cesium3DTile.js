/*global define*/
define([
        '../Core/RectangleOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/BoxOutlineGeometry',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        './Cesium3DTileContentProviderFactory',
        './Cesium3DTileContentState',
        './Cesium3DTileRefine',
        './Empty3DTileContentProvider',
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
        BoxOutlineGeometry,
        defined,
        defineProperties,
        destroyObject,
        Intersect,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        Cesium3DTileContentProviderFactory,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        Empty3DTileContentProvider,
        PerInstanceColorAppearance,
        Primitive,
        TileBoundingBox,
        Uri,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Cesium3DTile = function(tileset, baseUrl, header, parent) {
        this._header = header;
        var contentHeader = header.content;

// TODO: For the 3D Tiles spec, we want to change this to basically (x, y, z) to (x, y, z)
        var b = header.box;
        var rectangle = new Rectangle(b[0], b[1], b[2], b[3]);

        this._tileBoundingBox = new TileBoundingBox({
            rectangle : rectangle,
            minimumHeight : b[4],
            maximumHeight : b[5]
        });
        this._orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, b[4], b[5]);
// TODO: if the content type has pixel size, like points or billboards, the bounding volume needs
// to dynamic size bigger like BillboardCollection and PointCollection

        var rs;
        if (defined(contentHeader) && defined(contentHeader.box)) {
            // Non-leaf tiles may have a content-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            var cb = contentHeader.box;
            rs = OrientedBoundingBox.fromRectangle(new Rectangle(cb[0], cb[1], cb[2], cb[3]), cb[4], cb[5]);
        }

        this._contentsOrientedBoundingBox = rs;

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.geometricError = header.geometricError;

// TODO: use default for a smaller tree.json?  Or inherit from parent.  Same for "type" and others.
        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.refine = (header.refine === 'replace') ? Cesium3DTileRefine.REPLACE : Cesium3DTileRefine.ADD;

        /**
         * DOC_TBA
         *
         * @type {Array}
         * @readonly
         */
        this.children = [];

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.parent = parent;

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.numberOfChildrenWithoutContent = defined(header.children) ? header.children.length : 0;

        /**
         * DOC_TBA
         *
         * @type {Promise}
         * @readonly
         */
        this.readyPromise = when.defer();

        var content;
        if (defined(contentHeader)) {
            var contentUrl = contentHeader.url;
            var url = (new Uri(contentUrl).isAbsolute()) ? contentUrl : baseUrl + contentUrl;
            var contentFactory = Cesium3DTileContentProviderFactory[contentHeader.type];

            if (defined(contentFactory)) {
                content = contentFactory(tileset, this, url, contentHeader);
            } else {
                throw new DeveloperError('Unknown tile content type, ' + contentHeader.type + ', for ' + url);
            }
        } else {
            content = new Empty3DTileContentProvider();
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
//TODO: that.parent.numberOfChildrenWithoutContent will never reach zero and therefore that.parent will never refine
        });

        // Members that are updated every frame for rendering optimizations:

        /**
         * @private
         */
        this.distanceToCamera = 0;

        /**
         * The plane mask of the parent for use with {@link CullingVolume#computeVisibilityWithPlaneMask}).
         *
         * @type {Number}
         * @private
         */
        this.parentPlaneMask = 0;

        this._debugBox = undefined;
        this._debugcontentBox = undefined;
        this._debugOrientedBoundingBox = undefined;
        this._debugContentsOrientedBoundingBox = undefined;
    };

    defineProperties(Cesium3DTile.prototype, {
        /**
         * DOC_TBA
         *
         * @readonly
         */
        content : {
            get : function() {
                return this._content;
            }
        },

        /**
         * DOC_TBA
         *
         * @type {Promise}
         * @readonly
         */
        processingPromise : {
            get : function() {
                return this._content.processingPromise;
            }
        }
    });

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.isReady = function() {
        return this._content.state === Cesium3DTileContentState.READY;
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.isContentUnloaded = function() {
        return this._content.state === Cesium3DTileContentState.UNLOADED;
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.requestContent = function() {
        this._content.request();
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.visibility = function(cullingVolume) {
        return cullingVolume.computeVisibilityWithPlaneMask(this._orientedBoundingBox, this.parentPlaneMask);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.contentsVisibility = function(cullingVolume) {
        if (!defined(this._contentsOrientedBoundingBox)) {
            return Intersect.INSIDE;
        }

        return cullingVolume.computeVisibility(this._contentsOrientedBoundingBox);
    };

    /**
     * DOC_TBA
     */
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

   function createDebugOrientedBox(obb, color) {
        var geometry = BoxOutlineGeometry.fromDimensions({
            dimensions: new Cartesian3(2.0, 2.0, 2.0)
        });
        return createDebugPrimitive(geometry, color, Matrix4.fromRotationTranslation(obb.halfAxes, obb.center));
    }

// TODO: remove workaround for https://github.com/AnalyticalGraphicsInc/cesium/issues/2657
    function workaround2657(rectangle) {
        return (rectangle[1] !== rectangle[3]) && (rectangle[0] !== rectangle[2]);
    }

    function applyDebugSettings(tile, owner, context, frameState, commandList) {
        // Tiles do not have a content.box if it is the same as the tile's box.
        var hascontentBox = defined(tile._header.content) && defined(tile._header.content.box);

        var showBox = owner.debugShowBox || (owner.debugShowcontentBox && !hascontentBox);
        if (showBox && workaround2657(tile._header.box)) {
            if (!defined(tile._debugBox)) {
                tile._debugBox = createDebugBox(tile._header.box, hascontentBox ? Color.WHITE : Color.RED);
            }
            tile._debugBox.update(context, frameState, commandList);
        } else if (!showBox && defined(tile._debugBox)) {
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
            if (!defined(tile._debugOrientedBoundingBox)) {
                tile._debugOrientedBoundingBox = createDebugOrientedBox(tile._orientedBoundingBox, hascontentBox ? Color.WHITE : Color.RED);
            }
            tile._debugOrientedBoundingBox.update(context, frameState, commandList);
        } else if (!owner.debugShowBoundingVolume && defined(tile._debugOrientedBoundingBox)) {
            tile._debugOrientedBoundingBox = tile._debugOrientedBoundingBox.destroy();
        }

        if (owner.debugShowContentsBoundingVolume && hascontentBox) {
            if (!defined(tile._debugContentsOrientedBoundingBox)) {
                tile._debugContentsOrientedBoundingBox = createDebugOrientedBox(tile._contentsOrientedBoundingBox, Color.BLUE);
            }
            tile._debugContentsOrientedBoundingBox.update(context, frameState, commandList);
        } else if (!owner.debugShowContentsBoundingVolume && defined(tile._debugContentsOrientedBoundingBox)) {
            tile._debugContentsOrientedBoundingBox = tile._debugContentsOrientedBoundingBox.destroy();
        }
    }

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.update = function(owner, context, frameState, commandList) {
        applyDebugSettings(this, owner, context, frameState, commandList);
        this._content.update(owner, context, frameState, commandList);
    };

    var scratchCommandList = [];

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.process = function(owner, context, frameState) {
        this._content.update(owner, context, frameState, scratchCommandList);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.destroy = function() {
        this._content = this._content && this._content.destroy();
        this._debugBox = this._debugBox && this._debugBox.destroy();
        this._debugcontentBox = this._debugcontentBox && this._debugcontentBox.destroy();
        this._debugOrientedBoundingBox = this._debugOrientedBoundingBox && this._debugOrientedBoundingBox.destroy();
        this._debugContentsOrientedBoundingBox = this._debugContentsOrientedBoundingBox && this._debugContentsOrientedBoundingBox.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});
