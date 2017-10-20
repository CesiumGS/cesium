define([
        '../Core/BoundingSphere',
        '../Core/buildModuleUrl',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeographicTilingScheme',
        '../Core/GeometryInstance',
        '../Core/isArray',
        '../Core/loadJson',
        '../Core/Math',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../ThirdParty/when',
        './ClassificationPrimitive',
        './ClassificationType',
        './SceneMode'
    ], function(
        BoundingSphere,
        buildModuleUrl,
        Cartesian2,
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        GeographicTilingScheme,
        GeometryInstance,
        isArray,
        loadJson,
        CesiumMath,
        OrientedBoundingBox,
        Rectangle,
        when,
        ClassificationPrimitive,
        ClassificationType,
        SceneMode) {
    'use strict';

    var GroundPrimitiveUniformMap = {
        u_globeMinimumAltitude: function() {
            return 55000.0;
        }
    };

    /**
     * A ground primitive represents geometry draped over the terrain in the {@link Scene}.  The geometry must be from a single {@link GeometryInstance}.
     * Batching multiple geometries is not yet supported.
     * <p>
     * A primitive combines the geometry instance with an {@link Appearance} that describes the full shading, including
     * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
     * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
     * and match most of them and add a new geometry or appearance independently of each other. Only the {@link PerInstanceColorAppearance}
     * is supported at this time.
     * </p>
     * <p>
     * For correct rendering, this feature requires the EXT_frag_depth WebGL extension. For hardware that do not support this extension, there
     * will be rendering artifacts for some viewing angles.
     * </p>
     * <p>
     * Valid geometries are {@link CircleGeometry}, {@link CorridorGeometry}, {@link EllipseGeometry}, {@link PolygonGeometry}, and {@link RectangleGeometry}.
     * </p>
     *
     * @alias GroundPrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Array|GeometryInstance} [options.geometryInstances] The geometry instances to render.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Boolean} [options.vertexCacheOptimize=false] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
     * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
     * @param {Boolean} [options.compressVertices=true] When <code>true</code>, the geometry vertices are compressed, which will save memory.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready. If false initializeTerrainHeights() must be called first.
     * @param {ClassificationType} [options.classificationType=ClassificationType.BOTH] Determines whether terrain, 3D Tiles or both will be classified.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     * @param {Boolean} [options.debugShowShadowVolume=false] For debugging only. Determines if the shadow volume for each geometry in the primitive is drawn. Must be <code>true</code> on
     *                  creation for the volumes to be created before the geometry is released or options.releaseGeometryInstance must be <code>false</code>.
     *
     * @example
     * // Example 1: Create primitive with a single instance
     * var rectangleInstance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.RectangleGeometry({
     *     rectangle : Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0)
     *   }),
     *   id : 'rectangle',
     *   attributes : {
     *     color : new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
     *   }
     * });
     * scene.primitives.add(new Cesium.GroundPrimitive({
     *   geometryInstances : rectangleInstance
     * }));
     *
     * // Example 2: Batch instances
     * var color = new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5); // Both instances must have the same color.
     * var rectangleInstance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.RectangleGeometry({
     *     rectangle : Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0)
     *   }),
     *   id : 'rectangle',
     *   attributes : {
     *     color : color
     *   }
     * });
     * var ellipseInstance = new Cesium.GeometryInstance({
     *     geometry : new Cesium.EllipseGeometry({
     *         center : Cesium.Cartesian3.fromDegrees(-105.0, 40.0),
     *         semiMinorAxis : 300000.0,
     *         semiMajorAxis : 400000.0
     *     }),
     *     id : 'ellipse',
     *     attributes : {
     *         color : color
     *     }
     * });
     * scene.primitives.add(new Cesium.GroundPrimitive({
     *   geometryInstances : [rectangleInstance, ellipseInstance]
     * }));
     *
     * @see Primitive
     * @see ClassificationPrimitive
     * @see GeometryInstance
     * @see Appearance
     */
    function GroundPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The geometry instance rendered with this primitive.  This may
         * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
         * is <code>true</code> when the primitive is constructed.
         * <p>
         * Changing this property after the primitive is rendered has no effect.
         * </p>
         * <p>
         * Because of the rendering technique used, all geometry instances must be the same color.
         * If there is an instance with a differing color, a <code>DeveloperError</code> will be thrown
         * on the first attempt to render.
         * </p>
         *
         * @readonly
         * @type {Array|GeometryInstance}
         *
         * @default undefined
         */
        this.geometryInstances = options.geometryInstances;
        /**
         * Determines if the primitive will be shown.  This affects all geometry
         * instances in the primitive.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.show = defaultValue(options.show, true);
        /**
         * Determines whether terrain, 3D Tiles or both will be classified.
         *
         * @type {ClassificationType}
         *
         * @default ClassificationType.BOTH
         */
        this.classificationType = defaultValue(options.classificationType, ClassificationType.BOTH);
        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the bounding sphere for each draw command in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the shadow volume for each geometry in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowShadowVolume = defaultValue(options.debugShowShadowVolume, false);

        this._boundingVolumes = [];
        this._boundingVolumes2D = [];

        this._ready = false;
        this._readyPromise = when.defer();

        this._primitive = undefined;

        this._maxHeight = undefined;
        this._minHeight = undefined;

        this._maxTerrainHeight = GroundPrimitive._defaultMaxTerrainHeight;
        this._minTerrainHeight = GroundPrimitive._defaultMinTerrainHeight;

        this._boundingSpheresKeys = [];
        this._boundingSpheres = [];

        var that = this;
        this._primitiveOptions = {
            geometryInstances : undefined,
            vertexCacheOptimize : defaultValue(options.vertexCacheOptimize, false),
            interleave : defaultValue(options.interleave, false),
            releaseGeometryInstances : defaultValue(options.releaseGeometryInstances, true),
            allowPicking : defaultValue(options.allowPicking, true),
            asynchronous : defaultValue(options.asynchronous, true),
            compressVertices : defaultValue(options.compressVertices, true),
            _createBoundingVolumeFunction : undefined,
            _updateAndQueueCommandsFunction : undefined,
            _pickPrimitive : that,
            _extruded : true,
            _uniformMap : GroundPrimitiveUniformMap
        };
    }

    defineProperties(GroundPrimitive.prototype, {
        /**
         * When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        vertexCacheOptimize : {
            get : function() {
                return this._primitiveOptions.vertexCacheOptimize;
            }
        },

        /**
         * Determines if geometry vertex attributes are interleaved, which can slightly improve rendering performance.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        interleave : {
            get : function() {
                return this._primitiveOptions.interleave;
            }
        },

        /**
         * When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        releaseGeometryInstances : {
            get : function() {
                return this._primitiveOptions.releaseGeometryInstances;
            }
        },

        /**
         * When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        allowPicking : {
            get : function() {
                return this._primitiveOptions.allowPicking;
            }
        },

        /**
         * Determines if the geometry instances will be created and batched on a web worker.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        asynchronous : {
            get : function() {
                return this._primitiveOptions.asynchronous;
            }
        },

        /**
         * When <code>true</code>, geometry vertices are compressed, which will save memory.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        compressVertices : {
            get : function() {
                return this._primitiveOptions.compressVertices;
            }
        },

        /**
         * Determines if the primitive is complete and ready to render.  If this property is
         * true, the primitive will be rendered the next time that {@link GroundPrimitive#update}
         * is called.
         *
         * @memberof GroundPrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets a promise that resolves when the primitive is ready to render.
         * @memberof GroundPrimitive.prototype
         * @type {Promise.<GroundPrimitive>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    /**
     * Determines if GroundPrimitive rendering is supported.
     *
     * @param {Scene} scene The scene.
     * @returns {Boolean} <code>true</code> if GroundPrimitives are supported; otherwise, returns <code>false</code>
     */
    GroundPrimitive.isSupported = ClassificationPrimitive.isSupported;

    GroundPrimitive._defaultMaxTerrainHeight = 9000.0;
    GroundPrimitive._defaultMinTerrainHeight = -100000.0;

    GroundPrimitive._terrainHeights = undefined;
    GroundPrimitive._terrainHeightsMaxLevel = 6;

    function getComputeMaximumHeightFunction(primitive) {
        return function(granularity, ellipsoid) {
            var r = ellipsoid.maximumRadius;
            var delta = (r / Math.cos(granularity * 0.5)) - r;
            return primitive._maxHeight + delta;
        };
    }

    function getComputeMinimumHeightFunction(primitive) {
        return function(granularity, ellipsoid) {
            return primitive._minHeight;
        };
    }

    var scratchBVCartesianHigh = new Cartesian3();
    var scratchBVCartesianLow = new Cartesian3();
    var scratchBVCartesian = new Cartesian3();
    var scratchBVCartographic = new Cartographic();
    var scratchBVRectangle = new Rectangle();
    var tilingScheme = new GeographicTilingScheme();
    var scratchCorners = [new Cartographic(), new Cartographic(), new Cartographic(), new Cartographic()];
    var scratchTileXY = new Cartesian2();

    function getRectangle(frameState, geometry) {
        var ellipsoid = frameState.mapProjection.ellipsoid;

        if (!defined(geometry.attributes) || !defined(geometry.attributes.position3DHigh)) {
            if (defined(geometry.rectangle)) {
                return geometry.rectangle;
            }

            return undefined;
        }

        var highPositions = geometry.attributes.position3DHigh.values;
        var lowPositions = geometry.attributes.position3DLow.values;
        var length = highPositions.length;

        var minLat = Number.POSITIVE_INFINITY;
        var minLon = Number.POSITIVE_INFINITY;
        var maxLat = Number.NEGATIVE_INFINITY;
        var maxLon = Number.NEGATIVE_INFINITY;

        for (var i = 0; i < length; i +=3) {
            var highPosition = Cartesian3.unpack(highPositions, i, scratchBVCartesianHigh);
            var lowPosition = Cartesian3.unpack(lowPositions, i, scratchBVCartesianLow);

            var position = Cartesian3.add(highPosition, lowPosition, scratchBVCartesian);
            var cartographic = ellipsoid.cartesianToCartographic(position, scratchBVCartographic);

            var latitude = cartographic.latitude;
            var longitude = cartographic.longitude;

            minLat = Math.min(minLat, latitude);
            minLon = Math.min(minLon, longitude);
            maxLat = Math.max(maxLat, latitude);
            maxLon = Math.max(maxLon, longitude);
        }

        var rectangle = scratchBVRectangle;
        rectangle.north = maxLat;
        rectangle.south = minLat;
        rectangle.east = maxLon;
        rectangle.west = minLon;

        return rectangle;
    }

    var scratchDiagonalCartesianNE = new Cartesian3();
    var scratchDiagonalCartesianSW = new Cartesian3();
    var scratchDiagonalCartographic = new Cartographic();
    var scratchCenterCartesian = new Cartesian3();
    var scratchSurfaceCartesian = new Cartesian3();

    function getTileXYLevel(rectangle) {
        Cartographic.fromRadians(rectangle.east, rectangle.north, 0.0, scratchCorners[0]);
        Cartographic.fromRadians(rectangle.west, rectangle.north, 0.0, scratchCorners[1]);
        Cartographic.fromRadians(rectangle.east, rectangle.south, 0.0, scratchCorners[2]);
        Cartographic.fromRadians(rectangle.west, rectangle.south, 0.0, scratchCorners[3]);

        // Determine which tile the bounding rectangle is in
        var lastLevelX = 0, lastLevelY = 0;
        var currentX = 0, currentY = 0;
        var maxLevel = GroundPrimitive._terrainHeightsMaxLevel;
        var i;
        for(i = 0; i <= maxLevel; ++i) {
            var failed = false;
            for(var j = 0; j < 4; ++j) {
                var corner = scratchCorners[j];
                tilingScheme.positionToTileXY(corner, i, scratchTileXY);
                if (j === 0) {
                    currentX = scratchTileXY.x;
                    currentY = scratchTileXY.y;
                } else if(currentX !== scratchTileXY.x || currentY !== scratchTileXY.y) {
                    failed = true;
                    break;
                }
            }

            if (failed) {
                break;
            }

            lastLevelX = currentX;
            lastLevelY = currentY;
        }

        if (i === 0) {
            return undefined;
        }

        return {
            x : lastLevelX,
            y : lastLevelY,
            level : (i > maxLevel) ? maxLevel : (i - 1)
        };
    }

    function setMinMaxTerrainHeights(primitive, rectangle, ellipsoid) {
        var xyLevel = getTileXYLevel(rectangle);

        // Get the terrain min/max for that tile
        var minTerrainHeight = GroundPrimitive._defaultMinTerrainHeight;
        var maxTerrainHeight = GroundPrimitive._defaultMaxTerrainHeight;
        if (defined(xyLevel)) {
            var key = xyLevel.level + '-' + xyLevel.x + '-' + xyLevel.y;
            var heights = GroundPrimitive._terrainHeights[key];
            if (defined(heights)) {
                minTerrainHeight = heights[0];
                maxTerrainHeight = heights[1];
            }

            // Compute min by taking the center of the NE->SW diagonal and finding distance to the surface
            ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle, scratchDiagonalCartographic),
                scratchDiagonalCartesianNE);
            ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle, scratchDiagonalCartographic),
                scratchDiagonalCartesianSW);

            Cartesian3.subtract(scratchDiagonalCartesianSW, scratchDiagonalCartesianNE, scratchCenterCartesian);
            Cartesian3.add(scratchDiagonalCartesianNE,
                Cartesian3.multiplyByScalar(scratchCenterCartesian, 0.5, scratchCenterCartesian), scratchCenterCartesian);
            var surfacePosition = ellipsoid.scaleToGeodeticSurface(scratchCenterCartesian, scratchSurfaceCartesian);
            if (defined(surfacePosition)) {
                var distance = Cartesian3.distance(scratchCenterCartesian, surfacePosition);
                minTerrainHeight = Math.min(minTerrainHeight, -distance);
            } else {
                minTerrainHeight = GroundPrimitive._defaultMinTerrainHeight;
            }
        }

        primitive._minTerrainHeight = Math.max(GroundPrimitive._defaultMinTerrainHeight, minTerrainHeight);
        primitive._maxTerrainHeight = maxTerrainHeight;
    }

    var scratchBoundingSphere = new BoundingSphere();
    function getInstanceBoundingSphere(rectangle, ellipsoid) {
        var xyLevel = getTileXYLevel(rectangle);

        // Get the terrain max for that tile
        var maxTerrainHeight = GroundPrimitive._defaultMaxTerrainHeight;
        if (defined(xyLevel)) {
            var key = xyLevel.level + '-' + xyLevel.x + '-' + xyLevel.y;
            var heights = GroundPrimitive._terrainHeights[key];
            if (defined(heights)) {
                maxTerrainHeight = heights[1];
            }
        }

        var result = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, 0.0);
        BoundingSphere.fromRectangle3D(rectangle, ellipsoid, maxTerrainHeight, scratchBoundingSphere);

        return BoundingSphere.union(result, scratchBoundingSphere, result);
    }

    function createBoundingVolume(groundPrimitive, frameState, geometry) {
        var ellipsoid = frameState.mapProjection.ellipsoid;
        var rectangle = getRectangle(frameState, geometry);

        // Use an oriented bounding box by default, but switch to a bounding sphere if bounding box creation would fail.
        if (rectangle.width < CesiumMath.PI) {
            var obb = OrientedBoundingBox.fromRectangle(rectangle, groundPrimitive._maxHeight, groundPrimitive._minHeight, ellipsoid);
            groundPrimitive._boundingVolumes.push(obb);
        } else {
            var highPositions = geometry.attributes.position3DHigh.values;
            var lowPositions = geometry.attributes.position3DLow.values;
            groundPrimitive._boundingVolumes.push(BoundingSphere.fromEncodedCartesianVertices(highPositions, lowPositions));
        }

        if (!frameState.scene3DOnly) {
            var projection = frameState.mapProjection;
            var boundingVolume = BoundingSphere.fromRectangleWithHeights2D(rectangle, projection, groundPrimitive._maxHeight, groundPrimitive._minHeight);
            Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

            groundPrimitive._boundingVolumes2D.push(boundingVolume);
        }
    }

    function boundingVolumeIndex(commandIndex, length) {
        return Math.floor((commandIndex % (length / 2)) / 3);
    }

    var scratchCommandIndices = {
        start : 0,
        end : 0
    };

    function getCommandIndices(classificationType, length) {
        var startIndex;
        var endIndex;
        if (classificationType === ClassificationType.TERRAIN) {
            startIndex = 0;
            endIndex = length / 2;
        } else if (classificationType === ClassificationType.CESIUM_3D_TILE) {
            startIndex = length / 2;
            endIndex = length;
        } else {
            startIndex = 0;
            endIndex = length;
        }

        scratchCommandIndices.start = startIndex;
        scratchCommandIndices.end = endIndex;
        return scratchCommandIndices;
    }

    function updateAndQueueCommands(groundPrimitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
        var boundingVolumes;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolumes = groundPrimitive._boundingVolumes;
        } else {
            boundingVolumes = groundPrimitive._boundingVolumes2D;
        }

        var indices;
        var startIndex;
        var endIndex;
        var classificationType = groundPrimitive.classificationType;

        var commandList = frameState.commandList;
        var passes = frameState.passes;
        if (passes.render) {
            var colorLength = colorCommands.length;
            indices = getCommandIndices(classificationType, colorLength);
            startIndex = indices.start;
            endIndex = indices.end;

            var i;
            var colorCommand;

            for (i = startIndex; i < endIndex; ++i) {
                colorCommand = colorCommands[i];
                colorCommand.owner = groundPrimitive;
                colorCommand.modelMatrix = modelMatrix;
                colorCommand.boundingVolume = boundingVolumes[boundingVolumeIndex(i, colorLength)];
                colorCommand.cull = cull;
                colorCommand.debugShowBoundingVolume = debugShowBoundingVolume;

                commandList.push(colorCommand);
            }

            if (frameState.invertClassification) {
                var ignoreShowCommands = groundPrimitive._primitive._commandsIgnoreShow;
                startIndex = 0;
                endIndex = ignoreShowCommands.length;

                for (i = startIndex; i < endIndex; ++i) {
                    var bvIndex = Math.floor(i / 2);
                    colorCommand = ignoreShowCommands[i];
                    colorCommand.modelMatrix = modelMatrix;
                    colorCommand.boundingVolume = boundingVolumes[bvIndex];
                    colorCommand.cull = cull;
                    colorCommand.debugShowBoundingVolume = debugShowBoundingVolume;

                    commandList.push(colorCommand);
                }
            }
        }

        if (passes.pick) {
            var pickLength = pickCommands.length;
            indices = getCommandIndices(classificationType, pickLength);
            startIndex = indices.start;
            endIndex = indices.end;

            var primitive = groundPrimitive._primitive._primitive;
            var pickOffsets = primitive._pickOffsets;
            for (var j = startIndex; j < endIndex; ++j) {
                var pickOffset = pickOffsets[boundingVolumeIndex(j, pickLength)];
                var bv = boundingVolumes[pickOffset.index];

                var pickCommand = pickCommands[j];
                pickCommand.owner = groundPrimitive;
                pickCommand.modelMatrix = modelMatrix;
                pickCommand.boundingVolume = bv;
                pickCommand.cull = cull;

                commandList.push(pickCommand);
            }
        }
    }

    GroundPrimitive._initialized = false;
    GroundPrimitive._initPromise = undefined;

    /**
     * Initializes the minimum and maximum terrain heights. This only needs to be called if you are creating the
     * GroundPrimitive synchronously.
     *
     * @returns {Promise} A promise that will resolve once the terrain heights have been loaded.
     *
     */
    GroundPrimitive.initializeTerrainHeights = function() {
        var initPromise = GroundPrimitive._initPromise;
        if (defined(initPromise)) {
            return initPromise;
        }

        GroundPrimitive._initPromise = loadJson(buildModuleUrl('Assets/approximateTerrainHeights.json')).then(function(json) {
            GroundPrimitive._initialized = true;
            GroundPrimitive._terrainHeights = json;
        });

        return GroundPrimitive._initPromise;
    };

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} All instance geometries must have the same primitiveType.
     * @exception {DeveloperError} Appearance and material have a uniform with the same name.
     * @exception {DeveloperError} Not all of the geometry instances have the same color attribute.
     */
    GroundPrimitive.prototype.update = function(frameState) {
        if (!this.show || (!defined(this._primitive) && !defined(this.geometryInstances))) {
            return;
        }

        if (!GroundPrimitive._initialized) {
            //>>includeStart('debug', pragmas.debug);
            if (!this.asynchronous) {
                throw new DeveloperError('For synchronous GroundPrimitives, you must call GroundPrimitive.initializeTerrainHeights() and wait for the returned promise to resolve.');
            }
            //>>includeEnd('debug');

            GroundPrimitive.initializeTerrainHeights();
            return;
        }

        var that = this;
        var primitiveOptions = this._primitiveOptions;

        if (!defined(this._primitive)) {
            var ellipsoid = frameState.mapProjection.ellipsoid;

            var instance;
            var geometry;
            var instanceType;

            var instances = isArray(this.geometryInstances) ? this.geometryInstances : [this.geometryInstances];
            var length = instances.length;
            var groundInstances = new Array(length);

            var i;
            var rectangle;
            for (i = 0; i < length; ++i) {
                instance = instances[i];
                geometry = instance.geometry;
                var instanceRectangle = getRectangle(frameState, geometry);
                if (!defined(rectangle)) {
                    rectangle = instanceRectangle;
                } else if (defined(instanceRectangle)) {
                    Rectangle.union(rectangle, instanceRectangle, rectangle);
                }

                var id = instance.id;
                if (defined(id) && defined(instanceRectangle)) {
                    var boundingSphere = getInstanceBoundingSphere(instanceRectangle, ellipsoid);
                    this._boundingSpheresKeys.push(id);
                    this._boundingSpheres.push(boundingSphere);
                }

                instanceType = geometry.constructor;
                if (!defined(instanceType) || !defined(instanceType.createShadowVolume)) {
                    //>>includeStart('debug', pragmas.debug);
                    throw new DeveloperError('Not all of the geometry instances have GroundPrimitive support.');
                    //>>includeEnd('debug');
                }
            }

            // Now compute the min/max heights for the primitive
            setMinMaxTerrainHeights(this, rectangle, frameState.mapProjection.ellipsoid);
            var exaggeration = frameState.terrainExaggeration;
            this._minHeight = this._minTerrainHeight * exaggeration;
            this._maxHeight = this._maxTerrainHeight * exaggeration;

            for (i = 0; i < length; ++i) {
                instance = instances[i];
                geometry = instance.geometry;
                instanceType = geometry.constructor;
                groundInstances[i] = new GeometryInstance({
                    geometry : instanceType.createShadowVolume(geometry, getComputeMinimumHeightFunction(this),
                        getComputeMaximumHeightFunction(this)),
                    attributes : instance.attributes,
                    id : instance.id
                });
            }

            primitiveOptions.geometryInstances = groundInstances;

            primitiveOptions._createBoundingVolumeFunction = function(frameState, geometry) {
                createBoundingVolume(that, frameState, geometry);
            };
            primitiveOptions._updateAndQueueCommandsFunction = function(primitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
                updateAndQueueCommands(that, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses);
            };

            this._primitive = new ClassificationPrimitive(primitiveOptions);
            this._primitive.readyPromise.then(function(primitive) {
                that._ready = true;

                if (that.releaseGeometryInstances) {
                    that.geometryInstances = undefined;
                }

                var error = primitive._error;
                if (!defined(error)) {
                    that._readyPromise.resolve(that);
                } else {
                    that._readyPromise.reject(error);
                }
            });
        }

        this._primitive.debugShowShadowVolume = this.debugShowShadowVolume;
        this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        this._primitive.update(frameState);
    };

    /**
     * @private
     */
    GroundPrimitive.prototype.getBoundingSphere = function(id) {
        var index = this._boundingSpheresKeys.indexOf(id);
        if (index !== -1) {
            return this._boundingSpheres[index];
        }

        return undefined;
    };

    /**
     * Returns the modifiable per-instance attributes for a {@link GeometryInstance}.
     *
     * @param {Object} id The id of the {@link GeometryInstance}.
     * @returns {Object} The typed array in the attribute's format or undefined if the is no instance with id.
     *
     * @exception {DeveloperError} must call update before calling getGeometryInstanceAttributes.
     *
     * @example
     * var attributes = primitive.getGeometryInstanceAttributes('an id');
     * attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.AQUA);
     * attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true);
     */
    GroundPrimitive.prototype.getGeometryInstanceAttributes = function(id) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(this._primitive)) {
            throw new DeveloperError('must call update before calling getGeometryInstanceAttributes');
        }
        //>>includeEnd('debug');
        return this._primitive.getGeometryInstanceAttributes(id);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see GroundPrimitive#destroy
     */
    GroundPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * e = e && e.destroy();
     *
     * @see GroundPrimitive#isDestroyed
     */
    GroundPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return GroundPrimitive;
});
