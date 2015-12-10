/*global define*/
define([
        '../Core/BoundingSphere',
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
        '../Core/SphereOutlineGeometry',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Cesium3DTileContentProviderFactory',
        './Cesium3DTileContentState',
        './Cesium3DTileRefine',
        './Empty3DTileContentProvider',
        './PerInstanceColorAppearance',
        './Primitive',
        './TileBoundingBox',
        './Tileset3DTileContentProvider'
    ], function(
        BoundingSphere,
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
        SphereOutlineGeometry,
        Uri,
        when,
        Cesium3DTileContentProviderFactory,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        Empty3DTileContentProvider,
        PerInstanceColorAppearance,
        Primitive,
        TileBoundingBox,
        Tileset3DTileContentProvider) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Cesium3DTile = function(tileset, baseUrl, header, parent) {
        this._header = header;
        var contentHeader = header.content;

// TODO: For the 3D Tiles spec, we want to change this to basically (x, y, z) to (x, y, z)
        var tileBoundingVolume = header.boundingVolume;
        if (defined(tileBoundingVolume.box)) {
            var b = tileBoundingVolume.box;
            var rectangle = new Rectangle(b[0], b[1], b[2], b[3]);

            this._tileBoundingBox = new TileBoundingBox({
                rectangle : rectangle,
                minimumHeight : b[4],
                maximumHeight : b[5]
            });
            this._orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, b[4], b[5]);
        } else if (defined(tileBoundingVolume.sphere)) {
            var sphere = tileBoundingVolume.sphere;
            this._tileBoundingSphere = new BoundingSphere(
                new Cartesian3(sphere[0], sphere[1], sphere[2]),
                sphere[3]
            );
        }
// TODO: if the content type has pixel size, like points or billboards, the bounding volume needs
// to dynamic size bigger like BillboardCollection and PointCollection

        var contentsOrientedBoundingBox;
        var contentsBoundingSphere;
        if (defined(contentHeader) && defined(contentHeader.boundingVolume)) {
            // Non-leaf tiles may have a content-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.

            var contentsBoundingVolume = contentHeader.boundingVolume;
            if (defined(contentsBoundingVolume.box)) {
                var cb = contentHeader.boundingVolume.box;
                contentsOrientedBoundingBox = OrientedBoundingBox.fromRectangle(new Rectangle(cb[0], cb[1], cb[2], cb[3]), cb[4], cb[5]);
            } else if (defined(contentsBoundingVolume.sphere)) {
                var cs = contentHeader.boundingVolume.sphere;
                contentsBoundingSphere = new BoundingSphere(
                    new Cartesian3(cs[0], cs[1], cs[2]),
                    cs[3]
                );
            }
        }

        this._contentsOrientedBoundingBox = contentsOrientedBoundingBox;
        this._contentsBoundingSphere = contentsBoundingSphere;

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
                content = new Tileset3DTileContentProvider();
            } else if (defined(contentFactory)) {
                content = contentFactory(tileset, this, url);
            } else {
                throw new DeveloperError('Unknown tile content type, ' + type + ', for ' + url);
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

        this._debugBoundingVolume = undefined;
        this._debugContentBoundingVolume = undefined;
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
         * Get the bounding volume of the tile
         *
         * @type {Object}
         * @readonly
         */
        boundingVolume : {
            get : function() {
                return defaultValue(
                    defaultValue(this._contentsOrientedBoundingBox, this._contentsBoundingSphere),
                    defaultValue(this._orientedBoundingBox, this._tileBoundingSphere)
                );
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
        var boundingVolume = this._orientedBoundingBox || this._tileBoundingSphere;
        return cullingVolume.computeVisibilityWithPlaneMask(boundingVolume, this.parentPlaneMask);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.contentsVisibility = function(cullingVolume) {
        var boundingVolume = this._contentsOrientedBoundingBox || this._contentsBoundingSphere;
        if (!defined(boundingVolume)) {
            return Intersect.INSIDE;
        }

        return cullingVolume.computeVisibility(boundingVolume);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTile.prototype.distanceToTile = function(frameState) {
        var boundingVolume = this._tileBoundingBox || this._tileBoundingSphere;
        return boundingVolume.distanceToCamera(frameState);
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

    function createDebugVolume(boundingVolume, color) {
        var geometry;
        var modelMatrix = new Matrix4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
        if (boundingVolume.box) {
            var box = boundingVolume.box;
            geometry = new RectangleOutlineGeometry({
                rectangle : new Rectangle(box[0], box[1], box[2], box[3]),
                height : box[4],
                extrudedHeight: box[5]
             });
        } else if (boundingVolume.sphere) {
            var sphere = boundingVolume.sphere;
            geometry = new SphereOutlineGeometry({
                radius: sphere[3]
            });
            Matrix4.fromTranslation(new Cartesian3(sphere[0],sphere[1],sphere[2]), modelMatrix);
        }
        return createDebugPrimitive(geometry, color, modelMatrix);
    }

// TODO: remove workaround for https://github.com/AnalyticalGraphicsInc/cesium/issues/2657
    function workaround2657(boundingVolume) {
        if (defined(boundingVolume.box)) {
            var rectangle = boundingVolume.box;
            return (rectangle[1] !== rectangle[3]) && (rectangle[0] !== rectangle[2]);
        } else {
            return true;
        }
    }

    function applyDebugSettings(tile, owner, frameState) {
        // Tiles do not have a content.box if it is the same as the tile's box.
        var hasContentBoundingVolume = defined(tile._header.content) && defined(tile._header.content.boundingVolume);

        var showVolume = owner.debugShowBoundingVolume || (owner.debugShowContentBoundingVolume && !hasContentBoundingVolume);
        if (showVolume && workaround2657(tile._header.boundingVolume)) {
            if (!defined(tile._debugBoundingVolume)) {
                tile._debugBoundingVolume = createDebugVolume(tile._header.boundingVolume, hasContentBoundingVolume ? Color.WHITE : Color.RED);
            }
            tile._debugBoundingVolume.update(frameState);
        } else if (!showVolume && defined(tile._debugBoundingVolume)) {
            tile._debugBoundingVolume = tile._debugBoundingVolume.destroy();
        }

        if (owner.debugShowContentBoundingVolume && hasContentBoundingVolume && workaround2657(tile._header.content.boundingVolume)) {
            if (!defined(tile._debugContentBoundingVolume)) {
                tile._debugContentBoundingVolume = createDebugVolume(tile._header.content.boundingVolume, Color.BLUE);
            }
            tile._debugContentBoundingVolume.update(frameState);
        } else if (!owner.debugShowContentBoundingVolume && defined(tile._debugContentBoundingVolume)) {
            tile._debugContentBoundingVolume = tile._debugContentBoundingVolume.destroy();
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
        this._debugBoundingVolume = this._debugBoundingVolume && this._debugBoundingVolume.destroy();
        this._debugContentBoundingVolume = this._debugContentBoundingVolume && this._debugContentBoundingVolume.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});
