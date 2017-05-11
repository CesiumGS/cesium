/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/buildModuleUrl',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/EllipsoidTerrainProvider',
        '../Core/Event',
        '../Core/IntersectionTests',
        '../Core/loadImage',
        '../Core/Ray',
        '../Core/Rectangle',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Shaders/GlobeFS',
        '../Shaders/GlobeVS',
        '../Shaders/GroundAtmosphere',
        '../ThirdParty/when',
        './GlobeSurfaceShaderSet',
        './GlobeSurfaceTileProvider',
        './ImageryLayerCollection',
        './QuadtreePrimitive',
        './SceneMode',
        './ShadowMode'
    ], function(
        BoundingSphere,
        buildModuleUrl,
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        EllipsoidTerrainProvider,
        Event,
        IntersectionTests,
        loadImage,
        Ray,
        Rectangle,
        ShaderSource,
        Texture,
        GlobeFS,
        GlobeVS,
        GroundAtmosphere,
        when,
        GlobeSurfaceShaderSet,
        GlobeSurfaceTileProvider,
        ImageryLayerCollection,
        QuadtreePrimitive,
        SceneMode,
        ShadowMode) {
    'use strict';

    /**
     * The globe rendered in the scene, including its terrain ({@link Globe#terrainProvider})
     * and imagery layers ({@link Globe#imageryLayers}).  Access the globe using {@link Scene#globe}.
     *
     * @alias Globe
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] Determines the size and shape of the
     * globe.
     */
    function Globe(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var terrainProvider = new EllipsoidTerrainProvider({
            ellipsoid : ellipsoid
        });
        var imageryLayerCollection = new ImageryLayerCollection();

        this._ellipsoid = ellipsoid;
        this._imageryLayerCollection = imageryLayerCollection;

        this._surfaceShaderSet = new GlobeSurfaceShaderSet();

        this._surfaceShaderSet.baseVertexShaderSource = new ShaderSource({
            sources : [GroundAtmosphere, GlobeVS]
        });

        this._surfaceShaderSet.baseFragmentShaderSource = new ShaderSource({
            sources : [GlobeFS]
        });

        this._surface = new QuadtreePrimitive({
            tileProvider : new GlobeSurfaceTileProvider({
                terrainProvider : terrainProvider,
                imageryLayers : imageryLayerCollection,
                surfaceShaderSet : this._surfaceShaderSet
            })
        });

        this._terrainProvider = terrainProvider;
        this._terrainProviderChanged = new Event();

        /**
         * Determines if the globe will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        /**
         * The normal map to use for rendering waves in the ocean.  Setting this property will
         * only have an effect if the configured terrain provider includes a water mask.
         *
         * @type {String}
         * @default buildModuleUrl('Assets/Textures/waterNormalsSmall.jpg')
         */
        this.oceanNormalMapUrl = buildModuleUrl('Assets/Textures/waterNormalsSmall.jpg');
        this._oceanNormalMapUrl = undefined;

        /**
         * The maximum screen-space error used to drive level-of-detail refinement.  Higher
         * values will provide better performance but lower visual quality.
         *
         * @type {Number}
         * @default 2
         */
        this.maximumScreenSpaceError = 2;

        /**
         * The size of the terrain tile cache, expressed as a number of tiles.  Any additional
         * tiles beyond this number will be freed, as long as they aren't needed for rendering
         * this frame.  A larger number will consume more memory but will show detail faster
         * when, for example, zooming out and then back in.
         *
         * @type {Number}
         * @default 100
         */
        this.tileCacheSize = 100;

        /**
         * Enable lighting the globe with the sun as a light source.
         *
         * @type {Boolean}
         * @default false
         */
        this.enableLighting = false;

        /**
         * The distance where everything becomes lit. This only takes effect
         * when <code>enableLighting</code> is <code>true</code>.
         *
         * @type {Number}
         * @default 6500000.0
         */
        this.lightingFadeOutDistance = 6500000.0;

        /**
         * The distance where lighting resumes. This only takes effect
         * when <code>enableLighting</code> is <code>true</code>.
         *
         * @type {Number}
         * @default 9000000.0
         */
        this.lightingFadeInDistance = 9000000.0;

        /**
         * True if an animated wave effect should be shown in areas of the globe
         * covered by water; otherwise, false.  This property is ignored if the
         * <code>terrainProvider</code> does not provide a water mask.
         *
         * @type {Boolean}
         * @default true
         */
        this.showWaterEffect = true;

        /**
         * True if primitives such as billboards, polylines, labels, etc. should be depth-tested
         * against the terrain surface, or false if such primitives should always be drawn on top
         * of terrain unless they're on the opposite side of the globe.  The disadvantage of depth
         * testing primitives against terrain is that slight numerical noise or terrain level-of-detail
         * switched can sometimes make a primitive that should be on the surface disappear underneath it.
         *
         * @type {Boolean}
         * @default false
         *
         */
        this.depthTestAgainstTerrain = false;

        /**
         * Determines whether the globe casts or receives shadows from each light source. Setting the globe
         * to cast shadows may impact performance since the terrain is rendered again from the light's perspective.
         * Currently only terrain that is in view casts shadows. By default the globe does not cast shadows.
         *
         * @type {ShadowMode}
         * @default ShadowMode.RECEIVE_ONLY
         */
        this.shadows = ShadowMode.RECEIVE_ONLY;

        this._oceanNormalMap = undefined;
        this._zoomedOutOceanSpecularIntensity = 0.5;
    }

    defineProperties(Globe.prototype, {
        /**
         * Gets an ellipsoid describing the shape of this globe.
         * @memberof Globe.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },
        /**
         * Gets the collection of image layers that will be rendered on this globe.
         * @memberof Globe.prototype
         * @type {ImageryLayerCollection}
         */
        imageryLayers : {
            get : function() {
                return this._imageryLayerCollection;
            }
        },
        /**
         * Gets or sets the color of the globe when no imagery is available.
         * @memberof Globe.prototype
         * @type {Color}
         */
        baseColor : {
            get : function() {
                return this._surface.tileProvider.baseColor;
            },
            set : function(value) {
                this._surface.tileProvider.baseColor = value;
            }
        },
        /**
         * The terrain provider providing surface geometry for this globe.
         * @type {TerrainProvider}
         *
         * @memberof Globe.prototype
         * @type {TerrainProvider}
         *
         */
        terrainProvider : {
            get : function() {
                return this._terrainProvider;
            },
            set : function(value) {
                if (value !== this._terrainProvider) {
                    this._terrainProvider = value;
                    this._terrainProviderChanged.raiseEvent(value);
                }
            }
        },
        /**
         * Gets an event that's raised when the terrain provider is changed
         *
         * @memberof Globe.prototype
         * @type {Event}
         * @readonly
         */
        terrainProviderChanged : {
            get: function() {
                return this._terrainProviderChanged;
            }
        },
        /**
         * Gets an event that's raised when the length of the tile load queue has changed since the last render frame.  When the load queue is empty,
         * all terrain and imagery for the current view have been loaded.  The event passes the new length of the tile load queue.
         *
         * @memberof Globe.prototype
         * @type {Event}
         */
        tileLoadProgressEvent : {
            get: function() {
                return this._surface.tileLoadProgressEvent;
            }
        }
    });

    function createComparePickTileFunction(rayOrigin) {
        return function(a, b) {
            var aDist = BoundingSphere.distanceSquaredTo(a.pickBoundingSphere, rayOrigin);
            var bDist = BoundingSphere.distanceSquaredTo(b.pickBoundingSphere, rayOrigin);

            return aDist - bDist;
        };
    }

    var scratchArray = [];
    var scratchSphereIntersectionResult = {
        start : 0.0,
        stop : 0.0
    };

    /**
     * Find an intersection between a ray and the globe surface that was rendered. The ray must be given in world coordinates.
     *
     * @param {Ray} ray The ray to test for intersection.
     * @param {Scene} scene The scene.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
     *
     * @example
     * // find intersection of ray through a pixel and the globe
     * var ray = viewer.camera.getPickRay(windowCoordinates);
     * var intersection = globe.pick(ray, scene);
     */
    Globe.prototype.pick = function(ray, scene, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ray)) {
            throw new DeveloperError('ray is required');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }
        //>>includeEnd('debug');

        var mode = scene.mode;
        var projection = scene.mapProjection;

        var sphereIntersections = scratchArray;
        sphereIntersections.length = 0;

        var tilesToRender = this._surface._tilesToRender;
        var length = tilesToRender.length;

        var tile;
        var i;

        for (i = 0; i < length; ++i) {
            tile = tilesToRender[i];
            var tileData = tile.data;

            if (!defined(tileData)) {
                continue;
            }

            var boundingVolume = tileData.pickBoundingSphere;
            if (mode !== SceneMode.SCENE3D) {
                BoundingSphere.fromRectangleWithHeights2D(tile.rectangle, projection, tileData.minimumHeight, tileData.maximumHeight, boundingVolume);
                Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);
            } else {
                BoundingSphere.clone(tileData.boundingSphere3D, boundingVolume);
            }

            var boundingSphereIntersection = IntersectionTests.raySphere(ray, boundingVolume, scratchSphereIntersectionResult);
            if (defined(boundingSphereIntersection)) {
                sphereIntersections.push(tileData);
            }
        }

        sphereIntersections.sort(createComparePickTileFunction(ray.origin));

        var intersection;
        length = sphereIntersections.length;
        for (i = 0; i < length; ++i) {
            intersection = sphereIntersections[i].pick(ray, scene.mode, scene.mapProjection, true, result);
            if (defined(intersection)) {
                break;
            }
        }

        return intersection;
    };

    var scratchGetHeightCartesian = new Cartesian3();
    var scratchGetHeightIntersection = new Cartesian3();
    var scratchGetHeightCartographic = new Cartographic();
    var scratchGetHeightRay = new Ray();

    function tileIfContainsCartographic(tile, cartographic) {
        return Rectangle.contains(tile.rectangle, cartographic) ? tile : undefined;
    }

    /**
     * Get the height of the surface at a given cartographic.
     *
     * @param {Cartographic} cartographic The cartographic for which to find the height.
     * @returns {Number|undefined} The height of the cartographic or undefined if it could not be found.
     */
    Globe.prototype.getHeight = function(cartographic) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartographic)) {
            throw new DeveloperError('cartographic is required');
        }
        //>>includeEnd('debug');

        var levelZeroTiles = this._surface._levelZeroTiles;
        if (!defined(levelZeroTiles)) {
            return;
        }

        var tile;
        var i;

        var length = levelZeroTiles.length;
        for (i = 0; i < length; ++i) {
            tile = levelZeroTiles[i];
            if (Rectangle.contains(tile.rectangle, cartographic)) {
                break;
            }
        }

        if (!defined(tile) || !Rectangle.contains(tile.rectangle, cartographic)) {
            return undefined;
        }

        while (tile.renderable) {
            tile = tileIfContainsCartographic(tile.southwestChild, cartographic) ||
                   tileIfContainsCartographic(tile.southeastChild, cartographic) ||
                   tileIfContainsCartographic(tile.northwestChild, cartographic) ||
                   tile.northeastChild;
        }

        while (defined(tile) && (!defined(tile.data) || !defined(tile.data.pickTerrain))) {
            tile = tile.parent;
        }

        if (!defined(tile)) {
            return undefined;
        }

        var ellipsoid = this._surface._tileProvider.tilingScheme.ellipsoid;

        //cartesian has to be on the ellipsoid surface for `ellipsoid.geodeticSurfaceNormal`
        var cartesian = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0, ellipsoid, scratchGetHeightCartesian);

        var ray = scratchGetHeightRay;
        var surfaceNormal = ellipsoid.geodeticSurfaceNormal(cartesian, ray.direction);

        // Try to find the intersection point between the surface normal and z-axis.
        // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
        var rayOrigin = ellipsoid.getSurfaceNormalIntersectionWithZAxis(cartesian, 11500.0, ray.origin);

        // Theoretically, not with Earth datums, the intersection point can be outside the ellipsoid
        if (!defined(rayOrigin)) {
            // intersection point is outside the ellipsoid, try other value
            // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
            var magnitude = Math.min(defaultValue(tile.data.minimumHeight, 0.0),-11500.0);

            // multiply by the *positive* value of the magnitude
            var vectorToMinimumPoint = Cartesian3.multiplyByScalar(surfaceNormal, Math.abs(magnitude) + 1, scratchGetHeightIntersection);
            Cartesian3.subtract(cartesian, vectorToMinimumPoint, ray.origin);
        }

        var intersection = tile.data.pick(ray, undefined, undefined, false, scratchGetHeightIntersection);
        if (!defined(intersection)) {
            return undefined;
        }

        return ellipsoid.cartesianToCartographic(intersection, scratchGetHeightCartographic).height;
    };

    /**
     * @private
     */
    Globe.prototype.beginFrame = function(frameState) {
        if (!this.show) {
            return;
        }

        var surface = this._surface;
        var tileProvider = surface.tileProvider;
        var terrainProvider = this.terrainProvider;
        var hasWaterMask = this.showWaterEffect && terrainProvider.ready && terrainProvider.hasWaterMask;

        if (hasWaterMask && this.oceanNormalMapUrl !== this._oceanNormalMapUrl) {
            // url changed, load new normal map asynchronously
            var oceanNormalMapUrl = this.oceanNormalMapUrl;
            this._oceanNormalMapUrl = oceanNormalMapUrl;

            if (defined(oceanNormalMapUrl)) {
                var that = this;
                when(loadImage(oceanNormalMapUrl), function(image) {
                    if (oceanNormalMapUrl !== that.oceanNormalMapUrl) {
                        // url changed while we were loading
                        return;
                    }

                    that._oceanNormalMap = that._oceanNormalMap && that._oceanNormalMap.destroy();
                    that._oceanNormalMap = new Texture({
                        context : frameState.context,
                        source : image
                    });
                });
            } else {
                this._oceanNormalMap = this._oceanNormalMap && this._oceanNormalMap.destroy();
            }
        }

        var mode = frameState.mode;
        var pass = frameState.passes;

        if (pass.render) {
            // Don't show the ocean specular highlights when zoomed out in 2D and Columbus View.
            if (mode === SceneMode.SCENE3D) {
                this._zoomedOutOceanSpecularIntensity = 0.5;
            } else {
                this._zoomedOutOceanSpecularIntensity = 0.0;
            }

            surface.maximumScreenSpaceError = this.maximumScreenSpaceError;
            surface.tileCacheSize = this.tileCacheSize;

            tileProvider.terrainProvider = this.terrainProvider;
            tileProvider.lightingFadeOutDistance = this.lightingFadeOutDistance;
            tileProvider.lightingFadeInDistance = this.lightingFadeInDistance;
            tileProvider.zoomedOutOceanSpecularIntensity = this._zoomedOutOceanSpecularIntensity;
            tileProvider.hasWaterMask = hasWaterMask;
            tileProvider.oceanNormalMap = this._oceanNormalMap;
            tileProvider.enableLighting = this.enableLighting;
            tileProvider.shadows = this.shadows;

            surface.beginFrame(frameState);
        }
    };

    /**
     * @private
     */
    Globe.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        var surface = this._surface;
        var pass = frameState.passes;

        if (pass.render) {
            surface.update(frameState);
        }

        if (pass.pick) {
            surface.update(frameState);
        }
    };

    /**
     * @private
     */
    Globe.prototype.endFrame = function(frameState) {
        if (!this.show) {
            return;
        }

        if (frameState.passes.render) {
            this._surface.endFrame(frameState);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Globe#destroy
     */
    Globe.prototype.isDestroyed = function() {
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
     * globe = globe && globe.destroy();
     *
     * @see Globe#isDestroyed
     */
    Globe.prototype.destroy = function() {
        this._surfaceShaderSet = this._surfaceShaderSet && this._surfaceShaderSet.destroy();
        this._surface = this._surface && this._surface.destroy();
        this._oceanNormalMap = this._oceanNormalMap && this._oceanNormalMap.destroy();
        return destroyObject(this);
    };

    return Globe;
});
