/*global define*/
define([
        '../Core/buildModuleUrl',
        '../Core/combine',
        '../Core/loadImage',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/ComponentDatatype',
        '../Core/CubeMapEllipsoidTessellator',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/GeographicProjection',
        '../Core/Intersect',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/Occluder',
        '../Core/PrimitiveType',
        '../Core/Transforms',
        './Material',
        '../Renderer/BufferUsage',
        '../Renderer/ClearCommand',
        '../Renderer/CommandLists',
        '../Renderer/CullFace',
        '../Renderer/DepthFunction',
        '../Renderer/DrawCommand',
        '../Renderer/PixelFormat',
        '../Renderer/BlendingState',
        '../Renderer/Texture',
        './CentralBodySurface',
        './CentralBodySurfaceShaderSet',
        './EllipsoidTerrainProvider',
        './ImageryLayerCollection',
        './SceneMode',
        './TerrainProvider',
        './ViewportQuad',
        '../Shaders/CentralBodyFS',
        '../Shaders/CentralBodyFSDepth',
        '../Shaders/CentralBodyFSPole',
        '../Shaders/CentralBodyVS',
        '../Shaders/CentralBodyVSDepth',
        '../Shaders/CentralBodyVSPole',
        '../ThirdParty/when'
    ], function(
        buildModuleUrl,
        combine,
        loadImage,
        defaultValue,
        destroyObject,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        ComponentDatatype,
        CubeMapEllipsoidTessellator,
        Ellipsoid,
        Extent,
        GeographicProjection,
        Intersect,
        CesiumMath,
        Matrix4,
        MeshFilters,
        Occluder,
        PrimitiveType,
        Transforms,
        Material,
        BufferUsage,
        ClearCommand,
        CommandLists,
        CullFace,
        DepthFunction,
        DrawCommand,
        PixelFormat,
        BlendingState,
        Texture,
        CentralBodySurface,
        CentralBodySurfaceShaderSet,
        EllipsoidTerrainProvider,
        ImageryLayerCollection,
        SceneMode,
        TerrainProvider,
        ViewportQuad,
        CentralBodyFS,
        CentralBodyFSDepth,
        CentralBodyFSPole,
        CentralBodyVS,
        CentralBodyVSDepth,
        CentralBodyVSPole,
        when) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CentralBody
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] Determines the size and shape of the
     * central body.
     */
    var CentralBody = function(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var terrainProvider = new EllipsoidTerrainProvider({ellipsoid : ellipsoid});
        var imageryLayerCollection = new ImageryLayerCollection();

        /**
         * The terrain provider providing surface geometry for this central body.
         * @type {TerrainProvider}
         */
        this.terrainProvider = terrainProvider;

        this._ellipsoid = ellipsoid;
        this._imageryLayerCollection = imageryLayerCollection;
        this._surface = new CentralBodySurface({
            terrainProvider : terrainProvider,
            imageryLayerCollection : imageryLayerCollection
        });

        this._occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMinimumRadius()), Cartesian3.ZERO);

        this._surfaceShaderSet = new CentralBodySurfaceShaderSet(TerrainProvider.attributeIndices);

        this._rsColor = undefined;
        this._rsColorWithoutDepthTest = undefined;

        this._clearDepthCommand = new ClearCommand();

        this._depthCommand = new DrawCommand();
        this._depthCommand.primitiveType = PrimitiveType.TRIANGLES;
        this._depthCommand.boundingVolume = new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMaximumRadius());

        this._northPoleCommand = new DrawCommand();
        this._northPoleCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._southPoleCommand = new DrawCommand();
        this._southPoleCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;

        this._drawNorthPole = false;
        this._drawSouthPole = false;

        this._commandLists = new CommandLists();

        /**
         * Determines the color of the north pole. If the day tile provider imagery does not
         * extend over the north pole, it will be filled with this color before applying lighting.
         *
         * @type {Cartesian3}
         */
        this.northPoleColor = new Cartesian3(2.0 / 255.0, 6.0 / 255.0, 18.0 / 255.0);

        /**
         * Determines the color of the south pole. If the day tile provider imagery does not
         * extend over the south pole, it will be filled with this color before applying lighting.
         *
         * @type {Cartesian3}
         */
        this.southPoleColor = new Cartesian3(1.0, 1.0, 1.0);

        /**
         * The offset, relative to the bottom left corner of the viewport,
         * where the logo for terrain and imagery providers will be drawn.
         *
         * @type {Cartesian2}
         */
        this.logoOffset = Cartesian2.ZERO.clone();
        this._logos = [];
        this._logoQuad = undefined;

        /**
         * Determines if the central body will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         *
         * @default 1.0
         */
        this.morphTime = 1.0;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        /**
         * The normal map to use for rendering waves in the ocean.  Setting this property will
         * only have an effect if the configured terrain provider includes a water mask.
         *
         * @type String
         */
        this.oceanNormalMapUrl = buildModuleUrl('Assets/Textures/waterNormalsSmall.jpg');

        /**
         * True if primitives such as billboards, polylines, labels, etc. should be depth-tested
         * against the terrain surface, or false if such primitives should always be drawn on top
         * of terrain unless they're on the opposite side of the globe.  The disadvantage of depth
         * testing primitives against terrain is that slight numerical noise or terrain level-of-detail
         * switched can sometimes make a primitive that should be on the surface disappear underneath it.
         *
         * @type Boolean
         */
        this.depthTestAgainstTerrain = false;

        /**
         * The size of the terrain tile cache, expressed as a number of tiles.  Any additional
         * tiles beyond this number will be freed, as long as they aren't needed for rendering
         * this frame.  A larger number will consume more memory but will show detail faster
         * when, for example, zooming out and then back in.
         *
         * @type Number
         */
        this.tileCacheSize = 100;

        this._lastOceanNormalMapUrl = undefined;
        this._oceanNormalMap = undefined;
        this._zoomedOutOceanSpecularIntensity = 0.5;
        this._showingPrettyOcean = false;
        this._hasWaterMask = false;

        var that = this;

        this._drawUniforms = {
            u_mode : function() {
                return that._mode;
            },
            u_morphTime : function() {
                return that.morphTime;
            },
            u_zoomedOutOceanSpecularIntensity : function() {
                return that._zoomedOutOceanSpecularIntensity;
            },
            u_oceanNormalMap : function() {
                return that._oceanNormalMap;
            }
        };
    };

    /**
     * Gets an ellipsoid describing the shape of this central body.
     *
     * @memberof CentralBody
     *
     * @return {Ellipsoid}
     */
    CentralBody.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Gets the collection of image layers that will be rendered on this central body.
     *
     * @memberof CentralBody
     *
     * @returns {ImageryLayerCollection}
     */
    CentralBody.prototype.getImageryLayers = function() {
        return this._imageryLayerCollection;
    };

    CentralBody.prototype._computeDepthQuad = function(frameState) {
        var radii = this._ellipsoid.getRadii();
        var p = frameState.camera.getPositionWC();

        // Find the corresponding position in the scaled space of the ellipsoid.
        var q = this._ellipsoid.getOneOverRadii().multiplyComponents(p);

        var qMagnitude = q.magnitude();
        var qUnit = q.normalize();

        // Determine the east and north directions at q.
        var eUnit = Cartesian3.UNIT_Z.cross(q).normalize();
        var nUnit = qUnit.cross(eUnit).normalize();

        // Determine the radius of the 'limb' of the ellipsoid.
        var wMagnitude = Math.sqrt(q.magnitudeSquared() - 1.0);

        // Compute the center and offsets.
        var center = qUnit.multiplyByScalar(1.0 / qMagnitude);
        var scalar = wMagnitude / qMagnitude;
        var eastOffset = eUnit.multiplyByScalar(scalar);
        var northOffset = nUnit.multiplyByScalar(scalar);

        // A conservative measure for the longitudes would be to use the min/max longitudes of the bounding frustum.
        var upperLeft = radii.multiplyComponents(center.add(northOffset).subtract(eastOffset));
        var upperRight = radii.multiplyComponents(center.add(northOffset).add(eastOffset));
        var lowerLeft = radii.multiplyComponents(center.subtract(northOffset).subtract(eastOffset));
        var lowerRight = radii.multiplyComponents(center.subtract(northOffset).add(eastOffset));
        return [upperLeft.x, upperLeft.y, upperLeft.z, lowerLeft.x, lowerLeft.y, lowerLeft.z, upperRight.x, upperRight.y, upperRight.z, lowerRight.x, lowerRight.y, lowerRight.z];
    };

    CentralBody.prototype._computePoleQuad = function(frameState, maxLat, maxGivenLat, viewProjMatrix, viewportTransformation) {
        var pt1 = this._ellipsoid.cartographicToCartesian(new Cartographic(0.0, maxGivenLat));
        var pt2 = this._ellipsoid.cartographicToCartesian(new Cartographic(Math.PI, maxGivenLat));
        var radius = pt1.subtract(pt2).magnitude() * 0.5;

        var center = this._ellipsoid.cartographicToCartesian(new Cartographic(0.0, maxLat));

        var right;
        var dir = frameState.camera.direction;
        if (1.0 - Cartesian3.UNIT_Z.negate().dot(dir) < CesiumMath.EPSILON6) {
            right = Cartesian3.UNIT_X;
        } else {
            right = dir.cross(Cartesian3.UNIT_Z).normalize();
        }

        var screenRight = center.add(right.multiplyByScalar(radius));
        var screenUp = center.add(Cartesian3.UNIT_Z.cross(right).normalize().multiplyByScalar(radius));

        Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, center, center);
        Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, screenRight, screenRight);
        Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, screenUp, screenUp);

        var halfWidth = Math.floor(Math.max(screenUp.subtract(center).magnitude(), screenRight.subtract(center).magnitude()));
        var halfHeight = halfWidth;

        return new BoundingRectangle(
                Math.floor(center.x) - halfWidth,
                Math.floor(center.y) - halfHeight,
                halfWidth * 2.0,
                halfHeight * 2.0);
    };

    var viewportScratch = new BoundingRectangle();
    var vpTransformScratch = new Matrix4();
    CentralBody.prototype._fillPoles = function(context, frameState) {
        var terrainProvider = this._surface._terrainProvider;
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        if (!terrainProvider.isReady()) {
            return;
        }
        var terrainMaxExtent = terrainProvider.getTilingScheme().getExtent();

        var viewProjMatrix = context.getUniformState().getViewProjection();
        var viewport = viewportScratch;
        viewport.width = context.getCanvas().clientWidth;
        viewport.height = context.getCanvas().clientHeight;
        var viewportTransformation = Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, vpTransformScratch);
        var latitudeExtension = 0.05;

        var extent;
        var boundingVolume;
        var frustumCull;
        var occludeePoint;
        var occluded;
        var datatype;
        var mesh;
        var rect;
        var positions;
        var occluder = this._occluder;

        // handle north pole
        if (terrainMaxExtent.north < CesiumMath.PI_OVER_TWO) {
            extent = new Extent(
                -Math.PI,
                terrainMaxExtent.north,
                Math.PI,
                CesiumMath.PI_OVER_TWO
            );
            boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
            frustumCull = frameState.cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE;
            occludeePoint = Occluder.computeOccludeePointFromExtent(extent, this._ellipsoid);
            occluded = (occludeePoint && !occluder.isPointVisible(occludeePoint, 0.0)) || !occluder.isBoundingSphereVisible(boundingVolume);

            this._drawNorthPole = !frustumCull && !occluded;
            if (this._drawNorthPole) {
                rect = this._computePoleQuad(frameState, extent.north, extent.south - latitudeExtension, viewProjMatrix, viewportTransformation);
                positions = [
                    rect.x, rect.y,
                    rect.x + rect.width, rect.y,
                    rect.x + rect.width, rect.y + rect.height,
                    rect.x, rect.y + rect.height
                ];

                if (typeof this._northPoleCommand.vertexArray === 'undefined') {
                    this._northPoleCommand.boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
                    mesh = {
                        attributes : {
                            position : {
                                componentDatatype : ComponentDatatype.FLOAT,
                                componentsPerAttribute : 2,
                                values : positions
                            }
                        }
                    };
                    this._northPoleCommand.vertexArray = context.createVertexArrayFromMesh({
                        mesh : mesh,
                        attributeIndices : {
                            position : 0
                        },
                        bufferUsage : BufferUsage.STREAM_DRAW
                    });
                } else {
                    datatype = ComponentDatatype.FLOAT;
                    this._northPoleCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(positions));
                }
            }
        }

        // handle south pole
        if (terrainMaxExtent.south > -CesiumMath.PI_OVER_TWO) {
            extent = new Extent(
                -Math.PI,
                -CesiumMath.PI_OVER_TWO,
                Math.PI,
                terrainMaxExtent.south
            );
            boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
            frustumCull = frameState.cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE;
            occludeePoint = Occluder.computeOccludeePointFromExtent(extent, this._ellipsoid);
            occluded = (occludeePoint && !occluder.isPointVisible(occludeePoint)) || !occluder.isBoundingSphereVisible(boundingVolume);

            this._drawSouthPole = !frustumCull && !occluded;
            if (this._drawSouthPole) {
                rect = this._computePoleQuad(frameState, extent.south, extent.north + latitudeExtension, viewProjMatrix, viewportTransformation);
                positions = [
                     rect.x, rect.y,
                     rect.x + rect.width, rect.y,
                     rect.x + rect.width, rect.y + rect.height,
                     rect.x, rect.y + rect.height
                 ];

                 if (typeof this._southPoleCommand.vertexArray === 'undefined') {
                     this._southPoleCommand.boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
                     mesh = {
                         attributes : {
                             position : {
                                 componentDatatype : ComponentDatatype.FLOAT,
                                 componentsPerAttribute : 2,
                                 values : positions
                             }
                         }
                     };
                     this._southPoleCommand.vertexArray = context.createVertexArrayFromMesh({
                         mesh : mesh,
                         attributeIndices : {
                             position : 0
                         },
                         bufferUsage : BufferUsage.STREAM_DRAW
                     });
                 } else {
                     datatype = ComponentDatatype.FLOAT;
                     this._southPoleCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(positions));
                 }
            }
        }

        var poleIntensity = 0.0;
        var baseLayer = this._imageryLayerCollection.getLength() > 0 ? this._imageryLayerCollection.get(0) : undefined;
        if (typeof baseLayer !== 'undefined' && typeof baseLayer.getImageryProvider() !== 'undefined' && typeof baseLayer.getImageryProvider().getPoleIntensity !== 'undefined') {
            poleIntensity = baseLayer.getImageryProvider().getPoleIntensity();
        }

        var drawUniforms = {
            u_dayIntensity : function() {
                return poleIntensity;
            }
        };

        var that = this;
        if (typeof this._northPoleCommand.uniformMap === 'undefined') {
            var northPoleUniforms = combine([drawUniforms, {
                u_color : function() {
                    return that.northPoleColor;
                }
            }], false, false);
            this._northPoleCommand.uniformMap = combine([northPoleUniforms, this._drawUniforms], false, false);
        }

        if (typeof this._southPoleCommand.uniformMap === 'undefined') {
            var southPoleUniforms = combine([drawUniforms, {
                u_color : function() {
                    return that.southPoleColor;
                }
            }], false, false);
            this._southPoleCommand.uniformMap = combine([southPoleUniforms, this._drawUniforms], false, false);
        }
    };

    /**
     * @private
     */
    CentralBody.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        var width = context.getCanvas().clientWidth;
        var height = context.getCanvas().clientHeight;

        if (width === 0 || height === 0) {
            return;
        }

        var mode = frameState.mode;
        var projection = frameState.scene2D.projection;
        var modeChanged = false;

        if (this._mode !== mode || typeof this._rsColor === 'undefined') {
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
                this._clearDepthCommand.clearState = context.createClearState({ // Clear depth only
                    depth : 1.0,
                    stencil : 0.0
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

        this._northPoleCommand.renderState = this._rsColorWithoutDepthTest;
        this._southPoleCommand.renderState = this._rsColorWithoutDepthTest;

        // update depth plane
        var depthQuad = this._computeDepthQuad(frameState);

        // depth plane
        if (!this._depthCommand.vertexArray) {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : depthQuad
                    }
                },
                indexLists : [{
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : [0, 1, 2, 2, 1, 3]
                }]
            };
            this._depthCommand.vertexArray = context.createVertexArrayFromMesh({
                mesh : mesh,
                attributeIndices : {
                    position : 0
                },
                bufferUsage : BufferUsage.DYNAMIC_DRAW
            });
        } else {
            var datatype = ComponentDatatype.FLOAT;
            this._depthCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(depthQuad));
        }

        var shaderCache = context.getShaderCache();

        if (typeof this._depthCommand.shaderProgram === 'undefined') {
            this._depthCommand.shaderProgram = shaderCache.getShaderProgram(
                    CentralBodyVSDepth,
                    '#line 0\n' +
                    CentralBodyFSDepth, {
                        position : 0
                    });
        }

        if (this._surface._terrainProvider.hasWaterMask() &&
            this.oceanNormalMapUrl !== this._lastOceanNormalMapUrl) {

            this._lastOceanNormalMapUrl = this.oceanNormalMapUrl;

            var that = this;
            when(loadImage(this.oceanNormalMapUrl, true), function(image) {
                that._oceanNormalMap = that._oceanNormalMap && that._oceanNormalMap.destroy();
                that._oceanNormalMap = context.createTexture2D({
                    source : image
                });
            });
        }

        // Initial compile or re-compile if uber-shader parameters changed
        var projectionChanged = this._projection !== projection;
        var hasWaterMask = this._surface._terrainProvider.hasWaterMask();
        var hasWaterMaskChanged = this._hasWaterMask !== hasWaterMask;

        if (typeof this._surfaceShaderSet === 'undefined' ||
            typeof this._northPoleCommand.shaderProgram === 'undefined' ||
            typeof this._southPoleCommand.shaderProgram === 'undefined' ||
            modeChanged ||
            projectionChanged ||
            hasWaterMaskChanged ||
            (typeof this._oceanNormalMap !== 'undefined') !== this._showingPrettyOcean) {

            var getPosition3DMode = 'vec4 getPosition(vec3 position3DWC) { return getPosition3DMode(position3DWC); }';
            var getPosition2DMode = 'vec4 getPosition(vec3 position3DWC) { return getPosition2DMode(position3DWC); }';
            var getPositionColumbusViewMode = 'vec4 getPosition(vec3 position3DWC) { return getPositionColumbusViewMode(position3DWC); }';
            var getPositionMorphingMode = 'vec4 getPosition(vec3 position3DWC) { return getPositionMorphingMode(position3DWC); }';

            var getPositionMode;

            switch (mode) {
            case SceneMode.SCENE3D:
                getPositionMode = getPosition3DMode;
                break;
            case SceneMode.SCENE2D:
                getPositionMode = getPosition2DMode;
                break;
            case SceneMode.COLUMBUS_VIEW:
                getPositionMode = getPositionColumbusViewMode;
                break;
            case SceneMode.MORPHING:
                getPositionMode = getPositionMorphingMode;
                break;
            }

            var get2DYPositionFractionGeographicProjection = 'float get2DYPositionFraction() { return get2DGeographicYPositionFraction(); }';
            var get2DYPositionFractionMercatorProjection = 'float get2DYPositionFraction() { return get2DMercatorYPositionFraction(); }';

            var get2DYPositionFraction;

            if (projection instanceof GeographicProjection) {
                get2DYPositionFraction = get2DYPositionFractionGeographicProjection;
            } else {
                get2DYPositionFraction = get2DYPositionFractionMercatorProjection;
            }

            this._surfaceShaderSet.baseVertexShaderString =
                 CentralBodyVS + '\n' +
                 getPositionMode + '\n' +
                 get2DYPositionFraction;

            var showPrettyOcean = hasWaterMask && typeof this._oceanNormalMap !== 'undefined';

            this._surfaceShaderSet.baseFragmentShaderString =
                (hasWaterMask ? '#define SHOW_REFLECTIVE_OCEAN\n' : '') +
                (showPrettyOcean ? '#define SHOW_OCEAN_WAVES\n' : '') +
                '#line 0\n' +
                CentralBodyFS;
            this._surfaceShaderSet.invalidateShaders();

            var poleShaderProgram = shaderCache.replaceShaderProgram(this._northPoleCommand.shaderProgram,
                CentralBodyVSPole, CentralBodyFSPole, TerrainProvider.attributeIndices);

            this._northPoleCommand.shaderProgram = poleShaderProgram;
            this._southPoleCommand.shaderProgram = poleShaderProgram;

            this._showingPrettyOcean = typeof this._oceanNormalMap !== 'undefined';
            this._hasWaterMask = hasWaterMask;
        }

        var cameraPosition = frameState.camera.getPositionWC();

        this._occluder.setCameraPosition(cameraPosition);

        this._fillPoles(context, frameState);

        this._mode = mode;
        this._projection = projection;

        var pass = frameState.passes;
        var commandLists = this._commandLists;
        commandLists.removeAll();

        if (pass.color) {
            var colorCommandList = commandLists.colorList;

            // render quads to fill the poles
            if (mode === SceneMode.SCENE3D) {
                if (this._drawNorthPole) {
                    colorCommandList.push(this._northPoleCommand);
                }

                if (this._drawSouthPole) {
                    colorCommandList.push(this._southPoleCommand);
                }
            }

            var drawUniforms = this._drawUniforms;

            // Don't show the ocean specular highlights when zoomed out in 2D and Columbus View.
            if (mode === SceneMode.SCENE3D) {
                this._zoomedOutOceanSpecularIntensity = 0.5;
            } else {
                this._zoomedOutOceanSpecularIntensity = 0.0;
            }

            this._surface._tileCacheSize = this.tileCacheSize;
            this._surface.setTerrainProvider(this.terrainProvider);
            this._surface.update(context,
                    frameState,
                    colorCommandList,
                    drawUniforms,
                    this._surfaceShaderSet,
                    this._rsColor,
                    this._mode,
                    this._projection);

            updateLogos(this, context, frameState, commandList);

            // render depth plane
            if (mode === SceneMode.SCENE3D) {
                if (!this.depthTestAgainstTerrain) {
                    colorCommandList.push(this._clearDepthCommand);
                    colorCommandList.push(this._depthCommand);
                }
            }
        }

        if (pass.pick) {
            // Not actually pickable, but render depth-only so primitives on the backface
            // of the globe are not picked.
            commandLists.pickList.push(this._depthCommand);
        }

        if (!commandLists.empty()) {
            commandList.push(commandLists);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CentralBody
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CentralBody#destroy
     */
    CentralBody.prototype.isDestroyed = function() {
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
     * @memberof CentralBody
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CentralBody#isDestroyed
     *
     * @example
     * centralBody = centralBody && centralBody.destroy();
     */
    CentralBody.prototype.destroy = function() {
        this._northPoleCommand.vertexArray = this._northPoleCommand.vertexArray && this._northPoleCommand.vertexArray.destroy();
        this._southPoleCommand.vertexArray = this._southPoleCommand.vertexArray && this._southPoleCommand.vertexArray.destroy();

        this._surfaceShaderSet = this._surfaceShaderSet && this._surfaceShaderSet.destroy();

        this._northPoleCommand.shaderProgram = this._northPoleCommand.shaderProgram && this._northPoleCommand.shaderProgram.release();
        this._southPoleCommand.shaderProgram = this._northPoleCommand.shaderProgram;

        this._depthCommand.shaderProgram = this._depthCommand.shaderProgram && this._depthCommand.shaderProgram.release();
        this._depthCommand.vertexArray = this._depthCommand.vertexArray && this._depthCommand.vertexArray.destroy();

        this._surface = this._surface && this._surface.destroy();

        this._oceanNormalMap = this._oceanNormalMap && this._oceanNormalMap.destroy();

        return destroyObject(this);
    };

    var logoData = {
        logos : undefined,
        logoIndex : 0,
        rebuildLogo : false,
        totalLogoWidth : 0,
        totalLogoHeight : 0
    };

    function updateLogos(centralBody, context, frameState, commandList) {
        logoData.logos = centralBody._logos;
        logoData.logoIndex = 0;
        logoData.rebuildLogo = false;
        logoData.totalLogoWidth = 0;
        logoData.totalLogoHeight = 0;

        checkLogo(logoData, centralBody._surface._terrainProvider);

        var imageryLayerCollection = centralBody._imageryLayerCollection;
        for ( var i = 0, len = imageryLayerCollection.getLength(); i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                checkLogo(logoData, layer.getImageryProvider());
            }
        }

        if (logoData.logos.length !== logoData.logoIndex) {
            logoData.rebuildLogo = true;
            logoData.logos.length = logoData.logoIndex;
        }

        var totalLogoWidth = logoData.totalLogoWidth;
        var totalLogoHeight = logoData.totalLogoHeight;

        var logoQuad = centralBody._logoQuad;
        if (totalLogoWidth === 0 || totalLogoHeight === 0) {
            if (typeof logoQuad !== 'undefined') {
                logoQuad.material = logoQuad.material && logoQuad.material.destroy();
                logoQuad.destroy();
                centralBody._logoQuad = undefined;
            }
            return;
        }

        if (typeof logoQuad === 'undefined') {
            logoQuad = new ViewportQuad();
            logoQuad.material.destroy();
            logoQuad.material = Material.fromType(context, Material.ImageType);
            logoQuad.material.uniforms.image = undefined;

            centralBody._logoQuad = logoQuad;
        }

        var logoOffset = centralBody.logoOffset;
        var rectangle = logoQuad.rectangle;
        rectangle.x = logoOffset.x;
        rectangle.y = logoOffset.y;
        rectangle.width = totalLogoWidth;
        rectangle.height = totalLogoHeight;

        if (logoData.rebuildLogo) {
            var texture = logoQuad.material.uniforms.image;

            // always delete and recreate the texture to get rid of leftover pixels
            texture = texture && texture.destroy();
            texture = context.createTexture2D({
                width : totalLogoWidth,
                height : totalLogoHeight
            });
            logoQuad.material.uniforms.image = texture;

            var yOffset = 0;
            for (i = 0, len = logoData.logos.length; i < len; i++) {
                var logo = logoData.logos[i];
                if (typeof logo !== 'undefined') {
                    texture.copyFrom(logo, 0, yOffset);
                    yOffset += logo.height + 2;
                }
            }
        }

        if (typeof logoQuad !== 'undefined') {
            logoQuad.update(context, frameState, commandList);
        }
    }

    function checkLogo(logoData, logoSource) {
        if (typeof logoSource.isReady === 'function' && !logoSource.isReady()) {
            return;
        }

        var logo;
        if (typeof logoSource.getLogo === 'function') {
            logo = logoSource.getLogo();
        } else {
            logo = undefined;
        }

        if (logoData.logos[logoData.logoIndex] !== logo) {
            logoData.rebuildLogo = true;
            logoData.logos[logoData.logoIndex] = logo;
        }
        logoData.logoIndex++;

        if (typeof logo !== 'undefined') {
            logoData.totalLogoWidth = Math.max(logoData.totalLogoWidth, logo.width);
            logoData.totalLogoHeight += logo.height + 2;
        }
    }

    return CentralBody;
});
