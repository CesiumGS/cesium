/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DoublyLinkedList',
        '../Core/Event',
        '../Core/getBaseUri',
        '../Core/getExtensionFromUri',
        '../Core/Intersect',
        '../Core/isDataUri',
        '../Core/joinUrls',
        '../Core/JulianDate',
        '../Core/loadJson',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Cesium3DTile',
        './Cesium3DTileChildrenVisibility',
        './Cesium3DTileColorBlendMode',
        './Cesium3DTileOptimizations',
        './Cesium3DTileOptimizationHint',
        './Cesium3DTileRefine',
        './Cesium3DTileStyleEngine',
        './CullingVolume',
        './DebugCameraPrimitive',
        './LabelCollection',
        './SceneMode',
        './ShadowMode',
        './TileBoundingRegion',
        './TileBoundingSphere',
        './TileOrientedBoundingBox'
    ], function(
        Cartesian3,
        Cartographic,
        Color,
        clone,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DoublyLinkedList,
        Event,
        getBaseUri,
        getExtensionFromUri,
        Intersect,
        isDataUri,
        joinUrls,
        JulianDate,
        loadJson,
        CesiumMath,
        Matrix4,
        Request,
        RequestScheduler,
        RequestType,
        Uri,
        when,
        Cesium3DTile,
        Cesium3DTileChildrenVisibility,
        Cesium3DTileColorBlendMode,
        Cesium3DTileOptimizations,
        Cesium3DTileOptimizationHint,
        Cesium3DTileRefine,
        Cesium3DTileStyleEngine,
        CullingVolume,
        DebugCameraPrimitive,
        LabelCollection,
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
     * @param {Boolean} [options.refineToVisible=false] Whether replacement refinement should refine when all visible children are ready. An experimental optimization.
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
     * @param {Boolean} [options.debugShowGeometricError=false] For debugging only. When true, draws labels to indicate the geometric error of each tile
     * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the tileset casts or receives shadows from each light source.
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
        if (!defined(url)) {
            throw new DeveloperError('options.url is required.');
        }
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
        this._processingQueue = [];
        this._selectedTiles = [];
        this._selectedTilesToStyle = [];
        this._loadTimestamp = undefined;
        this._timeSinceLoad = 0.0;

        var replacementList = new DoublyLinkedList();

        // [head, sentinel) -> tiles that weren't selected this frame and may be replaced
        // (sentinel, tail] -> tiles that were selected this frame
        this._replacementList = replacementList; // Tiles with content loaded.  For cache management.
        this._replacementSentinel  = replacementList.add();
        this._trimTiles = false;

        this._refineToVisible = defaultValue(options.refineToVisible, false);

        this._cullWithChildrenBounds = defaultValue(options.cullWithChildrenBounds, true);

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

        this._maximumScreenSpaceError = defaultValue(options.maximumScreenSpaceError, 16);
        this._maximumNumberOfLoadedTiles = defaultValue(options.maximumNumberOfLoadedTiles, 256);
        this._styleEngine = new Cesium3DTileStyleEngine();

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

        this._modelMatrix = defined(options.modelMatrix) ? Matrix4.clone(options.modelMatrix) : Matrix4.clone(Matrix4.IDENTITY);

        this._statistics = {
            // Rendering stats
            visited : 0,
            numberOfCommands : 0,
            // Loading stats
            numberOfAttemptedRequests : 0,
            numberOfPendingRequests : 0,
            numberProcessing : 0,
            numberContentReady : 0, // Number of tiles with content loaded, does not include empty tiles
            numberTotal : 0, // Number of tiles in tileset.json (and other tileset.json files as they are loaded)
            // Features stats
            numberOfFeaturesSelected : 0,       // number of features rendered
            numberOfFeaturesLoaded : 0,  // number of features in memory
            numberOfPointsSelected: 0,
            numberOfPointsLoaded: 0,
            // Styling stats
            numberOfTilesStyled : 0,
            numberOfFeaturesStyled : 0,
            // Optimization stats
            numberOfTilesCulledWithChildrenUnion : 0,

            lastColor : new Cesium3DTilesetStatistics(),
            lastPick : new Cesium3DTilesetStatistics()
        };

        this._tilesLoaded = false;

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
         * what models belong to what tiles, espeically with additive refinement where models
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
         * When true, renders each tile's content as a wireframe
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.debugWireframe = defaultValue(options.debugWireframe, false);

        /**
         * This property is for debugging only; it is not optimized for production use.
         * <p>
         * When true, renders the bounding volume for each tile.  The bounding volume is
         * white if the tile's content has an explicit bounding volume; otherwise, it
         * is red.
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
        this._geometricErrorLabels = undefined;

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
         * The event fired to indicate that a tile's content was unloaded from the cache.
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
         * @see Cesium3DTileset#maximumNumberOfLoadedTiles
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

        this._readyPromise = when.defer();

        var that = this;
        this.loadTileset(tilesetUrl).then(function(data) {
            var tilesetJson = data.tilesetJson;
            that._asset = tilesetJson.asset;
            that._properties = tilesetJson.properties;
            that._geometricError = tilesetJson.geometricError;
            that._root = data.root;
            that._readyPromise.resolve(that);
        }).otherwise(function(error) {
            that._readyPromise.reject(error);
        });
    }

    function Cesium3DTilesetStatistics() {
        this.selected = 0;
        this.visited = 0;
        this.numberOfCommands = 0;
        this.numberOfAttemptedRequests = 0;
        this.numberOfPendingRequests = 0;
        this.numberProcessing = 0;
        this.numberContentReady = 0;
        this.numberTotal = 0;
        this.numberOfFeaturesSelected = 0;
        this.numberOfFeaturesLoaded = 0;
        this.numberOfPointsSelected = 0;
        this.numberOfPointsLoaded = 0;
        this.numberOfTilesStyled = 0;
        this.numberOfFeaturesStyled = 0;
        this.numberOfTilesCulledWithChildrenUnion = 0;
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
                if (value < 0) {
                    throw new DeveloperError('maximumScreenSpaceError must be greater than or equal to zero');
                }
                //>>includeEnd('debug');

                this._maximumScreenSpaceError = value;
            }
        },

        /**
         * The maximum number of tiles to load.  Tiles not in view are unloaded to enforce this.
         * <p>
         * If decreasing this value results in unloading tiles, the tiles are unloaded the next frame.
         * </p>
         * <p>
         * If more tiles than <code>maximumNumberOfLoadedTiles</code> are needed
         * to meet the desired screen-space error, determined by {@link Cesium3DTileset#maximumScreenSpaceError},
         * for the current view than the number of tiles loaded will exceed
         * <code>maximumNumberOfLoadedTiles</code>.  For example, if the maximum is 128 tiles, but
         * 150 tiles are needed to meet the screen-space error, then 150 tiles may be loaded.  When
         * these tiles go out of view, they will be unloaded.
         * </p>
         *
         * @memberof Cesium3DTileset.prototype
         *
         * @type {Number}
         * @default 256
         *
         * @exception {DeveloperError} <code>maximumNumberOfLoadedTiles</code> must be greater than or equal to zero.
         */
        maximumNumberOfLoadedTiles : {
            get : function() {
                return this._maximumNumberOfLoadedTiles;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (value < 0) {
                    throw new DeveloperError('maximumNumberOfLoadedTiles must be greater than or equal to zero');
                }
                //>>includeEnd('debug');

                this._maximumNumberOfLoadedTiles = value;
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
    Cesium3DTileset.prototype.loadTileset = function(tilesetUrl, parentTile) {
        var that = this;

        // We don't know the distance of the tileset until tiles.json is loaded, so use the default distance for now
        return RequestScheduler.request(tilesetUrl, loadJson, undefined, RequestType.TILES3D).then(function(tilesetJson) {
            if (that.isDestroyed()) {
                return when.reject('tileset is destroyed');
            }

            if (!defined(tilesetJson.asset) || (tilesetJson.asset.version !== '0.0')) {
                throw new DeveloperError('The tileset must be 3D Tiles version 0.0.  See https://github.com/AnalyticalGraphicsInc/3d-tiles#spec-status');
            }

            var stats = that._statistics;

            // Append the version to the baseUrl
            var hasVersionQuery = /[?&]v=/.test(tilesetUrl);
            if (!hasVersionQuery) {
                var versionQuery = '?v=' + defaultValue(tilesetJson.asset.tilesetVersion, '0.0');
                that._baseUrl = joinUrls(that._baseUrl, versionQuery);
                tilesetUrl = joinUrls(tilesetUrl, versionQuery, false);
            }

            // A tileset.json referenced from a tile may exist in a different directory than the root tileset.
            // Get the baseUrl relative to the external tileset.
            var baseUrl = getBaseUri(tilesetUrl, true);
            var rootTile = new Cesium3DTile(that, baseUrl, tilesetJson.root, parentTile);

            var refiningTiles = [];

            // If there is a parentTile, add the root of the currently loading tileset
            // to parentTile's children, and increment its numberOfChildrenWithoutContent
            if (defined(parentTile)) {
                parentTile.children.push(rootTile);
                ++parentTile.numberOfChildrenWithoutContent;

                // When an external tileset is loaded, its ancestor needs to recheck its refinement
                var ancestor = getAncestorWithContent(parentTile);
                if (defined(ancestor) && (ancestor.refine === Cesium3DTileRefine.REPLACE)) {
                    refiningTiles.push(ancestor);
                }
            }

            ++stats.numberTotal;

            var stack = [];
            stack.push({
                header : tilesetJson.root,
                cesium3DTile : rootTile
            });

            while (stack.length > 0) {
                var t = stack.pop();
                var tile3D = t.cesium3DTile;
                var children = t.header.children;
                var hasEmptyChild = false;
                if (defined(children)) {
                    var length = children.length;
                    for (var k = 0; k < length; ++k) {
                        var childHeader = children[k];
                        var childTile = new Cesium3DTile(that, baseUrl, childHeader, tile3D);
                        tile3D.children.push(childTile);
                        ++stats.numberTotal;
                        stack.push({
                            header : childHeader,
                            cesium3DTile : childTile
                        });
                        if (!childTile.hasContent) {
                            hasEmptyChild = true;
                        }
                    }
                }
                Cesium3DTileOptimizations.checkChildrenWithinParent(tile3D, true);
                if (tile3D.hasContent && hasEmptyChild && (tile3D.refine === Cesium3DTileRefine.REPLACE)) {
                    // Tiles that use replacement refinement and have empty child tiles need to keep track of
                    // descendants with content in order to refine correctly.
                    refiningTiles.push(tile3D);
                }
            }

            prepareRefiningTiles(refiningTiles);

            return {
                tilesetJson : tilesetJson,
                root : rootTile
            };
        });
    };

    function getAncestorWithContent(ancestor) {
        while(defined(ancestor) && !ancestor.hasContent) {
            ancestor = ancestor.parent;
        }
        return ancestor;
    }

    function prepareRefiningTiles(refiningTiles) {
        var stack = [];
        var length = refiningTiles.length;
        for (var i = 0; i < length; ++i) {
            var refiningTile = refiningTiles[i];
            refiningTile.descendantsWithContent = [];
            stack.push(refiningTile);
            while (stack.length > 0) {
                var tile = stack.pop();
                var children = tile.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var childTile = children[k];
                    if (childTile.hasContent) {
                        refiningTile.descendantsWithContent.push(childTile);
                    } else {
                        stack.push(childTile);
                    }
                }
            }
        }
    }

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

    function getScreenSpaceError(tileset, geometricError, tile, frameState) {
        if (geometricError === 0.0) {
            // Leaf nodes do not have any error so save the computation
            return 0.0;
        }

        // Avoid divide by zero when viewer is inside the tile
        var camera = frameState.camera;
        var context = frameState.context;
        var height = context.drawingBufferHeight;

        var error;
        if (frameState.mode === SceneMode.SCENE2D) {
            var frustum = camera.frustum;
            var width = context.drawingBufferWidth;

            var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
            error = geometricError / pixelSize;
        } else {
            // Avoid divide by zero when viewer is inside the tile
            var distance = Math.max(tile.distanceToCamera, CesiumMath.EPSILON7);
            var sseDenominator = camera.frustum.sseDenominator;
            error = (geometricError * height) / (distance * sseDenominator);

            if (tileset.dynamicScreenSpaceError) {
                var density = tileset._dynamicScreenSpaceErrorComputedDensity;
                var factor = tileset.dynamicScreenSpaceErrorFactor;
                var dynamicError = CesiumMath.fog(distance, density) * factor;
                error -= dynamicError;
            }
        }

        return error;
    }

    function computeDistanceToCamera(children, frameState) {
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            child.distanceToCamera = child.distanceToTile(frameState);
        }
    }

    function updateTransforms(children, parentTransform) {
        var length = children.length;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            child.updateTransform(parentTransform);
        }
    }

    // PERFORMANCE_IDEA: is it worth exploiting frame-to-frame coherence in the sort, i.e., the
    // list of children are probably fully or mostly sorted unless the camera moved significantly?
    function sortChildrenByDistanceToCamera(a, b) {
        // Sort by farthest child first since this is going on a stack
        return b.distanceToCamera - a.distanceToCamera;
    }

    ///////////////////////////////////////////////////////////////////////////

    function isVisible(visibilityPlaneMask) {
        return visibilityPlaneMask !== CullingVolume.MASK_OUTSIDE;
    }

    function requestContent(tileset, tile, outOfCore) {
        if (!outOfCore) {
            return;
        }
        if (!tile.canRequestContent()) {
            return;
        }

        tile.requestContent();

        var stats = tileset._statistics;

        if (!tile.contentUnloaded) {
            ++stats.numberOfPendingRequests;

            var removeFunction = removeFromProcessingQueue(tileset, tile);
            tile.content.contentReadyToProcessPromise.then(addToProcessingQueue(tileset, tile)).otherwise(removeFunction);
            tile.content.readyPromise.then(removeFunction).otherwise(removeFunction);
        } else {
            ++stats.numberOfAttemptedRequests;
        }
    }

    function selectTile(tileset, tile, fullyVisible, frameState) {
        // There may also be a tight box around just the tile's contents, e.g., for a city, we may be
        // zoomed into a neighborhood and can cull the skyscrapers in the root node.
        if (tile.contentReady && (fullyVisible || (tile.contentsVisibility(frameState) !== Intersect.OUTSIDE))) {
            tileset._selectedTiles.push(tile);
            tile.selected = true;

            var tileContent = tile.content;
            if (tileContent.featurePropertiesDirty) {
                // A feature's property in this tile changed, the tile needs to be re-styled.
                tileContent.featurePropertiesDirty = false;
                tile.lastStyleTime = 0; // Force applying the style to this tile
                tileset._selectedTilesToStyle.push(tile);
            }  else if ((tile.lastSelectedFrameNumber !== frameState.frameNumber - 1)) {
                // Tile is newly selected; it is selected this frame, but was not selected last frame.
                tileset._selectedTilesToStyle.push(tile);
            }
            tile.lastSelectedFrameNumber = frameState.frameNumber;
        }
    }

    function touch(tileset, tile, outOfCore) {
        if (!outOfCore) {
            return;
        }
        var node = tile.replacementNode;
        if (defined(node)) {
            tileset._replacementList.splice(tileset._replacementSentinel, node);
        }
    }

    var scratchStack = [];
    var scratchRefiningTiles = [];

    function computeChildrenVisibility(tile, frameState, checkViewerRequestVolume) {
        var flag = Cesium3DTileChildrenVisibility.NONE;
        var children = tile.children;
        var childrenLength = children.length;
        var visibilityPlaneMask = tile.visibilityPlaneMask;
        for (var k = 0; k < childrenLength; ++k) {
            var child = children[k];

            var visibilityMask = child.visibility(frameState, visibilityPlaneMask);

            if (isVisible(visibilityMask)) {
                flag |= Cesium3DTileChildrenVisibility.VISIBLE;
            }

            if (checkViewerRequestVolume) {
                if (!child.insideViewerRequestVolume(frameState)) {
                    visibilityMask = CullingVolume.MASK_OUTSIDE;
                } else {
                    flag |= Cesium3DTileChildrenVisibility.IN_REQUEST_VOLUME;
                    if (isVisible(visibilityMask)) {
                        flag |= Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME;
                    }
                }
            }

            child.visibilityPlaneMask = visibilityMask;
        }

        tile.childrenVisibility = flag;

        return flag;
    }

    function selectTiles(tileset, frameState, outOfCore) {
        if (tileset.debugFreezeFrame) {
            return;
        }

        var maximumScreenSpaceError = tileset._maximumScreenSpaceError;

        tileset._selectedTiles.length = 0;
        tileset._selectedTilesToStyle.length = 0;

        scratchRefiningTiles.length = 0;

        // Move sentinel node to the tail so, at the start of the frame, all tiles
        // may be potentially replaced.  Tiles are moved to the right of the sentinel
        // when they are selected so they will not be replaced.
        var replacementList = tileset._replacementList;
        replacementList.splice(replacementList.tail, tileset._replacementSentinel);

        var root = tileset._root;
        root.updateTransform(tileset._modelMatrix);

        if (!root.insideViewerRequestVolume(frameState)) {
            return;
        }

        root.distanceToCamera = root.distanceToTile(frameState);

        if (getScreenSpaceError(tileset, tileset._geometricError, root, frameState) <= maximumScreenSpaceError) {
            // The SSE of not rendering the tree is small enough that the tree does not need to be rendered
            return;
        }

        root.visibilityPlaneMask = root.visibility(frameState, CullingVolume.MASK_INDETERMINATE);
        if (root.visibilityPlaneMask === CullingVolume.MASK_OUTSIDE) {
            return;
        }

        if (root.contentUnloaded) {
            requestContent(tileset, root, outOfCore);
            return;
        }

        var stats = tileset._statistics;

        var stack = scratchStack;
        stack.push(root);
        while (stack.length > 0) {
            // Depth first.  We want the high detail tiles first.
            var t = stack.pop();
            t.selected = false;
            t.replaced = false;
            ++stats.visited;

            var visibilityPlaneMask = t.visibilityPlaneMask;
            var fullyVisible = (visibilityPlaneMask === CullingVolume.MASK_INSIDE);

            touch(tileset, t, outOfCore);

            // Tile is inside/intersects the view frustum.  How many pixels is its geometric error?
            var sse = getScreenSpaceError(tileset, t.geometricError, t, frameState);
            // PERFORMANCE_IDEA: refine also based on (1) occlusion/VMSSE and/or (2) center of viewport

            var children = t.children;
            var childrenLength = children.length;
            var child;
            var k;
            var additiveRefinement = (t.refine === Cesium3DTileRefine.ADD);

            if (t.hasTilesetContent) {
                // If tile has tileset content, skip it and process its child instead (the tileset root)
                // No need to check visibility or sse of the child because its bounding volume
                // and geometric error are equal to its parent.
                if (t.contentReady) {
                    child = t.children[0];
                    child.visibilityPlaneMask = t.visibilityPlaneMask;
                    child.distanceToCamera = t.distanceToCamera;
                    child.updateTransform(t.computedTransform);
                    if (child.contentUnloaded) {
                        requestContent(tileset, child, outOfCore);
                    } else {
                        stack.push(child);
                    }
                }
                continue;
            }

            if (additiveRefinement) {
                // With additive refinement, the tile is rendered
                // regardless of if its SSE is sufficient.
                selectTile(tileset, t, fullyVisible, frameState);

                if (sse > maximumScreenSpaceError) {
                    // Tile does not meet SSE. Refine them in front-to-back order.

                    // Only sort and refine (render or request children) if any
                    // children are loaded or request slots are available.
                    var anyChildrenLoaded = (t.numberOfChildrenWithoutContent < childrenLength);
                    if (anyChildrenLoaded || t.canRequestContent()) {
                        updateTransforms(children, t.computedTransform);

                        // Distance is used for sorting now and for computing SSE when the tile comes off the stack.
                        computeDistanceToCamera(children, frameState);

                        // Sort children by distance for (1) request ordering, and (2) early-z
                        children.sort(sortChildrenByDistanceToCamera);

                        // With additive refinement, we only request or refine when children are visible
                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];
                            if (child.insideViewerRequestVolume(frameState)) {
                                // Use parent's geometric error with child's box to see if we already meet the SSE
                                if (getScreenSpaceError(tileset, t.geometricError, child, frameState) > maximumScreenSpaceError) {
                                    child.visibilityPlaneMask = child.visibility(frameState, visibilityPlaneMask);
                                    if (isVisible(child.visibilityPlaneMask)) {
                                        if (child.contentUnloaded) {
                                            requestContent(tileset, child, outOfCore);
                                        } else {
                                            stack.push(child);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // t.refine === Cesium3DTileRefine.REPLACE
                //
                // With replacement refinement, if the tile's SSE
                // is not sufficient, its children (or ancestors) are
                // rendered instead

                // This optimization may cause issues if the parent's content exceeds the bounds of the childrens` content.
                // In these case nothing will be selected to fill the empty space. This is possible if occlusion-preserving
                // decimation is not used, but it is arguably better to cull in this way because in the cases where we cull
                // when the parent content is visible, if the object were to be drawn at full resolution, the geometry would
                // not be visible.
                var useChildrenBoundUnion = tileset._cullWithChildrenBounds && t._optimChildrenWithinParent === Cesium3DTileOptimizationHint.USE_OPTIMIZATION;

                var childrenVisibility;

                if (childrenLength === 0) {
                    // Select tile if it's a leaf (childrenLength === 0)
                    selectTile(tileset, t, fullyVisible, frameState);
                } else if (sse <= maximumScreenSpaceError) {
                    // This tile meets the SSE so add its commands.
                    if (useChildrenBoundUnion) {
                        childrenVisibility = computeChildrenVisibility(t, frameState, false);
                        if (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE) {
                            selectTile(tileset, t, fullyVisible, frameState);
                        } else {
                            ++stats.numberOfTilesCulledWithChildrenUnion;
                        }
                    } else {
                        selectTile(tileset, t, fullyVisible, frameState);
                    }
                } else if (!tileset._refineToVisible) {
                    // Tile does not meet SSE.
                    // Refine when all children (visible or not) are loaded.

                    // Only sort children by distance if we are going to refine to them
                    // or slots are available to request them.  If we are just rendering the
                    // tile (and can't make child requests because no slots are available)
                    // then the children do not need to be sorted.

                    var allChildrenLoaded = t.numberOfChildrenWithoutContent === 0;
                    if (allChildrenLoaded || t.canRequestContent()) {
                        updateTransforms(children, t.computedTransform);

                        // Distance is used for sorting now and for computing SSE when the tile comes off the stack.
                        computeDistanceToCamera(children, frameState);

                        // Sort children by distance for (1) request ordering, and (2) early-z
                        children.sort(sortChildrenByDistanceToCamera);
                    }

                    if (!allChildrenLoaded) {
                        if (useChildrenBoundUnion) {
                            childrenVisibility = computeChildrenVisibility(t, frameState, false);
                        }
                        if (!useChildrenBoundUnion || (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE)) {
                            // Tile does not meet SSE.  Add its commands since it is the best we have and request its children.
                            selectTile(tileset, t, fullyVisible, frameState);

                            if (outOfCore) {
                                for (k = 0; k < childrenLength; ++k) {
                                    child = children[k];
                                    // PERFORMANCE_IDEA: we could spin a bit less CPU here by keeping separate lists for unloaded/ready children.
                                    if (child.contentUnloaded) {
                                        requestContent(tileset, child, outOfCore);
                                    } else {
                                        // Touch loaded child even though it is not selected this frame since
                                        // we want to keep it in the cache for when all children are loaded
                                        // and this tile can refine to them.
                                        touch(tileset, child, outOfCore);
                                    }
                                }
                            }
                        } else if (useChildrenBoundUnion) {
                            ++stats.numberOfTilesCulledWithChildrenUnion;
                        }
                    } else {
                        // Tile does not meet SSE and its children are loaded.  Refine to them in front-to-back order.
                        childrenVisibility = computeChildrenVisibility(t, frameState, true);
                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];

                            if (isVisible(child.visibilityPlaneMask)) {
                                stack.push(child);
                            } else {
                                // Touch the child tile even if it is not visible. Since replacement refinement
                                // requires all child tiles to be loaded to refine to them, we want to keep it in the cache.
                                touch(tileset, child, outOfCore);
                            }
                        }

                        if (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE_IN_REQUEST_VOLUME) {
                            t.replaced = true;
                            if (defined(t.descendantsWithContent)) {
                                scratchRefiningTiles.push(t);
                            }
                        } else if (!useChildrenBoundUnion || (childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE)) {
                            // Even though the children are all loaded they may not be visible if the camera
                            // is not inside their request volumes.
                            selectTile(tileset, t, fullyVisible, frameState);
                        } else if (useChildrenBoundUnion) {
                            ++stats.numberOfTilesCulledWithChildrenUnion;
                        }
                    }
                } else {
                    // Tile does not meet SSE.
                    // Refine when all visible children are loaded.

                    // Get visibility for all children. Check if any visible children are not loaded.
                    // PERFORMANCE_IDEA: exploit temporal coherence to avoid checking visibility every frame
                    updateTransforms(children, t.computedTransform);
                    childrenVisibility = computeChildrenVisibility(t, frameState, true);

                    var allVisibleChildrenLoaded = true;
                    var someVisibleChildrenLoaded = false;
                    for (k = 0; k < childrenLength; ++k) {
                        child = children[k];
                        if (isVisible(child.visibilityPlaneMask)) {
                            if (child.contentReady) {
                                someVisibleChildrenLoaded = true;
                            } else {
                                allVisibleChildrenLoaded = false;
                            }
                        }
                    }

                    if (useChildrenBoundUnion && childrenVisibility === Cesium3DTileChildrenVisibility.NONE) {
                        if (allVisibleChildrenLoaded && !someVisibleChildrenLoaded) {
                            ++stats.numberOfTilesCulledWithChildrenUnion;
                        }
                        continue;
                    }

                    if (allVisibleChildrenLoaded && !someVisibleChildrenLoaded) {
                        // No children are visible, select this tile
                        selectTile(tileset, t, fullyVisible, frameState);
                        continue;
                    }

                    // Only sort children by distance if we are going to refine to them
                    // or slots are available to request them.  If we are just rendering the
                    // tile (and can't make child requests because no slots are available)
                    // then the children do not need to be sorted.

                    if (someVisibleChildrenLoaded || t.canRequestContent()) {
                        // Distance is used for sorting now and for computing SSE when the tile comes off the stack.
                        computeDistanceToCamera(children, frameState);

                        // Sort children by distance for (1) request ordering, and (2) early-z
                        children.sort(sortChildrenByDistanceToCamera);
                    }

                    if (!allVisibleChildrenLoaded) {
                        // TODO : render parent against a plane mask of its visible children so there is no overlap,
                        //        then the refineToVisible flags can be removed.

                        // Tile does not meet SSE.  Add its commands and push its visible children to the stack.
                        // The parent tile and child tiles will render simultaneously until all visible children
                        // are ready. This allows the visible children to stay loaded while other children stream in,
                        // otherwise if only the parent is selected the subtree may be unloaded from the cache.
                        selectTile(tileset, t, fullyVisible, frameState);

                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];
                            if (isVisible(child.visibilityPlaneMask)) {
                                if (child.contentUnloaded) {
                                    requestContent(tileset, child, outOfCore);
                                } else {
                                    stack.push(child);
                                }
                            }
                        }
                    } else {
                        // Tile does not meet SSE and its visible children are loaded. Refine to them in front-to-back order.
                        for (k = 0; k < childrenLength; ++k) {
                            child = children[k];
                            if (isVisible(child.visibilityPlaneMask)) {
                                stack.push(child);
                            }
                        }

                        t.replaced = true;
                        if (defined(t.descendantsWithContent)) {
                            scratchRefiningTiles.push(t);
                        }
                    }
                }
            }
        }

        checkRefiningTiles(scratchRefiningTiles, tileset, frameState);
    }

    function checkRefiningTiles(refiningTiles, tileset, frameState) {
        // In the common case, a tile that uses replacement refinement is refinable once all its
        // children are loaded. However if it has an empty child, refining to its children would
        // show a visible gap. In this case, the empty child's children (or further descendants)
        // would need to be selected before the original tile is refinable. It is hard to determine
        // this easily during the traversal, so this fixes the situation retroactively.
        var descendant;
        var refiningTilesLength = refiningTiles.length;
        for (var i = 0; i < refiningTilesLength; ++i) {
            var j;
            var refinable = true;
            var refiningTile = refiningTiles[i];
            var descendantsLength = refiningTile.descendantsWithContent.length;
            for (j = 0; j < descendantsLength; ++j) {
                descendant = refiningTile.descendantsWithContent[j];
                if (!descendant.selected && !descendant.replaced &&
                    ((descendant.childrenVisibility & Cesium3DTileChildrenVisibility.VISIBLE) || descendant.children.length === 0) &&
                    (frameState.cullingVolume.computeVisibility(descendant.contentBoundingVolume) !== Intersect.OUTSIDE)) {
                        refinable = false;
                        break;
                }
            }
            if (!refinable) {
                selectTile(tileset, refiningTile, true, frameState);
                for (j = 0; j < descendantsLength; ++j) {
                    descendant = refiningTile.descendantsWithContent[j];
                    descendant.selected = false;
                }
            }
        }
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
                if (tile.hasContent) {
                    // RESEARCH_IDEA: ability to unload tiles (without content) for an
                    // external tileset when all the tiles are unloaded.
                    ++tileset._statistics.numberContentReady;
                    incrementPointAndFeatureLoadCounts(tileset, tile.content);
                    tile.replacementNode = tileset._replacementList.add(tile);
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

    function clearStats(tileset) {
        var stats = tileset._statistics;
        stats.visited = 0;
        stats.numberOfCommands = 0;
        stats.numberOfAttemptedRequests = 0;
        stats.numberOfTilesStyled = 0;
        stats.numberOfFeaturesStyled = 0;
        stats.numberOfTilesCulledWithChildrenUnion = 0;
        stats.numberOfFeaturesSelected = 0;
        stats.numberOfPointsSelected = 0;
    }

    function updateLastStats(tileset, isPick) {
        var stats = tileset._statistics;
        var last = isPick ? stats.lastPick : stats.lastColor;

        last.visited = stats.visited;
        last.numberOfCommands = stats.numberOfCommands;
        last.selected = tileset._selectedTiles.length;
        last.numberOfAttemptedRequests = stats.numberOfAttemptedRequests;
        last.numberOfPendingRequests = stats.numberOfPendingRequests;
        last.numberProcessing = stats.numberProcessing;
        last.numberContentReady = stats.numberContentReady;
        last.numberTotal = stats.numberTotal;
        last.numberOfFeaturesSelected = stats.numberOfFeaturesSelected;
        last.numberOfFeaturesLoaded = stats.numberOfFeaturesLoaded;
        last.numberOfPointsSelected = stats.numberOfPointsSelected;
        last.numberOfPointsLoaded = stats.numberOfPointsLoaded;
        last.numberOfTilesStyled = stats.numberOfTilesStyled;
        last.numberOfFeaturesStyled = stats.numberOfFeaturesStyled;
        last.numberOfTilesCulledWithChildrenUnion = stats.numberOfTilesCulledWithChildrenUnion;
    }

    function updatePointAndFeatureCounts(tileset, content, decrement, load) {
        var stats = tileset._statistics;
        var contents = content.innerContents;
        var pointsLength = content.pointsLength;
        var featuresLength = content.featuresLength;

        if (load) {
            stats.numberOfFeaturesLoaded += decrement ? -featuresLength : featuresLength;
            stats.numberOfPointsLoaded += decrement ? -pointsLength : pointsLength;
        } else {
            stats.numberOfFeaturesSelected += decrement ? -featuresLength : featuresLength;
            stats.numberOfPointsSelected += decrement ? -pointsLength : pointsLength;
        }

        if (defined(contents)) {
            var length = contents.length;
            for (var i = 0; i < length; ++i) {
                updatePointAndFeatureCounts(tileset, contents[i], decrement, load);
            }
        }
    }

    function incrementPointAndFeatureSelectionCounts(tileset, content) {
        updatePointAndFeatureCounts(tileset, content, false, false);
    }

    function incrementPointAndFeatureLoadCounts(tileset, content) {
        updatePointAndFeatureCounts(tileset, content, false, true);
    }

    function decrementPointAndFeatureLoadCounts(tileset, content) {
        updatePointAndFeatureCounts(tileset, content, true, true);
    }

    var scratchCartesian = new Cartesian3();

    function updateGeometricErrorLabels(tileset, frameState) {
        var selectedTiles = tileset._selectedTiles;
        var length = selectedTiles.length;
        tileset._geometricErrorLabels.removeAll();
        for (var i = 0; i < length; ++i) {
            var tile = selectedTiles[i];
            if (tile.selected) {
                var boundingVolume = tile._boundingVolume.boundingVolume;
                var halfAxes = boundingVolume.halfAxes;
                var radius = boundingVolume.radius;

                var position = Cartesian3.clone(boundingVolume.center, scratchCartesian);
                if (defined(halfAxes)) {
                    position.x += 0.75 * (halfAxes[0] + halfAxes[3] + halfAxes[6]);
                    position.y += 0.75 * (halfAxes[1] + halfAxes[4] + halfAxes[7]);
                    position.z += 0.75 * (halfAxes[2] + halfAxes[5] + halfAxes[8]);
                } else if (defined(radius)) {
                    var normal = Cartesian3.normalize(boundingVolume.center, scratchCartesian);
                    normal = Cartesian3.multiplyByScalar(normal, 0.75 * radius, scratchCartesian);
                    position = Cartesian3.add(normal, boundingVolume.center, scratchCartesian);
                }
                tileset._geometricErrorLabels.add({
                    text: tile.geometricError.toString(),
                    position: position
                });
            }
        }
        tileset._geometricErrorLabels.update(frameState);
    }

    function updateTiles(tileset, frameState) {
        tileset._styleEngine.applyStyle(tileset, frameState);

        var commandList = frameState.commandList;
        var numberOfInitialCommands = commandList.length;
        var selectedTiles = tileset._selectedTiles;
        var length = selectedTiles.length;
        var tileVisible = tileset.tileVisible;
        for (var i = 0; i < length; ++i) {
            var tile = selectedTiles[i];
            if (tile.selected) {
                // Raise visible event before update in case the visible event
                // makes changes that update needs to apply to WebGL resources
                tileVisible.raiseEvent(tile);
                tile.update(tileset, frameState);
                incrementPointAndFeatureSelectionCounts(tileset, tile.content);
            }
        }

        // Number of commands added by each update above
        tileset._statistics.numberOfCommands = (commandList.length - numberOfInitialCommands);

        if (tileset.debugShowGeometricError) {
            if (!defined(tileset._geometricErrorLabels)) {
                tileset._geometricErrorLabels = new LabelCollection();
            }
            updateGeometricErrorLabels(tileset, frameState);
        } else {
            tileset._geometricErrorLabels = tileset._geometricErrorLabels && tileset._geometricErrorLabels.destroy();
        }
    }

    function unloadTiles(tileset, frameState) {
        var trimTiles = tileset._trimTiles;
        tileset._trimTiles = false;

        var stats = tileset._statistics;
        var maximumNumberOfLoadedTiles = tileset._maximumNumberOfLoadedTiles + 1; // + 1 to account for sentinel
        var replacementList = tileset._replacementList;
        var tileUnload = tileset.tileUnload;

        // Traverse the list only to the sentinel since tiles/nodes to the
        // right of the sentinel were used this frame.
        //
        // The sub-list to the left of the sentinel is ordered from LRU to MRU.
        var sentinel = tileset._replacementSentinel;
        var node = replacementList.head;
        while ((node !== sentinel) && ((replacementList.length > maximumNumberOfLoadedTiles) || trimTiles)) {
            var tile = node.item;

            decrementPointAndFeatureLoadCounts(tileset, tile.content);
            tileUnload.raiseEvent(tile);
            tile.unloadContent();

            var currentNode = node;
            node = node.next;
            replacementList.remove(currentNode);

            --stats.numberContentReady;
        }
    }

    /**
     * Unloads all tiles that weren't selected the previous frame.  This can be used to
     * explicitly manage the tile cache and reduce the total number of tiles loaded below
     * {@link Cesium3DTileset#maximumNumberOfLoadedTiles}.
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
        var stats = tileset._statistics;
        var numberOfPendingRequests = stats.numberOfPendingRequests;
        var numberProcessing = stats.numberProcessing;
        var lastNumberOfPendingRequest = stats.lastColor.numberOfPendingRequests;
        var lastNumberProcessing = stats.lastColor.numberProcessing;

        var progressChanged = (numberOfPendingRequests !== lastNumberOfPendingRequest) || (numberProcessing !== lastNumberProcessing);

        if (progressChanged) {
            frameState.afterRender.push(function() {
                tileset.loadProgress.raiseEvent(numberOfPendingRequests, numberProcessing);
            });
        }

        tileset._tilesLoaded = (stats.numberOfPendingRequests === 0) && (stats.numberProcessing === 0) && (stats.numberOfAttemptedRequests === 0);

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
     * @exception {DeveloperError} The tileset must be 3D Tiles version 0.0.  See https://github.com/AnalyticalGraphicsInc/3d-tiles#spec-status
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

        clearStats(this);

        if (outOfCore) {
            processTiles(this, frameState);
        }

        if (this.dynamicScreenSpaceError) {
            updateDynamicScreenSpaceError(this, frameState);
        }

        selectTiles(this, frameState, outOfCore);
        updateTiles(this, frameState);

        if (outOfCore) {
            unloadTiles(this, frameState);
        }

        // Events are raised (added to the afterRender queue) here since promises
        // may resolve outside of the update loop that then raise events, e.g.,
        // model's readyPromise.
        raiseLoadProgressEvent(this, frameState);

        updateLastStats(this, isPick);
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
     *
     * @example
     * tileset = tileset && tileset.destroy();
     *
     * @see Cesium3DTileset#isDestroyed
     */
    Cesium3DTileset.prototype.destroy = function() {
        // Traverse the tree and destroy all tiles
        if (defined(this._root)) {
            var stack = scratchStack;
            stack.push(this._root);

            while (stack.length > 0) {
                var t = stack.pop();
                t.destroy();

                var children = t.children;
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
