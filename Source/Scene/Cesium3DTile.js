/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/clone',
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
        './Cesium3DTileChildrenVisibility',
        './Cesium3DTileContentFactory',
        './Cesium3DTileContentState',
        './Cesium3DTileOptimizations',
        './Cesium3DTileOptimizationHint',
        './Cesium3DTileRefine',
        './Empty3DTileContent',
        './PerInstanceColorAppearance',
        './Primitive',
        './SceneMode',
        './TileBoundingRegion',
        './TileBoundingSphere',
        './TileOrientedBoundingBox'
    ], function(
        BoundingSphere,
        BoxOutlineGeometry,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        clone,
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
        Cesium3DTileChildrenVisibility,
        Cesium3DTileContentFactory,
        Cesium3DTileContentState,
        Cesium3DTileOptimizations,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine,
        Empty3DTileContent,
        PerInstanceColorAppearance,
        Primitive,
        SceneMode,
        TileBoundingRegion,
        TileBoundingSphere,
        TileOrientedBoundingBox) {
    'use strict';

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

        /**
         * The local transform of this tile
         * @type {Matrix4}
         */
        this.transform = defined(header.transform) ? Matrix4.unpack(header.transform) : Matrix4.clone(Matrix4.IDENTITY);

        var parentTransform = defined(parent) ? parent.computedTransform : tileset.modelMatrix;
        var computedTransform = Matrix4.multiply(parentTransform, this.transform, new Matrix4());

        /**
         * The final computed transform of this tile
         * @type {Matrix4}
         */
        this.computedTransform = computedTransform;

        this._transformDirty = true;

        this._boundingVolume = this.createBoundingVolume(header.boundingVolume, computedTransform);
        this._boundingVolume2D = undefined;

        var contentBoundingVolume;

        if (defined(contentHeader) && defined(contentHeader.boundingVolume)) {
            // Non-leaf tiles may have a content-box bounding-volume, which is a tight-fit box
            // around only the models in the tile.  This box is useful for culling for rendering,
            // but not for culling for traversing the tree since it is not spatial coherence, i.e.,
            // since it only bounds models in the tile, not the entire tile, children may be
            // outside of this box.
            contentBoundingVolume = this.createBoundingVolume(contentHeader.boundingVolume, computedTransform);
        }
        this._contentBoundingVolume = contentBoundingVolume;
        this._contentBoundingVolume2D = undefined;

        var viewerRequestVolume;
        if (defined(header.viewerRequestVolume)) {
            viewerRequestVolume = this.createBoundingVolume(header.viewerRequestVolume, computedTransform);
        }
        this._viewerRequestVolume = viewerRequestVolume;

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

        var hasContent;
        var hasTilesetContent;
        var requestServer;
        var createContent;

        if (defined(contentHeader)) {
            var contentUrl = contentHeader.url;
            var url = joinUrls(baseUrl, contentUrl);
            requestServer = RequestScheduler.getRequestServer(url);
            var type = getExtensionFromUri(url);
            var contentFactory = Cesium3DTileContentFactory[type];

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

            var that = this;
            createContent = function() {
                return contentFactory(tileset, that, url);
            };
        } else {
            hasContent = false;
            hasTilesetContent = false;

            createContent = function() {
                return new Empty3DTileContent();
            };
        }

        this._createContent = createContent;
        this._content = createContent();
        if (!hasContent && !hasTilesetContent) {
            addContentReadyPromise(this);
        }

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

        /**
         * The corresponding node in the cache replacement list.
         *
         * @type {DoublyLinkedListNode}
         * @readonly
         *
         * @private
         */
        this.replacementNode = undefined;

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
         * Marks if the tile is selected this frame.
         *
         * @type {Boolean}
         *
         * @private
         */
        this.selected = false;

        /**
         * Marks if the tile is replaced this frame.
         *
         * @type {Boolean}
         *
         * @private
         */
        this.replaced = false;

        /**
         * The stored plane mask from the visibility check during tree traversal.
         *
         * @type {Number}
         *
         * @private
         */
        this.visibilityPlaneMask = true;
        
        /**
         * Flag to mark children visibility
         *
         * @type {Cesium3DTileChildrenVisibility}
         * 
         * @private
         */
        this.childrenVisibility = Cesium3DTileChildrenVisibility.VISIBLE;

        /**
         * The last frame number the tile was selected in.
         *
         * @type {Number}
         *
         * @private
         */
        this.lastSelectedFrameNumber = 0;

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
        this._debugViewerRequestVolume = undefined;
        this._debugColor = new Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;

        /**
         * Marks whether the tile's children bounds are fully contained within the tile's bounds
         * 
         * @type {Cesium3DTileOptimizationHint}
         */
        this._optimChildrenWithinParent = Cesium3DTileOptimizationHint.NOT_COMPUTED;
    }

    defineProperties(Cesium3DTile.prototype, {
        /**
         * The tile's loaded content.  This represents the actual tile's payload,
         * not the content's metadata in tileset.json.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {Cesium3DTileContent}
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
         * Get the bounding sphere derived from the tile's bounding volume.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {BoundingSphere}
         * @readonly
         */
        boundingSphere : {
            get : function() {
                return this._boundingVolume.boundingSphere;
            }
        },

        /**
         * Whether the computedTransform has changed this frame.
         *
         * @memberof Cesium3DTile.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        transformDirty : {
            get : function() {
                return this._transformDirty;
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
            get : function() {
                return this._content.state === Cesium3DTileContentState.UNLOADED;
            }
        }
    });

    function addContentReadyPromise(tile) {
        // Content enters the READY state
        tile._content.readyPromise.then(function(content) {
            if (defined(tile.parent)) {
                --tile.parent.numberOfChildrenWithoutContent;
            }
        }).otherwise(function(error) {
            // In this case, that.parent.numberOfChildrenWithoutContent will never reach zero
            // and therefore that.parent will never refine.  If this becomes an issue, failed
            // requests can be reissued.
        });
    }

    /**
     * Requests the tile's content.
     * <p>
     * The request may not be made if the Cesium Request Scheduler can't prioritize it.
     * </p>
     *
     * @private
     */
    Cesium3DTile.prototype.requestContent = function() {
        if (this._content.request()) {
            addContentReadyPromise(this);
        }
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
     * Unloads the tile's content and returns the tile's state to the state of when
     * it was first created, before its content were loaded.
     *
     * @private
     */
    Cesium3DTile.prototype.unloadContent = function() {
        if (defined(this.parent)) {
            ++this.parent.numberOfChildrenWithoutContent;
        }

        this._content = this._content && this._content.destroy();
        this._content = this._createContent();
        if (!this.hasContent && !this.hasTilesetContent) {
            addContentReadyPromise(this);
        }

        this.replacementNode = undefined;

        // Restore properties set per frame to their defaults
        this.distanceToCamera = 0;
        this.visibilityPlaneMask = 0;
        this.selected = false;
        this.lastSelectedFrameNumber = 0;
        this.lastStyleTime = 0;

        this._debugBoundingVolume = this._debugBoundingVolume && this._debugBoundingVolume.destroy();
        this._debugContentBoundingVolume = this._debugContentBoundingVolume && this._debugContentBoundingVolume.destroy();
        this._debugViewerRequestVolume = this._debugViewerRequestVolume && this._debugViewerRequestVolume.destroy();
    };

    var scratchProjectedBoundingSphere = new BoundingSphere();

    function getBoundingVolume(tile, frameState) {
        if (frameState.mode !== SceneMode.SCENE3D && !defined(tile._boundingVolume2D)) {
            var boundingSphere = tile._boundingVolume.boundingSphere;
            var sphere = BoundingSphere.projectTo2D(boundingSphere, frameState.mapProjection, scratchProjectedBoundingSphere);
            tile._boundingVolume2D = new TileBoundingSphere(sphere.center, sphere.radius);
        }

        return frameState.mode !== SceneMode.SCENE3D ? tile._boundingVolume2D : tile._boundingVolume;
    }

    /**
     * Determines whether the tile's bounding volume intersects the culling volume.
     *
     * @param {FrameState} frameState The frame state.
     * @param {Number} parentVisibilityPlaneMask The parent's plane mask to speed up the visibility check.
     * @returns {Number} A plane mask as described above in {@link CullingVolume#computeVisibilityWithPlaneMask}.
     *
     * @private
     */
    Cesium3DTile.prototype.visibility = function(frameState, parentVisibilityPlaneMask) {
        var cullingVolume = frameState.cullingVolume;
        var boundingVolume = getBoundingVolume(this, frameState);
        return cullingVolume.computeVisibilityWithPlaneMask(boundingVolume, parentVisibilityPlaneMask);
    };

    /**
     * Assuming the tile's bounding volume intersects the culling volume, determines
     * whether the tile's content's bounding volume intersects the culling volume.
     *
     * @param {FrameState} frameState The frame state.
     * @returns {Intersect} The result of the intersection: the tile's content is completely outside, completely inside, or intersecting the culling volume.
     *
     * @private
     */
    Cesium3DTile.prototype.contentsVisibility = function(frameState) {
        // Assumes the tile's bounding volume intersects the culling volume already, so
        // just return Intersect.INSIDE if there is no content bounding volume.
        if (!defined(this._contentBoundingVolume)) {
            return Intersect.INSIDE;
        }

        if (frameState.mode !== SceneMode.SCENE3D && !defined(this._contentBoundingVolume2D)) {
            var boundingSphere = this._contentBoundingVolume.boundingSphere;
            this._contentBoundingVolume2D = BoundingSphere.projectTo2D(boundingSphere);
        }

        // PERFORMANCE_IDEA: is it possible to burn less CPU on this test since we know the
        // tile's (not the content's) bounding volume intersects the culling volume?
        var cullingVolume = frameState.cullingVolume;
        var boundingVolume = frameState.mode !== SceneMode.SCENE3D ? this._contentBoundingVolume2D : this._contentBoundingVolume;
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
        var boundingVolume = getBoundingVolume(this, frameState);
        return boundingVolume.distanceToCamera(frameState);
    };

    /**
     * Checks if the camera is inside the viewer request volume.
     *
     * @param {FrameState} frameState The frame state.
     * @returns {Boolean} Whether the camera is inside the volume.
     */
    Cesium3DTile.prototype.insideViewerRequestVolume = function(frameState) {
        var viewerRequestVolume = this._viewerRequestVolume;
        if (!defined(viewerRequestVolume)) {
            return true;
        }

        return (viewerRequestVolume.distanceToCamera(frameState) === 0.0);
    };

    var scratchMatrix = new Matrix3();
    var scratchScale = new Cartesian3();
    var scratchHalfAxes = new Matrix3();
    var scratchCenter = new Cartesian3();
    var scratchRectangle = new Rectangle();

    /**
     * Create a bounding volume from the tile's bounding volume header.
     *
     * @param {Object} boundingVolumeHeader The tile's bounding volume header.
     * @param {Matrix4} transform The transform to apply to the bounding volume.
     * @param {TileBoundingVolume} [result] The object onto which to store the result.
     *
     * @returns {TileBoundingVolume} The modified result parameter or a new TileBoundingVolume instance if none was provided.
     *
     * @private
     */
    Cesium3DTile.prototype.createBoundingVolume = function(boundingVolumeHeader, transform, result) {
        var center;
        if (defined(boundingVolumeHeader.box)) {
            var box = boundingVolumeHeader.box;
            center = Cartesian3.fromElements(box[0], box[1], box[2], scratchCenter);
            var halfAxes = Matrix3.fromArray(box, 3, scratchHalfAxes);

            // Find the transformed center and halfAxes
            center = Matrix4.multiplyByPoint(transform, center, center);
            var rotationScale = Matrix4.getRotation(transform, scratchMatrix);
            halfAxes = Matrix3.multiply(rotationScale, halfAxes, halfAxes);

            if (defined(result)) {
                result.update(center, halfAxes);
                return result;
            }
            return new TileOrientedBoundingBox(center, halfAxes);
        } else if (defined(boundingVolumeHeader.region)) {
            var region = boundingVolumeHeader.region;
            var rectangleRegion = Rectangle.unpack(region, 0, scratchRectangle);

            if (defined(result)) {
                // Don't update regions when the transform changes
                return result;
            }
            return new TileBoundingRegion({
                rectangle : rectangleRegion,
                minimumHeight : region[4],
                maximumHeight : region[5]
            });
        } else if (defined(boundingVolumeHeader.sphere)) {
            var sphere = boundingVolumeHeader.sphere;
            center = Cartesian3.fromElements(sphere[0], sphere[1], sphere[2], scratchCenter);
            var radius = sphere[3];

            // Find the transformed center and radius
            center = Matrix4.multiplyByPoint(transform, center, center);
            var scale = Matrix4.getScale(transform, scratchScale);
            var uniformScale = Cartesian3.maximumComponent(scale);
            radius *= uniformScale;

            if (defined(result)) {
                result.update(center, radius);
                return result;
            }
            return new TileBoundingSphere(center, radius);
        }
    };

    var scratchTransform = new Matrix4();

    /**
     * Update the tile's transform. The transform is applied to the tile's bounding volumes.
     *
     * @private
     */
    Cesium3DTile.prototype.updateTransform = function(parentTransform) {
        parentTransform = defaultValue(parentTransform, Matrix4.IDENTITY);
        var computedTransform = Matrix4.multiply(parentTransform, this.transform, scratchTransform);
        var transformDirty = !Matrix4.equals(computedTransform, this.computedTransform);
        if (transformDirty) {
            this._transformDirty = true;
            Matrix4.clone(computedTransform, this.computedTransform);

            // Update the bounding volumes
            var header = this._header;
            var content = this._header.content;
            this._boundingVolume = this.createBoundingVolume(header.boundingVolume, computedTransform, this._boundingVolume);
            if (defined(this._contentBoundingVolume)) {
                this._contentBoundingVolume = this.createBoundingVolume(content.boundingVolume, computedTransform, this._contentBoundingVolume);
            }
            if (defined(this._viewerRequestVolume)) {
                this._viewerRequestVolume = this.createBoundingVolume(header.viewerRequestVolume, computedTransform, this._viewerRequestVolume);
            }

            // Destroy the debug bounding volumes. They will be generated fresh.
            this._debugBoundingVolume = this._debugBoundingVolume && this._debugBoundingVolume.destroy();
            this._debugContentBoundingVolume = this._debugContentBoundingVolume && this._debugContentBoundingVolume.destroy();
            this._debugViewerRequestVolume = this._debugViewerRequestVolume && this._debugViewerRequestVolume.destroy();
        }
    };

    function applyDebugSettings(tile, tileset, frameState) {
        // Tiles do not have a content.boundingVolume if it is the same as the tile's boundingVolume.
        var hasContentBoundingVolume = defined(tile._header.content) && defined(tile._header.content.boundingVolume);

        var showVolume = tileset.debugShowBoundingVolume || (tileset.debugShowContentBoundingVolume && !hasContentBoundingVolume);
        if (showVolume) {
            if (!defined(tile._debugBoundingVolume)) {
                tile._debugBoundingVolume = tile._boundingVolume.createDebugVolume(hasContentBoundingVolume ? Color.WHITE : Color.RED);
            }
            tile._debugBoundingVolume.update(frameState);
        } else if (!showVolume && defined(tile._debugBoundingVolume)) {
            tile._debugBoundingVolume = tile._debugBoundingVolume.destroy();
        }

        if (tileset.debugShowContentBoundingVolume && hasContentBoundingVolume) {
            if (!defined(tile._debugContentBoundingVolume)) {
                tile._debugContentBoundingVolume = tile._contentBoundingVolume.createDebugVolume(Color.BLUE);
            }
            tile._debugContentBoundingVolume.update(frameState);
        } else if (!tileset.debugShowContentBoundingVolume && defined(tile._debugContentBoundingVolume)) {
            tile._debugContentBoundingVolume = tile._debugContentBoundingVolume.destroy();
        }

        if (tileset.debugShowViewerRequestVolume && defined(tile._viewerRequestVolume)) {
            if (!defined(tile._debugViewerRequestVolume)) {
                tile._debugViewerRequestVolume = tile._viewerRequestVolume.createDebugVolume(Color.YELLOW);
            }
            tile._debugViewerRequestVolume.update(frameState);
        } else if (!tileset.debugShowViewerRequestVolume && defined(tile._debugViewerRequestVolume)) {
            tile._debugViewerRequestVolume = tile._debugViewerRequestVolume.destroy();
        }

        if (tileset.debugColorizeTiles && !tile._debugColorizeTiles) {
            tile._debugColorizeTiles = true;
            tile._content.applyDebugSettings(true, tile._debugColor);
        } else if (!tileset.debugColorizeTiles && tile._debugColorizeTiles) {
            tile._debugColorizeTiles = false;
            tile._content.applyDebugSettings(false, tile._debugColor);
        }
    }

    /**
     * Get the draw commands needed to render this tile.
     *
     * @private
     */
    Cesium3DTile.prototype.update = function(tileset, frameState) {
        applyDebugSettings(this, tileset, frameState);
        this._content.update(tileset, frameState);
        this._transformDirty = false;
    };

    var scratchCommandList = [];

    /**
     * Processes the tile's content, e.g., create WebGL resources, to move from the PROCESSING to READY state.
     *
     * @param {Cesium3DTileset} tileset The tileset containing this tile.
     * @param {FrameState} frameState The frame state.
     *
     * @private
     */
    Cesium3DTile.prototype.process = function(tileset, frameState) {
        var savedCommandList = frameState.commandList;
        frameState.commandList = scratchCommandList;

        this._content.update(tileset, frameState);

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
        this._debugViewerRequestVolume = this._debugViewerRequestVolume && this._debugViewerRequestVolume.destroy();
        return destroyObject(this);
    };

    return Cesium3DTile;
});
