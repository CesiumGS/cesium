define([
        '../Core/ApproximateTerrainHeights',
        '../Core/BoundingSphere',
        '../Core/buildModuleUrl',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Check',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeographicTilingScheme',
        '../Core/GeometryInstance',
        '../Core/isArray',
        '../Core/Math',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../Core/RectangleGeometry',
        '../Core/Resource',
        '../Renderer/DrawCommand',
        '../Renderer/Pass',
        '../ThirdParty/when',
        './ClassificationPrimitive',
        './ClassificationType',
        './PerInstanceColorAppearance',
        './SceneMode',
        './ShadowVolumeAppearance'
    ], function(
        ApproximateTerrainHeights,
        BoundingSphere,
        buildModuleUrl,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Check,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        GeographicTilingScheme,
        GeometryInstance,
        isArray,
        CesiumMath,
        OrientedBoundingBox,
        Rectangle,
        RectangleGeometry,
        Resource,
        DrawCommand,
        Pass,
        when,
        ClassificationPrimitive,
        ClassificationType,
        PerInstanceColorAppearance,
        SceneMode,
        ShadowVolumeAppearance) {
    'use strict';

    var GroundPrimitiveUniformMap = {
        u_globeMinimumAltitude: function() {
            return 55000.0;
        }
    };

    /**
     * A ground primitive represents geometry draped over the terrain in the {@link Scene}.
     * <p>
     * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
     * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
     * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
     * and match most of them and add a new geometry or appearance independently of each other.
     *
     * Only {@link PerInstanceColorAppearance} with the same color across all instances is supported at this time when
     * classifying {@link ClassificationType}.CESIUM_3D_TILE and {@link ClassificationType}.BOTH.
     *
     * Support for the WEBGL_depth_texture extension is required to use GeometryInstances with different PerInstanceColors
     * or materials besides PerInstanceColorAppearance.
     *
     * Textured GroundPrimitives were designed for notional patterns and are not meant for precisely mapping
     * textures to terrain - for that use case, use {@link SingleTileImageryProvider}.
     *
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
     * @param {Appearance} [options.appearance] The appearance used to render the primitive. Defaults to a flat PerInstanceColorAppearance when GeometryInstances have a color attribute.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Boolean} [options.vertexCacheOptimize=false] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
     * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
     * @param {Boolean} [options.compressVertices=true] When <code>true</code>, the geometry vertices are compressed, which will save memory.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready. If false initializeTerrainHeights() must be called first.
     * @param {ClassificationType} [options.classificationType=ClassificationType.TERRAIN] Determines whether terrain, 3D Tiles or both will be classified.
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

        var appearance = options.appearance;
        var geometryInstances = options.geometryInstances;
        if (!defined(appearance) && defined(geometryInstances)) {
            var geometryInstancesArray = isArray(geometryInstances) ? geometryInstances : [geometryInstances];
            var geometryInstanceCount = geometryInstancesArray.length;
            for (var i = 0; i < geometryInstanceCount; i++) {
                var attributes = geometryInstancesArray[i].attributes;
                if (defined(attributes) && defined(attributes.color)) {
                    appearance = new PerInstanceColorAppearance({
                        flat : true
                    });
                    break;
                }
            }
        }
        /**
         * The {@link Appearance} used to shade this primitive. Each geometry
         * instance is shaded with the same appearance.  Some appearances, like
         * {@link PerInstanceColorAppearance} allow giving each instance unique
         * properties.
         *
         * @type Appearance
         *
         * @default undefined
         */
        this.appearance = appearance;

        /**
         * The geometry instances rendered with this primitive.  This may
         * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
         * is <code>true</code> when the primitive is constructed.
         * <p>
         * Changing this property after the primitive is rendered has no effect.
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
         * @default ClassificationType.TERRAIN
         */
        this.classificationType = defaultValue(options.classificationType, ClassificationType.TERRAIN);
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

        this._maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
        this._minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;

        this._boundingSpheresKeys = [];
        this._boundingSpheres = [];

        this._useFragmentCulling = false;
        // Used when inserting in an OrderedPrimitiveCollection
        this._zIndex = undefined;

        var that = this;
        this._classificationPrimitiveOptions = {
            geometryInstances : undefined,
            appearance : undefined,
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
                return this._classificationPrimitiveOptions.vertexCacheOptimize;
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
                return this._classificationPrimitiveOptions.interleave;
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
                return this._classificationPrimitiveOptions.releaseGeometryInstances;
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
                return this._classificationPrimitiveOptions.allowPicking;
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
                return this._classificationPrimitiveOptions.asynchronous;
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
                return this._classificationPrimitiveOptions.compressVertices;
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
     * @function
     * @param {Scene} scene The scene.
     * @returns {Boolean} <code>true</code> if GroundPrimitives are supported; otherwise, returns <code>false</code>
     */
    GroundPrimitive.isSupported = ClassificationPrimitive.isSupported;

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

    function setMinMaxTerrainHeights(primitive, rectangle, ellipsoid) {
        var result = ApproximateTerrainHeights.getMinimumMaximumHeights(rectangle, ellipsoid);

        primitive._minTerrainHeight = result.minimumTerrainHeight;
        primitive._maxTerrainHeight = result.maximumTerrainHeight;
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
        return Math.floor((commandIndex % length) / 3);
    }

    function updateAndQueueCommands(groundPrimitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
        var boundingVolumes;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolumes = groundPrimitive._boundingVolumes;
        } else {
            boundingVolumes = groundPrimitive._boundingVolumes2D;
        }

        var pass;
        switch (groundPrimitive.classificationType) {
            case ClassificationType.TERRAIN:
                pass = Pass.TERRAIN_CLASSIFICATION;
                break;
            case ClassificationType.CESIUM_3D_TILE:
                pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
                break;
            default:
                pass = Pass.CLASSIFICATION;
        }

        var commandList = frameState.commandList;
        var passes = frameState.passes;
        var classificationPrimitive = groundPrimitive._primitive;
        if (passes.render) {
            var colorLength = colorCommands.length;
            var i;
            var colorCommand;

            for (i = 0; i < colorLength; ++i) {
                colorCommand = colorCommands[i];

                // Use derived appearance command for 2D if needed
                if (frameState.mode !== SceneMode.SCENE3D &&
                    colorCommand.shaderProgram === classificationPrimitive._spColor &&
                    classificationPrimitive._needs2DShader) {
                    colorCommand = colorCommand.derivedCommands.appearance2D;
                }

                colorCommand.owner = groundPrimitive;
                colorCommand.modelMatrix = modelMatrix;
                colorCommand.boundingVolume = boundingVolumes[boundingVolumeIndex(i, colorLength)];
                colorCommand.cull = cull;
                colorCommand.debugShowBoundingVolume = debugShowBoundingVolume;
                colorCommand.pass = pass;

                commandList.push(colorCommand);
            }

            if (frameState.invertClassification) {
                var ignoreShowCommands = classificationPrimitive._commandsIgnoreShow;
                var ignoreShowCommandsLength = ignoreShowCommands.length;

                for (i = 0; i < ignoreShowCommandsLength; ++i) {
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

            var pickOffsets;
            if (!groundPrimitive._useFragmentCulling) {
                // Must be using pick offsets
                classificationPrimitive = groundPrimitive._primitive;
                pickOffsets = classificationPrimitive._primitive._pickOffsets;
            }
            for (var j = 0; j < pickLength; ++j) {
                var pickCommand = pickCommands[j];

                // Use derived pick command for 2D if needed
                if (frameState.mode !== SceneMode.SCENE3D &&
                    pickCommand.shaderProgram === classificationPrimitive._spPick &&
                    classificationPrimitive._needs2DShader) {
                    pickCommand = pickCommand.derivedCommands.pick2D;
                }
                var bv = boundingVolumes[boundingVolumeIndex(j, pickLength)];
                if (!groundPrimitive._useFragmentCulling) {
                    var pickOffset = pickOffsets[boundingVolumeIndex(j, pickLength)];
                    bv = boundingVolumes[pickOffset.index];
                }

                pickCommand.owner = groundPrimitive;
                pickCommand.modelMatrix = modelMatrix;
                pickCommand.boundingVolume = bv;
                pickCommand.cull = cull;
                pickCommand.pass = pass;

                commandList.push(pickCommand);
            }
        }
    }

    /**
     * Initializes the minimum and maximum terrain heights. This only needs to be called if you are creating the
     * GroundPrimitive synchronously.
     *
     * @returns {Promise} A promise that will resolve once the terrain heights have been loaded.
     *
     */
    GroundPrimitive.initializeTerrainHeights = function() {
        return ApproximateTerrainHeights.initialize();
    };

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} For synchronous GroundPrimitive, you must call GroundPrimitive.initializeTerrainHeights() and wait for the returned promise to resolve.
     * @exception {DeveloperError} All instance geometries must have the same primitiveType.
     * @exception {DeveloperError} Appearance and material have a uniform with the same name.
     */
    GroundPrimitive.prototype.update = function(frameState) {
        if (!defined(this._primitive) && !defined(this.geometryInstances)) {
            return;
        }

        if (!ApproximateTerrainHeights.initialized) {
            //>>includeStart('debug', pragmas.debug);
            if (!this.asynchronous) {
                throw new DeveloperError('For synchronous GroundPrimitives, you must call GroundPrimitive.initializeTerrainHeights() and wait for the returned promise to resolve.');
            }
            //>>includeEnd('debug');

            GroundPrimitive.initializeTerrainHeights();
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (this.classificationType !== ClassificationType.TERRAIN && !(this.appearance instanceof PerInstanceColorAppearance)) {
            throw new DeveloperError('GroundPrimitives with Materials can only classify ClassificationType.TERRAIN at this time.');
        }
        //>>includeEnd('debug');

        var that = this;
        var primitiveOptions = this._classificationPrimitiveOptions;

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
                    rectangle = Rectangle.clone(instanceRectangle);
                } else if (defined(instanceRectangle)) {
                    Rectangle.union(rectangle, instanceRectangle, rectangle);
                }

                var id = instance.id;
                if (defined(id) && defined(instanceRectangle)) {
                    var boundingSphere = ApproximateTerrainHeights.getBoundingSphere(instanceRectangle, ellipsoid);
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
            setMinMaxTerrainHeights(this, rectangle, ellipsoid);
            var exaggeration = frameState.terrainExaggeration;
            this._minHeight = this._minTerrainHeight * exaggeration;
            this._maxHeight = this._maxTerrainHeight * exaggeration;

            var useFragmentCulling = GroundPrimitive._supportsMaterials(frameState.context) && this.classificationType === ClassificationType.TERRAIN;
            this._useFragmentCulling = useFragmentCulling;

            if (useFragmentCulling) {
                // Determine whether to add spherical or planar extent attributes for computing texture coordinates.
                // This depends on the size of the GeometryInstances.
                var attributes;
                var usePlanarExtents = true;
                for (i = 0; i < length; ++i) {
                    instance = instances[i];
                    geometry = instance.geometry;
                    rectangle = getRectangle(frameState, geometry);
                    if (ShadowVolumeAppearance.shouldUseSphericalCoordinates(rectangle)) {
                        usePlanarExtents = false;
                        break;
                    }
                }

                for (i = 0; i < length; ++i) {
                    instance = instances[i];
                    geometry = instance.geometry;
                    instanceType = geometry.constructor;

                    var boundingRectangle = getRectangle(frameState, geometry);
                    var textureCoordinateRotationPoints = geometry.textureCoordinateRotationPoints;

                    if (usePlanarExtents) {
                        attributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(boundingRectangle, textureCoordinateRotationPoints, ellipsoid, frameState.mapProjection, this._maxHeight);
                    } else {
                        attributes = ShadowVolumeAppearance.getSphericalExtentGeometryInstanceAttributes(boundingRectangle, textureCoordinateRotationPoints, ellipsoid, frameState.mapProjection);
                    }

                    var instanceAttributes = instance.attributes;
                    for (var attributeKey in instanceAttributes) {
                        if (instanceAttributes.hasOwnProperty(attributeKey)) {
                            attributes[attributeKey] = instanceAttributes[attributeKey];
                        }
                    }

                    groundInstances[i] = new GeometryInstance({
                        geometry : instanceType.createShadowVolume(geometry, getComputeMinimumHeightFunction(this),
                            getComputeMaximumHeightFunction(this)),
                        attributes : attributes,
                        id : instance.id
                    });
                }
            } else {
                // ClassificationPrimitive will check if the colors are all the same if it detects lack of fragment culling attributes
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
            }

            primitiveOptions.geometryInstances = groundInstances;
            primitiveOptions.appearance = this.appearance;

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

        this._primitive.appearance = this.appearance;
        this._primitive.show = this.show;
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
     * @param {*} id The id of the {@link GeometryInstance}.
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

    /**
     * Exposed for testing.
     *
     * @param {Context} context Rendering context
     * @returns {Boolean} Whether or not the current context supports materials on GroundPrimitives.
     * @private
     */
    GroundPrimitive._supportsMaterials = function(context) {
        return context.depthTexture;
    };

    /**
     * Checks if the given Scene supports materials on GroundPrimitives.
     * Materials on GroundPrimitives require support for the WEBGL_depth_texture extension.
     *
     * @param {Scene} scene The current scene.
     * @returns {Boolean} Whether or not the current scene supports materials on GroundPrimitives.
     */
    GroundPrimitive.supportsMaterials = function(scene) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('scene', scene);
        //>>includeEnd('debug');

        return GroundPrimitive._supportsMaterials(scene.frameState.context);
    };

    return GroundPrimitive;
});
