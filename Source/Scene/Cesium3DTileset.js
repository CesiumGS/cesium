/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Check',
        '../Core/Color',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DoublyLinkedList',
        '../Core/Event',
        '../Core/freezeObject',
        '../Core/getBaseUri',
        '../Core/getExtensionFromUri',
        '../Core/Heap',
        '../Core/Intersect',
        '../Core/isDataUri',
        '../Core/joinUrls',
        '../Core/JulianDate',
        '../Core/loadJson',
        '../Core/ManagedArray',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../Renderer/ClearCommand',
        '../Renderer/Pass',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Axis',
        './Cesium3DTile',
        './Cesium3DTileChildrenVisibility',
        './Cesium3DTileColorBlendMode',
        './Cesium3DTileOptimizations',
        './Cesium3DTileOptimizationHint',
        './Cesium3DTileRefine',
        './Cesium3DTilesetStatistics',
        './Cesium3DTilesetTraversal',
        './Cesium3DTileStyleEngine',
        './CullingVolume',
        './DebugCameraPrimitive',
        './LabelCollection',
        './OrthographicFrustum',
        './SceneMode',
        './ShadowMode',
        './TileBoundingRegion',
        './TileBoundingSphere',
        './TileOrientedBoundingBox'
    ], function(
        Cartesian3,
        Cartographic,
        Check,
        Color,
        clone,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DoublyLinkedList,
        Event,
        freezeObject,
        getBaseUri,
        getExtensionFromUri,
        Heap,
        Intersect,
        isDataUri,
        joinUrls,
        JulianDate,
        loadJson,
        ManagedArray,
        CesiumMath,
        Matrix4,
        Request,
        RequestScheduler,
        RequestType,
        ClearCommand,
        Pass,
        Uri,
        when,
        Axis,
        Cesium3DTile,
        Cesium3DTileChildrenVisibility,
        Cesium3DTileColorBlendMode,
        Cesium3DTileOptimizations,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine,
        Cesium3DTilesetStatistics,
        Cesium3DTilesetTraversal,
        Cesium3DTileStyleEngine,
        CullingVolume,
        DebugCameraPrimitive,
        LabelCollection,
        OrthographicFrustum,
        SceneMode,
        ShadowMode,
        TileBoundingRegion,
        TileBoundingSphere,
        TileOrientedBoundingBox) {
    'use strict';

    /**
     * A {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles tileset},
     * used for streaming massive heterogeneous 3D geospatial datasets.
     *
     * @alias Cesium3DTileset
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url to a tileset.json file or to a directory containing a tileset.json file.
     * @param {Boolean} [options.show=true] Determines if the tileset will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] A 4x4 transformation matrix that transforms the tileset's root tile.
     * @param {Number} [options.maximumScreenSpaceError=16] The maximum screen-space error used to drive level-of-detail refinement.
     * @param {Number} [options.maximumMemoryUsage=512] The maximum amount of memory in MB that can be used by the tileset.
     * @param {Boolean} [options.cullWithChildrenBounds=true] Whether to cull tiles using the union of their children bounding volumes.
     * @param {Boolean} [options.dynamicScreenSpaceError=false] Reduce the screen space error for tiles that are further away from the camera.
     * @param {Number} [options.dynamicScreenSpaceErrorDensity=0.00278] Density used to adjust the dynamic screen space error, similar to fog density.
     * @param {Number} [options.dynamicScreenSpaceErrorFactor=4.0] A factor used to increase the computed dynamic screen space error.
     * @param {Number} [options.dynamicScreenSpaceErrorHeightFalloff=0.25] A ratio of the tileset's height at which the density starts to falloff.
     * @param {Boolean} [options.debugFreezeFrame=false] For debugging only. Determines if only the tiles from last frame should be used for rendering.
     * @param {Boolean} [options.debugColorizeTiles=false] For debugging only. When true, assigns a random color to each tile.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. When true, render's each tile's content as a wireframe.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. When true, renders the bounding volume for each tile.
     * @param {Boolean} [options.debugShowContentBoundingVolume=false] For debugging only. When true, renders the bounding volume for each tile's content.
     * @param {Boolean} [options.debugShowViewerRequestVolume=false] For debugging only. When true, renders the viewer request volume for each tile.
     * @param {Boolean} [options.debugShowGeometricError=false] For debugging only. When true, draws labels to indicate the geometric error of each tile.
     * @param {Boolean} [options.debugShowRenderingStatistics=false] For debugging only. When true, draws labels to indicate the number of commands, points, triangles and features for each tile.
     * @param {Boolean} [options.debugShowMemoryUsage=false] For debugging only. When true, draws labels to indicate the texture and vertex memory in megabytes used by each tile.
     * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the tileset casts or receives shadows from each light source.
     * @param {Boolean} [options.skipLODs=true] Determines if level-of-detail skipping optimization should be used.
     * @param {Number} [options.baseScreenSpaceError=1024] The screen-space error that must be reached before skipping LODs
     * @param {Number} [options.skipScreenSpaceErrorFactor=10] Multiplier defining the minimum screen space error to skip when loading tiles. Used in conjuction with skipLevels to determine which tiles to load.
     * @param {Number} [options.skipLevels=1] Constant defining the minimum number of levels to skip when loading tiles. When it is 0, no levels are skipped. Used in conjuction with skipScreenSpaceErrorFactor to determine which tiles to load.
     * @param {Boolean} [options.immediatelyLoadDesiredLOD=false] When true, do not progressively refine. Immediately load the desired LOD.
     * @param {Boolean} [options.loadSiblings=false] Determines whether sibling tiles should be loaded when skipping levels-of-detail. When true, the siblings of any visible and downloaded tile are downloaded as well.
     *
     * @exception {DeveloperError} The tileset must be 3D Tiles version 0.0.  See https://github.com/AnalyticalGraphicsInc/3d-tiles#spec-status
     *
     * @example
     * var tileset = scene.primitives.add(new Cesium.Cesium3DTileset({
     *      url : 'http://localhost:8002/tilesets/Seattle'
     * }));
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles specification}
     */
    function Cesium3DTileset(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var url = options.url;

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('options.url', url);
        //>>includeEnd('debug');

        var tilesetUrl;
        var baseUrl;

        if (getExtensionFromUri(url) === 'json') {
            tilesetUrl = url;
            baseUrl = getBaseUri(url, true);
        } else if (isDataUri(url)) {
            tilesetUrl = url;
            baseUrl = '';
        } else {
            baseUrl = url;
            tilesetUrl = joinUrls(baseUrl, 'tileset.json');
        }

        this._url = url;
        this._baseUrl = baseUrl;
        this._tilesetUrl = tilesetUrl;
        this._root = undefined;
        this._asset = undefined; // Metadata for the entire tileset
        this._properties = undefined; // Metadata for per-model/point/etc properties
        this._geometricError = undefined; // Geometric error when the tree is not rendered at all
        this._gltfUpAxis = undefined;
        this._processingQueue = [];
        this._selectedTiles = [];
        this._desiredTiles = new ManagedArray();
        this._selectedTilesToStyle = [];
        this._loadTimestamp = undefined;
        this._timeSinceLoad = 0.0;

        var replacementList = new DoublyLinkedList();

        // [head, sentinel) -> tiles that weren't selected this frame and may be replaced
        // (sentinel, tail] -> tiles that were selected this frame
        this._replacementList = replacementList; // Tiles with content loaded.  For cache management.
        this._replacementSentinel  = replacementList.add();
        this._trimTiles = false;

        this._cullWithChildrenBounds = defaultValue(options.cullWithChildrenBounds, true);

        this._requestHeaps = {};
        this._hasMixedContent = false;

        this._baseTraversal = new Cesium3DTilesetTraversal.BaseTraversal();
        this._skipTraversal = new Cesium3DTilesetTraversal.SkipTraversal({
            selectionHeuristic: selectionHeuristic
        });

        this._backfaceCommands = new ManagedArray();

        this._maximumScreenSpaceError = defaultValue(options.maximumScreenSpaceError, 16);
        this._baseScreenSpaceError = defaultValue(options.baseScreenSpaceError, 1024);
        this._maximumMemoryUsage = defaultValue(options.maximumMemoryUsage, 512);

        this._styleEngine = new Cesium3DTileStyleEngine();

        this._modelMatrix = defined(options.modelMatrix) ? Matrix4.clone(options.modelMatrix) : Matrix4.clone(Matrix4.IDENTITY);

        this._statistics = new Cesium3DTilesetStatistics();
        this._statisticsLastColor = new Cesium3DTilesetStatistics();
        this._statisticsLastPick = new Cesium3DTilesetStatistics();

        this._tilesLoaded = false;

        this._tileInfoLabels = undefined;

        this._readyPromise = when.defer();

        /**
         * Whether the tileset should should refine based on a dynamic screen space error. Tiles that are further
         * away will be rendered with lower detail than closer tiles. This improves performance by rendering fewer
         * tiles and making less requests, but may result in a slight drop in visual quality for tiles in the distance.
         * The algorithm is biased towards "street views" where the camera is close to the floor of the tileset and looking
         * at the horizon. In addition results are more accurate for tightly fitting bounding volumes like box and region.
         *
         * @type {Boolean}
         * @default false
         *
         * @see Fog
         */
        this.dynamicScreenSpaceError = defaultValue(options.dynamicScreenSpaceError, false);

        /**
         * A scalar that determines the density used to adjust the dynamic SSE, similar to {@link Fog}. Increasing this
         * value has the effect of increasing the maximum screen space error for all tiles, but in a non-linear fashion.
         * The error starts at 0.0 and increases exponentially until a midpoint is reached, and then approaches 1.0 asymptotically.
         * This has the effect of keeping high detail in the closer tiles and lower detail in the further tiles, with all tiles
         * beyond a certain distance all roughly having an error of 1.0.
         *
         * The dynamic error is in the range [0.0, 1.0) and is multiplied by dynamicScreenSpaceErrorFactor to produce the
         * final dynamic error. This dynamic error is then subtracted from the tile's actual screen space error.
         *
         * Increasing dynamicScreenSpaceErrorDensity has the effect of moving the error midpoint closer to the camera.
         * It is analogous to moving fog closer to the camera.
         *
         * @type {Number}
         * @default 0.00278
         *
         * @see Fog.density
         */
        this.dynamicScreenSpaceErrorDensity = 0.00278;

        /**
         * A factor used to increase the screen space error of tiles for dynamic SSE. As this value increases less tiles
         * are requested for rendering and tiles in the distance will have lower detail. If set to zero, the feature will be disabled.
         *
         * @type {Number}
         * @default 4.0
         *
         * @see Fog.screenSpaceErrorFactor
         */
        this.dynamicScreenSpaceErrorFactor = 4.0;

        /**
         * A ratio of the tileset's height at which the density starts to falloff. If the camera is below this height the
         * full computed density is applied, otherwise the density falls off. This has the effect of higher density at
         * street level views.
         *
         * Valid values are between 0.0 and 1.0.
         *
         * @type {Number}
         * @default 0.25
         */
        this.dynamicScreenSpaceErrorHeightFalloff = 0.25;

        this._dynamicScreenSpaceErrorComputedDensity = 0.0; // Updated based on the camera position and direction

        /**
         * Determines whether the tileset casts or receives shadows from each light source.
         *
         * @type {ShadowMode}
         * @default ShadowMode.ENABLED
         */
        this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);

        /**
         * Determines if the tileset will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * Defines how per-feature colors set from the Cesium API or declarative styling blend with the source colors from
         * the original feature, e.g. glTF material or per-point color in the tile.
         *
         * @type {Cesium3DTileColorBlendMode}
         * @default Cesium3DTileColorBlendMode.HIGHLIGHT
         */
        this.colorBlendMode = Cesium3DTileColorBlendMode.HIGHLIGHT;

        /**
         * Defines the value used to linearly interpolate between the source color and feature color when the colorBlendMode is MIX.
         * A value of 0.0 results in the source color while a value of 1.0 results in the feature color, with any value in-between
         * resulting in a mix of the source color and feature color.
         *
         * @type {Number}
         * @default 0.5
         */
        this.colorBlendAmount = 0.5;

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * Determines if only the tiles from last frame should be used for rendering.  This
         * effectively "freezes" the tileset to the previous frame so it is possible to zoom
         * out and see what was rendered.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugFreezeFrame = defaultValue(options.debugFreezeFrame, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, assigns a random color to each tile.  This is useful for visualizing
         * what models belong to what tiles, especially with additive refinement where models
         * from parent tiles may be interleaved with models from child tiles.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugColorizeTiles = defaultValue(options.debugColorizeTiles, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, renders each tile's content as a wireframe.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugWireframe = defaultValue(options.debugWireframe, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, renders the bounding volume for each visible tile.  The bounding volume is
         * white if the tile's content has an explicit bounding volume; otherwise, it
         * is red.  Tiles that are not at final resolution are yellow.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, renders a blue bounding volume for each tile's content.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugShowContentBoundingVolume = defaultValue(options.debugShowContentBoundingVolume, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, renders the viewer request volume for each tile.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugShowViewerRequestVolume = defaultValue(options.debugShowViewerRequestVolume, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, draws labels to indicate the geometric error of each tile.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugShowGeometricError = defaultValue(options.debugShowGeometricError, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, draws labels to indicate the number of commands, points, triangles and features of each tile.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugShowRenderingStatistics = defaultValue(options.debugShowRenderingStatistics, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, draws labels to indicate the vertex and texture memory usage of each tile.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugShowMemoryUsage = defaultValue(options.debugShowMemoryUsage, false);

        /**
         * The event fired to indicate progress of loading new tiles.  This event is fired when a new tile
         * is requested, when a requested tile is finished downloading, and when a downloaded tile has been
         * processed and is ready to render.
         * <p>
         * The number of pending tile requests, <code>numberOfPendingRequests</code>, and number of tiles
         * processing, <code>numberProcessing</code> are passed to the event listener.
         * </p>
         * <p>
         * This event is fired at the end of the frame after the scene is rendered.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * city.loadProgress.addEventListener(function(numberOfPendingRequests, numberProcessing) {
         *     if ((numberOfPendingRequests === 0) && (numberProcessing === 0)) {
         *         console.log('Stopped loading');
         *         return;
         *     }
         *
         *     console.log('Loading: requests: ' + numberOfPendingRequests + ', processing: ' + numberProcessing);
         * });
         */
        this.loadProgress = new Event();

        /**
         * The event fired to indicate that all tiles that meet the screen space error this frame are loaded. The tileset
         * is completely loaded for this view.
         * <p>
         * This event is fired at the end of the frame after the scene is rendered.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * city.allTilesLoaded.addEventListener(function() {
         *     console.log('All tiles are loaded');
         * });
         *
         * @see Cesium3DTileset#tilesLoaded
         */
        this.allTilesLoaded = new Event();

        /**
         * The event fired to indicate that a tile's content was unloaded.
         * <p>
         * The unloaded {@link Cesium3DTile} is passed to the event listener.
         * </p>
         * <p>
         * This event is fired immediately before the tile's content is unloaded while the frame is being
         * rendered so that the event listener has access to the tile's content.  Do not create
         * or modify Cesium entities or primitives during the event listener.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * tileset.tileUnload.addEventListener(function(tile) {
         *     console.log('A tile was unloaded from the cache.');
         * });
         *
         * @see Cesium3DTileset#maximumMemoryUsage
         * @see Cesium3DTileset#trimLoadedTiles
         */
        this.tileUnload = new Event();

        /**
         * This event fires once for each visible tile in a frame.  This can be used to manually
         * style a tileset.
         * <p>
         * The visible {@link Cesium3DTile} is passed to the event listener.
         * </p>
         * <p>
         * This event is fired during the tileset traversal while the frame is being rendered
         * so that updates to the tile take effect in the same frame.  Do not create or modify
         * Cesium entities or primitives during the event listener.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * tileset.tileVisible.addEventListener(function(tile) {
         *     if (tile.content instanceof Cesium.Batched3DModel3DTileContent) {
         *         console.log('A Batched 3D Model tile is visible.');
         *     }
         * });
         */
        this.tileVisible = new Event();

        /**
         * Determines if level-of-detail skipping optimization should be used.
         *
         * @type {Boolean}
         * @default true
         */
        this.skipLODs = defaultValue(options.skipLODs, true);

        /**
         * Multiplier defining the minimum screen space error to skip.
         * For example, if a tile has screen space error of 100, no tiles will be loaded unless they
         * are leaves or have a screen space error <= 100 / skipSSEFactor.
         *
         * Only used when tileset.skipLODs === true.
         *
         * @type {Number}
         * @default 10
         */
        this.skipScreenSpaceErrorFactor = defaultValue(options.skipScreenSpaceErrorFactor, 10);

        /**
         * Constant defining the minimum number of levels skip. When it is 0, no levels are skipped.
         * For example, if a tile is level 1, no tiles will be loaded unless they
         * are at level greater than 2.
         *
         * Only used when tileset.skipLODs === true.
         *
         * @type {Number}
         * @default 1
         */
        this.skipLevels = defaultValue(options.skipLevels, 1);

        /**
         * When true, only tiles that meet the maximum screen space error will ever be downloaded.
         * Skipping factors are ignored and just the desired tiles are loaded.
         *
         * Only used when tileset.skipLODs === true.
         *
         * @type {Boolean}
         * @default false
         */
        this.immediatelyLoadDesiredLOD = defaultValue(options.immediatelyLoadDesiredLOD, false);

        /**
         * Determines whether sibling tiles should be loaded when skipping levels-of-detail.
         * When true, the siblings of any visible and downloaded tile are downloaded as well.
         * This may be useful for ensuring that tiles are already available when the viewer turns left/right.
         *
         * Only used when tileset.skipLODs === true.
         *
         * @type {Boolean}
         * @default false
         */
        this.loadSiblings = defaultValue(options.loadSiblings, false);

        var that = this;

        // We don't know the distance of the tileset until tileset.json is loaded, so use the default distance for now
        RequestScheduler.request(tilesetUrl, loadJson, undefined, RequestType.TILES3D).then(function(tilesetJson) {
            if (that.isDestroyed()) {
                return when.reject('tileset is destroyed');
            }
            that._root = that.loadTileset(tilesetUrl, tilesetJson);

            var gltfUpAxis = defined(tilesetJson.asset.gltfUpAxis) ? Axis.fromName(tilesetJson.asset.gltfUpAxis) : Axis.Y;
            that._asset = tilesetJson.asset;
            that._properties = tilesetJson.properties;
            that._geometricError = tilesetJson.geometricError;
            that._gltfUpAxis = gltfUpAxis;
            that._readyPromise.resolve(that);
        }).otherwise(function(error) {
            that._readyPromise.reject(error);
        });
    }

    defineProperties(Cesium3DTileset.prototype, {
        /**
         * Gets the tileset's asset object property, which contains metadata about the tileset.
         * <p>
         * See the {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/schema/asset.schema.json|asset schema}
         * in the 3D Tiles spec for the full set of properties.
         * </p>
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @exception {DeveloperError} The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.
         *
         * @example
         * console.log('3D Tiles version: ' + tileset.asset.version);
         */
        asset : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this.ready) {
                    throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._asset;
            }
        },

        /**
         * Gets the tileset's properties dictionary object, which contains metadata about per-feature properties.
         * <p>
         * See the {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/schema/properties.schema.json|properties schema}
         * in the 3D Tiles spec for the full set of properties.
         * </p>
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @exception {DeveloperError} The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.
         *
         * @example
         * console.log('Maximum building height: ' + tileset.properties.height.maximum);
         * console.log('Minimum building height: ' + tileset.properties.height.minimum);
         *
         * @see {Cesium3DTileFeature#getProperty}
         * @see {Cesium3DTileFeature#setProperty}
         */
        properties : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this.ready) {
                    throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._properties;
            }
        },

        /**
         * When <code>true</code>, the tileset's root tile is loaded and the tileset is ready to render.
         * This is set to <code>true</code> right before {@link Cesium3DTileset#readyPromise} is resolved.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        ready : {
            get : function() {
                return defined(this._root);
            }
        },

        /**
         * Gets the promise that will be resolved when the tileset's root tile is loaded and the tileset is ready to render.
         * <p>
         * This promise is resolved at the end of the frame before the first frame the tileset is rendered in.
         * </p>
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Promise.<Cesium3DTileset>}
         * @readonly
         *
         * @example
         * Cesium.when(tileset.readyPromise).then(function(tileset) {
         *     // tile.properties is not defined until readyPromise resolves.
         *     var properties = tileset.properties;
         *     if (Cesium.defined(properties)) {
         *         for (var name in properties) {
         *             console.log(properties[name]);
         *         }
         *     }
         * });
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * When <code>true</code>, all tiles that meet the screen space error this frame are loaded. The tileset is
         * completely loaded for this view.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         *
         * @see Cesium3DTileset#allTilesLoaded
         */
        tilesLoaded : {
            get : function() {
                return this._tilesLoaded;
            }
        },

        /**
         * The url to a tileset.json file or to a directory containing a tileset.json file.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * The base path that non-absolute paths in tileset.json are relative to.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {String}
         * @readonly
         */
        baseUrl : {
            get : function() {
                return this._baseUrl;
            }
        },

        /**
         * The style, defined using the
         * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language},
         * applied to each feature in the tileset.
         * <p>
         * Assign <code>undefined</code> to remove the style, which will restore the visual
         * appearance of the tileset to its default when no style was applied.
         * </p>
         * <p>
         * The style is applied to a tile before the {@link Cesium3DTileset#tileVisible}
         * event is raised, so code in <code>tileVisible</code> can manually set a feature's
         * properties using {@link Cesium3DTileContent#getFeature}.  When
         * a new style is assigned any manually set properties are overwritten.
         * </p>
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Cesium3DTileStyle}
         *
         * @default undefined
         *
         * @example
         * tileset.style = new Cesium.Cesium3DTileStyle({
         *    color : {
         *        conditions : [
         *            ['${Height} >= 100', 'color("purple", 0.5)'],
         *            ['${Height} >= 50', 'color("red")'],
         *            ['true', 'color("blue")']
         *        ]
         *    },
         *    show : '${Height} > 0',
         *    meta : {
         *        description : '"Building id ${id} has height ${Height}."'
         *    }
         * });
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        style : {
            get : function() {
                return this._styleEngine.style;
            },
            set : function(value) {
                this._styleEngine.style = value;
            }
        },

        /**
         * The maximum screen-space error used to drive level-of-detail refinement.  Higher
         * values will provide better performance but lower visual quality.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Number}
         * @default 16
         *
         * @exception {DeveloperError} <code>maximumScreenSpaceError</code> must be greater than or equal to zero.
         */
        maximumScreenSpaceError : {
            get : function() {
                return this._maximumScreenSpaceError;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('maximumScreenSpaceError', value, 0);
                //>>includeEnd('debug');

                this._maximumScreenSpaceError = value;
            }
        },

        /**
         * The maximum amount of memory in MB that can be used by the tileset.
         * Tiles not in view are unloaded to enforce this.
         * <p>
         * If decreasing this value results in unloading tiles, the tiles are unloaded the next frame.
         * </p>
         * <p>
         * If tiles sized more than <code>maximumMemoryUsage</code> are needed
         * to meet the desired screen-space error, determined by {@link Cesium3DTileset#maximumScreenSpaceError},
         * for the current view, then the memory usage of the tiles loaded will exceed
         * <code>maximumMemoryUsage</code>.  For example, if the maximum is 256 MB, but
         * 300 MB of tiles are needed to meet the screen-space error, then 300 MB of tiles may be loaded.  When
         * these tiles go out of view, they will be unloaded.
         * </p>
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Number}
         * @default 512
         *
         * @exception {DeveloperError} <code>maximumMemoryUsage</code> must be greater than or equal to zero.
         * @see Cesium3DTileset#totalMemoryUsageInBytes
         */
        maximumMemoryUsage : {
            get : function() {
                return this._maximumMemoryUsage;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0);
                //>>includeEnd('debug');

                this._maximumMemoryUsage = value;
            }
        },

        /**
         * The tileset's bounding volume.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {TileBoundingVolume}
         * @readonly
         *
         * @exception {DeveloperError} The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.
         */
        boundingVolume : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this.ready) {
                    throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._root._boundingVolume;
            }
        },

        /**
         * The tileset's bounding sphere.
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {BoundingSphere}
         * @readonly
         *
         * @exception {DeveloperError} The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.
         */
        boundingSphere : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this.ready) {
                    throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._root.boundingSphere;
            }
        },

        /**
         * A 4x4 transformation matrix that transforms the tileset's root tile.
         *
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        modelMatrix : {
            get : function() {
                return this._modelMatrix;
            },
            set : function(value) {
                this._modelMatrix = Matrix4.clone(value, this._modelMatrix);
                if (defined(this._root)) {
                    // Update the root transform right away instead of waiting for the next update loop.
                    // Useful, for example, when setting the modelMatrix and then having the camera view the tileset.
                    this._root.updateTransform(this._modelMatrix);
                }
            }
        },

        /**
         * Returns the time, in seconds, since the tileset was loaded and first updated.
         *
         * @type {Number}
         */
        timeSinceLoad : {
            get : function() {
                return this._timeSinceLoad;
            }
        },

        /**
         * Returns the total amount of memory used in bytes by the tileset.
         * This is calculated as the sum of the vertex and index buffer, texture memory and batch table size
         * of the loaded tiles in the tileset.
         *
         * @type {Number}
         * @see Cesium3DTileset#maximumMemoryUsage
         */
        totalMemoryUsageInBytes : {
            get : function() {
                var statistics = this._statistics;
                return statistics.textureMemorySizeInBytes + statistics.vertexMemorySizeInBytes + statistics.batchTableMemorySizeInBytes;
            }
        },

        /**
         * @private
         */
        styleEngine : {
            get : function() {
                return this._styleEngine;
            }
        },

        /**
         * @private
         */
        statistics : {
            get : function() {
                return this._statistics;
            }
        }
    });

    /**
     * Marks the tileset's {@link Cesium3DTileset#style} as dirty, which forces all
     * features to re-evaluate the style in the next frame each is visible.  Call
     * this when a style changes.
     */
    Cesium3DTileset.prototype.makeStyleDirty = function() {
        this._styleEngine.makeDirty();
    };

    /**
     * Loads the main tileset.json or a tileset.json referenced from a tile.
     *
     * @private
     */
    Cesium3DTileset.prototype.loadTileset = function(tilesetUrl, tilesetJson, parentTile) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tilesetJson.asset) || (tilesetJson.asset.version !== '0.0')) {
            throw new DeveloperError('The tileset must be 3D Tiles version 0.0.  See https://github.com/AnalyticalGraphicsInc/3d-tiles#spec-status');
        }
        //>>includeEnd('debug');

        var statistics = this._statistics;

        // Append the version to the baseUrl
        var hasVersionQuery = /[?&]v=/.test(tilesetUrl);
        if (!hasVersionQuery) {
            var versionQuery = '?v=' + defaultValue(tilesetJson.asset.tilesetVersion, '0.0');
            this._baseUrl = joinUrls(this._baseUrl, versionQuery);
            tilesetUrl = joinUrls(tilesetUrl, versionQuery, false);
        }

        // A tileset.json referenced from a tile may exist in a different directory than the root tileset.
        // Get the baseUrl relative to the external tileset.
        var baseUrl = getBaseUri(tilesetUrl, true);
        var rootTile = new Cesium3DTile(this, baseUrl, tilesetJson.root, parentTile);

        // If there is a parentTile, add the root of the currently loading tileset
        // to parentTile's children, and update its _depth.
        if (defined(parentTile)) {
            parentTile.children.push(rootTile);
            rootTile._depth = parentTile._depth + 1;
        }

        ++statistics.numberTotal;

        var stack = [];
        stack.push({
            header : tilesetJson.root,
            cesium3DTile : rootTile
        });

        while (stack.length > 0) {
            var tile = stack.pop();
            var tile3D = tile.cesium3DTile;
            var children = tile.header.children;
            if (defined(children)) {
                var length = children.length;
                for (var k = 0; k < length; ++k) {
                    var childHeader = children[k];
                    var childTile = new Cesium3DTile(this, baseUrl, childHeader, tile3D);
                    tile3D.children.push(childTile);
                    childTile._depth = tile3D._depth + 1;
                    ++statistics.numberTotal;
                    stack.push({
                        header : childHeader,
                        cesium3DTile : childTile
                    });
                }
            }

            if (this._cullWithChildrenBounds) {
                Cesium3DTileOptimizations.checkChildrenWithinParent(tile3D, true);
            }

            // Create a load heap, one for each unique server. We can only make limited requests to a given
            // server so it is unnecessary to keep a queue of all tiles needed to be loaded.
            // Instead of creating a list of all tiles to load and then sorting it entirely to find the best ones,
            // we keep just a heap so we have the best `maximumRequestsPerServer` to load. The order of these does
            // not matter much as we will try to load them all.
            // The heap approach is a O(n log k) to find the best tiles for loading.
            var requestServer = tile3D.requestServer;
            if (defined(requestServer)) {
                if (!defined(this._requestHeaps[requestServer])) {
                    var heap = new Heap(sortForLoad);
                    this._requestHeaps[requestServer] = heap;
                    heap.maximumSize = RequestScheduler.maximumRequestsPerServer;
                    heap.reserve(heap.maximumSize);
                }
                tile3D._requestHeap = this._requestHeaps[requestServer];
            }
        }

        return rootTile;
    };

    var scratchPositionNormal = new Cartesian3();
    var scratchCartographic = new Cartographic();
    var scratchMatrix = new Matrix4();
    var scratchCenter = new Cartesian3();
    var scratchPosition = new Cartesian3();
    var scratchDirection = new Cartesian3();

    function updateDynamicScreenSpaceError(tileset, frameState) {
        var up;
        var direction;
        var height;
        var minimumHeight;
        var maximumHeight;

        var camera = frameState.camera;
        var root = tileset._root;
        var tileBoundingVolume = root.contentBoundingVolume;

        if (tileBoundingVolume instanceof TileBoundingRegion) {
            up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
            direction = camera.directionWC;
            height = camera.positionCartographic.height;
            minimumHeight = tileBoundingVolume.minimumHeight;
            maximumHeight = tileBoundingVolume.maximumHeight;
        } else {
            // Transform camera position and direction into the local coordinate system of the tileset
            var transformLocal = Matrix4.inverseTransformation(root.computedTransform, scratchMatrix);
            var ellipsoid = frameState.mapProjection.ellipsoid;
            var boundingVolume = tileBoundingVolume.boundingVolume;
            var centerLocal = Matrix4.multiplyByPoint(transformLocal, boundingVolume.center, scratchCenter);
            if (Cartesian3.magnitude(centerLocal) > ellipsoid.minimumRadius) {
                // The tileset is defined in WGS84. Approximate the minimum and maximum height.
                var centerCartographic = Cartographic.fromCartesian(centerLocal, ellipsoid, scratchCartographic);
                up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
                direction = camera.directionWC;
                height = camera.positionCartographic.height;
                minimumHeight = 0.0;
                maximumHeight = centerCartographic.height * 2.0;
            } else {
                // The tileset is defined in local coordinates (z-up)
                var positionLocal = Matrix4.multiplyByPoint(transformLocal, camera.positionWC, scratchPosition);
                up = Cartesian3.UNIT_Z;
                direction = Matrix4.multiplyByPointAsVector(transformLocal, camera.directionWC, scratchDirection);
                direction = Cartesian3.normalize(direction, direction);
                height = positionLocal.z;
                if (tileBoundingVolume instanceof TileOrientedBoundingBox) {
                    // Assuming z-up, the last component stores the half-height of the box
                    var boxHeight = root._header.boundingVolume.box[11];
                    minimumHeight = centerLocal.z - boxHeight;
                    maximumHeight = centerLocal.z + boxHeight;
                } else if (tileBoundingVolume instanceof TileBoundingSphere) {
                    var radius = boundingVolume.radius;
                    minimumHeight = centerLocal.z - radius;
                    maximumHeight = centerLocal.z + radius;
                }
            }
        }

        // The range where the density starts to lessen. Start at the quarter height of the tileset.
        var heightFalloff = tileset.dynamicScreenSpaceErrorHeightFalloff;
        var heightClose = minimumHeight + (maximumHeight - minimumHeight) * heightFalloff;
        var heightFar = maximumHeight;

        var t = CesiumMath.clamp((height - heightClose) / (heightFar - heightClose), 0.0, 1.0);

        // Increase density as the camera tilts towards the horizon
        var dot = Math.abs(Cartesian3.dot(direction, up));
        var horizonFactor = 1.0 - dot;

        // Weaken the horizon factor as the camera height increases, implying the camera is further away from the tileset.
        // The goal is to increase density for the "street view", not when viewing the tileset from a distance.
        horizonFactor = horizonFactor * (1.0 - t);

        var density = tileset.dynamicScreenSpaceErrorDensity;
        density *= horizonFactor;

        tileset._dynamicScreenSpaceErrorComputedDensity = density;
    }

    function sortForLoad(a, b) {
        var distanceDifference = a.distanceToCamera - b.distanceToCamera;
        if (a.refine === Cesium3DTileRefine.ADD || b.refine === Cesium3DTileRefine.ADD) {
            return distanceDifference;
        }

        var screenSpaceErrorDifference = b._screenSpaceError - a._screenSpaceError;
        return screenSpaceErrorDifference === 0 ? distanceDifference : screenSpaceErrorDifference;
    }

    ///////////////////////////////////////////////////////////////////////////

    function destroySubtree(tileset, tile) {
        var root = tile;
        var statistics = tileset._statistics;
        var stack = scratchStack;
        stack.push(tile);
        while (stack.length > 0) {
            tile = stack.pop();
            var children = tile.children;
            var length = children.length;
            for (var i = 0; i < length; ++i) {
                stack.push(children[i]);
            }
            if (tile !== root) {
                unloadTileFromCache(tileset, tile);
                tile.destroy();
                --statistics.numberTotal;
            }
        }
        root.children = [];
    }

    function requestContent(tileset, tile, outOfCore) {
        if (!outOfCore) {
            return;
        }

        if (tile.hasEmptyContent) {
            return;
        }

        var statistics = tileset._statistics;
        var expired = tile.contentExpired;
        var requested = tile.requestContent();

        if (!requested) {
            ++statistics.numberOfAttemptedRequests;
            return;
        }

        if (expired) {
            if (tile.hasRenderableContent) {
                statistics.decrementLoadCounts(tile.content);
                --tileset._statistics.numberContentReady;
            } else if (tile.hasTilesetContent) {
                destroySubtree(tileset, tile);
            }
        }

        ++statistics.numberOfPendingRequests;

        var removeFunction = removeFromProcessingQueue(tileset, tile);
        tile.contentReadyToProcessPromise.then(addToProcessingQueue(tileset, tile));
        tile.contentReadyPromise.then(removeFunction).otherwise(removeFunction);
    }

    function requestTiles(tileset, requestHeaps, outOfCore) {
        for (var name in requestHeaps) {
            if (requestHeaps.hasOwnProperty(name)) {
                var heap = requestHeaps[name];
                var tile;
                while (defined(tile = heap.pop())) {
                    requestContent(tileset, tile, outOfCore);
                }
            }
        }
    }

    function selectionHeuristic(tileset, ancestor, tile) {
        var skipLevels = tileset.skipLODs ? tileset.skipLevels : 0;
        var skipScreenSpaceErrorFactor = tileset.skipLODs ? tileset.skipScreenSpaceErrorFactor : 0.1;

        return (ancestor !== tile && !tile.hasEmptyContent && !tileset.immediatelyLoadDesiredLOD) &&
               (tile._screenSpaceError < ancestor._screenSpaceError / skipScreenSpaceErrorFactor) &&
               (tile._depth > ancestor._depth + skipLevels);
    }

    ///////////////////////////////////////////////////////////////////////////

    function addToProcessingQueue(tileset, tile) {
        return function() {
            tileset._processingQueue.push(tile);

            --tileset._statistics.numberOfPendingRequests;
            ++tileset._statistics.numberProcessing;
        };
    }

    function removeFromProcessingQueue(tileset, tile) {
        return function() {
            var index = tileset._processingQueue.indexOf(tile);
            if (index >= 0) {
                // Remove from processing queue
                tileset._processingQueue.splice(index, 1);
                --tileset._statistics.numberProcessing;

                if (tile.hasRenderableContent) {
                    // RESEARCH_IDEA: ability to unload tiles (without content) for an
                    // external tileset when all the tiles are unloaded.
                    tileset._statistics.incrementLoadCounts(tile.content);
                    ++tileset._statistics.numberContentReady;

                    // Add to the tile cache. Previously expired tiles are already in the cache.
                    if (!defined(tile.replacementNode)) {
                        tile.replacementNode = tileset._replacementList.add(tile);
                    }
                }
            } else {
                // Not in processing queue
                // For example, when a url request fails and the ready promise is rejected
                --tileset._statistics.numberOfPendingRequests;
            }
        };
    }

    function processTiles(tileset, frameState) {
        var tiles = tileset._processingQueue;
        var length = tiles.length;

        // Process tiles in the PROCESSING state so they will eventually move to the READY state.
        // Traverse backwards in case a tile is removed as a result of calling process()
        for (var i = length - 1; i >= 0; --i) {
            tiles[i].process(tileset, frameState);
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    var scratchCartesian2 = new Cartesian3();

    var stringOptions = {
        maximumFractionDigits : 3
    };

    function formatMemoryString(memorySizeInBytes) {
        var memoryInMegabytes = memorySizeInBytes / 1048576;
        if (memoryInMegabytes < 1.0) {
            return memoryInMegabytes.toLocaleString(undefined, stringOptions);
        } else {
            return Math.round(memoryInMegabytes).toLocaleString();
        }
    }

    function updateTileInfoLabels(tileset, frameState) {
        var selectedTiles = tileset._selectedTiles;
        var length = selectedTiles.length;
        tileset._tileInfoLabels.removeAll();
        for (var i = 0; i < length; ++i) {
            var tile = selectedTiles[i];
            var boundingVolume = tile._boundingVolume.boundingVolume;
            var halfAxes = boundingVolume.halfAxes;
            var radius = boundingVolume.radius;

            var position = Cartesian3.clone(boundingVolume.center, scratchCartesian2);
            if (defined(halfAxes)) {
                position.x += 0.75 * (halfAxes[0] + halfAxes[3] + halfAxes[6]);
                position.y += 0.75 * (halfAxes[1] + halfAxes[4] + halfAxes[7]);
                position.z += 0.75 * (halfAxes[2] + halfAxes[5] + halfAxes[8]);
            } else if (defined(radius)) {
                var normal = Cartesian3.normalize(boundingVolume.center, scratchCartesian2);
                normal = Cartesian3.multiplyByScalar(normal, 0.75 * radius, scratchCartesian2);
                position = Cartesian3.add(normal, boundingVolume.center, scratchCartesian2);
            }

            var labelString = '';
            var attributes = 0;

            if (tileset.debugShowGeometricError) {
                labelString += '\nGeometric error: ' + tile.geometricError;
                attributes++;
            }
            if (tileset.debugShowRenderingStatistics) {
                labelString += '\nCommands: ' + tile._commandsLength;
                attributes++;

                // Don't display number of points or triangles if 0.
                var numberOfPoints = tile.content.pointsLength;
                if (numberOfPoints > 0) {
                    labelString += '\nPoints: ' + tile.content.pointsLength;
                    attributes++;
                }
                var numberOfTriangles = tile.content.trianglesLength;
                if (numberOfTriangles > 0) {
                    labelString += '\nTriangles: ' + tile.content.trianglesLength;
                    attributes++;
                }

                labelString += '\nFeatures: ' + tile.content.featuresLength;
                attributes ++;
            }

            if (tileset.debugShowMemoryUsage) {
                labelString += '\nTexture Memory: ' + formatMemoryString(tile.content.textureMemorySizeInBytes);
                labelString += '\nVertex Memory: ' + formatMemoryString(tile.content.vertexMemorySizeInBytes);
                attributes += 2;
            }

            tileset._tileInfoLabels.add({
                text : labelString.substring(1),
                position : position,
                font : (19-attributes) + 'px sans-serif',
                showBackground : true,
                disableDepthTestDistance : Number.POSITIVE_INFINITY
            });
        }
        tileset._tileInfoLabels.update(frameState);
    }

    var stencilClearCommand = new ClearCommand({
        stencil : 0,
        pass : Pass.CESIUM_3D_TILE
    });

    function updateTiles(tileset, frameState) {
        tileset._styleEngine.applyStyle(tileset, frameState);

        var statistics = tileset._statistics;
        var commandList = frameState.commandList;
        var numberOfInitialCommands = commandList.length;
        var selectedTiles = tileset._selectedTiles;
        var length = selectedTiles.length;
        var tileVisible = tileset.tileVisible;
        var tile, i;

        var bivariateVisibilityTest = tileset.skipLODs && tileset._hasMixedContent && frameState.context.stencilBuffer && length > 0;

        tileset._backfaceCommands.length = 0;

        if (bivariateVisibilityTest) {
            commandList.push(stencilClearCommand);
        }

        var lengthBeforeUpdate = commandList.length;
        for (i = 0; i < length; ++i) {
            tile = selectedTiles[i];
            // tiles may get unloaded and destroyed between selection and update
            if (tile.selected) {
                // Raise visible event before update in case the visible event
                // makes changes that update needs to apply to WebGL resources
                tileVisible.raiseEvent(tile);
                tile.update(tileset, frameState);
                statistics.incrementSelectionCounts(tile.content);
                ++statistics.selected;
            }
        }
        var lengthAfterUpdate = commandList.length;

        tileset._backfaceCommands.trim();

        if (bivariateVisibilityTest) {
            /**
             * Consider 'effective leaf' tiles as selected tiles that have no selected descendants. They may have children,
             * but they are currently our effective leaves because they do not have selected descendants. These tiles
             * are those where with tile._finalResolution === true.
             * Let 'unresolved' tiles be those with tile._finalResolution === false.
             *
             * 1. Render just the backfaces of unresolved tiles in order to lay down z
             * 2. Render all frontfaces wherever tile._selectionDepth > stencilBuffer.
             *    Replace stencilBuffer with tile._selectionDepth, when passing the z test.
             *    Because children are always drawn before ancestors (@see {@link traverseAndSelect}),
             *    this effectively draws children first and does not draw ancestors if a descendant has already
             *    been drawn at that pixel.
             *    Step 1 prevents child tiles from appearing on top when they are truly behind ancestor content.
             *    If they are behind the backfaces of the ancestor, then they will not be drawn.
             *
             * NOTE: Step 2 sometimes causes visual artifacts when backfacing child content has some faces that
             * partially face the camera and are inside of the ancestor content. Because they are inside, they will
             * not be culled by the depth writes in Step 1, and because they partially face the camera, the stencil tests
             * will draw them on top of the ancestor content.
             *
             * NOTE: Because we always render backfaces of unresolved tiles, if the camera is looking at the backfaces
             * of an object, they will always be drawn while loading, even if backface culling is enabled.
             */

            var backfaceCommands = tileset._backfaceCommands.internalArray;
            var addedCommandsLength = (lengthAfterUpdate - lengthBeforeUpdate);
            var backfaceCommandsLength = backfaceCommands.length;

            commandList.length += backfaceCommands.length;

            // copy commands to the back of the commandList
            for (i = addedCommandsLength - 1; i >= 0; --i) {
                commandList[lengthBeforeUpdate + backfaceCommandsLength + i] = commandList[lengthBeforeUpdate + i];
            }

            // move backface commands to the front of the commandList
            for (i = 0; i < backfaceCommandsLength; ++i) {
                commandList[lengthBeforeUpdate + i] = backfaceCommands[i];
            }
        }

        // Number of commands added by each update above
        statistics.numberOfCommands = (commandList.length - numberOfInitialCommands);

        if (tileset.debugShowGeometricError || tileset.debugShowRenderingStatistics || tileset.debugShowMemoryUsage) {
            if (!defined(tileset._tileInfoLabels)) {
                tileset._tileInfoLabels = new LabelCollection();
            }
            updateTileInfoLabels(tileset, frameState);
        } else {
            tileset._tileInfoLabels = tileset._tileInfoLabels && tileset._tileInfoLabels.destroy();
        }
    }

    function unloadTileFromCache(tileset, tile) {
        var node = tile.replacementNode;
        if (!defined(node)) {
            return;
        }

        var statistics = tileset._statistics;
        var replacementList = tileset._replacementList;
        var tileUnload = tileset.tileUnload;

        tileUnload.raiseEvent(tile);
        replacementList.remove(node);
        statistics.decrementLoadCounts(tile.content);
        --statistics.numberContentReady;
    }

    function unloadTiles(tileset) {
        var trimTiles = tileset._trimTiles;
        tileset._trimTiles = false;

        var replacementList = tileset._replacementList;

        var totalMemoryUsageInBytes = tileset.totalMemoryUsageInBytes;
        var maximumMemoryUsageInBytes = tileset._maximumMemoryUsage * 1024 * 1024;

        // Traverse the list only to the sentinel since tiles/nodes to the
        // right of the sentinel were used this frame.
        //
        // The sub-list to the left of the sentinel is ordered from LRU to MRU.
        var sentinel = tileset._replacementSentinel;
        var node = replacementList.head;
        while ((node !== sentinel) && ((totalMemoryUsageInBytes > maximumMemoryUsageInBytes) || trimTiles)) {
            var tile = node.item;
            node = node.next;
            unloadTileFromCache(tileset, tile);
            tile.unloadContent();
            totalMemoryUsageInBytes = tileset.totalMemoryUsageInBytes;
        }
    }

    /**
     * Unloads all tiles that weren't selected the previous frame.  This can be used to
     * explicitly manage the tile cache and reduce the total number of tiles loaded below
     * {@link Cesium3DTileset#maximumMemoryUsage}.
     * <p>
     * Tile unloads occur at the next frame to keep all the WebGL delete calls
     * within the render loop.
     * </p>
     */
    Cesium3DTileset.prototype.trimLoadedTiles = function() {
        // Defer to next frame so WebGL delete calls happen inside the render loop
        this._trimTiles = true;
    };

    ///////////////////////////////////////////////////////////////////////////

    function raiseLoadProgressEvent(tileset, frameState) {
        var statistics = tileset._statistics;
        var statisticsLast = tileset._statisticsLastColor;
        var numberOfPendingRequests = statistics.numberOfPendingRequests;
        var numberProcessing = statistics.numberProcessing;
        var lastNumberOfPendingRequest = statisticsLast.numberOfPendingRequests;
        var lastNumberProcessing = statisticsLast.numberProcessing;

        var progressChanged = (numberOfPendingRequests !== lastNumberOfPendingRequest) || (numberProcessing !== lastNumberProcessing);

        if (progressChanged) {
            frameState.afterRender.push(function() {
                tileset.loadProgress.raiseEvent(numberOfPendingRequests, numberProcessing);
            });
        }

        tileset._tilesLoaded = (statistics.numberOfPendingRequests === 0) && (statistics.numberProcessing === 0) && (statistics.numberOfAttemptedRequests === 0);

        if (progressChanged && tileset._tilesLoaded) {
            frameState.afterRender.push(function() {
                tileset.allTilesLoaded.raiseEvent();
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     */
    Cesium3DTileset.prototype.update = function(frameState) {
        if (!this.show || !this.ready) {
            return;
        }

        if (!defined(this._loadTimestamp)) {
            this._loadTimestamp = JulianDate.clone(frameState.time);
        }

        this._timeSinceLoad = Math.max(JulianDate.secondsDifference(frameState.time, this._loadTimestamp), 0.0);

        // Do not do out-of-core operations (new content requests, cache removal,
        // process new tiles) during the pick pass.
        var passes = frameState.passes;
        var isPick = (passes.pick && !passes.render);
        var outOfCore = !isPick;

        var statistics = this._statistics;
        statistics.clear();

        if (outOfCore) {
            processTiles(this, frameState);
        }

        if (this.dynamicScreenSpaceError) {
            updateDynamicScreenSpaceError(this, frameState);
        }

        Cesium3DTilesetTraversal.selectTiles(this, frameState, outOfCore);
        requestTiles(this, this._requestHeaps, outOfCore);
        updateTiles(this, frameState);

        if (outOfCore) {
            unloadTiles(this);
        }

        // Events are raised (added to the afterRender queue) here since promises
        // may resolve outside of the update loop that then raise events, e.g.,
        // model's readyPromise.
        raiseLoadProgressEvent(this, frameState);

        // Update last statistics
        var statisticsLast = isPick ? this._statisticsLastPick : this._statisticsLastColor;
        Cesium3DTilesetStatistics.clone(statistics, statisticsLast);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Cesium3DTileset#destroy
     */
    Cesium3DTileset.prototype.isDestroyed = function() {
        return false;
    };

    var scratchStack = [];

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * tileset = tileset && tileset.destroy();
     *
     * @see Cesium3DTileset#isDestroyed
     */
    Cesium3DTileset.prototype.destroy = function() {
        // Destroy debug labels
        this._tileInfoLabels = this._tileInfoLabels && this._tileInfoLabels.destroy();

        // Traverse the tree and destroy all tiles
        if (defined(this._root)) {
            var stack = scratchStack;
            stack.push(this._root);

            while (stack.length > 0) {
                var tile = stack.pop();
                tile.destroy();

                var children = tile.children;
                var length = children.length;
                for (var i = 0; i < length; ++i) {
                    stack.push(children[i]);
                }
            }
        }

        this._root = undefined;
        return destroyObject(this);
    };

    return Cesium3DTileset;
});
