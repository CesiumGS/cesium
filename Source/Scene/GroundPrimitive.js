/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/isArray',
        '../Core/Math',
        '../Core/Matrix4',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        '../ThirdParty/when',
        './BlendingState',
        './DepthFunction',
        './Pass',
        './PerInstanceColorAppearance',
        './Primitive',
        './StencilFunction',
        './StencilOperation'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        isArray,
        CesiumMath,
        Matrix4,
        DrawCommand,
        ShaderSource,
        ShadowVolumeFS,
        ShadowVolumeVS,
        when,
        BlendingState,
        DepthFunction,
        Pass,
        PerInstanceColorAppearance,
        Primitive,
        StencilFunction,
        StencilOperation) {
    "use strict";

    /**
     * A ground primitive represents geometry draped over the terrain in the {@link Scene}.  The geometry must be from a single {@link GeometryInstance}.
     * Batching multiple geometries is not yet supported.
     * <p>
     * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
     * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
     * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
     * and match most of them and add a new geometry or appearance independently of each other. Only the {@link PerInstanceColorAppearance}
     * is supported at this time.
     * </p>
     *
     * @alias GroundPrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Array|GeometryInstance} [options.geometryInstances] A single geometry instance to render.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Boolean} [options.vertexCacheOptimize=false] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
     * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
     * @param {Boolean} [options.compressVertices=true] When <code>true</code>, the geometry vertices are compressed, which will save memory.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     *
     * @see Primitive
     * @see GeometryInstance
     * @see Appearance
     *
     * @example
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
     */
    var GroundPrimitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The geometry instances rendered with this primitive.  This may
         * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
         * is <code>true</code> when the primitive is constructed.
         * <p>
         * Changing this property after the primitive is rendered has no effect.
         * </p>
         *
         * @type Array
         *
         * @default undefined
         */
        this.geometryInstances = options.geometryInstances;
        /**
         * Determines if the primitive will be shown.  This affects all geometry
         * instances in the primitive.
         *
         * @type Boolean
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

        this._stencilPreloadPassCommands = undefined;
        this._stencilDepthPassCommands = undefined;
        this._colorPassCommands = undefined;
        this._pickCommands = undefined;

        this._primitiveCommandList = [];

        this._ready = false;
        this._readyPromise = when.defer();

        var geometryInstances = this.geometryInstances;
        geometryInstances = isArray(geometryInstances) ? geometryInstances : [geometryInstances];

        var length = geometryInstances.length;
        var instances = new Array(length);

        for (var i = 0; i < length; ++i) {
            var instance = geometryInstances[i];
            var geometry = instance.geometry;

            var instanceType = geometry.constructor;
            if (defined(instanceType) && defined(instanceType._createShadowVolume)) {
                instances[i] = new GeometryInstance({
                    geometry : instanceType._createShadowVolume(geometry, computeMinimumHeight, computeMaximumHeight),
                    attributes : instance.attributes,
                    modelMatrix : Matrix4.IDENTITY,
                    id : instance.id
                });
            }
        }

        var appearance = new PerInstanceColorAppearance({
            flat : true
        });

        var primitiveOptions = {
            geometryInstances : instances,
            appearance : appearance,
            vertexCacheOptimize : options.vertexCacheOptimizations,
            interleave : options.interleave,
            releaseGeometryInstances : options.releaseGeometryInstances,
            allowPicking : options.allowPicking,
            asynchronous : options.asynchronous,
            compressVertices : options.compressVertices
        };

        this._primitive = new Primitive(primitiveOptions);

        var that = this;
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
    };

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
                return this._primitive.vertexCacheOptimize;
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
                return this._primitive.interleave;
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
                return this._primitive.releaseGeometryInstances;
            }
        },

        /**
         * When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.         *
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
                return this._primitive.allowPicking;
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
                return this._primitive.asynchronous;
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
                return this._primitive.compressVertices;
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
                return this._readyPromise;
            }
        }
    });

    GroundPrimitive._maxHeight = 9000.0;
    GroundPrimitive._minHeight = -100000.0;

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
     */
    GroundPrimitive.prototype.update = function(context, frameState, commandList) {
        if (!context.fragmentDepth || !this.show) {
            return;
        }

        var primitiveCommandList = this._primitiveCommandList;
        primitiveCommandList.length = 0;
        this._primitive.update(context, frameState, primitiveCommandList);

        if (!this._ready) {
            return;
        }

        if (!defined(this._sp)) {
            var vs = Primitive._createColumbusViewShader(ShadowVolumeVS, frameState.scene3DOnly);
            vs = Primitive._appendShowToShader(this._primitive, vs);

            var fs = ShadowVolumeFS;
            var attributeLocations = this._primitive._attributeLocations;

            this._sp = context.replaceShaderProgram(this._sp, vs, fs, attributeLocations);

            if (this._primitive.allowPicking) {
                var pickFS = new ShaderSource({
                    sources : [fs],
                    pickColorQualifier : 'varying'
                });
                this._spPick = context.replaceShaderProgram(this._spPick, Primitive._createPickVertexShaderSource(vs), pickFS, attributeLocations);
            } else {
                this._spPick = context.createShaderProgram(vs, fs, attributeLocations);
            }
        }

        if (!defined(this._rsStencilPreloadPass)) {
            this._rsStencilPreloadPass = context.createRenderState(stencilPreloadRenderState);
            this._rsStencilDepthPass = context.createRenderState(stencilDepthRenderState);
            this._rsColorPass = context.createRenderState(colorRenderState);
            this._rsPickPass = context.createRenderState(pickRenderState);
        }

        if (!defined(this._stencilPreloadPassCommands)) {
            var commandsLength = primitiveCommandList.length;

            this._stencilPreloadPassCommands = new Array(commandsLength);
            this._stencilDepthPassCommands = new Array(commandsLength);
            this._colorPassCommands = new Array(commandsLength);
            this._pickCommands = new Array(commandsLength);

            for (var i = 0; i < commandsLength; ++i) {
                var primitiveCommand = primitiveCommandList[i];

                this._stencilPreloadPassCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsStencilPreloadPass,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._stencilDepthPassCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsStencilDepthPass,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._colorPassCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsColorPass,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._pickCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsPickPass,
                    shaderProgram : this._spPick,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });
            }
        }

        var stencilPreloadCommands = this._stencilPreloadPassCommands;
        var stencilDepthPassCommands = this._stencilDepthPassCommands;
        var colorPassCommands = this._colorPassCommands;
        var pickCommands = this._pickCommands;

        var j;
        var length = primitiveCommandList.length;
        for (j = 0; j < length; ++j) {
            var command = primitiveCommandList[j];

            var stencilPreloadCommand = stencilPreloadCommands[j];
            stencilPreloadCommand.boundingVolume = command.boundingVolume;

            var stencilDepthPassCommand = stencilDepthPassCommands[j];
            stencilDepthPassCommand.boundingVolume = command.boundingVolume;

            var colorCommand = colorPassCommands[j];
            colorCommand.boundingVolume = command.boundingVolume;
            colorCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var pickCommand = pickCommands[j];
            pickCommand.boundingVolume = pickCommand.boundingVolume;
        }

        var passes = frameState.passes;

        if (passes.render) {
            for (j = 0; j < length; ++j) {
                commandList.push(stencilPreloadCommands[j], stencilDepthPassCommands[j], colorPassCommands[j]);
            }
        }

        if (passes.pick) {
            for (j = 0; j < length; ++j) {
                commandList.push(stencilPreloadCommands[j], stencilDepthPassCommands[j], pickCommands[j]);
            }
        }
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
     * @see GroundPrimitive#isDestroyed
     *
     * @example
     * e = e && e.destroy();
     */
    GroundPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        this._sp = this._sp && this._sp.destroy();
    };

    return GroundPrimitive;
});