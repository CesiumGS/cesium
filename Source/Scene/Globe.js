/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/buildModuleUrl',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/EllipsoidTerrainProvider',
        '../Core/FeatureDetection',
        '../Core/GeographicProjection',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/Intersect',
        '../Core/IntersectionTests',
        '../Core/loadImage',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Occluder',
        '../Core/PrimitiveType',
        '../Core/Ray',
        '../Core/Rectangle',
        '../Core/Transforms',
        '../Renderer/BufferUsage',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../Shaders/GlobeFS',
        '../Shaders/GlobeFSDepth',
        '../Shaders/GlobeFSPole',
        '../Shaders/GlobeVS',
        '../Shaders/GlobeVSDepth',
        '../Shaders/GlobeVSPole',
        '../ThirdParty/when',
        './DepthFunction',
        './GlobeSurfaceShaderSet',
        './GlobeSurfaceTileProvider',
        './ImageryLayerCollection',
        './Pass',
        './QuadtreePrimitive',
        './SceneMode',
        './terrainAttributeLocations'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        buildModuleUrl,
        Cartesian2,
        Cartesian3,
        Cartographic,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        EllipsoidTerrainProvider,
        FeatureDetection,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        Intersect,
        IntersectionTests,
        loadImage,
        CesiumMath,
        Matrix4,
        Occluder,
        PrimitiveType,
        Ray,
        Rectangle,
        Transforms,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        ShaderSource,
        GlobeFS,
        GlobeFSDepth,
        GlobeFSPole,
        GlobeVS,
        GlobeVSDepth,
        GlobeVSPole,
        when,
        DepthFunction,
        GlobeSurfaceShaderSet,
        GlobeSurfaceTileProvider,
        ImageryLayerCollection,
        Pass,
        QuadtreePrimitive,
        SceneMode,
        terrainAttributeLocations) {
    "use strict";

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
    var Globe = function(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var terrainProvider = new EllipsoidTerrainProvider({
            ellipsoid : ellipsoid
        });
        var imageryLayerCollection = new ImageryLayerCollection();

        this._ellipsoid = ellipsoid;
        this._imageryLayerCollection = imageryLayerCollection;

        this._surfaceShaderSet = new GlobeSurfaceShaderSet();

        this._surfaceShaderSet.baseVertexShaderSource = new ShaderSource({
            sources : [GlobeVS]
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

        this._occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.minimumRadius), Cartesian3.ZERO);

        this._rsColor = undefined;
        this._rsColorWithoutDepthTest = undefined;

        this._clearDepthCommand = new ClearCommand({
            depth : 1.0,
            stencil : 0,
            owner : this
        });

        this._depthCommand = new DrawCommand({
            boundingVolume : new BoundingSphere(Cartesian3.ZERO, ellipsoid.maximumRadius),
            pass : Pass.OPAQUE,
            owner : this
        });
        this._northPoleCommand = new DrawCommand({
            pass : Pass.OPAQUE,
            owner : this
        });
        this._southPoleCommand = new DrawCommand({
            pass : Pass.OPAQUE,
            owner : this
        });

        this._drawNorthPole = false;
        this._drawSouthPole = false;

        this._mode = SceneMode.SCENE3D;

        /**
         * The terrain provider providing surface geometry for this globe.
         * @type {TerrainProvider}
         */
        this.terrainProvider = terrainProvider;

        /**
         * Determines the color of the north pole. If the day tile provider imagery does not
         * extend over the north pole, it will be filled with this color before applying lighting.
         *
         * @type {Cartesian3}
         * @default Cartesian3(2.0 / 255.0, 6.0 / 255.0, 18.0 / 255.0)
         */
        this.northPoleColor = new Cartesian3(2.0 / 255.0, 6.0 / 255.0, 18.0 / 255.0);

        /**
         * Determines the color of the south pole. If the day tile provider imagery does not
         * extend over the south pole, it will be filled with this color before applying lighting.
         *
         * @type {Cartesian3}
         * @default Cartesian3(1.0, 1.0, 1.0)
         */
        this.southPoleColor = new Cartesian3(1.0, 1.0, 1.0);

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
         * True if primitives such as billboards, polylines, labels, etc. should be depth-tested
         * against the terrain surface, or false if such primitives should always be drawn on top
         * of terrain unless they're on the opposite side of the globe.  The disadvantage of depth
         * testing primitives against terrain is that slight numerical noise or terrain level-of-detail
         * switched can sometimes make a primitive that should be on the surface disappear underneath it.
         *
         * @type {Boolean}
         * @default false
         */
        this.depthTestAgainstTerrain = false;

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

        this._oceanNormalMap = undefined;
        this._zoomedOutOceanSpecularIntensity = 0.5;
        this._lightingFadeDistance = new Cartesian2(this.lightingFadeOutDistance, this.lightingFadeInDistance);

        var that = this;

        this._drawUniforms = {
            u_zoomedOutOceanSpecularIntensity : function() {
                return that._zoomedOutOceanSpecularIntensity;
            },
            u_oceanNormalMap : function() {
                return that._oceanNormalMap;
            },
            u_lightingFadeDistance : function() {
                return that._lightingFadeDistance;
            }
        };
    };

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
            intersection = sphereIntersections[i].pick(ray, scene, true, result);
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
            var children = tile.children;
            length = children.length;

            for (i = 0; i < length; ++i) {
                tile = children[i];
                if (Rectangle.contains(tile.rectangle, cartographic)) {
                    break;
                }
            }
        }

        while (defined(tile) && (!defined(tile.data) || !defined(tile.data.pickTerrain))) {
            tile = tile.parent;
        }

        if (!defined(tile)) {
            return undefined;
        }

        var ellipsoid = this._surface._tileProvider.tilingScheme.ellipsoid;
        var cartesian = ellipsoid.cartographicToCartesian(cartographic, scratchGetHeightCartesian);

        var ray = scratchGetHeightRay;
        Cartesian3.normalize(cartesian, ray.direction);

        var intersection = tile.data.pick(ray, undefined, false, scratchGetHeightIntersection);
        if (!defined(intersection)) {
            return undefined;
        }

        return ellipsoid.cartesianToCartographic(intersection, scratchGetHeightCartographic).height;
    };

    var depthQuadScratch = FeatureDetection.supportsTypedArrays() ? new Float32Array(12) : [];
    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();

    function computeDepthQuad(globe, frameState) {
        var radii = globe._ellipsoid.radii;
        var p = frameState.camera.positionWC;

        // Find the corresponding position in the scaled space of the ellipsoid.
        var q = Cartesian3.multiplyComponents(globe._ellipsoid.oneOverRadii, p, scratchCartesian1);

        var qMagnitude = Cartesian3.magnitude(q);
        var qUnit = Cartesian3.normalize(q, scratchCartesian2);

        // Determine the east and north directions at q.
        var eUnit = Cartesian3.normalize(Cartesian3.cross(Cartesian3.UNIT_Z, q, scratchCartesian3), scratchCartesian3);
        var nUnit = Cartesian3.normalize(Cartesian3.cross(qUnit, eUnit, scratchCartesian4), scratchCartesian4);

        // Determine the radius of the 'limb' of the ellipsoid.
        var wMagnitude = Math.sqrt(Cartesian3.magnitudeSquared(q) - 1.0);

        // Compute the center and offsets.
        var center = Cartesian3.multiplyByScalar(qUnit, 1.0 / qMagnitude, scratchCartesian1);
        var scalar = wMagnitude / qMagnitude;
        var eastOffset = Cartesian3.multiplyByScalar(eUnit, scalar, scratchCartesian2);
        var northOffset = Cartesian3.multiplyByScalar(nUnit, scalar, scratchCartesian3);

        // A conservative measure for the longitudes would be to use the min/max longitudes of the bounding frustum.
        var upperLeft = Cartesian3.add(center, northOffset, scratchCartesian4);
        Cartesian3.subtract(upperLeft, eastOffset, upperLeft);
        Cartesian3.multiplyComponents(radii, upperLeft, upperLeft);
        Cartesian3.pack(upperLeft, depthQuadScratch, 0);

        var lowerLeft = Cartesian3.subtract(center, northOffset, scratchCartesian4);
        Cartesian3.subtract(lowerLeft, eastOffset, lowerLeft);
        Cartesian3.multiplyComponents(radii, lowerLeft, lowerLeft);
        Cartesian3.pack(lowerLeft, depthQuadScratch, 3);

        var upperRight = Cartesian3.add(center, northOffset, scratchCartesian4);
        Cartesian3.add(upperRight, eastOffset, upperRight);
        Cartesian3.multiplyComponents(radii, upperRight, upperRight);
        Cartesian3.pack(upperRight, depthQuadScratch, 6);

        var lowerRight = Cartesian3.subtract(center, northOffset, scratchCartesian4);
        Cartesian3.add(lowerRight, eastOffset, lowerRight);
        Cartesian3.multiplyComponents(radii, lowerRight, lowerRight);
        Cartesian3.pack(lowerRight, depthQuadScratch, 9);

        return depthQuadScratch;
    }

    var rightScratch = new Cartesian3();
    var upScratch = new Cartesian3();
    var negativeZ = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
    var cartographicScratch = new Cartographic(0.0, 0.0);
    var pt1Scratch = new Cartesian3();
    var pt2Scratch = new Cartesian3();

    function computePoleQuad(globe, frameState, maxLat, maxGivenLat, viewProjMatrix, viewportTransformation) {
        cartographicScratch.longitude = 0.0;
        cartographicScratch.latitude = maxGivenLat;
        var pt1 = globe._ellipsoid.cartographicToCartesian(cartographicScratch, pt1Scratch);

        cartographicScratch.longitude = Math.PI;
        var pt2 = globe._ellipsoid.cartographicToCartesian(cartographicScratch, pt2Scratch);

        var radius = Cartesian3.magnitude(Cartesian3.subtract(pt1, pt2, rightScratch), rightScratch) * 0.5;

        cartographicScratch.longitude = 0.0;
        cartographicScratch.latitude = maxLat;
        var center = globe._ellipsoid.cartographicToCartesian(cartographicScratch, pt1Scratch);

        var right;
        var dir = frameState.camera.direction;
        if (1.0 - Cartesian3.dot(negativeZ, dir) < CesiumMath.EPSILON6) {
            right = Cartesian3.UNIT_X;
        } else {
            right = Cartesian3.normalize(Cartesian3.cross(dir, Cartesian3.UNIT_Z, rightScratch), rightScratch);
        }

        var screenRight = Cartesian3.add(center, Cartesian3.multiplyByScalar(right, radius, rightScratch), rightScratch);
        var screenUp = Cartesian3.add(center, Cartesian3.multiplyByScalar(Cartesian3.normalize(Cartesian3.cross(Cartesian3.UNIT_Z, right, upScratch), upScratch), radius, upScratch), upScratch);

        Transforms.pointToGLWindowCoordinates(viewProjMatrix, viewportTransformation, center, center);
        Transforms.pointToGLWindowCoordinates(viewProjMatrix, viewportTransformation, screenRight, screenRight);
        Transforms.pointToGLWindowCoordinates(viewProjMatrix, viewportTransformation, screenUp, screenUp);

        var halfWidth = Math.floor(Math.max(Cartesian3.distance(screenUp, center), Cartesian3.distance(screenRight, center)));
        var halfHeight = halfWidth;

        return new BoundingRectangle(
                Math.floor(center.x) - halfWidth,
                Math.floor(center.y) - halfHeight,
                halfWidth * 2.0,
                halfHeight * 2.0);
    }

    var viewportScratch = new BoundingRectangle();
    var vpTransformScratch = new Matrix4();
    var polePositionsScratch = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];

    function fillPoles(globe, context, frameState) {
        var terrainProvider = globe.terrainProvider;
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        if (!terrainProvider.ready) {
            return;
        }

        var terrainMaxRectangle = terrainProvider.tilingScheme.rectangle;

        var viewProjMatrix = context.uniformState.viewProjection;
        var viewport = viewportScratch;
        viewport.width = context.drawingBufferWidth;
        viewport.height = context.drawingBufferHeight;
        var viewportTransformation = Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, vpTransformScratch);
        var latitudeExtension = 0.05;

        var rectangle;
        var boundingVolume;
        var frustumCull;
        var occludeePoint;
        var occluded;
        var geometry;
        var rect;
        var occluder = globe._occluder;

        // handle north pole
        if (terrainMaxRectangle.north < CesiumMath.PI_OVER_TWO) {
            rectangle = new Rectangle(-Math.PI, terrainMaxRectangle.north, Math.PI, CesiumMath.PI_OVER_TWO);
            boundingVolume = BoundingSphere.fromRectangle3D(rectangle, globe._ellipsoid);
            frustumCull = frameState.cullingVolume.computeVisibility(boundingVolume) === Intersect.OUTSIDE;
            occludeePoint = Occluder.computeOccludeePointFromRectangle(rectangle, globe._ellipsoid);
            occluded = (occludeePoint && !occluder.isPointVisible(occludeePoint, 0.0)) || !occluder.isBoundingSphereVisible(boundingVolume);

            globe._drawNorthPole = !frustumCull && !occluded;
            if (globe._drawNorthPole) {
                rect = computePoleQuad(globe, frameState, rectangle.north, rectangle.south - latitudeExtension, viewProjMatrix, viewportTransformation);
                polePositionsScratch[0] = rect.x;
                polePositionsScratch[1] = rect.y;
                polePositionsScratch[2] = rect.x + rect.width;
                polePositionsScratch[3] = rect.y;
                polePositionsScratch[4] = rect.x + rect.width;
                polePositionsScratch[5] = rect.y + rect.height;
                polePositionsScratch[6] = rect.x;
                polePositionsScratch[7] = rect.y + rect.height;

                if (!defined(globe._northPoleCommand.vertexArray)) {
                    globe._northPoleCommand.boundingVolume = BoundingSphere.fromRectangle3D(rectangle, globe._ellipsoid);
                    geometry = new Geometry({
                        attributes : {
                            position : new GeometryAttribute({
                                componentDatatype : ComponentDatatype.FLOAT,
                                componentsPerAttribute : 2,
                                values : polePositionsScratch
                            })
                        }
                    });
                    globe._northPoleCommand.vertexArray = context.createVertexArrayFromGeometry({
                        geometry : geometry,
                        attributeLocations : {
                            position : 0
                        },
                        bufferUsage : BufferUsage.STREAM_DRAW
                    });
                } else {
                    globe._northPoleCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(polePositionsScratch);
                }
            }
        }

        // handle south pole
        if (terrainMaxRectangle.south > -CesiumMath.PI_OVER_TWO) {
            rectangle = new Rectangle(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, terrainMaxRectangle.south);
            boundingVolume = BoundingSphere.fromRectangle3D(rectangle, globe._ellipsoid);
            frustumCull = frameState.cullingVolume.computeVisibility(boundingVolume) === Intersect.OUTSIDE;
            occludeePoint = Occluder.computeOccludeePointFromRectangle(rectangle, globe._ellipsoid);
            occluded = (occludeePoint && !occluder.isPointVisible(occludeePoint)) || !occluder.isBoundingSphereVisible(boundingVolume);

            globe._drawSouthPole = !frustumCull && !occluded;
            if (globe._drawSouthPole) {
                rect = computePoleQuad(globe, frameState, rectangle.south, rectangle.north + latitudeExtension, viewProjMatrix, viewportTransformation);
                polePositionsScratch[0] = rect.x;
                polePositionsScratch[1] = rect.y;
                polePositionsScratch[2] = rect.x + rect.width;
                polePositionsScratch[3] = rect.y;
                polePositionsScratch[4] = rect.x + rect.width;
                polePositionsScratch[5] = rect.y + rect.height;
                polePositionsScratch[6] = rect.x;
                polePositionsScratch[7] = rect.y + rect.height;

                 if (!defined(globe._southPoleCommand.vertexArray)) {
                     globe._southPoleCommand.boundingVolume = BoundingSphere.fromRectangle3D(rectangle, globe._ellipsoid);
                     geometry = new Geometry({
                         attributes : {
                             position : new GeometryAttribute({
                                 componentDatatype : ComponentDatatype.FLOAT,
                                 componentsPerAttribute : 2,
                                 values : polePositionsScratch
                             })
                         }
                     });
                     globe._southPoleCommand.vertexArray = context.createVertexArrayFromGeometry({
                         geometry : geometry,
                         attributeLocations : {
                             position : 0
                         },
                         bufferUsage : BufferUsage.STREAM_DRAW
                     });
                 } else {
                     globe._southPoleCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(polePositionsScratch);
                 }
            }
        }

        var poleIntensity = 0.0;
        var baseLayer = globe._imageryLayerCollection.length > 0 ? globe._imageryLayerCollection.get(0) : undefined;
        if (defined(baseLayer) && defined(baseLayer.imageryProvider) && defined(baseLayer.imageryProvider.getPoleIntensity)) {
            poleIntensity = baseLayer.imageryProvider.getPoleIntensity();
        }

        var drawUniforms = {
            u_dayIntensity : function() {
                return poleIntensity;
            }
        };

        if (!defined(globe._northPoleCommand.uniformMap)) {
            var northPoleUniforms = combine(drawUniforms, {
                u_color : function() {
                    return globe.northPoleColor;
                }
            });
            globe._northPoleCommand.uniformMap = combine(northPoleUniforms, globe._drawUniforms);
        }

        if (!defined(globe._southPoleCommand.uniformMap)) {
            var southPoleUniforms = combine(drawUniforms, {
                u_color : function() {
                    return globe.southPoleColor;
                }
            });
            globe._southPoleCommand.uniformMap = combine(southPoleUniforms, globe._drawUniforms);
        }
    }

    /**
     * @private
     */
    Globe.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        if (width === 0 || height === 0) {
            return;
        }

        var mode = frameState.mode;
        var projection = frameState.mapProjection;
        var modeChanged = false;

        if (this._mode !== mode || !defined(this._rsColor)) {
            modeChanged = true;
            if (mode === SceneMode.SCENE3D || mode === SceneMode.COLUMBUS_VIEW) {
                this._rsColor = context.createRenderState({ // Write color and depth
                    cull : {
                        enabled : true
                    },
                    depthTest : {
                        enabled : true
                    }
                });
                this._rsColorWithoutDepthTest = context.createRenderState({ // Write color, not depth
                    cull : {
                        enabled : true
                    }
                });
                this._depthCommand.renderState = context.createRenderState({ // Write depth, not color
                    cull : {
                        enabled : true
                    },
                    depthTest : {
                        enabled : true,
                        func : DepthFunction.ALWAYS
                    },
                    colorMask : {
                        red : false,
                        green : false,
                        blue : false,
                        alpha : false
                    }
                });
            } else {
                this._rsColor = context.createRenderState({
                    cull : {
                        enabled : true
                    }
                });
                this._rsColorWithoutDepthTest = context.createRenderState({
                    cull : {
                        enabled : true
                    }
                });
                this._depthCommand.renderState = context.createRenderState({
                    cull : {
                        enabled : true
                    }
                });
            }
        }

        this._mode = mode;

        var northPoleCommand = this._northPoleCommand;
        var southPoleCommand = this._southPoleCommand;

        northPoleCommand.renderState = this._rsColorWithoutDepthTest;
        southPoleCommand.renderState = this._rsColorWithoutDepthTest;

        // update depth plane
        var depthQuad = computeDepthQuad(this, frameState);

        // depth plane
        if (!this._depthCommand.vertexArray) {
            var geometry = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : depthQuad
                    })
                },
                indices : [0, 1, 2, 2, 1, 3],
                primitiveType : PrimitiveType.TRIANGLES
            });
            this._depthCommand.vertexArray = context.createVertexArrayFromGeometry({
                geometry : geometry,
                attributeLocations : {
                    position : 0
                },
                bufferUsage : BufferUsage.DYNAMIC_DRAW
            });
        } else {
            this._depthCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(depthQuad);
        }

        if (!defined(this._depthCommand.shaderProgram)) {
            this._depthCommand.shaderProgram = context.createShaderProgram(GlobeVSDepth, GlobeFSDepth, {
                position : 0
            });
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
                    that._oceanNormalMap = context.createTexture2D({
                        source : image
                    });
                });
            } else {
                this._oceanNormalMap = this._oceanNormalMap && this._oceanNormalMap.destroy();
            }
        }

        if (!defined(northPoleCommand.shaderProgram) ||
            !defined(southPoleCommand.shaderProgram)) {

            var poleShaderProgram = context.replaceShaderProgram(northPoleCommand.shaderProgram, GlobeVSPole, GlobeFSPole, terrainAttributeLocations);

            northPoleCommand.shaderProgram = poleShaderProgram;
            southPoleCommand.shaderProgram = poleShaderProgram;
        }

        this._occluder.cameraPosition = frameState.camera.positionWC;

        fillPoles(this, context, frameState);

        var pass = frameState.passes;
        if (pass.render) {
            // render quads to fill the poles
            if (mode === SceneMode.SCENE3D) {
                if (this._drawNorthPole) {
                    commandList.push(northPoleCommand);
                }

                if (this._drawSouthPole) {
                    commandList.push(southPoleCommand);
                }
            }

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

            surface.update(context, frameState, commandList);

            // render depth plane
            if (mode === SceneMode.SCENE3D || mode === SceneMode.COLUMBUS_VIEW) {
                if (!this.depthTestAgainstTerrain) {
                    commandList.push(this._clearDepthCommand);
                    if (mode === SceneMode.SCENE3D) {
                        commandList.push(this._depthCommand);
                    }
                }
            }
        }

        if (pass.pick) {
            // Not actually pickable, but render depth-only so primitives on the backface
            // of the globe are not picked.
            commandList.push(this._depthCommand);
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
     * @see Globe#isDestroyed
     *
     * @example
     * globe = globe && globe.destroy();
     */
    Globe.prototype.destroy = function() {
        this._northPoleCommand.vertexArray = this._northPoleCommand.vertexArray && this._northPoleCommand.vertexArray.destroy();
        this._southPoleCommand.vertexArray = this._southPoleCommand.vertexArray && this._southPoleCommand.vertexArray.destroy();

        this._surfaceShaderSet = this._surfaceShaderSet && this._surfaceShaderSet.destroy();

        this._northPoleCommand.shaderProgram = this._northPoleCommand.shaderProgram && this._northPoleCommand.shaderProgram.destroy();
        this._southPoleCommand.shaderProgram = this._northPoleCommand.shaderProgram;

        this._depthCommand.shaderProgram = this._depthCommand.shaderProgram && this._depthCommand.shaderProgram.destroy();
        this._depthCommand.vertexArray = this._depthCommand.vertexArray && this._depthCommand.vertexArray.destroy();

        this._surface = this._surface && this._surface.destroy();

        this._oceanNormalMap = this._oceanNormalMap && this._oceanNormalMap.destroy();

        return destroyObject(this);
    };

    return Globe;
});
