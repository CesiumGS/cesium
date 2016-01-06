/*global define*/
define([
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../Core/RectangleOutlineGeometry',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Cesium3DTileContentProviderFactory',
        './Cesium3DTileContentState',
        './Cesium3DTileRefine',
        './Empty3DTileContentProvider',
        './PerInstanceColorAppearance',
        './Primitive',
        './TileBoundingBox'
    ], function(
        BoxOutlineGeometry,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        GeometryInstance,
        Intersect,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        RectangleOutlineGeometry,
        Uri,
        when,
        Cesium3DTileContentProviderFactory,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        Empty3DTileContentProvider,
        PerInstanceColorAppearance,
        Primitive,
        TileBoundingBox) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Cesium3DTile(tileset, baseUrl, header, parent) {
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

        this._numberOfUnrefinableChildren = this.numberOfChildrenWithoutContent;

        this.refining = false;

        this.hasContent = true;

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.hasTilesetContent = false;

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
            var type = url.substring(url.lastIndexOf('.') + 1);
            var contentFactory = Cesium3DTileContentProviderFactory[type];

            if (type === 'json') {
                this.hasTilesetContent = true;
                this.hasContent = false;
                this._numberOfUnrefinableChildren = 1;
            }

            if (defined(contentFactory)) {
                content = contentFactory(tileset, this, url);
            } else {
                throw new DeveloperError('Unknown tile content type, ' + type + ', for ' + url);
            }
        } else {
            content = new Empty3DTileContentProvider();
            this.hasContent = false;
        }
        this._content = content;

        function setRefinable(tile) {
            var parent = tile.parent;
            if (defined(parent) && (tile.hasContent || tile.isRefinable())) {
                // When a tile with content is loaded, its parent can safely refine to it without any gaps in rendering
                // Since an empty tile doesn't have content of its own, its descendants with content need to be loaded
                // before the parent is able to refine to it.
                --parent._numberOfUnrefinableChildren;
                // If the parent is empty, traverse up the tree to update ancestor tiles.
                if (!parent.hasContent) {
                    setRefinable(parent);
                }
            }
        }

        var that = this;

        // Content enters the READY state
        when(content.readyPromise).then(function(content) {
            if (defined(that.parent)) {
                --that.parent.numberOfChildrenWithoutContent;
            }

            setRefinable(that);

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
    }

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
         * Get the tight oriented bounding box
         *
         * @type {Promise}
         * @readonly
         */
        orientedBoundingBox : {
            get : function() {
                return defaultValue(this._contentsOrientedBoundingBox, this._orientedBoundingBox);
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
    Cesium3DTile.prototype.isRefinable = function() {
        return this._numberOfUnrefinableChildren === 0;
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

    function applyDebugSettings(tile, owner, frameState) {
        // Tiles do not have a content.box if it is the same as the tile's box.
        var hasContentBox = defined(tile._header.content) && defined(tile._header.content.box);

        var showBox = owner.debugShowBox || (owner.debugShowContentBox && !hasContentBox);
        if (showBox && workaround2657(tile._header.box)) {
            if (!defined(tile._debugBox)) {
                tile._debugBox = createDebugBox(tile._header.box, hasContentBox ? Color.WHITE : Color.RED);
            }
            tile._debugBox.update(frameState);
        } else if (!showBox && defined(tile._debugBox)) {
            tile._debugBox = tile._debugBox.destroy();
        }

        if (owner.debugShowContentBox && hasContentBox && workaround2657(tile._header.content.box)) {
            if (!defined(tile._debugcontentBox)) {
                tile._debugcontentBox = createDebugBox(tile._header.content.box, Color.BLUE);
            }
            tile._debugcontentBox.update(frameState);
        } else if (!owner.debugShowContentBox && defined(tile._debugcontentBox)) {
            tile._debugcontentBox = tile._debugcontentBox.destroy();
        }

        if (owner.debugShowBoundingVolume) {
            if (!defined(tile._debugOrientedBoundingBox)) {
                tile._debugOrientedBoundingBox = createDebugOrientedBox(tile._orientedBoundingBox, hasContentBox ? Color.WHITE : Color.RED);
            }
            tile._debugOrientedBoundingBox.update(frameState);
        } else if (!owner.debugShowBoundingVolume && defined(tile._debugOrientedBoundingBox)) {
            tile._debugOrientedBoundingBox = tile._debugOrientedBoundingBox.destroy();
        }

        if (owner.debugShowContentsBoundingVolume && hasContentBox) {
            if (!defined(tile._debugContentsOrientedBoundingBox)) {
                tile._debugContentsOrientedBoundingBox = createDebugOrientedBox(tile._contentsOrientedBoundingBox, Color.BLUE);
            }
            tile._debugContentsOrientedBoundingBox.update(frameState);
        } else if (!owner.debugShowContentsBoundingVolume && defined(tile._debugContentsOrientedBoundingBox)) {
            tile._debugContentsOrientedBoundingBox = tile._debugContentsOrientedBoundingBox.destroy();
        }
    }

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.update = function(owner, frameState) {
        applyDebugSettings(this, owner, frameState);
        this._content.update(owner, frameState);
    };

    var scratchCommandList = [];

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.process = function(owner, frameState) {
        var savedCommandList = frameState.commandList;
        frameState.commandList = scratchCommandList;

        this._content.update(owner, frameState);

        scratchCommandList.length = 0;
        frameState.commandList = savedCommandList;
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
