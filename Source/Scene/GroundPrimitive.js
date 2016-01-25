/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/isArray',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        '../ThirdParty/when',
        './BlendingState',
        './DepthFunction',
        './Pass',
        './PerInstanceColorAppearance',
        './Primitive',
        './SceneMode',
        './StencilFunction',
        './StencilOperation'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        GeometryInstance,
        isArray,
        CesiumMath,
        Matrix3,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        ShadowVolumeFS,
        ShadowVolumeVS,
        when,
        BlendingState,
        DepthFunction,
        Pass,
        PerInstanceColorAppearance,
        Primitive,
        SceneMode,
        StencilFunction,
        StencilOperation) {
    "use strict";

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
     * Because of the cutting edge nature of this feature in WebGL, it requires the EXT_frag_depth extension, which is currently only supported in Chrome,
     * Firefox, and Edge. Apple support is expected in iOS 9 and MacOS Safari 9. Android support varies by hardware and IE11 will most likely never support
     * it. You can use webglreport.com to verify support for your hardware. Finally, this feature is currently only supported in Primitives and not yet
     * available via the Entity API.
     * </p>
     * <p>
     * Valid geometries are {@link CircleGeometry}, {@link CorridorGeometry}, {@link EllipseGeometry}, {@link PolygonGeometry}, and {@link RectangleGeometry}.
     * </p>
     *
     * @alias GroundPrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {GeometryInstance} [options.geometryInstance] A single geometry instance to render. This option is deprecated. Please use options.geometryInstances instead.
     * @param {Array|GeometryInstance} [options.geometryInstances] The geometry instances to render.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Boolean} [options.vertexCacheOptimize=false] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
     * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
     * @param {Boolean} [options.compressVertices=true] When <code>true</code>, the geometry vertices are compressed, which will save memory.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
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
     * @see GeometryInstance
     * @see Appearance
     */
    function GroundPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (defined(options.geometryInstance)) {
            deprecationWarning('GroundPrimitive.geometryInstance', 'GroundPrimitive.geometryInstance is deprecated in version 1.18 and will be removed in version 1.20. Please use GroundPrimitive.geometryInstances.');
        }

        /**
         * The geometry instance rendered with this primitive.  This may
         * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
         * is <code>true</code> when the primitive is constructed.
         * <p>
         * Changing this property after the primitive is rendered has no effect.
         * </p>
         *
         * @type {GeometryInstance}
         *
         * @default undefined
         *
         * @deprecated
         */
        this.geometryInstance = options.geometryInstance;
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

        this._sp = undefined;
        this._spPick = undefined;

        this._rsStencilPreloadPass = undefined;
        this._rsStencilDepthPass = undefined;
        this._rsColorPass = undefined;
        this._rsPickPass = undefined;

        this._uniformMap = {};

        this._boundingVolumes = [];
        this._boundingVolumes2D = [];

        this._ready = false;
        this._readyPromise = when.defer();

        this._primitive = undefined;

        var appearance = new PerInstanceColorAppearance({
            flat : true
        });

        var readOnlyAttributes;
        if (defined(this.geometryInstances) && isArray(this.geometryInstances) && this.geometryInstances.length > 1) {
            readOnlyAttributes = readOnlyInstanceAttributesScratch;
        }

        this._primitiveOptions = {
            geometryInstances : undefined,
            appearance : appearance,
            vertexCacheOptimize : defaultValue(options.vertexCacheOptimize, false),
            interleave : defaultValue(options.interleave, false),
            releaseGeometryInstances : defaultValue(options.releaseGeometryInstances, true),
            allowPicking : defaultValue(options.allowPicking, true),
            asynchronous : defaultValue(options.asynchronous, true),
            compressVertices : defaultValue(options.compressVertices, true),
            _readOnlyInstanceAttributes : readOnlyAttributes,
            _createRenderStatesFunction : undefined,
            _createShaderProgramFunction : undefined,
            _createCommandsFunction : undefined,
            _createPickOffsets : true
        };
    }

    var readOnlyInstanceAttributesScratch = ['color'];

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
    GroundPrimitive.isSupported = function(scene) {
        return scene.context.fragmentDepth;
    };

    GroundPrimitive._maxHeight = undefined;
    GroundPrimitive._minHeight = undefined;
    GroundPrimitive._minOBBHeight = undefined;

    GroundPrimitive._maxTerrainHeight = 9000.0;
    GroundPrimitive._minTerrainHeight = -100000.0;
    GroundPrimitive._minOBBTerrainHeight = -11500.0;

    function computeMaximumHeight(granularity, ellipsoid) {
        var r = ellipsoid.maximumRadius;
        var delta = (r / Math.cos(granularity * 0.5)) - r;
        return GroundPrimitive._maxHeight + delta;
    }

    function computeMinimumHeight(granularity, ellipsoid) {
        return GroundPrimitive._minHeight;
    }

    var stencilPreloadRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.DECREMENT_WRAP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.INCREMENT_WRAP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false
    };

    var stencilDepthRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : true,
            func : DepthFunction.LESS_OR_EQUAL
        },
        depthMask : false
    };

    var colorRenderState = {
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false,
        blending : BlendingState.ALPHA_BLEND
    };

    var pickRenderState = {
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false
    };

    var scratchBVCartesianHigh = new Cartesian3();
    var scratchBVCartesianLow = new Cartesian3();
    var scratchBVCartesian = new Cartesian3();
    var scratchBVCartographic = new Cartographic();
    var scratchBVRectangle = new Rectangle();

    function createBoundingVolume(primitive, frameState, geometry) {
        var highPositions = geometry.attributes.position3DHigh.values;
        var lowPositions = geometry.attributes.position3DLow.values;
        var length = highPositions.length;

        var ellipsoid = frameState.mapProjection.ellipsoid;

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

        // Use an oriented bounding box by default, but switch to a bounding sphere if bounding box creation would fail.
        if (rectangle.width < CesiumMath.PI) {
            var obb = OrientedBoundingBox.fromRectangle(rectangle, GroundPrimitive._maxHeight, GroundPrimitive._minOBBHeight, ellipsoid);
            primitive._boundingVolumes.push(obb);
        } else {
            primitive._boundingVolumes.push(BoundingSphere.fromEncodedCartesianVertices(highPositions, lowPositions));
        }

        if (!frameState.scene3DOnly) {
            var projection = frameState.mapProjection;
            var boundingVolume = BoundingSphere.fromRectangleWithHeights2D(rectangle, projection, GroundPrimitive._maxHeight, GroundPrimitive._minOBBHeight);
            Cartesian3.fromElements(boundingVolume.center.z, boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center);

            primitive._boundingVolumes2D.push(boundingVolume);
        }
    }

    function createRenderStates(primitive, context, appearance, twoPasses) {
        if (defined(primitive._rsStencilPreloadPass)) {
            return;
        }

        primitive._rsStencilPreloadPass = RenderState.fromCache(stencilPreloadRenderState);
        primitive._rsStencilDepthPass = RenderState.fromCache(stencilDepthRenderState);
        primitive._rsColorPass = RenderState.fromCache(colorRenderState);
        primitive._rsPickPass = RenderState.fromCache(pickRenderState);
    }

    function createShaderProgram(primitive, frameState, appearance) {
        if (defined(primitive._sp)) {
            return;
        }

        var context = frameState.context;

        var vs = ShadowVolumeVS;
        vs = Primitive._modifyShaderPosition(primitive, vs, frameState.scene3DOnly);
        vs = Primitive._appendShowToShader(primitive._primitive, vs);

        var fs = ShadowVolumeFS;
        var attributeLocations = primitive._primitive._attributeLocations;

        primitive._sp = ShaderProgram.replaceCache({
            context : context,
            shaderProgram : primitive._sp,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : attributeLocations
        });

        if (primitive._primitive.allowPicking) {
            var pickFS = new ShaderSource({
                sources : [fs],
                pickColorQualifier : 'varying'
            });
            primitive._spPick = ShaderProgram.replaceCache({
                context : context,
                shaderProgram : primitive._spPick,
                vertexShaderSource : ShaderSource.createPickVertexShaderSource(vs),
                fragmentShaderSource : pickFS,
                attributeLocations : attributeLocations
            });
        } else {
            primitive._spPick = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }
    }

    function createColorCommands(groundPrimitive, colorCommands) {
        var primitive = groundPrimitive._primitive;
        var length = primitive._va.length * 3;
        colorCommands.length = length;

        var vaIndex = 0;

        for (var i = 0; i < length; i += 3) {
            var vertexArray = primitive._va[vaIndex++];

            // stencil preload command
            var command = colorCommands[i];
            if (!defined(command)) {
                command = colorCommands[i] = new DrawCommand({
                    owner : groundPrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPrimitive._rsStencilPreloadPass;
            command.shaderProgram = groundPrimitive._sp;
            command.uniformMap = groundPrimitive._uniformMap;
            command.pass = Pass.GROUND;

            // stencil depth command
            command = colorCommands[i + 1];
            if (!defined(command)) {
                command = colorCommands[i + 1] = new DrawCommand({
                    owner : groundPrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPrimitive._rsStencilDepthPass;
            command.shaderProgram = groundPrimitive._sp;
            command.uniformMap = groundPrimitive._uniformMap;
            command.pass = Pass.GROUND;

            // color command
            command = colorCommands[i + 2];
            if (!defined(command)) {
                command = colorCommands[i + 2] = new DrawCommand({
                    owner : groundPrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPrimitive._rsColorPass;
            command.shaderProgram = groundPrimitive._sp;
            command.uniformMap = groundPrimitive._uniformMap;
            command.pass = Pass.GROUND;
        }
    }

    function createPickCommands(groundPrimitive, pickCommands) {
        var primitive = groundPrimitive._primitive;
        var pickOffsets = primitive._pickOffsets;
        var length = pickOffsets.length * 3;
        pickCommands.length = length;

        var pickIndex = 0;

        for (var j = 0; j < length; j += 3) {
            var pickOffset = pickOffsets[pickIndex++];

            var offset = pickOffset.offset;
            var count = pickOffset.count;
            var vertexArray = primitive._va[pickOffset.index];

            // stencil preload command
            var command = pickCommands[j];
            if (!defined(command)) {
                command = pickCommands[j] = new DrawCommand({
                    owner : groundPrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = groundPrimitive._rsStencilPreloadPass;
            command.shaderProgram = groundPrimitive._sp;
            command.uniformMap = groundPrimitive._uniformMap;
            command.pass = Pass.GROUND;

            // stencil depth command
            command = pickCommands[j + 1];
            if (!defined(command)) {
                command = pickCommands[j + 1] = new DrawCommand({
                    owner : groundPrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = groundPrimitive._rsStencilDepthPass;
            command.shaderProgram = groundPrimitive._sp;
            command.uniformMap = groundPrimitive._uniformMap;
            command.pass = Pass.GROUND;

            // color command
            command = pickCommands[j + 2];
            if (!defined(command)) {
                command = pickCommands[j + 2] = new DrawCommand({
                    owner : groundPrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = groundPrimitive._rsPickPass;
            command.shaderProgram = groundPrimitive._spPick;
            command.uniformMap = groundPrimitive._uniformMap;
            command.pass = Pass.GROUND;
        }
    }

    function createCommands(groundPrimitive, appearance, material, translucent, twoPasses, colorCommands, pickCommands) {
        createColorCommands(groundPrimitive, colorCommands);
        createPickCommands(groundPrimitive, pickCommands);
    }

    function updateAndQueueCommands(groundPrimitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
        var boundingVolumes;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolumes = groundPrimitive._boundingVolumes;
        } else if (frameState.mode !== SceneMode.SCENE3D && defined(groundPrimitive._boundingVolumes2D)) {
            boundingVolumes = groundPrimitive._boundingVolumes2D;
        }

        var commandList = frameState.commandList;
        var passes = frameState.passes;
        if (passes.render) {
            var colorLength = colorCommands.length;
            for (var j = 0; j < colorLength; ++j) {
                colorCommands[j].modelMatrix = modelMatrix;
                colorCommands[j].boundingVolume = boundingVolumes[Math.floor(j / 3)];
                colorCommands[j].cull = cull;
                colorCommands[j].debugShowBoundingVolume = debugShowBoundingVolume;

                commandList.push(colorCommands[j]);
            }
        }

        if (passes.pick) {
            var primitive = groundPrimitive._primitive;
            var pickOffsets = primitive._pickOffsets;
            var length = pickOffsets.length * 3;
            pickCommands.length = length;

            var pickIndex = 0;
            for (var k = 0; k < length; k += 3) {
                var pickOffset = pickOffsets[pickIndex++];
                var bv = boundingVolumes[pickOffset.index];

                pickCommands[k].modelMatrix = modelMatrix;
                pickCommands[k].boundingVolume = bv;
                pickCommands[k].cull = cull;

                pickCommands[k + 1].modelMatrix = modelMatrix;
                pickCommands[k + 1].boundingVolume = bv;
                pickCommands[k + 1].cull = cull;

                pickCommands[k + 2].modelMatrix = modelMatrix;
                pickCommands[k + 2].boundingVolume = bv;
                pickCommands[k + 2].cull = cull;

                commandList.push(pickCommands[k], pickCommands[k + 1], pickCommands[k + 2]);
            }
        }
    }

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
        var context = frameState.context;
        if (!context.fragmentDepth || !this.show || (!defined(this._primitive) && !defined(this.geometryInstance) && !defined(this.geometryInstances))) {
            return;
        }

        if (!defined(GroundPrimitive._maxHeight)) {
            var exaggeration = frameState.terrainExaggeration;
            GroundPrimitive._maxHeight = GroundPrimitive._maxTerrainHeight * exaggeration;
            GroundPrimitive._minHeight = GroundPrimitive._minTerrainHeight * exaggeration;
            GroundPrimitive._minOBBHeight = GroundPrimitive._minOBBTerrainHeight * exaggeration;
        }

        if (!defined(this._primitive)) {
            var primitiveOptions = this._primitiveOptions;

            var instance;
            var geometry;
            var instanceType;

            if (defined(this.geometryInstance)) {
                instance = this.geometryInstance;
                geometry = instance.geometry;

                instanceType = geometry.constructor;
                if (defined(instanceType) && defined(instanceType.createShadowVolume)) {
                    instance = new GeometryInstance({
                        geometry : instanceType.createShadowVolume(geometry, computeMinimumHeight, computeMaximumHeight),
                        attributes : instance.attributes,
                        id : instance.id,
                        pickPrimitive : this
                    });
                }

                primitiveOptions.geometryInstances = instance;
            } else {
                var instances = isArray(this.geometryInstances) ? this.geometryInstances : [this.geometryInstances];
                var length = instances.length;
                var groundInstances = new Array(length);

                var color;

                for (var i = 0 ; i < length; ++i) {
                    instance = instances[i];
                    geometry = instance.geometry;

                    instanceType = geometry.constructor;
                    if (defined(instanceType) && defined(instanceType.createShadowVolume)) {
                        var attributes = instance.attributes;

                        //>>includeStart('debug', pragmas.debug);
                        if (!defined(attributes) || !defined(attributes.color)) {
                            throw new DeveloperError('Not all of the geometry instances have the same color attribute.');
                        } else if (defined(color) && !ColorGeometryInstanceAttribute.equals(color, attributes.color)) {
                            throw new DeveloperError('Not all of the geometry instances have the same color attribute.');
                        } else if (!defined(color)) {
                            color = attributes.color;
                        }
                        //>>includeEnd('debug');

                        groundInstances[i] = new GeometryInstance({
                            geometry : instanceType.createShadowVolume(geometry, computeMinimumHeight, computeMaximumHeight),
                            attributes : attributes,
                            id : instance.id,
                            pickPrimitive : this
                        });
                    }
                }

                primitiveOptions.geometryInstances = groundInstances;
            }

            var that = this;
            primitiveOptions._createBoundingVolumeFunction = function(frameState, geometry) {
                createBoundingVolume(that, frameState, geometry);
            };
            primitiveOptions._createRenderStatesFunction = function(primitive, context, appearance, twoPasses) {
                createRenderStates(that, context);
            };
            primitiveOptions._createShaderProgramFunction = function(primitive, frameState, appearance) {
                createShaderProgram(that, frameState);
            };
            primitiveOptions._createCommandsFunction = function(primitive, appearance, material, translucent, twoPasses, colorCommands, pickCommands) {
                createCommands(that, undefined, undefined, true, false, colorCommands, pickCommands);
            };
            primitiveOptions._updateAndQueueCommandsFunction = function(primitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
                updateAndQueueCommands(that, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses);
            };

            this._primitive = new Primitive(primitiveOptions);
            this._primitive.readyPromise.then(function(primitive) {
                that._ready = true;

                if (that.releaseGeometryInstances) {
                    that.geometryInstance = undefined;
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

        this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        this._primitive.update(frameState);
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
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();
        return destroyObject(this);
    };

    return GroundPrimitive;
});
