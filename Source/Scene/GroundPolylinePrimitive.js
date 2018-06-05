define([
        '../Core/ApproximateTerrainHeights',
        '../Core/Check',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/GeometryInstanceAttribute',
        '../Core/GroundPolylineGeometry',
        '../Core/isArray',
        '../Core/Matrix4',
        '../Shaders/PolylineShadowVolumeVS',
        '../Shaders/PolylineShadowVolumeFS',
        '../Shaders/PolylineShadowVolumeMorphVS',
        '../Shaders/PolylineShadowVolumeMorphFS',
        '../Renderer/DrawCommand',
        '../Renderer/Pass',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../ThirdParty/when',
        './BlendingState',
        './CullFace',
        './Material',
        './PolylineColorAppearance',
        './PolylineMaterialAppearance',
        './Primitive',
        './SceneMode'
    ], function(
        ApproximateTerrainHeights,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        GeometryInstance,
        GeometryInstanceAttribute,
        GroundPolylineGeometry,
        isArray,
        Matrix4,
        PolylineShadowVolumeVS,
        PolylineShadowVolumeFS,
        PolylineShadowVolumeMorphVS,
        PolylineShadowVolumeMorphFS,
        DrawCommand,
        Pass,
        RenderState,
        ShaderProgram,
        ShaderSource,
        when,
        BlendingState,
        CullFace,
        Material,
        PolylineColorAppearance,
        PolylineMaterialAppearance,
        Primitive,
        SceneMode) {
    'use strict';

    /**
     * A GroundPolylinePrimitive represents a polyline draped over the terrain in the {@link Scene}.
     * <p>
     *
     * Only to be used with GeometryInstances containing GroundPolylineGeometries
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Array|GeometryInstance} [options.geometryInstances] GeometryInstances containing GroundPolylineGeometry
     * @param {Appearance} [options.appearance] The Appearance used to render the polyline. Defaults to a white color {@link Material} on a {@link PolylineMaterialAppearance}.
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
     */
    function GroundPolylinePrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The geometry instances rendered with this primitive. This may
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

        var appearance = options.appearance;
        if (!defined(appearance)) {
            appearance = new PolylineMaterialAppearance();
        }
        /**
         * The {@link Appearance} used to shade this primitive. Each geometry
         * instance is shaded with the same appearance.  Some appearances, like
         * {@link PolylineColorAppearance} allow giving each instance unique
         * properties.
         *
         * @type Appearance
         *
         * @default undefined
         */
        this.appearance = appearance;

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

        // Shadow volume is shown by removing a discard in the shader, so this isn't toggleable.
        this._debugShowShadowVolume = defaultValue(options.debugShowShadowVolume, false);

        this._primitiveOptions = {
            geometryInstances : undefined,
            appearance : undefined,
            vertexCacheOptimize : defaultValue(options.vertexCacheOptimize, false),
            interleave : defaultValue(options.interleave, false),
            releaseGeometryInstances : defaultValue(options.releaseGeometryInstances, true),
            allowPicking : defaultValue(options.allowPicking, true),
            asynchronous : defaultValue(options.asynchronous, true),
            compressVertices : defaultValue(options.compressVertices, true),
            _createShaderProgramFunction : undefined,
            _createCommandsFunction : undefined,
            _updateAndQueueCommandsFunction : undefined
        };

        // Used when inserting in an OrderedPrimitiveCollection
        this._zIndex = undefined;

        this._ready = false;
        this._readyPromise = when.defer();

        this._primitive = undefined;

        this._sp = undefined;
        this._spPick = undefined;
        this._sp2D = undefined;
        this._spPick2D = undefined;
        this._spMorph = undefined;
        this._spPickMorph = undefined;
        this._renderState = RenderState.fromCache({
            cull : {
                enabled : true // prevent double-draw. Geometry is "inverted" (reversed winding order) so we're drawing backfaces.
            },
            blending : BlendingState.ALPHA_BLEND
        });

        this._renderStateMorph = RenderState.fromCache({
            cull : {
                enabled : true,
                face : CullFace.FRONT // Geometry is "inverted," so cull front when materials on volume instead of on terrain (morph)
            },
            depthTest : {
                enabled : true
            },
            blending : BlendingState.ALPHA_BLEND
        });
    }

    defineProperties(GroundPolylinePrimitive.prototype, {
        /**
         * When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
         *
         * @memberof GroundPolylinePrimitive.prototype
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
         * @memberof GroundPolylinePrimitive.prototype
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
         * @memberof GroundPolylinePrimitive.prototype
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
         * @memberof GroundPolylinePrimitive.prototype
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
         * @memberof GroundPolylinePrimitive.prototype
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
         * @memberof GroundPolylinePrimitive.prototype
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
         * true, the primitive will be rendered the next time that {@link GroundPolylinePrimitive#update}
         * is called.
         *
         * @memberof GroundPolylinePrimitive.prototype
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
         * @memberof GroundPolylinePrimitive.prototype
         * @type {Promise.<GroundPolylinePrimitive>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * If true, draws the shadow volume for each geometry in the primitive.
         * </p>
         *
         * @memberof GroundPolylinePrimitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        debugShowShadowVolume : {
            get : function() {
                return this._debugShowShadowVolume;
            }
        }
    });

    GroundPolylinePrimitive._initialized = false;
    GroundPolylinePrimitive._initPromise = undefined;

    /**
     * Initializes the minimum and maximum terrain heights. This only needs to be called if you are creating the
     * GroundPolylinePrimitive synchronously.
     *
     * @returns {Promise} A promise that will resolve once the terrain heights have been loaded.
     *
     */
    GroundPolylinePrimitive.initializeTerrainHeights = function() {
        var initPromise = GroundPolylinePrimitive._initPromise;
        if (defined(initPromise)) {
            return initPromise;
        }

        GroundPolylinePrimitive._initPromise = ApproximateTerrainHeights.initialize()
            .then(function() {
                GroundPolylinePrimitive._initialized = true;
            });

        return GroundPolylinePrimitive._initPromise;
    };

    // For use with web workers.
    GroundPolylinePrimitive._initializeTerrainHeightsWorker = function() {
        var initPromise = GroundPolylinePrimitive._initPromise;
        if (defined(initPromise)) {
            return initPromise;
        }

        GroundPolylinePrimitive._initPromise = ApproximateTerrainHeights.initialize('../Assets/approximateTerrainHeights.json')
            .then(function() {
                GroundPolylinePrimitive._initialized = true;
            });

        return GroundPolylinePrimitive._initPromise;
    };

    function createShaderProgram(groundPolylinePrimitive, frameState, appearance) {
        var context = frameState.context;
        var primitive = groundPolylinePrimitive._primitive;
        var isPolylineColorAppearance = appearance instanceof PolylineColorAppearance;

        var attributeLocations = primitive._attributeLocations;

        var vs = primitive._batchTable.getVertexShaderCallback()(PolylineShadowVolumeVS);
        vs = Primitive._appendShowToShader(primitive, vs);
        vs = Primitive._appendDistanceDisplayConditionToShader(primitive, vs);
        vs = Primitive._modifyShaderPosition(groundPolylinePrimitive, vs, frameState.scene3DOnly);

        var vsMorph = primitive._batchTable.getVertexShaderCallback()(PolylineShadowVolumeMorphVS);
        vsMorph = Primitive._appendShowToShader(primitive, vsMorph);
        vsMorph = Primitive._appendDistanceDisplayConditionToShader(primitive, vsMorph);
        vsMorph = Primitive._modifyShaderPosition(groundPolylinePrimitive, vsMorph, frameState.scene3DOnly);

        // Tesselation on these volumes tends to be low,
        // which causes problems when interpolating log depth from vertices.
        // So force computing and writing log depth in the fragment shader.
        // Re-enable at far distances to avoid z-fighting.
        var colorDefine = isPolylineColorAppearance ? 'PER_INSTANCE_COLOR' : '';
        var vsDefines =  ['ENABLE_GL_POSITION_LOG_DEPTH_AT_HEIGHT', colorDefine];
        var fsDefines =  groundPolylinePrimitive.debugShowShadowVolume ? ['DEBUG_SHOW_VOLUME', colorDefine] : [colorDefine];

        var vsColor3D = new ShaderSource({
            defines : vsDefines,
            sources : [vs]
        });
        var fsColor3D = new ShaderSource({
            defines : fsDefines,
            sources : [isPolylineColorAppearance ? '' : appearance.material.shaderSource, PolylineShadowVolumeFS]
        });
        groundPolylinePrimitive._sp = ShaderProgram.replaceCache({
            context : context,
            shaderProgram : primitive._sp,
            vertexShaderSource : vsColor3D,
            fragmentShaderSource : fsColor3D,
            attributeLocations : attributeLocations
        });

        // Derive 2D/CV
        var colorProgram2D = context.shaderCache.getDerivedShaderProgram(groundPolylinePrimitive._sp, '2dColor');
        if (!defined(colorProgram2D)) {
            var vsColor2D = new ShaderSource({
                defines : vsDefines.concat(['COLUMBUS_VIEW_2D']),
                sources : [vs]
            });
            colorProgram2D = context.shaderCache.createDerivedShaderProgram(groundPolylinePrimitive._sp, '2dColor', {
                context : context,
                shaderProgram : groundPolylinePrimitive._sp2D,
                vertexShaderSource : vsColor2D,
                fragmentShaderSource : fsColor3D,
                attributeLocations : attributeLocations
            });
        }
        groundPolylinePrimitive._sp2D = colorProgram2D;

        // Derive Morph
        var colorProgramMorph = context.shaderCache.getDerivedShaderProgram(groundPolylinePrimitive._sp, 'MorphColor');
        if (!defined(colorProgramMorph)) {
            var vsColorMorph = new ShaderSource({
                defines : vsDefines,
                sources : [vsMorph]
            });
            var fsColorMorph = new ShaderSource({
                defines : fsDefines,
                sources : [isPolylineColorAppearance ? '' : appearance.material.shaderSource, PolylineShadowVolumeMorphFS]
            });
            colorProgramMorph = context.shaderCache.createDerivedShaderProgram(groundPolylinePrimitive._sp, 'MorphColor', {
                context : context,
                shaderProgram : groundPolylinePrimitive._spMorph,
                vertexShaderSource : vsColorMorph,
                fragmentShaderSource : fsColorMorph,
                attributeLocations : attributeLocations
            });
        }
        groundPolylinePrimitive._spMorph = colorProgramMorph;

        if (groundPolylinePrimitive._primitive.allowPicking) {
            var vsPick = ShaderSource.createPickVertexShaderSource(vs);
            vsPick = Primitive._updatePickColorAttribute(vsPick);

            var vsPickMorphSource = ShaderSource.createPickVertexShaderSource(vsMorph);
            vsPickMorphSource = Primitive._updatePickColorAttribute(vsPick);

            var vsPick3D = new ShaderSource({
                defines : vsDefines,
                sources : [vsPick]
            });
            var fsPick3D = new ShaderSource({
                defines : fsDefines.concat(['PICK']),
                sources : [PolylineShadowVolumeFS],
                pickColorQualifier : 'varying'
            });

            groundPolylinePrimitive._spPick = ShaderProgram.replaceCache({
                context : context,
                shaderProgram : groundPolylinePrimitive._spPick,
                vertexShaderSource : vsPick3D,
                fragmentShaderSource : fsPick3D,
                attributeLocations : attributeLocations
            });

            // Derive 2D/CV
            var pickProgram2D = context.shaderCache.getDerivedShaderProgram(groundPolylinePrimitive._spPick, '2dPick');
            if (!defined(pickProgram2D)) {
                var vsPick2D = new ShaderSource({
                    defines : vsDefines.concat(['COLUMBUS_VIEW_2D']),
                    sources : [vsPick]
                });
                pickProgram2D = context.shaderCache.createDerivedShaderProgram(groundPolylinePrimitive._spPick, '2dPick', {
                    context : context,
                    shaderProgram : groundPolylinePrimitive._spPick2D,
                    vertexShaderSource : vsPick2D,
                    fragmentShaderSource : fsPick3D,
                    attributeLocations : attributeLocations
                });
            }
            groundPolylinePrimitive._spPick2D = pickProgram2D;

            // Derive Morph
            var pickProgramMorph = context.shaderCache.getDerivedShaderProgram(groundPolylinePrimitive._spPick, 'MorphPick');
            if (!defined(pickProgramMorph)) {
                var vsPickMorph = new ShaderSource({
                    defines : vsDefines,
                    sources : [vsPickMorphSource]
                });
                var fsPickMorph = new ShaderSource({
                    defines : ['PICK'],
                    sources : [PolylineShadowVolumeMorphFS],
                    pickColorQualifier : 'varying'
                });
                pickProgramMorph = context.shaderCache.createDerivedShaderProgram(groundPolylinePrimitive._spPick, 'MorphPick', {
                    context : context,
                    shaderProgram : groundPolylinePrimitive._spPickMorph,
                    vertexShaderSource : vsPickMorph,
                    fragmentShaderSource : fsPickMorph,
                    attributeLocations : attributeLocations
                });
            }
            groundPolylinePrimitive._spPickMorph = pickProgramMorph;
        } else {
            groundPolylinePrimitive._spPick = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vsColor3D,
                fragmentShaderSource : fsColor3D,
                attributeLocations : attributeLocations
            });
        }
    }

    function createCommands(groundPolylinePrimitive, appearance, material, translucent, colorCommands, pickCommands) {
        var primitive = groundPolylinePrimitive._primitive;
        var length = primitive._va.length;
        colorCommands.length = length;
        pickCommands.length = length;

        var isPolylineColorAppearance = appearance instanceof PolylineColorAppearance;

        var i;
        var command;
        var materialUniforms = isPolylineColorAppearance ? {} : material._uniforms;
        var uniformMap = primitive._batchTable.getUniformMapCallback()(materialUniforms);
        var pass = Pass.TERRAIN_CLASSIFICATION;

        for (i = 0; i < length; i++) {
            var vertexArray = primitive._va[i];

            command = colorCommands[i];
            if (!defined(command)) {
                command = colorCommands[i] = new DrawCommand({
                    owner : groundPolylinePrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPolylinePrimitive._renderState;
            command.shaderProgram = groundPolylinePrimitive._sp;
            command.uniformMap = uniformMap;
            command.pass = pass;

            // derive for 2D
            var derivedColorCommand = command.derivedCommands.color2D;
            if (!defined(derivedColorCommand)) {
                derivedColorCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.color2D = derivedColorCommand;
            }
            derivedColorCommand.vertexArray = vertexArray;
            derivedColorCommand.renderState = groundPolylinePrimitive._renderState;
            derivedColorCommand.shaderProgram = groundPolylinePrimitive._sp2D;
            derivedColorCommand.uniformMap = uniformMap;
            derivedColorCommand.pass = pass;

            // derive for Morph
            derivedColorCommand = command.derivedCommands.colorMorph;
            if (!defined(derivedColorCommand)) {
                derivedColorCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.colorMorph = derivedColorCommand;
            }
            derivedColorCommand.vertexArray = vertexArray;
            derivedColorCommand.renderState = groundPolylinePrimitive._renderStateMorph;
            derivedColorCommand.shaderProgram = groundPolylinePrimitive._spMorph;
            derivedColorCommand.uniformMap = uniformMap;
            derivedColorCommand.pass = pass;

            // Pick
            command = pickCommands[i];
            if (!defined(command)) {
                command = pickCommands[i] = new DrawCommand({
                    owner : groundPolylinePrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPolylinePrimitive._renderState;
            command.shaderProgram = groundPolylinePrimitive._spPick;
            command.uniformMap = uniformMap;
            command.pass = pass;

            // derive for 2D
            var derivedPickCommand = command.derivedCommands.pick2D;
            if (!defined(derivedPickCommand)) {
                derivedPickCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.pick2D = derivedPickCommand;
            }
            derivedPickCommand.vertexArray = vertexArray;
            derivedPickCommand.renderState = groundPolylinePrimitive._renderState;
            derivedPickCommand.shaderProgram = groundPolylinePrimitive._spPick2D;
            derivedPickCommand.uniformMap = uniformMap;
            derivedPickCommand.pass = pass;

            // derive for Morph
            derivedPickCommand = command.derivedCommands.pickMorph;
            if (!defined(derivedPickCommand)) {
                derivedPickCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.pickMorph = derivedPickCommand;
            }
            derivedPickCommand.vertexArray = vertexArray;
            derivedPickCommand.renderState = groundPolylinePrimitive._renderStateMorph;
            derivedPickCommand.shaderProgram = groundPolylinePrimitive._spPickMorph;
            derivedPickCommand.uniformMap = uniformMap;
            derivedPickCommand.pass = pass;
        }
    }

    function updateAndQueueCommands(groundPolylinePrimitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume) {
        var primitive = groundPolylinePrimitive._primitive;

        //>>includeStart('debug', pragmas.debug);
        if (frameState.mode !== SceneMode.SCENE3D && !Matrix4.equals(modelMatrix, Matrix4.IDENTITY)) {
            throw new DeveloperError('Primitive.modelMatrix is only supported in 3D mode.');
        }
        //>>includeEnd('debug');

        Primitive._updateBoundingVolumes(primitive, frameState, modelMatrix);

        var boundingSpheres;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingSpheres = primitive._boundingSphereWC;
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
            boundingSpheres = primitive._boundingSphereCV;
        } else if (frameState.mode === SceneMode.SCENE2D && defined(primitive._boundingSphere2D)) {
            boundingSpheres = primitive._boundingSphere2D;
        } else if (defined(primitive._boundingSphereMorph)) {
            boundingSpheres = primitive._boundingSphereMorph;
        }

        var commandList = frameState.commandList;
        var passes = frameState.passes;
        if (passes.render) {
            var colorLength = colorCommands.length;

            for (var j = 0; j < colorLength; ++j) {
                var colorCommand = colorCommands[j];
                // Use derived appearance command for morph and 2D
                if (frameState.mode === SceneMode.MORPHING && colorCommand.shaderProgram !== groundPolylinePrimitive._spMorph) {
                    colorCommand = colorCommand.derivedCommands.colorMorph;
                } else if (frameState.mode !== SceneMode.SCENE3D && colorCommand.shaderProgram !== groundPolylinePrimitive._sp2D) {
                    colorCommand = colorCommand.derivedCommands.color2D;
                }
                colorCommand.modelMatrix = modelMatrix;
                colorCommand.boundingVolume = boundingSpheres[j];
                colorCommand.cull = cull;
                colorCommand.debugShowBoundingVolume = debugShowBoundingVolume;

                commandList.push(colorCommand);
            }
        }

        if (passes.pick) {
            var pickLength = pickCommands.length;
            for (var k = 0; k < pickLength; ++k) {
                var pickCommand = pickCommands[k];
                // Use derived pick command for morph and 2D
                if (frameState.mode === SceneMode.MORPHING && pickCommand.shaderProgram !== groundPolylinePrimitive._spMorph) {
                    pickCommand = pickCommand.derivedCommands.pickMorph;
                } else if (frameState.mode !== SceneMode.SCENE3D && pickCommand.shaderProgram !== groundPolylinePrimitive._spPick2D) {
                    pickCommand = pickCommand.derivedCommands.pick2D;
                }
                pickCommand.modelMatrix = modelMatrix;
                pickCommand.boundingVolume = boundingSpheres[k];
                pickCommand.cull = cull;

                commandList.push(pickCommand);
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
     * @exception {DeveloperError} For synchronous GroundPolylinePrimitives, you must call GroundPolylinePrimitives.initializeTerrainHeights() and wait for the returned promise to resolve.
     * @exception {DeveloperError} All instance geometries must have the same primitiveType.
     * @exception {DeveloperError} Appearance and material have a uniform with the same name.
     */
    GroundPolylinePrimitive.prototype.update = function(frameState) {
        if (!defined(this._primitive) && !defined(this.geometryInstances)) {
            return;
        }

        if (!GroundPolylinePrimitive._initialized) {
            //>>includeStart('debug', pragmas.debug);
            if (!this.asynchronous) {
                throw new DeveloperError('For synchronous GroundPolylinePrimitives, you must call GroundPolylinePrimitives.initializeTerrainHeights() and wait for the returned promise to resolve.');
            }
            //>>includeEnd('debug');

            GroundPolylinePrimitive.initializeTerrainHeights();
            return;
        }

        var i;

        var that = this;
        var primitiveOptions = this._primitiveOptions;
        if (!defined(this._primitive)) {
            var geometryInstances = isArray(this.geometryInstances) ? this.geometryInstances : [this.geometryInstances];
            var geometryInstancesLength = geometryInstances.length;

            // If using PolylineColorAppearance, check if each instance has a color attribute.
            if (this.appearance instanceof PolylineColorAppearance) {
                for (i = 0; i < geometryInstancesLength; ++i) {
                    if (!defined(geometryInstances[i].attributes.color)) {
                        throw new DeveloperError('All GeometryInstances must have color attributes to use PolylineColorAppearance with GroundPolylinePrimitive.');
                    }
                }
            }

            // Automatically create line width attributes
            for (i = 0; i < geometryInstancesLength; ++i) {
                var geometryInstance = geometryInstances[i];
                var attributes = geometryInstance.attributes;
                if (!defined(attributes.width)) {
                    attributes.width = new GeometryInstanceAttribute({
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        componentsPerAttribute : 1.0,
                        value : [geometryInstance.geometry.width]
                    });
                }
            }

            primitiveOptions.geometryInstances = geometryInstances;
            primitiveOptions.appearance = this.appearance;

            primitiveOptions._createShaderProgramFunction = function(primitive, frameState, appearance) {
                createShaderProgram(that, frameState, appearance);
            };
            primitiveOptions._createCommandsFunction = function(primitive, appearance, material, translucent, twoPasses, colorCommands, pickCommands) {
                createCommands(that, appearance, material, translucent, colorCommands, pickCommands);
            };
            primitiveOptions._updateAndQueueCommandsFunction = function(primitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
                updateAndQueueCommands(that, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume);
            };

            this._primitive = new Primitive(primitiveOptions);
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
        this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        this._primitive.update(frameState);
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
    GroundPolylinePrimitive.prototype.getGeometryInstanceAttributes = function(id) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(this._primitive)) {
            throw new DeveloperError('must call update before calling getGeometryInstanceAttributes');
        }
        //>>includeEnd('debug');
        return this._primitive.getGeometryInstanceAttributes(id);
    };

    /**
     * Checks if the given Scene supports GroundPolylinePrimitives.
     * GroundPolylinePrimitives require support for the WEBGL_depth_texture extension.
     *
     * @param {Scene} scene The current scene.
     * @returns {Boolean} Whether or not the current scene supports GroundPolylinePrimitives.
     */
    GroundPolylinePrimitive.isSupported = function(scene) {
        return scene.frameState.context.depthTexture;
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
     * @see GroundPolylinePrimitive#destroy
     */
    GroundPolylinePrimitive.prototype.isDestroyed = function() {
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
     * @see GroundPolylinePrimitive#isDestroyed
     */
    GroundPolylinePrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();

        // Derived programs, destroyed above if they existed.
        this._sp2D = undefined;
        this._spPick2D = undefined;
        this._spMorph = undefined;
        this._spPickMorph = undefined;

        return destroyObject(this);
    };

    return GroundPolylinePrimitive;
});
