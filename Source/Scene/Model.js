/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/clone',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/getAbsoluteUri',
        '../Core/getBaseUri',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/IndexDatatype',
        '../Core/loadArrayBuffer',
        '../Core/loadImage',
        '../Core/loadImageFromTypedArray',
        '../Core/loadText',
        '../Core/Math',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/Quaternion',
        '../Core/Queue',
        '../Core/RuntimeError',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Renderer/VertexArray',
        '../Renderer/WebGLConstants',
        '../ThirdParty/gltfDefaults',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './getModelAccessor',
        './ModelAnimationCache',
        './ModelAnimationCollection',
        './ModelMaterial',
        './modelMaterialsCommon',
        './ModelMesh',
        './ModelNode',
        './Pass',
        './SceneMode'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        clone,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        getAbsoluteUri,
        getBaseUri,
        getMagic,
        getStringFromTypedArray,
        IndexDatatype,
        loadArrayBuffer,
        loadImage,
        loadImageFromTypedArray,
        loadText,
        CesiumMath,
        Matrix2,
        Matrix3,
        Matrix4,
        PrimitiveType,
        Quaternion,
        Queue,
        RuntimeError,
        Buffer,
        BufferUsage,
        DrawCommand,
        RenderState,
        Sampler,
        ShaderProgram,
        ShaderSource,
        Texture,
        TextureMinificationFilter,
        TextureWrap,
        VertexArray,
        WebGLConstants,
        gltfDefaults,
        Uri,
        when,
        getModelAccessor,
        ModelAnimationCache,
        ModelAnimationCollection,
        ModelMaterial,
        modelMaterialsCommon,
        ModelMesh,
        ModelNode,
        Pass,
        SceneMode) {
    "use strict";

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    var yUpToZUp = Matrix4.fromRotationTranslation(Matrix3.fromRotationX(CesiumMath.PI_OVER_TWO));
    var boundingSphereCartesian3Scratch = new Cartesian3();

    var ModelState = {
        NEEDS_LOAD : 0,
        LOADING : 1,
        LOADED : 2,  // Renderable, but textures can still be pending when incrementallyLoadTextures is true.
        FAILED : 3
    };

    // GLTF_SPEC: Figure out correct mime types (https://github.com/KhronosGroup/glTF/issues/412)
    var defaultModelAccept = 'model/vnd.gltf.binary,model/vnd.gltf+json,model/gltf.binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01';

    function LoadResources() {
        this.buffersToCreate = new Queue();
        this.buffers = {};
        this.pendingBufferLoads = 0;

        this.programsToCreate = new Queue();
        this.shaders = {};
        this.pendingShaderLoads = 0;

        this.texturesToCreate = new Queue();
        this.pendingTextureLoads = 0;

        this.texturesToCreateFromBufferView = new Queue();
        this.pendingBufferViewToImage = 0;

        this.createSamplers = true;
        this.createSkins = true;
        this.createRuntimeAnimations = true;
        this.createVertexArrays = true;
        this.createRenderStates = true;
        this.createUniformMaps = true;
        this.createRuntimeNodes = true;

        this.skinnedNodesIds = [];
    }

    LoadResources.prototype.getBuffer = function(bufferView) {
        return getSubarray(this.buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
    };

    LoadResources.prototype.finishedPendingBufferLoads = function() {
        return (this.pendingBufferLoads === 0);
    };

    LoadResources.prototype.finishedBuffersCreation = function() {
        return ((this.pendingBufferLoads === 0) && (this.buffersToCreate.length === 0));
    };

    LoadResources.prototype.finishedProgramCreation = function() {
        return ((this.pendingShaderLoads === 0) && (this.programsToCreate.length === 0));
    };

    LoadResources.prototype.finishedTextureCreation = function() {
        var finishedPendingLoads = (this.pendingTextureLoads === 0);
        var finishedResourceCreation =
            (this.texturesToCreate.length === 0) &&
            (this.texturesToCreateFromBufferView.length === 0);

        return finishedPendingLoads && finishedResourceCreation;
    };

    LoadResources.prototype.finishedEverythingButTextureCreation = function() {
        var finishedPendingLoads =
            (this.pendingBufferLoads === 0) &&
            (this.pendingShaderLoads === 0);
        var finishedResourceCreation =
            (this.buffersToCreate.length === 0) &&
            (this.programsToCreate.length === 0) &&
            (this.pendingBufferViewToImage === 0);

        return finishedPendingLoads && finishedResourceCreation;
    };

    LoadResources.prototype.finished = function() {
        return this.finishedTextureCreation() && this.finishedEverythingButTextureCreation();
    };

    ///////////////////////////////////////////////////////////////////////////

    function setCachedGltf(model, cachedGltf) {
        model._cachedGltf = cachedGltf;
        model._animationIds = getAnimationIds(cachedGltf);
    }

    // glTF JSON can be big given embedded geometry, textures, and animations, so we
    // cache it across all models using the same url/cache-key.  This also reduces the
    // slight overhead in assigning defaults to missing values.
    //
    // Note that this is a global cache, compared to renderer resources, which
    // are cached per context.
    function CachedGltf(options) {
        this._gltf = modelMaterialsCommon(gltfDefaults(options.gltf));
        this._bgltf = options.bgltf;
        this.ready = options.ready;
        this.modelsToLoad = [];
        this.count = 0;
    }

    defineProperties(CachedGltf.prototype, {
        gltf : {
            set : function(value) {
                this._gltf = modelMaterialsCommon(gltfDefaults(value));
            },

            get : function() {
                return this._gltf;
            }
        },

        bgltf : {
            get : function() {
                return this._bgltf;
            }
        }
    });

    CachedGltf.prototype.makeReady = function(gltfJson, bgltf) {
        this.gltf = gltfJson;
        this._bgltf = bgltf;

        var models = this.modelsToLoad;
        var length = models.length;
        for (var i = 0; i < length; ++i) {
            var m = models[i];
            if (!m.isDestroyed()) {
                setCachedGltf(m, this);
            }
        }
        this.modelsToLoad = undefined;
        this.ready = true;
    };

    function getAnimationIds(cachedGltf) {
        var animationIds = [];
        if (defined(cachedGltf) && defined(cachedGltf.gltf)) {
            var animations = cachedGltf.gltf.animations;
            for (var id in animations) {
                if (animations.hasOwnProperty(id)) {
                    animationIds.push(id);
                }
            }
        }

        return animationIds;
    }

    var gltfCache = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * A 3D model based on glTF, the runtime asset format for WebGL, OpenGL ES, and OpenGL.
     * <p>
     * Cesium includes support for geometry and materials, glTF animations, and glTF skinning.
     * In addition, individual glTF nodes are pickable with {@link Scene#pick} and animatable
     * with {@link Model#getNode}.  glTF cameras and lights are not currently supported.
     * </p>
     * <p>
     * An external glTF asset is created with {@link Model.fromGltf}.  glTF JSON can also be
     * created at runtime and passed to this constructor function.  In either case, the
     * {@link Model#readyPromise} is resolved when the model is ready to render, i.e.,
     * when the external binary, image, and shader files are downloaded and the WebGL
     * resources are created.
     * </p>
     * <p>
     * For high-precision rendering, Cesium supports the CESIUM_RTC extension, which introduces the
     * CESIUM_RTC_MODELVIEW parameter semantic that says the node is in WGS84 coordinates translated
     * relative to a local origin.
     * </p>
     *
     * @alias Model
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Object|ArrayBuffer|Uint8Array} [options.gltf] The object for the glTF JSON or an arraybuffer of Binary glTF defined by the KHR_binary_glTF extension.
     * @param {String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
     * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
     * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
     * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
     * @param {Number} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
     * @param {Object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
     *
     * @exception {DeveloperError} bgltf is not a valid Binary glTF file.
     * @exception {DeveloperError} Only glTF Binary version 1 is supported.
     *
     * @see Model.fromGltf
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Models.html|Cesium Sandcastle Models Demo}
     */
    function Model(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var cacheKey = options.cacheKey;
        this._cacheKey = cacheKey;
        this._cachedGltf = undefined;
        this._releaseGltfJson = defaultValue(options.releaseGltfJson, false);
        this._animationIds = undefined;

        var cachedGltf;
        if (defined(cacheKey) && defined(gltfCache[cacheKey]) && gltfCache[cacheKey].ready) {
            // glTF JSON is in cache and ready
            cachedGltf = gltfCache[cacheKey];
            ++cachedGltf.count;
        } else {
            // glTF was explicitly provided, e.g., when a user uses the Model constructor directly
            var gltf = options.gltf;

            if (defined(gltf)) {
                if (gltf instanceof ArrayBuffer) {
                    gltf = new Uint8Array(gltf);
                }

                if (gltf instanceof Uint8Array) {
                    // Binary glTF
                    var result = parseBinaryGltfHeader(gltf);

                    // KHR_binary_glTF is from the beginning of the binary section
                    if (result.binaryOffset !== 0) {
                        gltf = gltf.subarray(result.binaryOffset);
                    }

                    cachedGltf = new CachedGltf({
                        gltf : result.glTF,
                        bgltf : gltf,
                        ready : true
                    });
                } else {
                    // Normal glTF (JSON)
                    cachedGltf = new CachedGltf({
                        gltf : options.gltf,
                        ready : true
                    });
                }

                cachedGltf.count = 1;

                if (defined(cacheKey)) {
                    gltfCache[cacheKey] = cachedGltf;
                }
            }
        }
        setCachedGltf(this, cachedGltf);

        this._basePath = defaultValue(options.basePath, '');

        var docUri = new Uri(document.location.href);
        var modelUri = new Uri(this._basePath);
        this._baseUri = modelUri.resolve(docUri);

        /**
         * Determines if the model primitive will be shown.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * The 4x4 transformation matrix that transforms the model from model to world coordinates.
         * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type {Matrix4}
         *
         * @default {@link Matrix4.IDENTITY}
         *
         * @example
         * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
         * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = Matrix4.clone(this.modelMatrix);

        /**
         * A uniform scale applied to this model before the {@link Model#modelMatrix}.
         * Values greater than <code>1.0</code> increase the size of the model; values
         * less than <code>1.0</code> decrease.
         *
         * @type {Number}
         *
         * @default 1.0
         */
        this.scale = defaultValue(options.scale, 1.0);
        this._scale = this.scale;

        /**
         * The approximate minimum pixel size of the model regardless of zoom.
         * This can be used to ensure that a model is visible even when the viewer
         * zooms out.  When <code>0.0</code>, no minimum size is enforced.
         *
         * @type {Number}
         *
         * @default 0.0
         */
        this.minimumPixelSize = defaultValue(options.minimumPixelSize, 0.0);
        this._minimumPixelSize = this.minimumPixelSize;

        /**
         * The maximum scale size for a model. This can be used to give
         * an upper limit to the {@link Model#minimumPixelSize}, ensuring that the model
         * is never an unreasonable scale.
         *
         * @type {Number}
         */
        this.maximumScale = options.maximumScale;
        this._maximumScale = this.maximumScale;

        /**
         * User-defined object returned when the model is picked.
         *
         * @type Object
         *
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;
        this._id = options.id;

        /**
         * Used for picking primitives that wrap a model.
         *
         * @private
         */
        this.pickPrimitive = options.pickPrimitive;

        this._allowPicking = defaultValue(options.allowPicking, true);

        this._ready = false;
        this._readyPromise = when.defer();

        /**
         * The currently playing glTF animations.
         *
         * @type {ModelAnimationCollection}
         */
        this.activeAnimations = new ModelAnimationCollection(this);

        this._defaultTexture = undefined;
        this._incrementallyLoadTextures = defaultValue(options.incrementallyLoadTextures, true);
        this._asynchronous = defaultValue(options.asynchronous, true);

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the bounding sphere for each draw command in the model.  A glTF primitive corresponds
         * to one draw command.  A glTF mesh has an array of primitives, often of length one.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);
        this._debugShowBoundingVolume = false;

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the model in wireframe.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugWireframe = defaultValue(options.debugWireframe, false);
        this._debugWireframe = false;

        // Undocumented options
        this._precreatedAttributes = options.precreatedAttributes;
        this._vertexShaderLoaded = options.vertexShaderLoaded;
        this._fragmentShaderLoaded = options.fragmentShaderLoaded;
        this._uniformMapLoaded = options.uniformMapLoaded;
        this._pickVertexShaderLoaded = options.pickVertexShaderLoaded;
        this._pickFragmentShaderLoaded = options.pickFragmentShaderLoaded;
        this._pickUniformMapLoaded = options.pickUniformMapLoaded;
        this._ignoreCommands = defaultValue(options.ignoreCommands, false);

        /**
         * @private
         * @readonly
         */
        this.cull = defaultValue(options.cull, true);

        this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and scale
        this._initialRadius = undefined;           // Radius without model's scale property, model-matrix scale, animations, or skins
        this._boundingSphere = undefined;
        this._scaledBoundingSphere = new BoundingSphere();
        this._state = ModelState.NEEDS_LOAD;
        this._loadResources = undefined;

        this._perNodeShowDirty = false;            // true when the Cesium API was used to change a node's show property
        this._cesiumAnimationsDirty = false;       // true when the Cesium API, not a glTF animation, changed a node transform
        this._dirty = false;                       // true when the model was transformed this frame
        this._maxDirtyNumber = 0;                  // Used in place of a dirty boolean flag to avoid an extra graph traversal

        this._runtime = {
            animations : undefined,
            rootNodes : undefined,
            nodes : undefined,            // Indexed with the node property's name, i.e., glTF id
            nodesByName : undefined,      // Indexed with name property in the node
            skinnedNodes : undefined,
            meshesByName : undefined,     // Indexed with the name property in the mesh
            materialsByName : undefined,  // Indexed with the name property in the material
            materialsById : undefined     // Indexed with the material's property name
        };

        this._uniformMaps = {};       // Not cached since it can be targeted by glTF animation
        this._rendererResources = {   // Cached between models with the same url/cache-key
            buffers : {},
            vertexArrays : {},
            programs : {},
            pickPrograms : {},
            textures : {},

            samplers : {},
            renderStates : {}
        };
        this._cachedRendererResources = undefined;
        this._loadRendererResourcesFromCache = false;

        this._nodeCommands = [];
        this._pickIds = [];

        // CESIUM_RTC extension
        this._rtcCenter = undefined;    // in world coordinates
        this._rtcCenterEye = undefined; // in eye coordinates
    }

    defineProperties(Model.prototype, {
        /**
         * The object for the glTF JSON, including properties with default values omitted
         * from the JSON provided to this model.
         *
         * @memberof Model.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @default undefined
         */
        gltf : {
            get : function() {
                return defined(this._cachedGltf) ? this._cachedGltf.gltf : undefined;
            }
        },

        /**
         * When <code>true</code>, the glTF JSON is not stored with the model once the model is
         * loaded (when {@link Model#ready} is <code>true</code>).  This saves memory when
         * geometry, textures, and animations are embedded in the .gltf file, which is the
         * default for the {@link http://cesiumjs.org/convertmodel.html|Cesium model converter}.
         * This is especially useful for cases like 3D buildings, where each .gltf model is unique
         * and caching the glTF JSON is not effective.
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         *
         * @private
         */
        releaseGltfJson : {
            get : function() {
                return this._releaseGltfJson;
            }
        },

        /**
         * The key identifying this model in the model cache for glTF JSON, renderer resources, and animations.
         * Caching saves memory and improves loading speed when several models with the same url are created.
         * <p>
         * This key is automatically generated when the model is created with {@link Model.fromGltf}.  If the model
         * is created directly from glTF JSON using the {@link Model} constructor, this key can be manually
         * provided; otherwise, the model will not be changed.
         * </p>
         *
         * @memberof Model.prototype
         *
         * @type {String}
         * @readonly
         *
         * @private
         */
        cacheKey : {
            get : function() {
                return this._cacheKey;
            }
        },

        /**
         * The base path that paths in the glTF JSON are relative to.  The base
         * path is the same path as the path containing the .gltf file
         * minus the .gltf file, when binary, image, and shader files are
         * in the same directory as the .gltf.  When this is <code>''</code>,
         * the app's base path is used.
         *
         * @memberof Model.prototype
         *
         * @type {String}
         * @readonly
         *
         * @default ''
         */
        basePath : {
            get : function() {
                return this._basePath;
            }
        },

        /**
         * The model's bounding sphere in its local coordinate system.  This does not take into
         * account glTF animations and skins nor does it take into account {@link Model#minimumPixelSize}.
         *
         * @memberof Model.prototype
         *
         * @type {BoundingSphere}
         * @readonly
         *
         * @default undefined
         *
         * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
         *
         * @example
         * // Center in WGS84 coordinates
         * var center = Cesium.Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cesium.Cartesian3());
         */
        boundingSphere : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (this._state !== ModelState.LOADED) {
                    throw new DeveloperError('The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.');
                }
                //>>includeEnd('debug');

                var nonUniformScale = Matrix4.getScale(this.modelMatrix, boundingSphereCartesian3Scratch);
                var scale = defined(this.maximumScale) ? Math.min(this.maximumScale, this.scale) : this.scale;
                Cartesian3.multiplyByScalar(nonUniformScale, scale, nonUniformScale);

                var scaledBoundingSphere = this._scaledBoundingSphere;
                scaledBoundingSphere.center = Cartesian3.multiplyComponents(this._boundingSphere.center, nonUniformScale, scaledBoundingSphere.center);
                scaledBoundingSphere.radius = Cartesian3.maximumComponent(nonUniformScale) * this._initialRadius;

                if (defined(this._rtcCenter)) {
                    Cartesian3.add(this._rtcCenter, scaledBoundingSphere.center, scaledBoundingSphere.center);
                }

                return scaledBoundingSphere;
            }
        },

        /**
         * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
         * and shader files were downloaded and the WebGL resources were created.  This is set to
         * <code>true</code> right before {@link Model#readyPromise} is resolved.
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the promise that will be resolved when this model is ready to render, i.e., when the external binary, image,
         * and shader files were downloaded and the WebGL resources were created.
         * <p>
         * This promise is resolved at the end of the frame before the first frame the model is rendered in.
         * </p>
         *
         * @memberof Model.prototype
         * @type {Promise.<Model>}
         * @readonly
         *
         * @example
         * // Play all animations at half-speed when the model is ready to render
         * Cesium.when(model.readyPromise).then(function(model) {
         *   model.activeAnimations.addAll({
         *     speedup : 0.5
         *   });
         * }).otherwise(function(error){
         *   window.alert(error);
         * });
         *
         * @see Model#ready
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * Determines if model WebGL resource creation will be spread out over several frames or
         * block until completion once all glTF files are loaded.
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        asynchronous : {
            get : function() {
                return this._asynchronous;
            }
        },

        /**
         * When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        allowPicking : {
            get : function() {
                return this._allowPicking;
            }
        },

        /**
         * Determine if textures may continue to stream in after the model is loaded.
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        incrementallyLoadTextures : {
            get : function() {
                return this._incrementallyLoadTextures;
            }
        },

        /**
         * Return the number of pending texture loads.
         *
         * @memberof Model.prototype
         *
         * @type {Number}
         * @readonly
         */
        pendingTextureLoads : {
            get : function() {
                return defined(this._loadResources) ? this._loadResources.pendingTextureLoads : 0;
            }
        },

        /**
         * Returns true if the model was transformed this frame
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @private
         */
        dirty : {
            get : function() {
                return this._dirty;
            }
        }
    });

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * This function differs from the normal subarray function
     * because it takes offset and length, rather than begin and end.
     */
    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    function containsGltfMagic(uint8Array) {
        var magic = getMagic(uint8Array);
        return magic === 'glTF';
    }

    function parseBinaryGltfHeader(uint8Array) {
        if (!containsGltfMagic(uint8Array)) {
            throw new DeveloperError('bgltf is not a valid Binary glTF file.');
        }

        var view = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
        var byteOffset = 0;

        byteOffset += sizeOfUint32; // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Binary glTF version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        byteOffset += sizeOfUint32; // Skip length

        var sceneLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32 + sizeOfUint32; // Skip sceneFormat

        var sceneOffset = byteOffset;
        var binOffset = sceneOffset + sceneLength;

        var json = getStringFromTypedArray(uint8Array, sceneOffset, sceneLength);
        return {
            glTF: JSON.parse(json),
            binaryOffset: binOffset
        };
    }

    /**
     * <p>
     * Creates a model from a glTF asset.  When the model is ready to render, i.e., when the external binary, image,
     * and shader files are downloaded and the WebGL resources are created, the {@link Model#readyPromise} is resolved.
     * </p>
     * <p>
     * The model can be a traditional glTF asset with a .gltf extension or a Binary glTF using the
     * KHR_binary_glTF extension with a .glb extension.
     * </p>
     * <p>
     * For high-precision rendering, Cesium supports the CESIUM_RTC extension, which introduces the
     * CESIUM_RTC_MODELVIEW parameter semantic that says the node is in WGS84 coordinates translated
     * relative to a local origin.
     * </p>
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url to the .gltf file.
     * @param {Object} [options.headers] HTTP headers to send with the request.
     * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
     * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
     * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
     * @param {Number} [options.maxiumumScale] The maximum scale for the model.
     * @param {Object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each {@link DrawCommand} in the model.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
     * @returns {Model} The newly created model.
     *
     * @exception {DeveloperError} bgltf is not a valid Binary glTF file.
     * @exception {DeveloperError} Only glTF Binary version 1 is supported.
     *
     * @example
     * // Example 1. Create a model from a glTF asset
     * var model = scene.primitives.add(Cesium.Model.fromGltf({
     *   url : './duck/duck.gltf'
     * }));
     *
     * @example
     * // Example 2. Create model and provide all properties and events
     * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
     * var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
     *
     * var model = scene.primitives.add(Cesium.Model.fromGltf({
     *   url : './duck/duck.gltf',
     *   show : true,                     // default
     *   modelMatrix : modelMatrix,
     *   scale : 2.0,                     // double size
     *   minimumPixelSize : 128,          // never smaller than 128 pixels
     *   maximumScale: 20000,             // never larger than 20000 * model size (overrides minimumPixelSize)
     *   allowPicking : false,            // not pickable
     *   debugShowBoundingVolume : false, // default
     *   debugWireframe : false
     * }));
     *
     * model.readyPromise.then(function(model) {
     *   // Play all animations when the model is ready to render
     *   model.activeAnimations.addAll();
     * });
     */
    Model.fromGltf = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.url)) {
            throw new DeveloperError('options.url is required');
        }
        //>>includeEnd('debug');

        var url = options.url;
        // If no cache key is provided, use the absolute URL, since two URLs with
        // different relative paths could point to the same model.
        var cacheKey = defaultValue(options.cacheKey, getAbsoluteUri(url));

        options = clone(options);
        options.basePath = getBaseUri(url);
        options.cacheKey = cacheKey;
        var model = new Model(options);

        options.headers = defined(options.headers) ? clone(options.headers) : {};
        if (!defined(options.headers.Accept)) {
            options.headers.Accept = defaultModelAccept;
        }

        var cachedGltf = gltfCache[cacheKey];
        if (!defined(cachedGltf)) {
            cachedGltf = new CachedGltf({
                ready : false
            });
            cachedGltf.count = 1;
            cachedGltf.modelsToLoad.push(model);
            setCachedGltf(model, cachedGltf);
            gltfCache[cacheKey] = cachedGltf;

            loadArrayBuffer(url, options.headers).then(function(arrayBuffer) {
                var array = new Uint8Array(arrayBuffer);
                if (containsGltfMagic(array)) {
                    // Load binary glTF
                    var result = parseBinaryGltfHeader(array);
                    // KHR_binary_glTF is from the beginning of the binary section
                    if (result.binaryOffset !== 0) {
                        array = array.subarray(result.binaryOffset);
                    }
                    cachedGltf.makeReady(result.glTF, array);
                } else {
                    // Load text (JSON) glTF
                    var json = getStringFromTypedArray(array);
                    cachedGltf.makeReady(JSON.parse(json));
                }
            }).otherwise(getFailedLoadFunction(model, 'model', url));
        } else if (!cachedGltf.ready) {
            // Cache hit but the loadArrayBuffer() or loadText() request is still pending
            ++cachedGltf.count;
            cachedGltf.modelsToLoad.push(model);
        }
        // else if the cached glTF is defined and ready, the
        // model constructor will pick it up using the cache key.

        return model;
    };

    /**
     * For the unit tests to verify model caching.
     *
     * @private
     */
    Model._gltfCache = gltfCache;

    function getRuntime(model, runtimeName, name) {
        //>>includeStart('debug', pragmas.debug);
        if (model._state !== ModelState.LOADED) {
            throw new DeveloperError('The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        return (model._runtime[runtimeName])[name];
    }

    /**
     * Returns the glTF node with the given <code>name</code> property.  This is used to
     * modify a node's transform for animation outside of glTF animations.
     *
     * @param {String} name The glTF name of the node.
     * @returns {ModelNode} The node or <code>undefined</code> if no node with <code>name</code> exists.
     *
     * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
     *
     * @example
     * // Apply non-uniform scale to node LOD3sp
     * var node = model.getNode('LOD3sp');
     * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
     */
    Model.prototype.getNode = function(name) {
        var node = getRuntime(this, 'nodesByName', name);
        return defined(node) ? node.publicNode : undefined;
    };

    /**
     * Returns the glTF mesh with the given <code>name</code> property.
     *
     * @param {String} name The glTF name of the mesh.
     *
     * @returns {ModelMesh} The mesh or <code>undefined</code> if no mesh with <code>name</code> exists.
     *
     * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
     */
    Model.prototype.getMesh = function(name) {
        return getRuntime(this, 'meshesByName', name);
    };

    /**
     * Returns the glTF material with the given <code>name</code> property.
     *
     * @param {String} name The glTF name of the material.
     * @returns {ModelMaterial} The material or <code>undefined</code> if no material with <code>name</code> exists.
     *
     * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
     */
    Model.prototype.getMaterial = function(name) {
        return getRuntime(this, 'materialsByName', name);
    };

    var aMinScratch = new Cartesian3();
    var aMaxScratch = new Cartesian3();

    function computeBoundingSphere(gltf) {
        var gltfNodes = gltf.nodes;
        var gltfMeshes = gltf.meshes;
        var gltfAccessors = gltf.accessors;
        var rootNodes = gltf.scenes[gltf.scene].nodes;
        var rootNodesLength = rootNodes.length;

        var nodeStack = [];

        var min = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var max = new Cartesian3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

        for (var i = 0; i < rootNodesLength; ++i) {
            var n = gltfNodes[rootNodes[i]];
            n._transformToRoot = getTransform(n);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n._transformToRoot;

                var meshes = n.meshes;
                if (defined(meshes)) {
                    var meshesLength = meshes.length;
                    for (var j = 0; j < meshesLength; ++j) {
                        var primitives = gltfMeshes[meshes[j]].primitives;
                        var primitivesLength = primitives.length;
                        for (var m = 0; m < primitivesLength; ++m) {
                            var position = primitives[m].attributes.POSITION;
                            if (defined(position)) {
                                var accessor = gltfAccessors[position];
                                var aMin = Cartesian3.fromArray(accessor.min, 0, aMinScratch);
                                var aMax = Cartesian3.fromArray(accessor.max, 0, aMaxScratch);
                                if (defined(min) && defined(max)) {
                                    Matrix4.multiplyByPoint(transformToRoot, aMin, aMin);
                                    Matrix4.multiplyByPoint(transformToRoot, aMax, aMax);
                                    Cartesian3.minimumByComponent(min, aMin, min);
                                    Cartesian3.maximumByComponent(max, aMax, max);
                                }
                            }
                        }
                    }
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var child = gltfNodes[children[k]];
                    child._transformToRoot = getTransform(child);
                    Matrix4.multiplyTransformation(transformToRoot, child._transformToRoot, child._transformToRoot);
                    nodeStack.push(child);
                }
                delete n._transformToRoot;
            }
        }

        var boundingSphere = BoundingSphere.fromCornerPoints(min, max);
        return BoundingSphere.transformWithoutScale(boundingSphere, yUpToZUp, boundingSphere);
    }

    ///////////////////////////////////////////////////////////////////////////

    function getFailedLoadFunction(model, type, path) {
        return function() {
            model._state = ModelState.FAILED;
            model._readyPromise.reject(new RuntimeError('Failed to load ' + type + ': ' + path));
        };
    }

    function bufferLoad(model, id) {
        return function(arrayBuffer) {
            var loadResources = model._loadResources;
            loadResources.buffers[id] = new Uint8Array(arrayBuffer);
            --loadResources.pendingBufferLoads;
         };
    }

    function parseBuffers(model) {
        var buffers = model.gltf.buffers;
        for (var id in buffers) {
            if (buffers.hasOwnProperty(id)) {
                var buffer = buffers[id];

                // The extension 'KHR_binary_glTF' uses a special buffer entitled just 'binary_glTF'.
                // The 'KHR_binary_glTF' check is for backwards compatibility for the Cesium model converter
                // circa Cesium 1.15-1.17 when the converter incorrectly used the buffer name 'KHR_binary_glTF'.
                if ((id === 'binary_glTF') || (id === 'KHR_binary_glTF')) {
                    // Buffer is the binary glTF file itself that is already loaded
                    var loadResources = model._loadResources;
                    loadResources.buffers[id] = model._cachedGltf.bgltf;
                }
                else if (buffer.type === 'arraybuffer') {
                    ++model._loadResources.pendingBufferLoads;
                    var uri = new Uri(buffer.uri);
                    var bufferPath = uri.resolve(model._baseUri).toString();
                    loadArrayBuffer(bufferPath).then(bufferLoad(model, id)).otherwise(getFailedLoadFunction(model, 'buffer', bufferPath));
                }
            }
        }
    }

    function parseBufferViews(model) {
        var bufferViews = model.gltf.bufferViews;
        for (var id in bufferViews) {
            if (bufferViews.hasOwnProperty(id)) {
                if (bufferViews[id].target === WebGLConstants.ARRAY_BUFFER) {
                    model._loadResources.buffersToCreate.enqueue(id);
                }
            }
        }
    }

    function shaderLoad(model, id) {
        return function(source) {
            var loadResources = model._loadResources;
            loadResources.shaders[id] = {
                source : source,
                bufferView : undefined
            };
            --loadResources.pendingShaderLoads;
         };
    }

    function parseShaders(model) {
        var shaders = model.gltf.shaders;
        for (var id in shaders) {
            if (shaders.hasOwnProperty(id)) {
                var shader = shaders[id];

                // Shader references either uri (external or base64-encoded) or bufferView
                if (defined(shader.extras) && defined(shader.extras.source)) {
                    model._loadResources.shaders[id] = {
                        source : shader.extras.source,
                        bufferView : undefined
                    };
                }
                else if (defined(shader.extensions) && defined(shader.extensions.KHR_binary_glTF)) {
                    var binary = shader.extensions.KHR_binary_glTF;
                    model._loadResources.shaders[id] = {
                        source : undefined,
                        bufferView : binary.bufferView
                    };
                } else {
                    ++model._loadResources.pendingShaderLoads;
                    var uri = new Uri(shader.uri);
                    var shaderPath = uri.resolve(model._baseUri).toString();
                    loadText(shaderPath).then(shaderLoad(model, id)).otherwise(getFailedLoadFunction(model, 'shader', shaderPath));
                }
            }
        }
    }

    function parsePrograms(model) {
        var programs = model.gltf.programs;
        for (var id in programs) {
            if (programs.hasOwnProperty(id)) {
                model._loadResources.programsToCreate.enqueue(id);
            }
        }
    }

    function imageLoad(model, id) {
        return function(image) {
            var loadResources = model._loadResources;
            --loadResources.pendingTextureLoads;
            loadResources.texturesToCreate.enqueue({
                id : id,
                image : image,
                bufferView : undefined
            });
        };
    }

    function parseTextures(model) {
        var images = model.gltf.images;
        var textures = model.gltf.textures;
        for (var id in textures) {
            if (textures.hasOwnProperty(id)) {
                var gltfImage = images[textures[id].source];

                // Image references either uri (external or base64-encoded) or bufferView
                if (defined(gltfImage.extensions) && defined(gltfImage.extensions.KHR_binary_glTF)) {
                    var binary = gltfImage.extensions.KHR_binary_glTF;
                    model._loadResources.texturesToCreateFromBufferView.enqueue({
                        id : id,
                        image : undefined,
                        bufferView : binary.bufferView,
                        mimeType : binary.mimeType
                    });
                } else {
                    ++model._loadResources.pendingTextureLoads;
                    var uri = new Uri(gltfImage.uri);
                    var imagePath = uri.resolve(model._baseUri).toString();
                    loadImage(imagePath).then(imageLoad(model, id)).otherwise(getFailedLoadFunction(model, 'image', imagePath));
                }
            }
        }
    }

    var nodeTranslationScratch = new Cartesian3();
    var nodeQuaternionScratch = new Quaternion();
    var nodeScaleScratch = new Cartesian3();

    function getTransform(node) {
        if (defined(node.matrix)) {
            return Matrix4.fromArray(node.matrix);
        }

        return Matrix4.fromTranslationQuaternionRotationScale(
            Cartesian3.fromArray(node.translation, 0, nodeTranslationScratch),
            Quaternion.unpack(node.rotation, 0, nodeQuaternionScratch),
            Cartesian3.fromArray(node.scale, 0 , nodeScaleScratch));
    }

    function parseNodes(model) {
        var runtimeNodes = {};
        var runtimeNodesByName = {};
        var skinnedNodes = [];

        var skinnedNodesIds = model._loadResources.skinnedNodesIds;
        var nodes = model.gltf.nodes;

        for (var id in nodes) {
            if (nodes.hasOwnProperty(id)) {
                var node = nodes[id];

                var runtimeNode = {
                    // Animation targets
                    matrix : undefined,
                    translation : undefined,
                    rotation : undefined,
                    scale : undefined,

                    // Per-node show inherited from parent
                    computedShow : true,

                    // Computed transforms
                    transformToRoot : new Matrix4(),
                    computedMatrix : new Matrix4(),
                    dirtyNumber : 0,                    // The frame this node was made dirty by an animation; for graph traversal

                    // Rendering
                    commands : [],                      // empty for transform, light, and camera nodes

                    // Skinned node
                    inverseBindMatrices : undefined,    // undefined when node is not skinned
                    bindShapeMatrix : undefined,        // undefined when node is not skinned or identity
                    joints : [],                        // empty when node is not skinned
                    computedJointMatrices : [],         // empty when node is not skinned

                    // Joint node
                    jointName : node.jointName,         // undefined when node is not a joint

                    // Graph pointers
                    children : [],                      // empty for leaf nodes
                    parents : [],                       // empty for root nodes

                    // Publicly-accessible ModelNode instance to modify animation targets
                    publicNode : undefined
                };
                runtimeNode.publicNode = new ModelNode(model, node, runtimeNode, id, getTransform(node));

                runtimeNodes[id] = runtimeNode;
                runtimeNodesByName[node.name] = runtimeNode;

                if (defined(node.skin)) {
                    skinnedNodesIds.push(id);
                    skinnedNodes.push(runtimeNode);
                }
            }
        }

        model._runtime.nodes = runtimeNodes;
        model._runtime.nodesByName = runtimeNodesByName;
        model._runtime.skinnedNodes = skinnedNodes;
    }

    function parseMaterials(model) {
        var runtimeMaterialsByName = {};
        var runtimeMaterialsById = {};
        var materials = model.gltf.materials;
        var uniformMaps = model._uniformMaps;

        for (var id in materials) {
            if (materials.hasOwnProperty(id)) {
                // Allocated now so ModelMaterial can keep a reference to it.
                uniformMaps[id] = {
                    uniformMap : undefined,
                    values : undefined,
                    jointMatrixUniformName : undefined
                };

                var material = materials[id];
                var modelMaterial = new ModelMaterial(model, material, id);
                runtimeMaterialsByName[material.name] = modelMaterial;
                runtimeMaterialsById[id] = modelMaterial;
            }
        }

        model._runtime.materialsByName = runtimeMaterialsByName;
        model._runtime.materialsById = runtimeMaterialsById;
    }

    function parseMeshes(model) {
        var runtimeMeshesByName = {};
        var runtimeMaterialsById = model._runtime.materialsById;
        var meshes = model.gltf.meshes;

        for (var id in meshes) {
            if (meshes.hasOwnProperty(id)) {
                var mesh = meshes[id];
                runtimeMeshesByName[mesh.name] = new ModelMesh(mesh, runtimeMaterialsById, id);
            }
        }

        model._runtime.meshesByName = runtimeMeshesByName;
    }

    function parse(model) {
        if (!model._loadRendererResourcesFromCache) {
            parseBuffers(model);
            parseBufferViews(model);
            parseShaders(model);
            parsePrograms(model);
            parseTextures(model);
        }

        parseMaterials(model);
        parseMeshes(model);
        parseNodes(model);
    }

    ///////////////////////////////////////////////////////////////////////////

    function createBuffers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        var bufferView;
        var bufferViews = model.gltf.bufferViews;
        var rendererBuffers = model._rendererResources.buffers;

        while (loadResources.buffersToCreate.length > 0) {
            var bufferViewId = loadResources.buffersToCreate.dequeue();
            bufferView = bufferViews[bufferViewId];

            // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
            var vertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : loadResources.getBuffer(bufferView),
                usage : BufferUsage.STATIC_DRAW
            });
            vertexBuffer.vertexArrayDestroyable = false;
            rendererBuffers[bufferViewId] = vertexBuffer;
        }

        // The Cesium Renderer requires knowing the datatype for an index buffer
        // at creation type, which is not part of the glTF bufferview so loop
        // through glTF accessors to create the bufferview's index buffer.
        var accessors = model.gltf.accessors;
        for (var id in accessors) {
            if (accessors.hasOwnProperty(id)) {
                var accessor = accessors[id];
                bufferView = bufferViews[accessor.bufferView];

                if ((bufferView.target === WebGLConstants.ELEMENT_ARRAY_BUFFER) && !defined(rendererBuffers[accessor.bufferView])) {
                    var indexBuffer = Buffer.createIndexBuffer({
                        context : context,
                        typedArray : loadResources.getBuffer(bufferView),
                        usage : BufferUsage.STATIC_DRAW,
                        indexDatatype : accessor.componentType
                    });
                    indexBuffer.vertexArrayDestroyable = false;
                    rendererBuffers[accessor.bufferView] = indexBuffer;
                    // In theory, several glTF accessors with different componentTypes could
                    // point to the same glTF bufferView, which would break this.
                    // In practice, it is unlikely as it will be UNSIGNED_SHORT.
                }
            }
        }
    }

    function createAttributeLocations(attributes) {
        var attributeLocations = {};
        var length = attributes.length;

        for (var i = 0; i < length; ++i) {
            attributeLocations[attributes[i]] = i;
        }

        return attributeLocations;
    }

    function getShaderSource(model, shader) {
        if (defined(shader.source)) {
            return shader.source;
        }

        var loadResources = model._loadResources;
        var gltf = model.gltf;
        var bufferView = gltf.bufferViews[shader.bufferView];

        return getStringFromTypedArray(loadResources.getBuffer(bufferView));
    }

    function modifyShader(shader, programName, callback) {
        if (defined(callback)) {
            shader = callback(shader, programName);
        }
        return shader;
    }

    function createProgram(id, model, context) {
        var programs = model.gltf.programs;
        var shaders = model._loadResources.shaders;
        var program = programs[id];

        var attributeLocations = createAttributeLocations(program.attributes);
        var vs = getShaderSource(model, shaders[program.vertexShader]);
        var fs = getShaderSource(model, shaders[program.fragmentShader]);

        var drawVS = modifyShader(vs, id, model._vertexShaderLoaded);
        var drawFS = modifyShader(fs, id, model._fragmentShaderLoaded);

        // Add pre-created attributes to attributeLocations
        var attributesLength = program.attributes.length;
        var precreatedAttributes = model._precreatedAttributes;
        if (defined(precreatedAttributes)) {
            for (var attrName in precreatedAttributes) {
                if (precreatedAttributes.hasOwnProperty(attrName)) {
                    attributeLocations[attrName] = attributesLength++;
                }
            }
        }

        model._rendererResources.programs[id] = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : drawVS,
            fragmentShaderSource : drawFS,
            attributeLocations : attributeLocations
        });

        if (model.allowPicking) {
            // PERFORMANCE_IDEA: Can optimize this shader with a glTF hint. https://github.com/KhronosGroup/glTF/issues/181
            var pickVS = modifyShader(vs, id, model._pickVertexShaderLoaded);
            var pickFS = modifyShader(fs, id, model._pickFragmentShaderLoaded);

            if (!model._pickFragmentShaderLoaded) {
                pickFS = ShaderSource.createPickFragmentShaderSource(fs, 'uniform');
            }

            model._rendererResources.pickPrograms[id] = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : pickVS,
                fragmentShaderSource : pickFS,
                attributeLocations : attributeLocations
            });
        }
    }

    function createPrograms(model, context) {
        var loadResources = model._loadResources;
        var id;

        if (loadResources.pendingShaderLoads !== 0) {
            return;
        }

        // PERFORMANCE_IDEA: this could be more fine-grained by looking
        // at the shader's bufferView's to determine the buffer dependencies.
        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        if (model.asynchronous) {
            // Create one program per frame
            if (loadResources.programsToCreate.length > 0) {
                id = loadResources.programsToCreate.dequeue();
                createProgram(id, model, context);
            }
        } else {
            // Create all loaded programs this frame
            while (loadResources.programsToCreate.length > 0) {
                id = loadResources.programsToCreate.dequeue();
                createProgram(id, model, context);
            }
        }
    }

    function getOnImageCreatedFromTypedArray(loadResources, gltfTexture) {
        return function(image) {
            loadResources.texturesToCreate.enqueue({
                id : gltfTexture.id,
                image : image,
                bufferView : undefined
            });

            --loadResources.pendingBufferViewToImage;
        };
    }

    function loadTexturesFromBufferViews(model) {
        var loadResources = model._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        while (loadResources.texturesToCreateFromBufferView.length > 0) {
            var gltfTexture = loadResources.texturesToCreateFromBufferView.dequeue();

            var gltf = model.gltf;
            var bufferView = gltf.bufferViews[gltfTexture.bufferView];

            var onload = getOnImageCreatedFromTypedArray(loadResources, gltfTexture);
            var onerror = getFailedLoadFunction(model, 'image', 'id: ' + gltfTexture.id + ', bufferView: ' + gltfTexture.bufferView);
            loadImageFromTypedArray(loadResources.getBuffer(bufferView), gltfTexture.mimeType).
                then(onload).otherwise(onerror);

            ++loadResources.pendingBufferViewToImage;
        }
    }

    function createSamplers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createSamplers) {
            loadResources.createSamplers = false;

            var rendererSamplers = model._rendererResources.samplers;
            var samplers = model.gltf.samplers;
            for (var id in samplers) {
                if (samplers.hasOwnProperty(id)) {
                    var sampler = samplers[id];

                    rendererSamplers[id] = new Sampler({
                        wrapS : sampler.wrapS,
                        wrapT : sampler.wrapT,
                        minificationFilter : sampler.minFilter,
                        magnificationFilter : sampler.magFilter
                    });
                }
            }
        }
    }

    function createTexture(gltfTexture, model, context) {
        var textures = model.gltf.textures;
        var texture = textures[gltfTexture.id];

        var rendererSamplers = model._rendererResources.samplers;
        var sampler = rendererSamplers[texture.sampler];

        var mipmap =
            (sampler.minificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST) ||
            (sampler.minificationFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR) ||
            (sampler.minificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST) ||
            (sampler.minificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR);
        var requiresNpot = mipmap ||
            (sampler.wrapS === TextureWrap.REPEAT) ||
            (sampler.wrapS === TextureWrap.MIRRORED_REPEAT) ||
            (sampler.wrapT === TextureWrap.REPEAT) ||
            (sampler.wrapT === TextureWrap.MIRRORED_REPEAT);

        var source = gltfTexture.image;
        var npot = !CesiumMath.isPowerOfTwo(source.width) || !CesiumMath.isPowerOfTwo(source.height);

        if (requiresNpot && npot) {
            // WebGL requires power-of-two texture dimensions for mipmapping and REPEAT/MIRRORED_REPEAT wrap modes.
            var canvas = document.createElement('canvas');
            canvas.width = CesiumMath.nextPowerOfTwo(source.width);
            canvas.height = CesiumMath.nextPowerOfTwo(source.height);
            var canvasContext = canvas.getContext('2d');
            canvasContext.drawImage(source, 0, 0, source.width, source.height, 0, 0, canvas.width, canvas.height);
            source = canvas;
        }

        var tx;

        if (texture.target === WebGLConstants.TEXTURE_2D) {
            tx = new Texture({
                context : context,
                source : source,
                pixelFormat : texture.internalFormat,
                pixelDatatype : texture.type,
                sampler : sampler,
                flipY : false
            });
        }
        // GLTF_SPEC: Support TEXTURE_CUBE_MAP.  https://github.com/KhronosGroup/glTF/issues/40

        if (mipmap) {
            tx.generateMipmap();
        }

        model._rendererResources.textures[gltfTexture.id] = tx;
    }

    function createTextures(model, context) {
        var loadResources = model._loadResources;
        var gltfTexture;

        if (model.asynchronous) {
            // Create one texture per frame
            if (loadResources.texturesToCreate.length > 0) {
                gltfTexture = loadResources.texturesToCreate.dequeue();
                createTexture(gltfTexture, model, context);
            }
        } else {
            // Create all loaded textures this frame
            while (loadResources.texturesToCreate.length > 0) {
                gltfTexture = loadResources.texturesToCreate.dequeue();
                createTexture(gltfTexture, model, context);
            }
        }
    }

    function getAttributeLocations(model, primitive) {
        var gltf = model.gltf;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        // Retrieve the compiled shader program to assign index values to attributes
        var attributeLocations = {};

        var technique = techniques[materials[primitive.material].technique];
        var parameters = technique.parameters;
        var attributes = technique.attributes;
        var programAttributeLocations = model._rendererResources.programs[technique.program].vertexAttributes;

        // Note: WebGL shader compiler may have optimized and removed some attributes from programAttributeLocations
        for (var location in programAttributeLocations){
            if (programAttributeLocations.hasOwnProperty(location)) {
                var attribute = attributes[location];
                var index = programAttributeLocations[location].index;
                if (defined(attribute)) {
                    var parameter = parameters[attribute];
                    attributeLocations[parameter.semantic] = index;
                } else {
                    // Pre-created attributes
                    attributeLocations[location] = index;
                }
            }
        }

        return attributeLocations;
    }

    function searchForest(forest, jointName, nodes) {
        var length = forest.length;
        for (var i = 0; i < length; ++i) {
            var stack = [forest[i]]; // Push root node of tree

            while (stack.length > 0) {
                var id = stack.pop();
                var n = nodes[id];

                if (n.jointName === jointName) {
                    return id;
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    stack.push(children[k]);
                }
            }
        }

        // This should never happen; the skeleton should have a node for all joints in the skin.
        return undefined;
    }

    function createJoints(model, runtimeSkins) {
        var gltf = model.gltf;
        var skins = gltf.skins;
        var nodes = gltf.nodes;
        var runtimeNodes = model._runtime.nodes;

        var skinnedNodesIds = model._loadResources.skinnedNodesIds;
        var length = skinnedNodesIds.length;
        for (var j = 0; j < length; ++j) {
            var id = skinnedNodesIds[j];
            var skinnedNode = runtimeNodes[id];
            var node = nodes[id];

            var runtimeSkin = runtimeSkins[node.skin];
            skinnedNode.inverseBindMatrices = runtimeSkin.inverseBindMatrices;
            skinnedNode.bindShapeMatrix = runtimeSkin.bindShapeMatrix;

            // 1. Find nodes with the names in node.skeletons (the node's skeletons)
            // 2. These nodes form the root nodes of the forest to search for each joint in skin.jointNames.  This search uses jointName, not the node's name.
            // 3. Search for the joint name among the gltf node hierarchy instead of the runtime node hierarchy. Child links aren't set up yet for runtime nodes.
            var forest = [];
            var gltfSkeletons = node.skeletons;
            var skeletonsLength = gltfSkeletons.length;
            for (var k = 0; k < skeletonsLength; ++k) {
                forest.push(gltfSkeletons[k]);
            }

            var gltfJointNames = skins[node.skin].jointNames;
            var jointNamesLength = gltfJointNames.length;
            for (var i = 0; i < jointNamesLength; ++i) {
                var jointName = gltfJointNames[i];
                var jointNode = runtimeNodes[searchForest(forest, jointName, nodes)];
                skinnedNode.joints.push(jointNode);
            }
        }
    }

    function createSkins(model) {
        var loadResources = model._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        if (!loadResources.createSkins) {
            return;
        }
        loadResources.createSkins = false;

        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var skins = gltf.skins;
        var runtimeSkins = {};

        for (var id in skins) {
            if (skins.hasOwnProperty(id)) {
                var skin = skins[id];
                var accessor = accessors[skin.inverseBindMatrices];

                var bindShapeMatrix;
                if (!Matrix4.equals(skin.bindShapeMatrix, Matrix4.IDENTITY)) {
                    bindShapeMatrix = Matrix4.clone(skin.bindShapeMatrix);
                }

                runtimeSkins[id] = {
                    inverseBindMatrices : ModelAnimationCache.getSkinInverseBindMatrices(model, accessor),
                    bindShapeMatrix : bindShapeMatrix // not used when undefined
                };
            }
        }

        createJoints(model, runtimeSkins);
    }

    function getChannelEvaluator(model, runtimeNode, targetPath, spline) {
        return function(localAnimationTime) {
            //  Workaround for https://github.com/KhronosGroup/glTF/issues/219

            //if (targetPath === 'translation') {
            //    return;
            //}
            runtimeNode[targetPath] = spline.evaluate(localAnimationTime, runtimeNode[targetPath]);
            runtimeNode.dirtyNumber = model._maxDirtyNumber;
        };
    }

    function createRuntimeAnimations(model) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedPendingBufferLoads()) {
            return;
        }

        if (!loadResources.createRuntimeAnimations) {
            return;
        }
        loadResources.createRuntimeAnimations = false;

        model._runtime.animations = {
        };

        var runtimeNodes = model._runtime.nodes;
        var animations = model.gltf.animations;
        var accessors = model.gltf.accessors;

         for (var animationId in animations) {
             if (animations.hasOwnProperty(animationId)) {
                 var animation = animations[animationId];
                 var channels = animation.channels;
                 var parameters = animation.parameters;
                 var samplers = animation.samplers;

                 var parameterValues = {};

                 for (var name in parameters) {
                     if (parameters.hasOwnProperty(name)) {
                         parameterValues[name] = ModelAnimationCache.getAnimationParameterValues(model, accessors[parameters[name]]);
                     }
                 }

                 // Find start and stop time for the entire animation
                 var startTime = Number.MAX_VALUE;
                 var stopTime = -Number.MAX_VALUE;

                 var length = channels.length;
                 var channelEvaluators = new Array(length);

                 for (var i = 0; i < length; ++i) {
                     var channel = channels[i];
                     var target = channel.target;
                     var sampler = samplers[channel.sampler];
                     var times = parameterValues[sampler.input];

                     startTime = Math.min(startTime, times[0]);
                     stopTime = Math.max(stopTime, times[times.length - 1]);

                     var spline = ModelAnimationCache.getAnimationSpline(model, animationId, animation, channel.sampler, sampler, parameterValues);
                     // GLTF_SPEC: Support more targets like materials. https://github.com/KhronosGroup/glTF/issues/142
                     channelEvaluators[i] = getChannelEvaluator(model, runtimeNodes[target.id], target.path, spline);
                 }

                 model._runtime.animations[animationId] = {
                     startTime : startTime,
                     stopTime : stopTime,
                     channelEvaluators : channelEvaluators
                 };
             }
         }
    }

    function createVertexArrays(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedBuffersCreation() || !loadResources.finishedProgramCreation()) {
            return;
        }

        if (!loadResources.createVertexArrays) {
            return;
        }
        loadResources.createVertexArrays = false;

        var rendererBuffers = model._rendererResources.buffers;
        var rendererVertexArrays = model._rendererResources.vertexArrays;
        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var meshes = gltf.meshes;

        for (var meshId in meshes) {
            if (meshes.hasOwnProperty(meshId)) {
                var primitives = meshes[meshId].primitives;
                var primitivesLength = primitives.length;

                for (var i = 0; i < primitivesLength; ++i) {
                    var primitive = primitives[i];

                    // GLTF_SPEC: This does not take into account attribute arrays,
                    // indicated by when an attribute points to a parameter with a
                    // count property.
                    //
                    // https://github.com/KhronosGroup/glTF/issues/258

                    var attributeLocations = getAttributeLocations(model, primitive);
                    var attributeName;
                    var attributeLocation;
                    var attribute;
                    var attributes = [];
                    var primitiveAttributes = primitive.attributes;
                    for (attributeName in primitiveAttributes) {
                        if (primitiveAttributes.hasOwnProperty(attributeName)) {
                            attributeLocation = attributeLocations[attributeName];
                            // Skip if the attribute is not used by the material, e.g., because the asset was exported
                            // with an attribute that wasn't used and the asset wasn't optimized.
                            if (defined(attributeLocation)) {
                                var a = accessors[primitiveAttributes[attributeName]];
                                attributes.push({
                                    index                  : attributeLocation,
                                    vertexBuffer           : rendererBuffers[a.bufferView],
                                    componentsPerAttribute : getModelAccessor(a).componentsPerAttribute,
                                    componentDatatype      : a.componentType,
                                    normalize              : false,
                                    offsetInBytes          : a.byteOffset,
                                    strideInBytes          : a.byteStride
                                });
                            }
                        }
                    }

                    // Add pre-created attributes
                    var precreatedAttributes = model._precreatedAttributes;
                    if (defined(precreatedAttributes)) {
                        for (attributeName in precreatedAttributes) {
                            if (precreatedAttributes.hasOwnProperty(attributeName)) {
                                attributeLocation = attributeLocations[attributeName];
                                if (defined(attributeLocation)) {
                                    attribute = precreatedAttributes[attributeName];
                                    attribute.index = attributeLocation;
                                    attributes.push(attribute);
                                }
                            }
                        }
                    }

                    var indexBuffer;
                    if (defined(primitive.indices)) {
                        var accessor = accessors[primitive.indices];
                        indexBuffer = rendererBuffers[accessor.bufferView];
                    }
                    rendererVertexArrays[meshId + '.primitive.' + i] = new VertexArray({
                        context : context,
                        attributes : attributes,
                        indexBuffer : indexBuffer
                    });
                }
            }
        }
    }

    function getBooleanStates(states) {
        // GLTF_SPEC: SAMPLE_ALPHA_TO_COVERAGE not used by Cesium
        var booleanStates = {};
        booleanStates[WebGLConstants.BLEND] = false;
        booleanStates[WebGLConstants.CULL_FACE] = false;
        booleanStates[WebGLConstants.DEPTH_TEST] = false;
        booleanStates[WebGLConstants.POLYGON_OFFSET_FILL] = false;
        booleanStates[WebGLConstants.SCISSOR_TEST] = false;

        var enable = states.enable;
        var length = enable.length;
        var i;
        for (i = 0; i < length; ++i) {
            booleanStates[enable[i]] = true;
        }

        return booleanStates;
    }

    function createRenderStates(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createRenderStates) {
            loadResources.createRenderStates = false;
            var rendererRenderStates = model._rendererResources.renderStates;
            var techniques = model.gltf.techniques;
            for (var id in techniques) {
                if (techniques.hasOwnProperty(id)) {
                    var technique = techniques[id];
                    var states = technique.states;

                    var booleanStates = getBooleanStates(states);
                    var statesFunctions = defaultValue(states.functions, defaultValue.EMPTY_OBJECT);
                    var blendColor = defaultValue(statesFunctions.blendColor, [0.0, 0.0, 0.0, 0.0]);
                    var blendEquationSeparate = defaultValue(statesFunctions.blendEquationSeparate, [
                        WebGLConstants.FUNC_ADD,
                        WebGLConstants.FUNC_ADD]);
                    var blendFuncSeparate = defaultValue(statesFunctions.blendFuncSeparate, [
                        WebGLConstants.ONE,
                        WebGLConstants.ONE,
                        WebGLConstants.ZERO,
                        WebGLConstants.ZERO]);
                    var colorMask = defaultValue(statesFunctions.colorMask, [true, true, true, true]);
                    var depthRange = defaultValue(statesFunctions.depthRange, [0.0, 1.0]);
                    var polygonOffset = defaultValue(statesFunctions.polygonOffset, [0.0, 0.0]);
                    var scissor = defaultValue(statesFunctions.scissor, [0.0, 0.0, 0.0, 0.0]);

                    rendererRenderStates[id] = RenderState.fromCache({
                        frontFace : defined(statesFunctions.frontFace) ? statesFunctions.frontFace[0] : WebGLConstants.CCW,
                        cull : {
                            enabled : booleanStates[WebGLConstants.CULL_FACE],
                            face : defined(statesFunctions.cullFace) ? statesFunctions.cullFace[0] : WebGLConstants.BACK
                        },
                        lineWidth : defined(statesFunctions.lineWidth) ? statesFunctions.lineWidth[0] : 1.0,
                        polygonOffset : {
                            enabled : booleanStates[WebGLConstants.POLYGON_OFFSET_FILL],
                            factor : polygonOffset[0],
                            units : polygonOffset[1]
                        },
                        scissorTest : {
                            enabled : booleanStates[WebGLConstants.SCISSOR_TEST],
                            rectangle : {
                                x : scissor[0],
                                y : scissor[1],
                                width : scissor[2],
                                height : scissor[3]
                            }
                        },
                        depthRange : {
                            near : depthRange[0],
                            far : depthRange[1]
                        },
                        depthTest : {
                            enabled : booleanStates[WebGLConstants.DEPTH_TEST],
                            func : defined(statesFunctions.depthFunc) ? statesFunctions.depthFunc[0] : WebGLConstants.LESS
                        },
                        colorMask : {
                            red : colorMask[0],
                            green : colorMask[1],
                            blue : colorMask[2],
                            alpha : colorMask[3]
                        },
                        depthMask : defined(statesFunctions.depthMask) ? statesFunctions.depthMask[0] : true,
                        blending : {
                            enabled : booleanStates[WebGLConstants.BLEND],
                            color : {
                                red : blendColor[0],
                                green : blendColor[1],
                                blue : blendColor[2],
                                alpha : blendColor[3]
                            },
                            equationRgb : blendEquationSeparate[0],
                            equationAlpha : blendEquationSeparate[1],
                            functionSourceRgb : blendFuncSeparate[0],
                            functionSourceAlpha : blendFuncSeparate[1],
                            functionDestinationRgb : blendFuncSeparate[2],
                            functionDestinationAlpha : blendFuncSeparate[3]
                        }
                    });
                }
            }
        }
    }

    // This doesn't support LOCAL, which we could add if it is ever used.
    var scratchTranslationRtc = new Cartesian3();
    var gltfSemanticUniforms = {
        MODEL : function(uniformState, model) {
            return function() {
                return uniformState.model;
            };
        },
        VIEW : function(uniformState, model) {
            return function() {
                return uniformState.view;
            };
        },
        PROJECTION : function(uniformState, model) {
            return function() {
                return uniformState.projection;
            };
        },
        MODELVIEW : function(uniformState, model) {
            return function() {
                return uniformState.modelView;
            };
        },
        CESIUM_RTC_MODELVIEW : function(uniformState, model) {
            // CESIUM_RTC extension
            var mvRtc = new Matrix4();
            return function() {
                Matrix4.getTranslation(uniformState.model, scratchTranslationRtc);
                Cartesian3.add(scratchTranslationRtc, model._rtcCenter, scratchTranslationRtc);
                Matrix4.multiplyByPoint(uniformState.view, scratchTranslationRtc, scratchTranslationRtc);
                return Matrix4.setTranslation(uniformState.modelView, scratchTranslationRtc, mvRtc);
            };
        },
        MODELVIEWPROJECTION : function(uniformState, model) {
            return function() {
                return uniformState.modelViewProjection;
            };
        },
        MODELINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseModel;
            };
        },
        VIEWINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseView;
            };
        },
        PROJECTIONINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseProjection;
            };
        },
        MODELVIEWINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseModelView;
            };
        },
        MODELVIEWPROJECTIONINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseModelViewProjection;
            };
        },
        MODELINVERSETRANSPOSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseTranposeModel;
            };
        },
        MODELVIEWINVERSETRANSPOSE : function(uniformState, model) {
            return function() {
                return uniformState.normal;
            };
        },
        VIEWPORT : function(uniformState, model) {
            return function() {
                return uniformState.viewportCartesian4;
            };
        }
        // JOINTMATRIX created in createCommand()
    };

    ///////////////////////////////////////////////////////////////////////////

    function getScalarUniformFunction(value, model) {
        var that = {
            value : value,
            clone : function(source, result) {
                return source;
            },
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getVec2UniformFunction(value, model) {
        var that = {
            value : Cartesian2.fromArray(value),
            clone : Cartesian2.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getVec3UniformFunction(value, model) {
        var that = {
            value : Cartesian3.fromArray(value),
            clone : Cartesian3.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getVec4UniformFunction(value, model) {
        var that = {
            value : Cartesian4.fromArray(value),
            clone : Cartesian4.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getMat2UniformFunction(value, model) {
        var that = {
            value : Matrix2.fromColumnMajorArray(value),
            clone : Matrix2.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getMat3UniformFunction(value, model) {
        var that = {
            value : Matrix3.fromColumnMajorArray(value),
            clone : Matrix3.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getMat4UniformFunction(value, model) {
        var that = {
            value : Matrix4.fromColumnMajorArray(value),
            clone : Matrix4.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    ///////////////////////////////////////////////////////////////////////////

    function DelayLoadedTextureUniform(value, model) {
        this._value = undefined;
        this._textureId = value;
        this._model = model;
    }

    defineProperties(DelayLoadedTextureUniform.prototype, {
        value : {
            get : function() {
                // Use the default texture (1x1 white) until the model's texture is loaded
                if (!defined(this._value)) {
                    var texture = this._model._rendererResources.textures[this._textureId];
                    if (defined(texture)) {
                        this._value = texture;
                    } else {
                        return this._model._defaultTexture;
                    }
                }

                return this._value;
            },
            set : function(value) {
                this._value = value;
            }
        }
    });

    DelayLoadedTextureUniform.prototype.clone = function(source, result) {
        return source;
    };

    DelayLoadedTextureUniform.prototype.func = undefined;

    ///////////////////////////////////////////////////////////////////////////

    function getTextureUniformFunction(value, model) {
        var uniform = new DelayLoadedTextureUniform(value, model);
        // Define function here to access closure since 'this' can't be
        // used when the Renderer sets uniforms.
        uniform.func = function() {
            return uniform.value;
        };
        return uniform;
    }

    var gltfUniformFunctions = {};
    gltfUniformFunctions[WebGLConstants.FLOAT] = getScalarUniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[WebGLConstants.INT] = getScalarUniformFunction;
    gltfUniformFunctions[WebGLConstants.INT_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[WebGLConstants.INT_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[WebGLConstants.INT_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL] = getScalarUniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_MAT2] = getMat2UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_MAT3] = getMat3UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_MAT4] = getMat4UniformFunction;
    gltfUniformFunctions[WebGLConstants.SAMPLER_2D] = getTextureUniformFunction;
    // GLTF_SPEC: Support SAMPLER_CUBE. https://github.com/KhronosGroup/glTF/issues/40

    var gltfUniformsFromNode = {
        MODEL : function(uniformState, model, runtimeNode) {
            return function() {
                return runtimeNode.computedMatrix;
            };
        },
        VIEW : function(uniformState, model, runtimeNode) {
            return function() {
                return uniformState.view;
            };
        },
        PROJECTION : function(uniformState, model, runtimeNode) {
            return function() {
                return uniformState.projection;
            };
        },
        MODELVIEW : function(uniformState, model, runtimeNode) {
            var mv = new Matrix4();
            return function() {
                return Matrix4.multiplyTransformation(uniformState.view, runtimeNode.computedMatrix, mv);
            };
        },
        CESIUM_RTC_MODELVIEW : function(uniformState, model, runtimeNode) {
            // CESIUM_RTC extension
            var mvRtc = new Matrix4();
            return function() {
                Matrix4.multiplyTransformation(uniformState.view, runtimeNode.computedMatrix, mvRtc);
                return Matrix4.setTranslation(mvRtc, model._rtcCenterEye, mvRtc);
            };
        },
        MODELVIEWPROJECTION : function(uniformState, model, runtimeNode) {
            var mvp = new Matrix4();
            return function() {
                Matrix4.multiplyTransformation(uniformState.view, runtimeNode.computedMatrix, mvp);
                return Matrix4.multiply(uniformState._projection, mvp, mvp);
            };
        },
        MODELINVERSE : function(uniformState, model, runtimeNode) {
            var mInverse = new Matrix4();
            return function() {
                return Matrix4.inverse(runtimeNode.computedMatrix, mInverse);
            };
        },
        VIEWINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseView;
            };
        },
        PROJECTIONINVERSE : function(uniformState, model, runtimeNode) {
            return function() {
                return uniformState.inverseProjection;
            };
        },
        MODELVIEWINVERSE : function(uniformState, model, runtimeNode) {
            var mv = new Matrix4();
            var mvInverse = new Matrix4();
            return function() {
                Matrix4.multiplyTransformation(uniformState.view, runtimeNode.computedMatrix, mv);
                return Matrix4.inverse(mv, mvInverse);
            };
        },
        MODELVIEWPROJECTIONINVERSE : function(uniformState, model, runtimeNode) {
            var mvp = new Matrix4();
            var mvpInverse = new Matrix4();
            return function() {
                Matrix4.multiplyTransformation(uniformState.view, runtimeNode.computedMatrix, mvp);
                Matrix4.multiply(uniformState._projection, mvp, mvp);
                return Matrix4.inverse(mvp, mvpInverse);
            };
        },
        MODELINVERSETRANSPOSE : function(uniformState, model, runtimeNode) {
            var mInverse = new Matrix4();
            var mInverseTranspose = new Matrix3();
            return function() {
                Matrix4.inverse(runtimeNode.computedMatrix, mInverse);
                Matrix4.getRotation(mInverse, mInverseTranspose);
                return Matrix3.transpose(mInverseTranspose, mInverseTranspose);
            };
        },
        MODELVIEWINVERSETRANSPOSE : function(uniformState, model, runtimeNode) {
            var mv = new Matrix4();
            var mvInverse = new Matrix4();
            var mvInverseTranspose = new Matrix3();
            return function() {
                Matrix4.multiplyTransformation(uniformState.view, runtimeNode.computedMatrix, mv);
                Matrix4.inverse(mv, mvInverse);
                Matrix4.getRotation(mvInverse, mvInverseTranspose);
                return Matrix3.transpose(mvInverseTranspose, mvInverseTranspose);
            };
        },
        VIEWPORT : function(uniformState, model, runtimeNode) {
            return function() {
                return uniformState.viewportCartesian4;
            };
        }
    };

    function getUniformFunctionFromSource(source, model, semantic, uniformState) {
        var runtimeNode = model._runtime.nodes[source];
        return gltfUniformsFromNode[semantic](uniformState, model, runtimeNode);
    }

    function createUniformMaps(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedProgramCreation()) {
            return;
        }

        if (!loadResources.createUniformMaps) {
            return;
        }
        loadResources.createUniformMaps = false;

        var gltf = model.gltf;
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var uniformMaps = model._uniformMaps;

        for (var materialId in materials) {
            if (materials.hasOwnProperty(materialId)) {
                var material = materials[materialId];
                var instanceParameters = material.values;
                var technique = techniques[material.technique];
                var parameters = technique.parameters;
                var uniforms = technique.uniforms;

                var uniformMap = {};
                var uniformValues = {};
                var jointMatrixUniformName;

                // Uniform parameters
                for (var name in uniforms) {
                    if (uniforms.hasOwnProperty(name)) {
                        var parameterName = uniforms[name];
                        var parameter = parameters[parameterName];

                        // GLTF_SPEC: This does not take into account uniform arrays,
                        // indicated by parameters with a count property.
                        //
                        // https://github.com/KhronosGroup/glTF/issues/258

                        // GLTF_SPEC: In this implementation, material parameters with a
                        // semantic or targeted via a source (for animation) are not
                        // targetable for material animations.  Is this too strict?
                        //
                        // https://github.com/KhronosGroup/glTF/issues/142

                        if (defined(instanceParameters[parameterName])) {
                            // Parameter overrides by the instance technique
                            var uv = gltfUniformFunctions[parameter.type](instanceParameters[parameterName], model);
                            uniformMap[name] = uv.func;
                            uniformValues[parameterName] = uv;
                        } else if (defined(parameter.node)) {
                            uniformMap[name] = getUniformFunctionFromSource(parameter.node, model, parameter.semantic, context.uniformState);
                        } else if (defined(parameter.semantic)) {
                            if (parameter.semantic !== 'JOINTMATRIX') {
                                // Map glTF semantic to Cesium automatic uniform
                                uniformMap[name] = gltfSemanticUniforms[parameter.semantic](context.uniformState, model);
                            } else {
                                jointMatrixUniformName = name;
                            }
                        } else if (defined(parameter.value)) {
                            // Technique value that isn't overridden by a material
                            var uv2 = gltfUniformFunctions[parameter.type](parameter.value, model);
                            uniformMap[name] = uv2.func;
                            uniformValues[parameterName] = uv2;
                        }
                    }
                }

                var u = uniformMaps[materialId];
                u.uniformMap = uniformMap;                          // uniform name -> function for the renderer
                u.values = uniformValues;                           // material parameter name -> ModelMaterial for modifying the parameter at runtime
                u.jointMatrixUniformName = jointMatrixUniformName;
            }
        }
    }

    function createPickColorFunction(color) {
        return function() {
            return color;
        };
    }

    function createJointMatricesFunction(runtimeNode) {
        return function() {
            return runtimeNode.computedJointMatrices;
        };
    }

    function createCommand(model, gltfNode, runtimeNode, context) {
        var nodeCommands = model._nodeCommands;
        var pickIds = model._pickIds;
        var allowPicking = model.allowPicking;
        var runtimeMeshesByName = model._runtime.meshesByName;

        var resources = model._rendererResources;
        var rendererVertexArrays = resources.vertexArrays;
        var rendererPrograms = resources.programs;
        var rendererPickPrograms = resources.pickPrograms;
        var rendererRenderStates = resources.renderStates;
        var uniformMaps = model._uniformMaps;

        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var gltfMeshes = gltf.meshes;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        var meshes = gltfNode.meshes;
        var meshesLength = meshes.length;

        for (var j = 0; j < meshesLength; ++j) {
            var id = meshes[j];
            var mesh = gltfMeshes[id];
            var primitives = mesh.primitives;
            var length = primitives.length;

            // The glTF node hierarchy is a DAG so a node can have more than one
            // parent, so a node may already have commands.  If so, append more
            // since they will have a different model matrix.

            for (var i = 0; i < length; ++i) {
                var primitive = primitives[i];
                var ix = accessors[primitive.indices];
                var material = materials[primitive.material];
                var technique = techniques[material.technique];
                var programId = technique.program;

                var boundingSphere;
                var positionAttribute = primitive.attributes.POSITION;
                if (defined(positionAttribute)) {
                    var a = accessors[positionAttribute];
                    boundingSphere = BoundingSphere.fromCornerPoints(Cartesian3.fromArray(a.min), Cartesian3.fromArray(a.max));
                }

                var vertexArray = rendererVertexArrays[id + '.primitive.' + i];
                var offset;
                var count;
                if (defined(ix)) {
                    count = ix.count;
                    offset = (ix.byteOffset / IndexDatatype.getSizeInBytes(ix.componentType));  // glTF has offset in bytes.  Cesium has offsets in indices
                }
                else {
                    var positions = accessors[primitive.attributes.POSITION];
                    count = positions.count;
                    var accessorInfo = getModelAccessor(positions);
                    offset = (positions.byteOffset / (accessorInfo.componentsPerAttribute*ComponentDatatype.getSizeInBytes(positions.componentType)));
                }

                var um = uniformMaps[primitive.material];
                var uniformMap = um.uniformMap;
                if (defined(um.jointMatrixUniformName)) {
                    var jointUniformMap = {};
                    jointUniformMap[um.jointMatrixUniformName] = createJointMatricesFunction(runtimeNode);

                    uniformMap = combine(uniformMap, jointUniformMap);
                }

                // Allow callback to modify the uniformMap
                if (defined(model._uniformMapLoaded)) {
                    uniformMap = model._uniformMapLoaded(uniformMap, programId, runtimeNode);
                }

                var rs = rendererRenderStates[material.technique];

                // GLTF_SPEC: Offical means to determine translucency. https://github.com/KhronosGroup/glTF/issues/105
                var isTranslucent = rs.blending.enabled;
                var owner = {
                    primitive : defaultValue(model.pickPrimitive, model),
                    id : model.id,
                    node : runtimeNode.publicNode,
                    mesh : runtimeMeshesByName[mesh.name]
                };

                var command = new DrawCommand({
                    boundingVolume : new BoundingSphere(), // updated in update()
                    cull : model.cull,
                    modelMatrix : new Matrix4(),           // computed in update()
                    primitiveType : primitive.mode,
                    vertexArray : vertexArray,
                    count : count,
                    offset : offset,
                    shaderProgram : rendererPrograms[technique.program],
                    uniformMap : uniformMap,
                    renderState : rs,
                    owner : owner,
                    pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE
                });

                var pickCommand;

                if (allowPicking) {
                    var pickUniformMap;

                    // Callback to override default model picking
                    if (defined(model._pickFragmentShaderLoaded)) {
                        if (defined(model._pickUniformMapLoaded)) {
                            pickUniformMap = model._pickUniformMapLoaded(uniformMap);
                        } else {
                            // This is unlikely, but could happen if the override shader does not
                            // need new uniforms since, for example, its pick ids are coming from
                            // a vertex attribute or are baked into the shader source.
                            pickUniformMap = combine(uniformMap);
                        }
                    } else {
                        var pickId = context.createPickId(owner);
                        pickIds.push(pickId);
                        var pickUniforms = {
                            czm_pickColor : createPickColorFunction(pickId.color)
                        };
                        pickUniformMap = combine(uniformMap, pickUniforms);
                    }

                    pickCommand = new DrawCommand({
                        boundingVolume : new BoundingSphere(), // updated in update()
                        cull : model.cull,
                        modelMatrix : new Matrix4(),           // computed in update()
                        primitiveType : primitive.mode,
                        vertexArray : vertexArray,
                        count : count,
                        offset : offset,
                        shaderProgram : rendererPickPrograms[technique.program],
                        uniformMap : pickUniformMap,
                        renderState : rs,
                        owner : owner,
                        pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE
                    });
                }

                var nodeCommand = {
                    show : true,
                    boundingSphere : boundingSphere,
                    command : command,
                    pickCommand : pickCommand
                };
                runtimeNode.commands.push(nodeCommand);
                nodeCommands.push(nodeCommand);
            }
        }
    }

    function createRuntimeNodes(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedEverythingButTextureCreation()) {
            return;
        }

        if (!loadResources.createRuntimeNodes) {
            return;
        }
        loadResources.createRuntimeNodes = false;

        var rootNodes = [];
        var runtimeNodes = model._runtime.nodes;

        var gltf = model.gltf;
        var nodes = gltf.nodes;

        var scene = gltf.scenes[gltf.scene];
        var sceneNodes = scene.nodes;
        var length = sceneNodes.length;

        var stack = [];

        for (var i = 0; i < length; ++i) {
            stack.push({
                parentRuntimeNode : undefined,
                gltfNode : nodes[sceneNodes[i]],
                id : sceneNodes[i]
            });

            while (stack.length > 0) {
                var n = stack.pop();
                var parentRuntimeNode = n.parentRuntimeNode;
                var gltfNode = n.gltfNode;

                // Node hierarchy is a DAG so a node can have more than one parent so it may already exist
                var runtimeNode = runtimeNodes[n.id];
                if (runtimeNode.parents.length === 0) {
                    if (defined(gltfNode.matrix)) {
                        runtimeNode.matrix = Matrix4.fromColumnMajorArray(gltfNode.matrix);
                    } else {
                        // TRS converted to Cesium types
                        var rotation = gltfNode.rotation;
                        runtimeNode.translation = Cartesian3.fromArray(gltfNode.translation);
                        runtimeNode.rotation = Quaternion.unpack(rotation);
                        runtimeNode.scale = Cartesian3.fromArray(gltfNode.scale);
                    }
                }

                if (defined(parentRuntimeNode)) {
                    parentRuntimeNode.children.push(runtimeNode);
                    runtimeNode.parents.push(parentRuntimeNode);
                } else {
                    rootNodes.push(runtimeNode);
                }

                if (defined(gltfNode.meshes)) {
                    createCommand(model, gltfNode, runtimeNode, context);
                }

                var children = gltfNode.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    stack.push({
                        parentRuntimeNode : runtimeNode,
                        gltfNode : nodes[children[k]],
                        id : children[k]
                    });
                }
            }
        }

        model._runtime.rootNodes = rootNodes;
        model._runtime.nodes = runtimeNodes;
    }

    function createResources(model, frameState) {
        var context = frameState.context;

        if (model._loadRendererResourcesFromCache) {
            var resources = model._rendererResources;
            var cachedResources = model._cachedRendererResources;

            resources.buffers = cachedResources.buffers;
            resources.vertexArrays = cachedResources.vertexArrays;
            resources.programs = cachedResources.programs;
            resources.pickPrograms = cachedResources.pickPrograms;
            resources.textures = cachedResources.textures;
            resources.samplers = cachedResources.samplers;
            resources.renderStates = cachedResources.renderStates;

            // Vertex arrays are unique to this model, create instead of using the cache.
            if (defined(model._precreatedAttributes)) {
                createVertexArrays(model, context);
            }
        } else {
            createBuffers(model, context); // using glTF bufferViews
            createPrograms(model, context);
            createSamplers(model, context);
            loadTexturesFromBufferViews(model);
            createTextures(model, context);
        }

        createSkins(model);
        createRuntimeAnimations(model);

        if (!model._loadRendererResourcesFromCache) {
            createVertexArrays(model, context); // using glTF meshes
            createRenderStates(model, context); // using glTF materials/techniques/states

            // Long-term, we might not cache render states if they could change
            // due to an animation, e.g., a uniform going from opaque to transparent.
            // Could use copy-on-write if it is worth it.  Probably overkill.
        }

        createUniformMaps(model, context);  // using glTF materials/techniques
        createRuntimeNodes(model, context); // using glTF scene
    }

    ///////////////////////////////////////////////////////////////////////////

    function getNodeMatrix(node, result) {
        var publicNode = node.publicNode;
        var publicMatrix = publicNode.matrix;

        if (publicNode.useMatrix && defined(publicMatrix)) {
            // Public matrix overrides orginial glTF matrix and glTF animations
            Matrix4.clone(publicMatrix, result);
        } else if (defined(node.matrix)) {
            Matrix4.clone(node.matrix, result);
        } else {
            Matrix4.fromTranslationQuaternionRotationScale(node.translation, node.rotation, node.scale, result);
            // Keep matrix returned by the node in-sync if the node is targeted by an animation.  Only TRS nodes can be targeted.
            publicNode.setMatrix(result);
        }
    }

    var scratchNodeStack = [];

    function updateNodeHierarchyModelMatrix(model, modelTransformChanged, justLoaded) {
        var maxDirtyNumber = model._maxDirtyNumber;
        var allowPicking = model.allowPicking;

        var rootNodes = model._runtime.rootNodes;
        var length = rootNodes.length;

        var nodeStack = scratchNodeStack;
        var computedModelMatrix = model._computedModelMatrix;

        for (var i = 0; i < length; ++i) {
            var n = rootNodes[i];

            getNodeMatrix(n, n.transformToRoot);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n.transformToRoot;
                var commands = n.commands;

                if ((n.dirtyNumber === maxDirtyNumber) || modelTransformChanged || justLoaded) {
                    var nodeMatrix = Matrix4.multiplyTransformation(computedModelMatrix, transformToRoot, n.computedMatrix);
                    var commandsLength = commands.length;
                    if (commandsLength > 0) {
                        // Node has meshes, which has primitives.  Update their commands.
                        for (var j = 0 ; j < commandsLength; ++j) {
                            var primitiveCommand = commands[j];
                            var command = primitiveCommand.command;
                            Matrix4.clone(nodeMatrix, command.modelMatrix);

                            // PERFORMANCE_IDEA: Can use transformWithoutScale if no node up to the root has scale (including animation)
                            BoundingSphere.transform(primitiveCommand.boundingSphere, command.modelMatrix, command.boundingVolume);

                            if (defined(model._rtcCenter)) {
                                Cartesian3.add(model._rtcCenter, command.boundingVolume.center, command.boundingVolume.center);
                            }

                            if (allowPicking) {
                                var pickCommand = primitiveCommand.pickCommand;
                                Matrix4.clone(command.modelMatrix, pickCommand.modelMatrix);
                                BoundingSphere.clone(command.boundingVolume, pickCommand.boundingVolume);
                            }
                        }
                    }
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var child = children[k];

                    // A node's transform needs to be updated if
                    // - It was targeted for animation this frame, or
                    // - Any of its ancestors were targeted for animation this frame

                    // PERFORMANCE_IDEA: if a child has multiple parents and only one of the parents
                    // is dirty, all the subtrees for each child instance will be dirty; we probably
                    // won't see this in the wild often.
                    child.dirtyNumber = Math.max(child.dirtyNumber, n.dirtyNumber);

                    if ((child.dirtyNumber === maxDirtyNumber) || justLoaded) {
                        // Don't check for modelTransformChanged since if only the model's model matrix changed,
                        // we do not need to rebuild the local transform-to-root, only the final
                        // [model's-model-matrix][transform-to-root] above.
                        getNodeMatrix(child, child.transformToRoot);
                        Matrix4.multiplyTransformation(transformToRoot, child.transformToRoot, child.transformToRoot);
                    }

                    nodeStack.push(child);
                }
            }
        }

        ++model._maxDirtyNumber;
    }

    var scratchObjectSpace = new Matrix4();

    function applySkins(model) {
        var skinnedNodes = model._runtime.skinnedNodes;
        var length = skinnedNodes.length;

        for (var i = 0; i < length; ++i) {
            var node = skinnedNodes[i];

            scratchObjectSpace = Matrix4.inverseTransformation(node.transformToRoot, scratchObjectSpace);

            var computedJointMatrices = node.computedJointMatrices;
            var joints = node.joints;
            var bindShapeMatrix = node.bindShapeMatrix;
            var inverseBindMatrices = node.inverseBindMatrices;
            var inverseBindMatricesLength = inverseBindMatrices.length;

            for (var m = 0; m < inverseBindMatricesLength; ++m) {
                // [joint-matrix] = [node-to-root^-1][joint-to-root][inverse-bind][bind-shape]
                if (!defined(computedJointMatrices[m])) {
                    computedJointMatrices[m] = new Matrix4();
                }
                computedJointMatrices[m] = Matrix4.multiplyTransformation(scratchObjectSpace, joints[m].transformToRoot, computedJointMatrices[m]);
                computedJointMatrices[m] = Matrix4.multiplyTransformation(computedJointMatrices[m], inverseBindMatrices[m], computedJointMatrices[m]);
                if (defined(bindShapeMatrix)) {
                    // Optimization for when bind shape matrix is the identity.
                    computedJointMatrices[m] = Matrix4.multiplyTransformation(computedJointMatrices[m], bindShapeMatrix, computedJointMatrices[m]);
                }
            }
        }
    }


    function updatePerNodeShow(model) {
        // Totally not worth it, but we could optimize this:
        // http://blogs.agi.com/insight3d/index.php/2008/02/13/deletion-in-bounding-volume-hierarchies/

        var rootNodes = model._runtime.rootNodes;
        var length = rootNodes.length;

        var nodeStack = scratchNodeStack;

        for (var i = 0; i < length; ++i) {
            var n = rootNodes[i];
            n.computedShow = n.publicNode.show;
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var show = n.computedShow;

                var nodeCommands = n.commands;
                var nodeCommandsLength = nodeCommands.length;
                for (var j = 0 ; j < nodeCommandsLength; ++j) {
                    nodeCommands[j].show = show;
                }
                // if commandsLength is zero, the node has a light or camera

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var child = children[k];
                    // Parent needs to be shown for child to be shown.
                    child.computedShow = show && child.publicNode.show;
                    nodeStack.push(child);
                }
            }
        }
    }

    function updatePickIds(model, context) {
        var id = model.id;
        if (model._id !== id) {
            model._id = id;

            var pickIds = model._pickIds;
            var length = pickIds.length;
            for (var i = 0; i < length; ++i) {
                pickIds[i].object.id = id;
            }
        }
    }

    function updateWireframe(model) {
        if (model._debugWireframe !== model.debugWireframe) {
            model._debugWireframe = model.debugWireframe;

            // This assumes the original primitive was TRIANGLES and that the triangles
            // are connected for the wireframe to look perfect.
            var primitiveType = model.debugWireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES;
            var nodeCommands = model._nodeCommands;
            var length = nodeCommands.length;

            for (var i = 0; i < length; ++i) {
                nodeCommands[i].command.primitiveType = primitiveType;
            }
        }
    }

    function updateShowBoundingVolume(model) {
        if (model.debugShowBoundingVolume !== model._debugShowBoundingVolume) {
            model._debugShowBoundingVolume = model.debugShowBoundingVolume;

            var debugShowBoundingVolume = model.debugShowBoundingVolume;
            var nodeCommands = model._nodeCommands;
            var length = nodeCommands.length;

            for (var i = 0; i < length; i++) {
                nodeCommands[i].command.debugShowBoundingVolume = debugShowBoundingVolume;
            }
        }
    }

    var scratchBoundingSphere = new BoundingSphere();

    function scaleInPixels(positionWC, radius, frameState) {
        scratchBoundingSphere.center = positionWC;
        scratchBoundingSphere.radius = radius;
        return frameState.camera.getPixelSize(scratchBoundingSphere, frameState.context.drawingBufferWidth, frameState.context.drawingBufferHeight);
    }

    var scratchPosition = new Cartesian3();

    function getScale(model, frameState) {
        var scale = model.scale;

        if (model.minimumPixelSize !== 0.0) {
            // Compute size of bounding sphere in pixels
            var context = frameState.context;
            var maxPixelSize = Math.max(context.drawingBufferWidth, context.drawingBufferHeight);
            var m = model.modelMatrix;
            scratchPosition.x = m[12];
            scratchPosition.y = m[13];
            scratchPosition.z = m[14];

            if (defined(model._rtcCenter)) {
                Cartesian3.add(model._rtcCenter, scratchPosition, scratchPosition);
            }

            var radius = model.boundingSphere.radius;
            var metersPerPixel = scaleInPixels(scratchPosition, radius, frameState);

            // metersPerPixel is always > 0.0
            var pixelsPerMeter = 1.0 / metersPerPixel;
            var diameterInPixels = Math.min(pixelsPerMeter * (2.0 * radius), maxPixelSize);

            // Maintain model's minimum pixel size
            if (diameterInPixels < model.minimumPixelSize) {
                scale = (model.minimumPixelSize * metersPerPixel) / (2.0 * model._initialRadius);
            }
        }

        return defined(model.maximumScale) ? Math.min(model.maximumScale, scale) : scale;
    }

    function releaseCachedGltf(model) {
        if (defined(model._cacheKey) && defined(model._cachedGltf) && (--model._cachedGltf.count === 0)) {
            delete gltfCache[model._cacheKey];
        }
        model._cachedGltf = undefined;
    }

    function checkSupportedExtensions(model) {
        var extensionsUsed = model.gltf.extensionsUsed;
        if (defined(extensionsUsed)) {
            var extensionsUsedCount = extensionsUsed.length;
            for (var index=0;index<extensionsUsedCount;++index) {
                var extension = extensionsUsed[index];

                if (extension !== 'CESIUM_RTC' && extension !== 'KHR_binary_glTF' &&
                    extension !== 'KHR_materials_common') {
                    throw new RuntimeError('Unsupported glTF Extension: ' + extension);
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    function CachedRendererResources(context, cacheKey) {
        this.buffers = undefined;
        this.vertexArrays = undefined;
        this.programs = undefined;
        this.pickPrograms = undefined;
        this.textures = undefined;
        this.samplers = undefined;
        this.renderStates = undefined;
        this.ready = false;

        this.context = context;
        this.cacheKey = cacheKey;
        this.count = 0;
    }

    function destroy(property) {
        for (var name in property) {
            if (property.hasOwnProperty(name)) {
                property[name].destroy();
            }
        }
    }

    function destroyCachedRendererResources(resources) {
        destroy(resources.buffers);
        destroy(resources.vertexArrays);
        destroy(resources.programs);
        destroy(resources.pickPrograms);
        destroy(resources.textures);
    }

    CachedRendererResources.prototype.release = function() {
        if (--this.count === 0) {
            if (defined(this.cacheKey)) {
                // Remove if this was cached
                delete this.context.cache.modelRendererResourceCache[this.cacheKey];
            }
            destroyCachedRendererResources(this);
            return destroyObject(this);
        }

        return undefined;
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {RuntimeError} Failed to load external reference.
     */
    Model.prototype.update = function(frameState) {
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        var context = frameState.context;
        this._defaultTexture = context.defaultTexture;

        if ((this._state === ModelState.NEEDS_LOAD) && defined(this.gltf)) {
            // Use renderer resources from cache instead of loading/creating them?
            var cachedRendererResources;
            var cacheKey = this.cacheKey;
            if (defined(cacheKey)) {
                context.cache.modelRendererResourceCache = defaultValue(context.cache.modelRendererResourceCache, {});
                var modelCaches = context.cache.modelRendererResourceCache;

                cachedRendererResources = modelCaches[this.cacheKey];
                if (defined(cachedRendererResources)) {
                    if (!cachedRendererResources.ready) {
                        // Cached resources for the model are not loaded yet.  We'll
                        // try again every frame until they are.
                        return;
                    }

                    ++cachedRendererResources.count;
                    this._loadRendererResourcesFromCache = true;
                } else {
                    cachedRendererResources = new CachedRendererResources(context, cacheKey);
                    cachedRendererResources.count = 1;
                    modelCaches[this.cacheKey] = cachedRendererResources;
                }
                this._cachedRendererResources = cachedRendererResources;
            } else {
                cachedRendererResources = new CachedRendererResources(context);
                cachedRendererResources.count = 1;
                this._cachedRendererResources = cachedRendererResources;
            }

            this._state = ModelState.LOADING;

            this._boundingSphere = computeBoundingSphere(this.gltf);
            this._initialRadius = this._boundingSphere.radius;

            checkSupportedExtensions(this);
            if (this._state !== ModelState.FAILED) {
                var extensions = this.gltf.extensions;
                if (defined(extensions) && defined(extensions.CESIUM_RTC)) {
                    this._rtcCenter = Cartesian3.fromArray(extensions.CESIUM_RTC.center);
                    this._rtcCenterEye = new Cartesian3();
                }

                this._loadResources = new LoadResources();
                parse(this);
            }
        }

        var loadResources = this._loadResources;
        var incrementallyLoadTextures = this._incrementallyLoadTextures;
        var justLoaded = false;

        if (this._state === ModelState.LOADING) {
            // Create WebGL resources as buffers/shaders/textures are downloaded
            createResources(this, frameState);

            // Transition from LOADING -> LOADED once resources are downloaded and created.
            // Textures may continue to stream in while in the LOADED state.
            if (loadResources.finished() ||
                    (incrementallyLoadTextures && loadResources.finishedEverythingButTextureCreation())) {
                this._state = ModelState.LOADED;
                justLoaded = true;
            }
        }

        // Incrementally stream textures.
        if (defined(loadResources) && (this._state === ModelState.LOADED)) {
            // Also check justLoaded so we don't process twice during the transition frame
            if (incrementallyLoadTextures && !justLoaded) {
                createResources(this, frameState);
            }

            if (loadResources.finished()) {
                this._loadResources = undefined;  // Clear CPU memory since WebGL resources were created.

                var resources = this._rendererResources;
                var cachedResources = this._cachedRendererResources;

                cachedResources.buffers = resources.buffers;
                cachedResources.vertexArrays = resources.vertexArrays;
                cachedResources.programs = resources.programs;
                cachedResources.pickPrograms = resources.pickPrograms;
                cachedResources.textures = resources.textures;
                cachedResources.samplers = resources.samplers;
                cachedResources.renderStates = resources.renderStates;
                cachedResources.ready = true;

                // Vertex arrays are unique to this model, do not store in cache.
                if (defined(this._precreatedAttributes)) {
                    cachedResources.vertexArrays = {};
                }

                if (this.releaseGltfJson) {
                    releaseCachedGltf(this);
                }
            }
        }

        var show = this.show && (this.scale !== 0.0);

        if ((show && this._state === ModelState.LOADED) || justLoaded) {
            var animated = this.activeAnimations.update(frameState) || this._cesiumAnimationsDirty;
            this._cesiumAnimationsDirty = false;
            this._dirty = false;

            // Model's model matrix needs to be updated
            var modelTransformChanged = !Matrix4.equals(this._modelMatrix, this.modelMatrix) ||
                (this._scale !== this.scale) ||
                (this._minimumPixelSize !== this.minimumPixelSize) || (this.minimumPixelSize !== 0.0) || // Minimum pixel size changed or is enabled
                (this._maximumScale !== this.maximumScale);

            if (modelTransformChanged || justLoaded) {
                Matrix4.clone(this.modelMatrix, this._modelMatrix);
                this._scale = this.scale;
                this._minimumPixelSize = this.minimumPixelSize;
                this._maximumScale = this.maximumScale;

                var scale = getScale(this, frameState);
                var computedModelMatrix = this._computedModelMatrix;
                Matrix4.multiplyByUniformScale(this.modelMatrix, scale, computedModelMatrix);
                Matrix4.multiplyTransformation(computedModelMatrix, yUpToZUp, computedModelMatrix);
            }

            // Update modelMatrix throughout the graph as needed
            if (animated || modelTransformChanged || justLoaded) {
                updateNodeHierarchyModelMatrix(this, modelTransformChanged, justLoaded);
                this._dirty = true;

                if (animated || justLoaded) {
                    // Apply skins if animation changed any node transforms
                    applySkins(this);
                }
            }

            if (this._perNodeShowDirty) {
                this._perNodeShowDirty = false;
                updatePerNodeShow(this);
            }
            updatePickIds(this, context);
            updateWireframe(this);
            updateShowBoundingVolume(this);
        }

        if (justLoaded) {
            // Called after modelMatrix update.
            var model = this;
            frameState.afterRender.push(function() {
                model._ready = true;
                model._readyPromise.resolve(model);
            });
            return;
        }

        // We don't check show at the top of the function since we
        // want to be able to progressively load models when they are not shown,
        // and then have them visible immediately when show is set to true.
        if (show && !this._ignoreCommands) {
            // PERFORMANCE_IDEA: This is terrible
            var commandList = frameState.commandList;
            var passes = frameState.passes;
            var nodeCommands = this._nodeCommands;
            var length = nodeCommands.length;
            var i;
            var nc;

            if (passes.render) {
                for (i = 0; i < length; ++i) {
                    nc = nodeCommands[i];
                    if (nc.show) {
                        commandList.push(nc.command);
                    }
                }
            }

            if (passes.pick && this.allowPicking) {
                for (i = 0; i < length; ++i) {
                    nc = nodeCommands[i];
                    if (nc.show) {
                        commandList.push(nc.pickCommand);
                    }
                }
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Model#destroy
     */
    Model.prototype.isDestroyed = function() {
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
     * model = model && model.destroy();
     * 
     * @see Model#isDestroyed
     */
    Model.prototype.destroy = function() {
        // Vertex arrays are unique to this model, destroy here.
        if (defined(this._precreatedAttributes)) {
            destroy(this._rendererResources.vertexArrays);
        }

        this._rendererResources = undefined;
        this._cachedRendererResources = this._cachedRendererResources && this._cachedRendererResources.release();

        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        releaseCachedGltf(this);

        return destroyObject(this);
    };

    return Model;
});
