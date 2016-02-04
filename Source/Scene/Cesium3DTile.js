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
        '../Core/getExtensionFromUri',
        '../Core/Intersect',
        '../Core/joinUrls',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../Core/RectangleOutlineGeometry',
        '../Core/RequestScheduler',
        '../Core/SphereOutlineGeometry',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Cesium3DTileContentProviderFactory',
        './Cesium3DTileContentState',
        './Cesium3DTileRefine',
        './Empty3DTileContentProvider',
        './PerInstanceColorAppearance',
        './Primitive',
        './TileBoundingRegion',
        './TileBoundingSphere',
        './Tileset3DTileContentProvider',
        './TileOrientedBoundingBox'
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
        getExtensionFromUri,
        Intersect,
        joinUrls,
        Matrix3,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        RectangleOutlineGeometry,
        RequestScheduler,
        SphereOutlineGeometry,
        Uri,
        when,
        Cesium3DTileContentProviderFactory,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        Empty3DTileContentProvider,
        PerInstanceColorAppearance,
        Primitive,
        TileBoundingRegion,
        TileBoundingSphere,
        Tileset3DTileContentProvider,
        TileOrientedBoundingBox) {
    "use strict";

    /**
     * A tile in a 3D Tiles tileset.  When a tile is first created, its content is not loaded;
     * the content is loaded on-demand when needed based on the view using
     * {@link Cesium3DTile#requestContent}.
     * <p>
     * Do not construct this directly, instead access tiles through {@link Cesium3DTileset#tileVisible}.
     * </p>
     *
     * @alias Cesium3DTile
     * @constructor
     */
    function Cesium3DTile(tileset, baseUrl, header, parent) {
        this._header = header;
        var contentHeader = header.content;

        this._boundingVolume = createBoundingVolume(header.boundingVolume);

// TODO: if the content type has pixel size, like points or billboards, the bounding volume needs
// to dynamic size bigger like BillboardCollection and PointCollection

        var contentBoundingVolume;

        if (defined(contentHeader) && defined(contentHeader.boundingVolume)) {
            // Non-leaf tiles may have a content-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            contentBoundingVolume = createBoundingVolume(contentHeader.boundingVolume);
        }
        this._contentBoundingVolume = contentBoundingVolume;

        /**
         * The error, in meters, introduced if this tile is rendered and its children are not.
         * This is used to compute Screen-Space Error (SSE), i.e., the error measured in pixels.
         *
         * @type {Number}
         * @readonly
         */
        this.geometricError = header.geometricError;

        var refine;
        if (defined(header.refine)) {
            refine = (header.refine === 'replace') ? Cesium3DTileRefine.REPLACE : Cesium3DTileRefine.ADD;
        } else if (defined(parent)) {
            // Inherit from parent tile if omitted.
            refine = parent.refine;
        }

        /**
         * Specifies if additive or replacement refinement is used when traversing this tile for rendering.
         *
         * @type {Cesium3DTileRefine}
         * @readonly
         */
        this.refine = refine;

        /**
         * An array of {@link Cesium3DTile} objects that are this tile's children.
         *
         * @type {Array}
         * @readonly
         */
        this.children = [];

        /**
         * Descendant tiles that need to be visible before this tile can refine. For example, if
         * a child is empty (such as for accelerating culling), its descendants with content would
         * be added here. This array is generated during runtime in {@link Cesium3DTileset#loadTileset}.
         * If a tiles's children all have content, this is left undefined.
         *
         * @type {Array}
         * @readonly
         */
        this.descendantsWithContent = undefined;

        /**
         * This tile's parent or <code>undefined</code> if this tile is the root.
         * <p>
         * When a tile's content points to an external tileset.json, the external tileset's
         * root tile's parent is not <code>undefined</code>; instead, the parent references
         * the tile (with its content pointing to an external tileset.json) as if the two tilesets were merged.
         * </p>
         *
         * @type {Cesium3DTile}
         * @readonly
         */
        this.parent = parent;

        /**
         * The number of unloaded children, i.e., children whose content is not loaded.
         *
         * @type {Number}
         * @readonly
         *
         * @private
         */
        this.numberOfChildrenWithoutContent = defined(header.children) ? header.children.length : 0;

        /**
         * Gets the promise that will be resolved when the tile's content is ready to render.
         *
         * @type {Promise.<Cesium3DTile>}
         * @readonly
         *
         * @private
         */
        this.contentReadyPromise = when.defer();

        var content;
        var hasContent;
        var hasTilesetContent;
        var requestServer;

        if (defined(contentHeader)) {
            var contentUrl = contentHeader.url;
            var url = joinUrls(baseUrl, contentUrl);
            requestServer = RequestScheduler.getRequestServer(url);
            var type = getExtensionFromUri(url);
            var contentFactory = Cesium3DTileContentProviderFactory[type];

            if (type === 'json') {
                hasContent = false;
                hasTilesetContent = true;
            } else {
                hasContent = true;
                hasTilesetContent = false;
            }

            //>>includeStart('debug', pragmas.debug);
            if (!defined(contentFactory)) {
                throw new DeveloperError('Unknown tile content type, ' + type + ', for ' + url);
            }
            //>>includeEnd('debug');

            content = contentFactory(tileset, this, url);
        } else {
            content = new Empty3DTileContentProvider();
            hasContent = false;
            hasTilesetContent = false;
        }

        this._content = content;
        this._requestServer = requestServer;

        /**
         * When <code>true</code>, the tile has content.  This does not imply that the content is loaded.
         * <p>
         * When a tile's content points to a external tileset, the tile is not considered to have content.
         * </p>
         *
         * @type {Boolean}
         * @readonly
         *
         * @private
         */
        this.hasContent = hasContent;

        /**
         * When <code>true</code>, the tile's content points to an external tileset.
         *
         * @type {Boolean}
         * @readonly
         *
         * @private
         */
        this.hasTilesetContent = hasTilesetContent;

        var that = this;

        // Content enters the READY state
        when(content.readyPromise).then(function(content) {
            if (defined(that.parent)) {
                --that.parent.numberOfChildrenWithoutContent;
            }

            that.contentReadyPromise.resolve(that);
        }).otherwise(function(error) {
            // In this case, that.parent.numberOfChildrenWithoutContent will never reach zero
            // and therefore that.parent will never refine.  If this becomes an issue, failed
            // requests can be reissued.
            that.contentReadyPromise.reject(error);
        });

        // Members that are updated every frame for tree traversal and rendering optimizations:

        /**
         * The (potentially approximate) distance from the closest point of the tile's bounding volume to the camera.
         *
         * @type {Number}
         *
         * @private
         */
        this.distanceToCamera = 0;

        /**
         * The plane mask of the parent for use with {@link CullingVolume#computeVisibilityWithPlaneMask}).
         *
         * @type {Number}
         *
         * @private
         */
        this.parentPlaneMask = 0;

        /**
         * Marks if the tile is selected this frame.
         *
         * @type {Boolean}
         *
         * @private
         */
        this.selected = false;

        /**
         * The last frame number the tile was visible in.
         *
         * @type {Number}
         *
         * @private
         */
        this.lastFrameNumber = 0;

        /**
         * The time when a style was last applied to this tile.
         *
         * @type {Number}
         *
         * @private
         */
        this.lastStyleTime = 0;

        this._debugBoundingVolume = undefined;
        this._debugContentBoundingVolume = undefined;
        this._debugColor = new Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;
    }

    defineProperties(Cesium3DTile.prototype, {
        /**
         * The tile's loaded content.  This represents the actual tile's payload,
         * not the content's metadata in tileset.json.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {Cesium3DTileContentProvider}
         * @readonly
         */
        content : {
            get : function() {
                return this._content;
            }
        },

        /**
         * Get the bounding volume of the tile's contents.  This defaults to the
         * tile's bounding volume when the content's bounding volume is
         * <code>undefined</code>.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {TileBoundingVolume}
         * @readonly
         */
        contentBoundingVolume : {
            get : function() {
                return defaultValue(this._contentBoundingVolume, this._boundingVolume);
            }
        },

        /**
         * Gets the promise that will be resolved when the tile's content is ready to process.
         * This happens after the content is downloaded but before the content is ready
         * to render.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {Promise.<Cesium3DTileContentProvider>}
         * @readonly
         *
         * @private
         */
        contentReadyToProcessPromise : {
            get : function() {
                return this._content.contentReadyToProcessPromise;
            }
        },

        /**
         * @readonly
         * @private
         */
        requestServer : {
            get : function() {
                return this._requestServer;
            }
        },

        /**
         * Determines if the tile is ready to render. <code>true</code> if the tile
         * is ready to render; otherwise, <code>false</code>.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        contentReady : {
            get : function() {
                return this._content.state === Cesium3DTileContentState.READY;
            }
        },

        /**
         * Determines if the tile's content has not be requested. <code>true</code> if tile's
         * content has not be requested; otherwise, <code>false</code>.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        contentUnloaded : {
            get : function () {
                return this._content.state === Cesium3DTileContentState.UNLOADED;
            }
        }
    });

    /**
     * Requests the tile's content.
     * <p>
     * The request may not be made if the Cesium Request Scheduler can't prioritize it.
     * </p>
     *
     * @private
     */
    Cesium3DTile.prototype.requestContent = function() {
        this._content.request();
    };

    /**
     * Determines if a request for the tile's content can be made based on the priorities of
     * the request scheduler.
     *
     * @returns {Boolean} <code>true</code> when the content request can be made; otherwise, <code>false</false>.
     *
     * @private
     */
    Cesium3DTile.prototype.canRequestContent = function() {
        if (!defined(this._requestServer)) {
            // If tile does not have a request server, then it does not have content to load.
            return true;
        }
        return this._requestServer.hasAvailableRequests();
    };

    /**
     * Determines whether the tile's bounding volume intersects the culling volume.
     *
     * @param {CullingVolume} cullingVolume The culling volume whose intersection with the tile is to be tested.
     * @returns {Number} A plane mask as described above in {@link CullingVolume#computeVisibilityWithPlaneMask}.
     *
     * @private
     */
    Cesium3DTile.prototype.visibility = function(cullingVolume) {
        return cullingVolume.computeVisibilityWithPlaneMask(this._boundingVolume, this.parentPlaneMask);
    };

    /**
     * Assuming the tile's bounding volume intersects the culling volume, determines
     * whether the tile's content's bounding volume intersects the culling volume.
     *
     * @param {CullingVolume} cullingVolume The culling volume whose intersection with the tile's content is to be tested.
     * @returns {Intersect} The result of the intersection: the tile's content is completely outside, completely inside, or intersecting the culling volume.
     *
     * @private
     */
    Cesium3DTile.prototype.contentsVisibility = function(cullingVolume) {
        var boundingVolume = this._contentBoundingVolume;
        if (!defined(boundingVolume)) {
            return Intersect.INSIDE;
        }
        // PERFORMANCE_IDEA: is it possible to burn less CPU on this test since we know the
        // tile's (not the content's) bounding volume intersects the culling volume?
        return cullingVolume.computeVisibility(boundingVolume);
    };

    /**
     * Computes the (potentially approximate) distance from the closest point of the tile's bounding volume to the camera.
     *
     * @param {FrameState} frameState The frame state.
     * @returns {Number} The distance, in meters, or zero if the camera is inside the bounding volume.
     *
     * @private
     */
    Cesium3DTile.prototype.distanceToTile = function(frameState) {
        return this._boundingVolume.distanceToCamera(frameState);
    };

    function createBoundingVolume(boundingVolumeHeader) {
        var volume;
        if (boundingVolumeHeader.box) {
            var box = boundingVolumeHeader.box;
            var center = new Cartesian3(box[0], box[1], box[2]);
            var halfAxes = Matrix3.fromArray(box, 3);

            volume = new TileOrientedBoundingBox({
                center: center,
                halfAxes: halfAxes
            });
        } else if (boundingVolumeHeader.region) {
            var region = boundingVolumeHeader.region;
            var rectangleRegion = new Rectangle(region[0], region[1], region[2], region[3]);

            volume = new TileBoundingRegion({
                rectangle : rectangleRegion,
                minimumHeight : region[4],
                maximumHeight : region[5]
            });
        } else if (boundingVolumeHeader.sphere) {
            var sphere = boundingVolumeHeader.sphere;

            volume = new TileBoundingSphere(
                new Cartesian3(sphere[0], sphere[1], sphere[2]),
                sphere[3]
            );
        }

        return volume;
    }

// TODO: remove workaround for https://github.com/AnalyticalGraphicsInc/cesium/issues/2657
    function workaround2657(boundingVolume) {
        if (defined(boundingVolume.region)) {
            var region = boundingVolume.region;
            return (region[1] !== region[3]) && (region[0] !== region[2]);
        } else {
            return true;
        }
    }

    function applyDebugSettings(tile, tiles3D, frameState) {
        // Tiles do not have a content.box if it is the same as the tile's box.
        var hasContentBoundingVolume = defined(tile._header.content) && defined(tile._header.content.boundingVolume);

        var showVolume = tiles3D.debugShowBoundingVolume || (tiles3D.debugShowContentBoundingVolume && !hasContentBoundingVolume);
        if (showVolume && workaround2657(tile._header.boundingVolume)) {
            if (!defined(tile._debugBoundingVolume)) {
                tile._debugBoundingVolume = tile._boundingVolume.createDebugVolume(hasContentBoundingVolume ? Color.WHITE : Color.RED);
            }
            tile._debugBoundingVolume.update(frameState);
        } else if (!showVolume && defined(tile._debugBoundingVolume)) {
            tile._debugBoundingVolume = tile._debugBoundingVolume.destroy();
        }

        if (tiles3D.debugShowContentBoundingVolume && hasContentBoundingVolume && workaround2657(tile._header.content.boundingVolume)) {
            if (!defined(tile._debugContentBoundingVolume)) {
                tile._debugContentBoundingVolume = tile._contentBoundingVolume.createDebugVolume(Color.BLUE);
            }
            tile._debugContentBoundingVolume.update(frameState);
        } else if (!tiles3D.debugShowContentBoundingVolume && defined(tile._debugContentBoundingVolume)) {
            tile._debugContentBoundingVolume = tile._debugContentBoundingVolume.destroy();
        }

        if (tiles3D.debugColorizeTiles && !tile._debugColorizeTiles) {
            tile._debugColorizeTiles = true;
            tile._content.applyDebugSettings(true, tile._debugColor);
        } else if (!tiles3D.debugColorizeTiles && tile._debugColorizeTiles) {
            tile._debugColorizeTiles = false;
            tile._content.applyDebugSettings(false, tile._debugColor);
        }
    }

    /**
     * Get the draw commands needed to render this tile.
     *
     * @private
     */
    Cesium3DTile.prototype.update = function(tiles3D, frameState) {
        applyDebugSettings(this, tiles3D, frameState);
        this._content.update(tiles3D, frameState);
    };

    var scratchCommandList = [];

    /**
     * Processes the tile's content, e.g., create WebGL resources, to move from the PROCESSING to READY state.
     *
     * @param {Cesium3DTileset} tiles3D The tileset containing this tile.
     * @param {FrameState} frameState The frame state.
     *
     * @private
     */
    Cesium3DTile.prototype.process = function(tiles3D, frameState) {
        var savedCommandList = frameState.commandList;
        frameState.commandList = scratchCommandList;

        this._content.update(tiles3D, frameState);

        scratchCommandList.length = 0;
        frameState.commandList = savedCommandList;
    };

    /**
     * @private
     */
    Cesium3DTile.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    Cesium3DTile.prototype.destroy = function() {
        this._content = this._content && this._content.destroy();
        this._debugBoundingVolume = this._debugBoundingVolume && this._debugBoundingVolume.destroy();
        this._debugContentBoundingVolume = this._debugContentBoundingVolume && this._debugContentBoundingVolume.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});
