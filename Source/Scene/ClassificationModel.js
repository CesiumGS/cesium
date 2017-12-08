define([
        '../Core/arraySlice',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayCondition',
        '../Core/FeatureDetection',
        '../Core/getBaseUri',
        '../Core/IndexDatatype',
        '../Core/joinUrls',
        '../Core/loadArrayBuffer',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/Quaternion',
        '../Core/Queue',
        '../Core/RuntimeError',
        '../Core/Transforms',
        '../Core/WebGLConstants',
        '../Renderer/ShaderSource',
        '../ThirdParty/GltfPipeline/ForEach',
        '../ThirdParty/GltfPipeline/getAccessorByteStride',
        '../ThirdParty/GltfPipeline/numberOfComponentsForType',
        '../ThirdParty/GltfPipeline/parseBinaryGltf',
        '../ThirdParty/when',
        './AttributeType',
        './Axis',
        './ClassificationType',
        './getAttributeOrUniformBySemantic',
        './HeightReference',
        './ModelMaterial',
        './ModelMesh',
        './ModelNode',
        './SceneMode',
        './Vector3DTileBatch',
        './Vector3DTilePrimitive'
    ], function(
        arraySlice,
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Color,
        combine,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DistanceDisplayCondition,
        FeatureDetection,
        getBaseUri,
        IndexDatatype,
        joinUrls,
        loadArrayBuffer,
        Matrix2,
        Matrix3,
        Matrix4,
        PrimitiveType,
        Quaternion,
        Queue,
        RuntimeError,
        Transforms,
        WebGLConstants,
        ShaderSource,
        ForEach,
        getAccessorByteStride,
        numberOfComponentsForType,
        parseBinaryGltf,
        when,
        AttributeType,
        Axis,
        ClassificationType,
        getAttributeOrUniformBySemantic,
        HeightReference,
        ModelMaterial,
        ModelMesh,
        ModelNode,
        SceneMode,
        Vector3DTileBatch,
        Vector3DTilePrimitive) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    var boundingSphereCartesian3Scratch = new Cartesian3();

    var ModelState = {
        NEEDS_LOAD : 0,
        LOADING : 1,
        LOADED : 2,  // Renderable, but textures can still be pending when incrementallyLoadTextures is true.
        FAILED : 3
    };

    function LoadResources() {
        this.vertexBuffersToCreate = new Queue();
        this.indexBuffersToCreate = new Queue();
        this.buffers = {};
        this.pendingBufferLoads = 0;

        this.programsToCreate = new Queue();
        this.pendingShaderLoads = 0;

        this.createVertexArrays = true;
        this.createUniformMaps = true;
        this.createRuntimeNodes = true;
    }

    LoadResources.prototype.getBuffer = function(bufferView) {
        return getSubarray(this.buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
    };

    LoadResources.prototype.finishedPendingBufferLoads = function() {
        return (this.pendingBufferLoads === 0);
    };

    LoadResources.prototype.finishedBuffersCreation = function() {
        return ((this.pendingBufferLoads === 0) &&
                (this.vertexBuffersToCreate.length === 0) &&
                (this.indexBuffersToCreate.length === 0));
    };

    LoadResources.prototype.finishedProgramCreation = function() {
        return ((this.pendingShaderLoads === 0) && (this.programsToCreate.length === 0));
    };

    LoadResources.prototype.finishedEverythingButTextureCreation = function() {
        var finishedPendingLoads =
            (this.pendingBufferLoads === 0) &&
            (this.pendingShaderLoads === 0);
        var finishedResourceCreation =
            (this.vertexBuffersToCreate.length === 0) &&
            (this.indexBuffersToCreate.length === 0) &&
            (this.programsToCreate.length === 0);

        return finishedPendingLoads && finishedResourceCreation;
    };

    LoadResources.prototype.finished = function() {
        return this.finishedEverythingButTextureCreation();
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * A 3D model for classifying other 3D assets based on glTF, the runtime asset format for WebGL, OpenGL ES, and OpenGL.
     *
     * @alias ClassificationModel
     * @constructor
     *
     * @private
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Object|ArrayBuffer|Uint8Array} options.gltf The object for the glTF JSON or an arraybuffer of Binary glTF defined by the KHR_binary_glTF extension.
     * @param {String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
     * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
     * @param {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this model will be displayed.
     * @param {ClassificationType} [options.classificationType] What this model will classify.
     *
     * @exception {DeveloperError} bgltf is not a valid Binary glTF file.
     * @exception {DeveloperError} Only glTF Binary version 1 is supported.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Models.html|Cesium Sandcastle Models Demo}
     */
    function ClassificationModel(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var gltf = options.gltf;
        if (gltf instanceof ArrayBuffer) {
            gltf = new Uint8Array(gltf);
        }

        if (gltf instanceof Uint8Array) {
            // Binary glTF
             gltf = parseBinaryGltf(gltf);
        } // else Normal glTF (JSON)

        this._gltf = gltf;

        this._basePath = defaultValue(options.basePath, '');
        var baseUri = getBaseUri(document.location.href);
        this._baseUri = joinUrls(baseUri, this._basePath);

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

        this._ready = false;
        this._readyPromise = when.defer();

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

        this._distanceDisplayCondition = options.distanceDisplayCondition;
        this._classificationType = options.classificationType;

        // Undocumented options
        this._vertexShaderLoaded = options.vertexShaderLoaded;
        this._classificationShaderLoaded = options.classificationShaderLoaded;
        this._uniformMapLoaded = options.uniformMapLoaded;
        this._pickVertexShaderLoaded = options.pickVertexShaderLoaded;
        this._pickFragmentShaderLoaded = options.pickFragmentShaderLoaded;
        this._pickUniformMapLoaded = options.pickUniformMapLoaded;
        this._ignoreCommands = defaultValue(options.ignoreCommands, false);
        this._upAxis = defaultValue(options.upAxis, Axis.Y);
        this._batchTable = options.batchTable;

        /**
         * @private
         * @readonly
         */
        this.cull = defaultValue(options.cull, true);

        this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and axis
        this._initialRadius = undefined;           // Radius without model's scale property, model-matrix scale, animations, or skins
        this._boundingSphere = undefined;
        this._scaledBoundingSphere = new BoundingSphere();
        this._state = ModelState.NEEDS_LOAD;
        this._loadResources = undefined;

        this._mode = undefined;

        this._perNodeShowDirty = false;            // true when the Cesium API was used to change a node's show property
        this._dirty = false;                       // true when the model was transformed this frame
        this._maxDirtyNumber = 0;                  // Used in place of a dirty boolean flag to avoid an extra graph traversal

        this._runtimeNode = {
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
            commands : []                      // empty for transform, light, and camera nodes
        };

        this._uniformMaps = {};           // Not cached since it can be targeted by glTF animation
        this._extensionsUsed = undefined;     // Cached used glTF extensions
        this._extensionsRequired = undefined; // Cached required glTF extensions
        this._quantizedUniforms = {};     // Quantized uniforms for each program for WEB3D_quantized_attributes
        this._programPrimitives = {};
        this._rendererResources = {       // Cached between models with the same url/cache-key
            buffers : {},
            vertexArrays : {},
            programs : {},
            pickPrograms : {}
        };
        this._updatedGltfVersion = false;

        this._geometryByteLength = 0;
        this._trianglesLength = 0;

        this._nodeCommands = [];

        // CESIUM_RTC extension
        this._rtcCenter = undefined;    // reference to either 3D or 2D
        this._rtcCenterEye = undefined; // in eye coordinates
        this._rtcCenter3D = undefined;  // in world coordinates
        this._rtcCenter2D = undefined;  // in projected world coordinates
    }

    defineProperties(ClassificationModel.prototype, {
        /**
         * The object for the glTF JSON, including properties with default values omitted
         * from the JSON provided to this model.
         *
         * @memberof ClassificationModel.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @default undefined
         */
        gltf : {
            get : function() {
                return this._gltf;
            }
        },

        /**
         * The base path that paths in the glTF JSON are relative to.  The base
         * path is the same path as the path containing the .gltf file
         * minus the .gltf file, when binary, image, and shader files are
         * in the same directory as the .gltf.  When this is <code>''</code>,
         * the app's base path is used.
         *
         * @memberof ClassificationModel.prototype
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
         * account glTF animations and skins nor does it take into account {@link ClassificationModel#minimumPixelSize}.
         *
         * @memberof ClassificationModel.prototype
         *
         * @type {BoundingSphere}
         * @readonly
         *
         * @default undefined
         *
         * @exception {DeveloperError} The model is not loaded.  Use ClassificationModel.readyPromise or wait for ClassificationModel.ready to be true.
         *
         * @example
         * // Center in WGS84 coordinates
         * var center = Cesium.Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cesium.Cartesian3());
         */
        boundingSphere : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (this._state !== ModelState.LOADED) {
                    throw new DeveloperError('The model is not loaded.  Use ClassificationModel.readyPromise or wait for ClassificationModel.ready to be true.');
                }
                //>>includeEnd('debug');

                var modelMatrix = this.modelMatrix;
                var nonUniformScale = Matrix4.getScale(modelMatrix, boundingSphereCartesian3Scratch);

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
         * <code>true</code> right before {@link ClassificationModel#readyPromise} is resolved.
         *
         * @memberof ClassificationModel.prototype
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
         * @memberof ClassificationModel.prototype
         * @type {Promise.<ClassificationModel>}
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
         * @see ClassificationModel#ready
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * Returns true if the model was transformed this frame
         *
         * @memberof ClassificationModel.prototype
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
        },

        /**
         * Gets or sets the condition specifying at what distance from the camera that this model will be displayed.
         * @memberof ClassificationModel.prototype
         * @type {DistanceDisplayCondition}
         * @default undefined
         */
        distanceDisplayCondition : {
            get : function() {
                return this._distanceDisplayCondition;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value.far <= value.near) {
                    throw new DeveloperError('far must be greater than near');
                }
                //>>includeEnd('debug');
                this._distanceDisplayCondition = DistanceDisplayCondition.clone(value, this._distanceDisplayCondition);
            }
        },

        extensionsUsed : {
            get : function() {
                if (!defined(this._extensionsUsed)) {
                    this._extensionsUsed = getUsedExtensions(this);
                }
                return this._extensionsUsed;
            }
        },

        extensionsRequired : {
            get : function() {
                if (!defined(this._extensionsRequired)) {
                    this._extensionsRequired = getRequiredExtensions(this);
                }
                return this._extensionsRequired;
            }
        },

        /**
         * Gets the model's up-axis.
         * By default models are y-up according to the glTF spec, however geo-referenced models will typically be z-up.
         *
         * @memberof ClassificationModel.prototype
         *
         * @type {Number}
         * @default Axis.Y
         * @readonly
         *
         * @private
         */
        upAxis : {
            get : function() {
                return this._upAxis;
            }
        },

        /**
         * Gets the model's triangle count.
         *
         * @private
         */
        trianglesLength : {
            get : function() {
                return this._trianglesLength;
            }
        },

        /**
         * Gets the model's geometry memory in bytes. This includes all vertex and index buffers.
         *
         * @private
         */
        geometryByteLength : {
            get : function() {
                return this._geometryByteLength;
            }
        },

        /**
         * Gets the model's texture memory in bytes.
         *
         * @private
         */
        texturesByteLength : {
            get : function() {
                return this._texturesByteLength;
            }
        },

        /**
         * Gets the model's classification type.
         * @memberof ClassificationModel.prototype
         * @type {ClassificationType}
         */
        classificationType : {
            get : function() {
                return this._classificationType;
            }
        }
    });

    /**
     * This function differs from the normal subarray function
     * because it takes offset and length, rather than begin and end.
     */
    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    var aMinScratch = new Cartesian3();
    var aMaxScratch = new Cartesian3();

    function getAccessorMinMax(gltf, accessorId) {
        var accessor = gltf.accessors[accessorId];
        var extensions = accessor.extensions;
        var accessorMin = accessor.min;
        var accessorMax = accessor.max;
        // If this accessor is quantized, we should use the decoded min and max
        if (defined(extensions)) {
            var quantizedAttributes = extensions.WEB3D_quantized_attributes;
            if (defined(quantizedAttributes)) {
                accessorMin = quantizedAttributes.decodedMin;
                accessorMax = quantizedAttributes.decodedMax;
            }
        }
        return {
            min : accessorMin,
            max : accessorMax
        };
    }

    function computeBoundingSphere(model) {
        var gltf = model.gltf;
        var gltfNodes = gltf.nodes;
        var gltfMeshes = gltf.meshes;
        var rootNodes = gltf.scenes[gltf.scene].nodes;
        var rootNodesLength = rootNodes.length;

        var nodeStack = [];

        var min = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var max = new Cartesian3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

        for (var i = 0; i < rootNodesLength; ++i) {
            var n = gltfNodes[rootNodes[i]];
            n._transformToRoot = getTransform(n);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n._transformToRoot;

                var meshId = n.mesh;
                if (defined(meshId)) {
                    var mesh = gltfMeshes[meshId];
                    var primitives = mesh.primitives;
                    var primitivesLength = primitives.length;
                    for (var m = 0; m < primitivesLength; ++m) {
                        var positionAccessor = primitives[m].attributes.POSITION;
                        if (defined(positionAccessor)) {
                            var minMax = getAccessorMinMax(gltf, positionAccessor);
                            var aMin = Cartesian3.fromArray(minMax.min, 0, aMinScratch);
                            var aMax = Cartesian3.fromArray(minMax.max, 0, aMaxScratch);
                            if (defined(min) && defined(max)) {
                                Matrix4.multiplyByPoint(transformToRoot, aMin, aMin);
                                Matrix4.multiplyByPoint(transformToRoot, aMax, aMax);
                                Cartesian3.minimumByComponent(min, aMin, min);
                                Cartesian3.maximumByComponent(max, aMax, max);
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
        if (model._upAxis === Axis.Y) {
            BoundingSphere.transformWithoutScale(boundingSphere, Axis.Y_UP_TO_Z_UP, boundingSphere);
        } else if (model._upAxis === Axis.X) {
            BoundingSphere.transformWithoutScale(boundingSphere, Axis.X_UP_TO_Z_UP, boundingSphere);
        }
        return boundingSphere;
    }

    ///////////////////////////////////////////////////////////////////////////

    function getFailedLoadFunction(model, type, path) {
        return function() {
            model._state = ModelState.FAILED;
            model._readyPromise.reject(new RuntimeError('Failed to load ' + type + ': ' + path));
        };
    }

    function addBuffersToLoadResources(model) {
        var gltf = model.gltf;
        var loadResources = model._loadResources;
        ForEach.buffer(gltf, function(buffer, id) {
            loadResources.buffers[id] = buffer.extras._pipeline.source;
        });
    }

    function bufferLoad(model, id) {
        return function(arrayBuffer) {
            var loadResources = model._loadResources;
            var buffer = new Uint8Array(arrayBuffer);
            --loadResources.pendingBufferLoads;
            model.gltf.buffers[id].extras._pipeline.source = buffer;
        };
    }

    function parseBuffers(model) {
        var loadResources = model._loadResources;
        // Iterate this way for compatibility with objects and arrays
        var buffers = model.gltf.buffers;
        for (var id in buffers) {
            if (buffers.hasOwnProperty(id)) {
                var buffer = buffers[id];
                buffer.extras = defaultValue(buffer.extras, {});
                buffer.extras._pipeline = defaultValue(buffer.extras._pipeline, {});
                if (defined(buffer.extras._pipeline.source)) {
                    loadResources.buffers[id] = buffer.extras._pipeline.source;
                } else {
                    var bufferPath = joinUrls(model._baseUri, buffer.uri);
                    ++loadResources.pendingBufferLoads;
                    loadArrayBuffer(bufferPath).then(bufferLoad(model, id)).otherwise(getFailedLoadFunction(model, 'buffer', bufferPath));
                }
            }
        }
    }

    function parseBufferViews(model) {
        var bufferViews = model.gltf.bufferViews;

        var vertexBuffersToCreate = model._loadResources.vertexBuffersToCreate;

        // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
        ForEach.bufferView(model.gltf, function(bufferView, id) {
            if (bufferView.target === WebGLConstants.ARRAY_BUFFER) {
                vertexBuffersToCreate.enqueue(id);
            }
        });

        var indexBuffersToCreate = model._loadResources.indexBuffersToCreate;
        var indexBufferIds = {};

        // The Cesium Renderer requires knowing the datatype for an index buffer
        // at creation type, which is not part of the glTF bufferview so loop
        // through glTF accessors to create the bufferview's index buffer.
        ForEach.accessor(model.gltf, function(accessor) {
            var bufferViewId = accessor.bufferView;
            var bufferView = bufferViews[bufferViewId];

            if ((bufferView.target === WebGLConstants.ELEMENT_ARRAY_BUFFER) && !defined(indexBufferIds[bufferViewId])) {
                indexBufferIds[bufferViewId] = true;
                indexBuffersToCreate.enqueue({
                    id : bufferViewId,
                    componentType : accessor.componentType
                });
            }
        });
    }

    function parsePrograms(model) {
        ForEach.program(model.gltf, function(program, id) {
            model._loadResources.programsToCreate.enqueue(id);
        });
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
            Cartesian3.fromArray(node.scale, 0, nodeScaleScratch));
    }

    function parseMaterials(model) {
        var uniformMaps = model._uniformMaps;
        ForEach.material(model.gltf, function(material, id) {
            // Allocated now so ModelMaterial can keep a reference to it.
            uniformMaps[id] = {
                uniformMap : undefined,
                values : undefined
            };
        });
    }

    function parseMeshes(model) {
        if (!defined(model.extensionsUsed.WEB3D_quantized_attributes)) {
            return;
        }
        ForEach.mesh(model.gltf, function(mesh, id) {
            // Cache primitives according to their program
            var primitives = mesh.primitives;
            var primitivesLength = primitives.length;
            for (var i = 0; i < primitivesLength; i++) {
                var primitive = primitives[i];
                var programId = getProgramForPrimitive(model, primitive);
                var programPrimitives = model._programPrimitives[programId];
                if (!defined(programPrimitives)) {
                    programPrimitives = [];
                    model._programPrimitives[programId] = programPrimitives;
                }
                programPrimitives.push(primitive);
            }
        });
    }

    function getUsedExtensions(model) {
        var extensionsUsed = model.gltf.extensionsUsed;
        var cachedExtensionsUsed = {};

        if (defined(extensionsUsed)) {
            var extensionsUsedLength = extensionsUsed.length;
            for (var i = 0; i < extensionsUsedLength; i++) {
                var extension = extensionsUsed[i];
                cachedExtensionsUsed[extension] = true;
            }
        }
        return cachedExtensionsUsed;
    }

    function getRequiredExtensions(model) {
        var extensionsRequired = model.gltf.extensionsRequired;
        var cachedExtensionsRequired = {};

        if (defined(extensionsRequired)) {
            var extensionsRequiredLength = extensionsRequired.length;
            for (var i = 0; i < extensionsRequiredLength; i++) {
                var extension = extensionsRequired[i];
                cachedExtensionsRequired[extension] = true;
            }
        }

        return cachedExtensionsRequired;
    }

    function createVertexBuffer(bufferViewId, model) {
        var loadResources = model._loadResources;
        var bufferViews = model.gltf.bufferViews;
        var bufferView = bufferViews[bufferViewId];
        var vertexBuffer = loadResources.getBuffer(bufferView);
        model._rendererResources.buffers[bufferViewId] = vertexBuffer;
        model._geometryByteLength += vertexBuffer.byteLength;
    }

    function createIndexBuffer(bufferViewId, componentType, model) {
        var loadResources = model._loadResources;
        var bufferViews = model.gltf.bufferViews;
        var bufferView = bufferViews[bufferViewId];
        var indexBuffer = {
            typedArray : loadResources.getBuffer(bufferView),
            indexDatatype : componentType
        };
        model._rendererResources.buffers[bufferViewId] = indexBuffer;
        model._geometryByteLength += indexBuffer.typedArray.byteLength;
    }

    function createBuffers(model) {
        var loadResources = model._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        var vertexBuffersToCreate = loadResources.vertexBuffersToCreate;
        var indexBuffersToCreate = loadResources.indexBuffersToCreate;

        while (vertexBuffersToCreate.length > 0) {
            createVertexBuffer(vertexBuffersToCreate.dequeue(), model);
        }

        while (indexBuffersToCreate.length > 0) {
            var i = indexBuffersToCreate.dequeue();
            createIndexBuffer(i.id, i.componentType, model);
        }
    }

    function replaceAllButFirstInString(string, find, replace) {
        var index = string.indexOf(find);
        return string.replace(new RegExp(find, 'g'), function(match, offset, all) {
            return index === offset ? match : replace;
        });
    }

    function getProgramForPrimitive(model, primitive) {
        var gltf = model.gltf;
        var materialId = primitive.material;
        var material = gltf.materials[materialId];
        var techniqueId = material.technique;
        var technique = gltf.techniques[techniqueId];
        return technique.program;
    }

    function getQuantizedAttributes(model, accessorId) {
        var gltf = model.gltf;
        var accessor = gltf.accessors[accessorId];
        var extensions = accessor.extensions;
        if (defined(extensions)) {
            return extensions.WEB3D_quantized_attributes;
        }
        return undefined;
    }

    function getAttributeVariableName(model, primitive, attributeSemantic) {
        var gltf = model.gltf;
        var materialId = primitive.material;
        var material = gltf.materials[materialId];
        var techniqueId = material.technique;
        var technique = gltf.techniques[techniqueId];
        for (var parameter in technique.parameters) {
            if (technique.parameters.hasOwnProperty(parameter)) {
                var semantic = technique.parameters[parameter].semantic;
                if (semantic === attributeSemantic) {
                    var attributes = technique.attributes;
                    for (var attributeVarName in attributes) {
                        if (attributes.hasOwnProperty(attributeVarName)) {
                            var name = attributes[attributeVarName];
                            if (name === parameter) {
                                return attributeVarName;
                            }
                        }
                    }
                }
            }
        }
        return undefined;
    }

    function modifyShaderForQuantizedAttributes(shader, programName, model) {
        var quantizedUniforms = {};
        model._quantizedUniforms[programName] = quantizedUniforms;

        var primitives = model._programPrimitives[programName];
        for (var i = 0; i < primitives.length; i++) {
            var primitive = primitives[i];
            if (getProgramForPrimitive(model, primitive) === programName) {
                for (var attributeSemantic in primitive.attributes) {
                    if (primitive.attributes.hasOwnProperty(attributeSemantic)) {
                        var attributeVarName = getAttributeVariableName(model, primitive, attributeSemantic);
                        var accessorId = primitive.attributes[attributeSemantic];

                        if (attributeSemantic.charAt(0) === '_') {
                            attributeSemantic = attributeSemantic.substring(1);
                        }
                        var decodeUniformVarName = 'gltf_u_dec_' + attributeSemantic.toLowerCase();

                        var decodeUniformVarNameScale = decodeUniformVarName + '_scale';
                        var decodeUniformVarNameTranslate = decodeUniformVarName + '_translate';
                        if (!defined(quantizedUniforms[decodeUniformVarName]) && !defined(quantizedUniforms[decodeUniformVarNameScale])) {
                            var quantizedAttributes = getQuantizedAttributes(model, accessorId);
                            if (defined(quantizedAttributes)) {
                                var decodeMatrix = quantizedAttributes.decodeMatrix;
                                var newMain = 'gltf_decoded_' + attributeSemantic;
                                var decodedAttributeVarName = attributeVarName.replace('a_', 'gltf_a_dec_');
                                var size = Math.floor(Math.sqrt(decodeMatrix.length));

                                // replace usages of the original attribute with the decoded version, but not the declaration
                                shader = replaceAllButFirstInString(shader, attributeVarName, decodedAttributeVarName);
                                // declare decoded attribute
                                var variableType;
                                if (size > 2) {
                                    variableType = 'vec' + (size - 1);
                                } else {
                                    variableType = 'float';
                                }
                                shader = variableType + ' ' + decodedAttributeVarName + ';\n' + shader;
                                // splice decode function into the shader - attributes are pre-multiplied with the decode matrix
                                // uniform in the shader (32-bit floating point)
                                var decode = '';
                                if (size === 5) {
                                    // separate scale and translate since glsl doesn't have mat5
                                    shader = 'uniform mat4 ' + decodeUniformVarNameScale + ';\n' + shader;
                                    shader = 'uniform vec4 ' + decodeUniformVarNameTranslate + ';\n' + shader;
                                    decode = '\n' +
                                             'void main() {\n' +
                                             '    ' + decodedAttributeVarName + ' = ' + decodeUniformVarNameScale + ' * ' + attributeVarName + ' + ' + decodeUniformVarNameTranslate + ';\n' +
                                             '    ' + newMain + '();\n' +
                                             '}\n';

                                    quantizedUniforms[decodeUniformVarNameScale] = {mat : 4};
                                    quantizedUniforms[decodeUniformVarNameTranslate] = {vec : 4};
                                }
                                else {
                                    shader = 'uniform mat' + size + ' ' + decodeUniformVarName + ';\n' + shader;
                                    decode = '\n' +
                                             'void main() {\n' +
                                             '    ' + decodedAttributeVarName + ' = ' + variableType + '(' + decodeUniformVarName + ' * vec' + size + '(' + attributeVarName + ',1.0));\n' +
                                             '    ' + newMain + '();\n' +
                                             '}\n';

                                    quantizedUniforms[decodeUniformVarName] = {mat : size};
                                }
                                shader = ShaderSource.replaceMain(shader, newMain);
                                shader += decode;
                            }
                        }
                    }
                }
            }
        }
        // This is not needed after the program is processed, free the memory
        model._programPrimitives[programName] = undefined;
        return shader;
    }

    function modifyShader(shader, callback) {
        if (defined(callback)) {
            shader = callback(shader);
        }
        return shader;
    }

    function createProgram(id, model) {
        var positionName = getAttributeOrUniformBySemantic(model.gltf, 'POSITION');
        var batchIdName = getAttributeOrUniformBySemantic(model.gltf, '_BATCHID');

        var attributeLocations = {};
        attributeLocations[positionName] = 0;
        attributeLocations[batchIdName] = 1;

        var modelViewProjectionName = getAttributeOrUniformBySemantic(model.gltf, 'MODELVIEWPROJECTION');

        var uniformDecl;
        var computePosition;

        if (!defined(modelViewProjectionName)) {
            var projectionName = getAttributeOrUniformBySemantic(model.gltf, 'PROJECTION');
            var modelViewName = getAttributeOrUniformBySemantic(model.gltf, 'MODELVIEW');
            if (!defined(modelViewName)) {
                modelViewName = getAttributeOrUniformBySemantic(model.gltf, 'CESIUM_RTC_MODELVIEW');
            }

            uniformDecl =
                'uniform mat4 ' + modelViewName + ';\n' +
                'uniform mat4 ' + projectionName + ';\n';
            computePosition = '    gl_Position = ' + projectionName + ' * ' + modelViewName + ' * ' + positionName + ';\n';
        } else {
            uniformDecl = 'uniform mat4 ' + modelViewProjectionName + ';\n';
            computePosition = '    gl_Position = ' + modelViewProjectionName + ' * ' + positionName + ';\n';
        }

        var vs =
            'attribute vec4 ' + positionName + ';\n' +
            'attribute float ' + batchIdName + ';\n' +
            uniformDecl +
            'void main() {\n' +
            computePosition +
            '    gl_Position = czm_depthClampFarPlane(gl_Position);\n' +
            '}\n';
        var fs =
            '#ifdef GL_EXT_frag_depth\n' +
            '#extension GL_EXT_frag_depth : enable\n' +
            '#endif\n' +
            'void main() \n' +
            '{ \n' +
            '    gl_FragColor = vec4(1.0); \n' +
            '    czm_writeDepthClampedToFarPlane();\n' +
            '}\n';

        if (model.extensionsUsed.WEB3D_quantized_attributes) {
            vs = modifyShaderForQuantizedAttributes(vs, id, model);
        }

        var drawVS = modifyShader(vs, model._vertexShaderLoaded);
        var drawFS = modifyShader(fs, model._classificationShaderLoaded);

        model._rendererResources.programs[id] = {
            vertexShaderSource : drawVS,
            fragmentShaderSource : drawFS,
            attributeLocations : attributeLocations
        };

        // PERFORMANCE_IDEA: Can optimize this shader with a glTF hint. https://github.com/KhronosGroup/glTF/issues/181
        var pickVS = modifyShader(vs, model._pickVertexShaderLoaded);
        var pickFS = modifyShader(fs, model._pickFragmentShaderLoaded);

        model._rendererResources.pickPrograms[id] = {
            vertexShaderSource : pickVS,
            fragmentShaderSource : pickFS,
            attributeLocations : attributeLocations
        };
    }

    function createPrograms(model) {
        var loadResources = model._loadResources;
        var programsToCreate = loadResources.programsToCreate;

        if (loadResources.pendingShaderLoads !== 0) {
            return;
        }

        // PERFORMANCE_IDEA: this could be more fine-grained by looking
        // at the shader's bufferView's to determine the buffer dependencies.
        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        // Create all loaded programs this frame
        while (programsToCreate.length > 0) {
            createProgram(programsToCreate.dequeue(), model);
        }
    }

    function getAttributeLocations() {
        return {
            POSITION : 0,
            _BATCHID : 1
        };
    }

    function createVertexArrays(model) {
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

                    var attributeLocations = getAttributeLocations();
                    var attributeName;
                    var attributeLocation;
                    var attributes = {};
                    var primitiveAttributes = primitive.attributes;
                    for (attributeName in primitiveAttributes) {
                        if (primitiveAttributes.hasOwnProperty(attributeName)) {
                            attributeLocation = attributeLocations[attributeName];
                            // Skip if the attribute is not used by the material, e.g., because the asset was exported
                            // with an attribute that wasn't used and the asset wasn't optimized.
                            if (defined(attributeLocation)) {
                                var a = accessors[primitiveAttributes[attributeName]];
                                attributes[attributeName] = {
                                    index : attributeLocation,
                                    vertexBuffer : rendererBuffers[a.bufferView],
                                    componentsPerAttribute : numberOfComponentsForType(a.type),
                                    componentDatatype : a.componentType,
                                    offsetInBytes : a.byteOffset,
                                    strideInBytes : getAccessorByteStride(gltf, a)
                                };
                            }
                        }
                    }

                    var indexBuffer;
                    if (defined(primitive.indices)) {
                        var accessor = accessors[primitive.indices];
                        indexBuffer = rendererBuffers[accessor.bufferView];
                    }
                    rendererVertexArrays[meshId + '.primitive.' + i] = {
                        attributes : attributes,
                        indexBuffer : indexBuffer
                    };
                }
            }
        }
    }

    // This doesn't support LOCAL, which we could add if it is ever used.
    var scratchTranslationRtc = new Cartesian3();
    var gltfSemanticUniforms = {
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
                if (defined(model._rtcCenter)) {
                    Matrix4.getTranslation(uniformState.model, scratchTranslationRtc);
                    Cartesian3.add(scratchTranslationRtc, model._rtcCenter, scratchTranslationRtc);
                    Matrix4.multiplyByPoint(uniformState.view, scratchTranslationRtc, scratchTranslationRtc);
                    return Matrix4.setTranslation(uniformState.modelView, scratchTranslationRtc, mvRtc);
                }
                return uniformState.modelView;
            };
        },
        MODELVIEWPROJECTION : function(uniformState, model) {
            return function() {
                return uniformState.modelViewProjection;
            };
        }
    };


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
                var technique = techniques[material.technique];
                var parameters = technique.parameters;
                var uniforms = technique.uniforms;

                var uniformMap = {};
                var uniformValues = {};

                // Uniform parameters
                for (var name in uniforms) {
                    if (uniforms.hasOwnProperty(name) && name !== 'extras') {
                        var parameterName = uniforms[name];
                        var parameter = parameters[parameterName];

                        if (!defined(parameter.semantic) || !defined(gltfSemanticUniforms[parameter.semantic])) {
                            continue;
                        }
                        uniformMap[name] = gltfSemanticUniforms[parameter.semantic](context.uniformState, model);
                    }
                }

                var u = uniformMaps[materialId];
                u.uniformMap = uniformMap;                          // uniform name -> function for the renderer
                u.values = uniformValues;                           // material parameter name -> ModelMaterial for modifying the parameter at runtime
            }
        }
    }

    function scaleFromMatrix5Array(matrix) {
        return [matrix[0], matrix[1], matrix[2], matrix[3],
                matrix[5], matrix[6], matrix[7], matrix[8],
                matrix[10], matrix[11], matrix[12], matrix[13],
                matrix[15], matrix[16], matrix[17], matrix[18]];
    }

    function translateFromMatrix5Array(matrix) {
        return [matrix[20], matrix[21], matrix[22], matrix[23]];
    }

    function createUniformsForQuantizedAttributes(model, primitive, context) {
        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var programId = getProgramForPrimitive(model, primitive);
        var quantizedUniforms = model._quantizedUniforms[programId];
        var setUniforms = {};
        var uniformMap = {};

        for (var attribute in primitive.attributes) {
            if (primitive.attributes.hasOwnProperty(attribute)) {
                var accessorId = primitive.attributes[attribute];
                var a = accessors[accessorId];
                var extensions = a.extensions;

                if (attribute.charAt(0) === '_') {
                    attribute = attribute.substring(1);
                }

                if (defined(extensions)) {
                    var quantizedAttributes = extensions.WEB3D_quantized_attributes;
                    if (defined(quantizedAttributes)) {
                        var decodeMatrix = quantizedAttributes.decodeMatrix;
                        var uniformVariable = 'gltf_u_dec_' + attribute.toLowerCase();

                        switch (a.type) {
                            case AttributeType.SCALAR:
                                uniformMap[uniformVariable] = getMat2UniformFunction(decodeMatrix, model).func;
                                setUniforms[uniformVariable] = true;
                                break;
                            case AttributeType.VEC2:
                                uniformMap[uniformVariable] = getMat3UniformFunction(decodeMatrix, model).func;
                                setUniforms[uniformVariable] = true;
                                break;
                            case AttributeType.VEC3:
                                uniformMap[uniformVariable] = getMat4UniformFunction(decodeMatrix, model).func;
                                setUniforms[uniformVariable] = true;
                                break;
                            case AttributeType.VEC4:
                                // VEC4 attributes are split into scale and translate because there is no mat5 in GLSL
                                var uniformVariableScale = uniformVariable + '_scale';
                                var uniformVariableTranslate = uniformVariable + '_translate';
                                uniformMap[uniformVariableScale] = getMat4UniformFunction(scaleFromMatrix5Array(decodeMatrix), model).func;
                                uniformMap[uniformVariableTranslate] = getVec4UniformFunction(translateFromMatrix5Array(decodeMatrix), model).func;
                                setUniforms[uniformVariableScale] = true;
                                setUniforms[uniformVariableTranslate] = true;
                                break;
                        }
                    }
                }
            }
        }

        // If there are any unset quantized uniforms in this program, they should be set to the identity
        for (var quantizedUniform in quantizedUniforms) {
            if (quantizedUniforms.hasOwnProperty(quantizedUniform)) {
                if (!setUniforms[quantizedUniform]) {
                    var properties = quantizedUniforms[quantizedUniform];
                    if (defined(properties.mat)) {
                        if (properties.mat === 2) {
                            uniformMap[quantizedUniform] = getMat2UniformFunction(Matrix2.IDENTITY, model).func;
                        } else if (properties.mat === 3) {
                            uniformMap[quantizedUniform] = getMat3UniformFunction(Matrix3.IDENTITY, model).func;
                        } else if (properties.mat === 4) {
                            uniformMap[quantizedUniform] = getMat4UniformFunction(Matrix4.IDENTITY, model).func;
                        }
                    }
                    if (defined(properties.vec)) {
                        if (properties.vec === 4) {
                            uniformMap[quantizedUniform] = getVec4UniformFunction([0, 0, 0, 0], model).func;
                        }
                    }
                }
            }
        }
        return uniformMap;
    }

    function triangleCountFromPrimitiveIndices(primitive, indicesCount) {
        switch (primitive.mode) {
            case PrimitiveType.TRIANGLES:
                return (indicesCount / 3);
            case PrimitiveType.TRIANGLE_STRIP:
            case PrimitiveType.TRIANGLE_FAN:
                return Math.max(indicesCount - 2, 0);
            default:
                return 0;
        }
    }

    function createCommand(model, gltfNode, runtimeNode, context) {
        var batchTable = model._batchTable;

        var nodeCommands = model._nodeCommands;

        var resources = model._rendererResources;
        var rendererVertexArrays = resources.vertexArrays;
        var rendererPrograms = resources.programs;
        var rendererPickPrograms = resources.pickPrograms;
        var uniformMaps = model._uniformMaps;

        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var gltfMeshes = gltf.meshes;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        var id = gltfNode.mesh;
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
            var positionAccessor = primitive.attributes.POSITION;
            if (defined(positionAccessor)) {
                var minMax = getAccessorMinMax(gltf, positionAccessor);
                boundingSphere = BoundingSphere.fromCornerPoints(Cartesian3.fromArray(minMax.min), Cartesian3.fromArray(minMax.max));
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
                offset = 0;
            }

            // Update model triangle count using number of indices
            model._trianglesLength += triangleCountFromPrimitiveIndices(primitive, count);

            var uniformMap = uniformMaps[primitive.material].uniformMap;

            // Allow callback to modify the uniformMap
            if (defined(model._uniformMapLoaded)) {
                uniformMap = model._uniformMapLoaded(uniformMap, programId, runtimeNode);
            }

            // Add uniforms for decoding quantized attributes if used
            if (model.extensionsUsed.WEB3D_quantized_attributes) {
                var quantizedUniformMap = createUniformsForQuantizedAttributes(model, primitive, context);
                uniformMap = combine(uniformMap, quantizedUniformMap);
            }

            var buffer = vertexArray.attributes.POSITION.vertexBuffer;
            var positionsBuffer = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);

            buffer = vertexArray.attributes._BATCHID.vertexBuffer;
            var vertexBatchIds = new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Uint16Array.BYTES_PER_ELEMENT);

            buffer = vertexArray.indexBuffer.typedArray;
            var indices;
            if (vertexArray.indexBuffer.indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
                indices = new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Uint16Array.BYTES_PER_ELEMENT);
            } else {
                indices = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Uint32Array.BYTES_PER_ELEMENT);
            }

            positionsBuffer = arraySlice(positionsBuffer);
            vertexBatchIds = arraySlice(vertexBatchIds);
            indices = arraySlice(indices, offset, offset + count);

            var batchIds = [];
            var indexCounts = [];
            var indexOffsets = [];
            var batchedIndices = [];

            var currentId = vertexBatchIds[indices[0]];
            batchIds.push(currentId);
            indexOffsets.push(0);

            var batchId;
            var indexOffset;
            var indexCount;
            var indicesLength = indices.length;
            for (var j = 1; j < indicesLength; ++j) {
                batchId = vertexBatchIds[indices[j]];
                if (batchId !== currentId) {
                    indexOffset = indexOffsets[indexOffsets.length - 1];
                    indexCount = j - indexOffset;

                    batchIds.push(batchId);
                    indexCounts.push(indexCount);
                    indexOffsets.push(j);

                    batchedIndices.push(new Vector3DTileBatch({
                        offset : indexOffset,
                        count : indexCount,
                        batchIds : [currentId],
                        color : Color.WHITE
                    }));

                    currentId = batchId;
                }
            }

            batchId = vertexBatchIds[indices[indicesLength - 1]];
            indexOffset = indexOffsets[indexOffsets.length - 1];
            indexCount = indicesLength - indexOffset;

            indexCounts.push(indexCount);
            batchedIndices.push(new Vector3DTileBatch({
                offset : indexOffset,
                count : indexCount,
                batchIds : [currentId],
                color : Color.WHITE
            }));

            var shader = rendererPrograms[technique.program];
            var vertexShaderSource = shader.vertexShaderSource;
            var fragmentShaderSource = shader.fragmentShaderSource;
            var attributeLocations = shader.attributeLocations;

            var pickUniformMap;
            var pickShader = rendererPickPrograms[technique.program];
            var pickVertexShaderSource = pickShader.vertexShaderSource;
            var pickFragmentShaderSource = pickShader.fragmentShaderSource;

            if (defined(model._pickUniformMapLoaded)) {
                pickUniformMap = model._pickUniformMapLoaded(uniformMap);
            } else {
                // This is unlikely, but could happen if the override shader does not
                // need new uniforms since, for example, its pick ids are coming from
                // a vertex attribute or are baked into the shader source.
                pickUniformMap = combine(uniformMap);
            }

            var nodeCommand = new Vector3DTilePrimitive({
                classificationType : model._classificationType,
                positions : positionsBuffer,
                indices : indices,
                indexOffsets : indexOffsets,
                indexCounts : indexCounts,
                batchIds : batchIds,
                vertexBatchIds : vertexBatchIds,
                batchedIndices : batchedIndices,
                batchTable : batchTable,
                boundingVolume : new BoundingSphere(), // updated in update()
                _vertexShaderSource : vertexShaderSource,
                _fragmentShaderSource : fragmentShaderSource,
                _attributeLocations : attributeLocations,
                _pickVertexShaderSource : pickVertexShaderSource,
                _pickFragmentShaderSource : pickFragmentShaderSource,
                _uniformMap : uniformMap,
                _pickUniformMap : pickUniformMap,
                _modelMatrix : new Matrix4(), // updated in update()
                _boundingSphere : boundingSphere // used to update boundingVolume
            });
            runtimeNode.commands.push(nodeCommand);
            nodeCommands.push(nodeCommand);
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

        var gltf = model.gltf;
        var nodes = gltf.nodes;
        if (nodes.length > 1) {
            throw new RuntimeError('Only one node is supported when using a batched 3D tileset for classification.');
        }

        var gltfNode = nodes[0];
        var runtimeNode = model._runtimeNode;
        if (defined(gltfNode.matrix)) {
            runtimeNode.matrix = Matrix4.fromColumnMajorArray(gltfNode.matrix);
        } else {
            // TRS converted to Cesium types
            var rotation = gltfNode.rotation;
            runtimeNode.translation = Cartesian3.fromArray(gltfNode.translation);
            runtimeNode.rotation = Quaternion.unpack(rotation);
            runtimeNode.scale = Cartesian3.fromArray(gltfNode.scale);
        }

        if (!defined(gltfNode.mesh)) {
            throw new RuntimeError('The only node in the glTF does not have a mesh.');
        }

        createCommand(model, gltfNode, runtimeNode, context);
    }

    function createResources(model, frameState) {
        var context = frameState.context;

        checkSupportedGlExtensions(model, context);
        createBuffers(model); // using glTF bufferViews
        createPrograms(model);
        createVertexArrays(model); // using glTF meshes
        createUniformMaps(model, context);  // using glTF materials/techniques
        createRuntimeNodes(model, context); // using glTF scene
    }

    ///////////////////////////////////////////////////////////////////////////

    var scratchComputedTranslation = new Cartesian4();
    var scratchComputedMatrixIn2D = new Matrix4();

    function updateNodeHierarchyModelMatrix(model, modelTransformChanged, justLoaded, projection) {
        var maxDirtyNumber = model._maxDirtyNumber;

        var computedModelMatrix = model._computedModelMatrix;

        if ((model._mode !== SceneMode.SCENE3D) && !model._ignoreCommands) {
            var translation = Matrix4.getColumn(computedModelMatrix, 3, scratchComputedTranslation);
            if (!Cartesian4.equals(translation, Cartesian4.UNIT_W)) {
                computedModelMatrix = Transforms.basisTo2D(projection, computedModelMatrix, scratchComputedMatrixIn2D);
                model._rtcCenter = model._rtcCenter3D;
            } else {
                var center = model.boundingSphere.center;
                var to2D = Transforms.wgs84To2DModelMatrix(projection, center, scratchComputedMatrixIn2D);
                computedModelMatrix = Matrix4.multiply(to2D, computedModelMatrix, scratchComputedMatrixIn2D);

                if (defined(model._rtcCenter)) {
                    Matrix4.setTranslation(computedModelMatrix, Cartesian4.UNIT_W, computedModelMatrix);
                    model._rtcCenter = model._rtcCenter2D;
                }
            }
        }

        var n = model._runtimeNode;
        var transformToRoot = n.transformToRoot;
        var commands = n.commands;

        if (defined(n.matrix)) {
            Matrix4.clone(n.matrix, transformToRoot);
        } else {
            Matrix4.fromTranslationQuaternionRotationScale(n.translation, n.rotation, n.scale, transformToRoot);
        }

        if ((n.dirtyNumber === maxDirtyNumber) || modelTransformChanged || justLoaded) {
            var nodeMatrix = Matrix4.multiplyTransformation(computedModelMatrix, transformToRoot, n.computedMatrix);
            var commandsLength = commands.length;
            if (commandsLength > 0) {
                // Node has meshes, which has primitives.  Update their commands.
                for (var j = 0; j < commandsLength; ++j) {
                    var primitiveCommand = commands[j];
                    Matrix4.clone(nodeMatrix, primitiveCommand._modelMatrix);

                    // PERFORMANCE_IDEA: Can use transformWithoutScale if no node up to the root has scale (including animation)
                    BoundingSphere.transform(primitiveCommand._boundingSphere, primitiveCommand._modelMatrix, primitiveCommand._boundingVolume);

                    if (defined(model._rtcCenter)) {
                        Cartesian3.add(model._rtcCenter, primitiveCommand._boundingVolume.center, primitiveCommand._boundingVolume.center);
                    }
                }
            }
        }

        ++model._maxDirtyNumber;
    }

    function checkSupportedExtensions(model) {
        var extensionsRequired = model.extensionsRequired;
        for (var extension in extensionsRequired) {
            if (extensionsRequired.hasOwnProperty(extension)) {
                if (extension !== 'CESIUM_RTC' &&
                    extension !== 'KHR_technique_webgl' &&
                    extension !== 'KHR_binary_glTF' &&
                    extension !== 'KHR_materials_common' &&
                    extension !== 'WEB3D_quantized_attributes') {
                    throw new RuntimeError('Unsupported glTF Extension: ' + extension);
                }
            }
        }
    }

    function checkSupportedGlExtensions(model, context) {
        var glExtensionsUsed = model.gltf.glExtensionsUsed;
        if (defined(glExtensionsUsed)) {
            var glExtensionsUsedLength = glExtensionsUsed.length;
            for (var i = 0; i < glExtensionsUsedLength; i++) {
                var extension = glExtensionsUsed[i];
                if (extension !== 'OES_element_index_uint') {
                    throw new RuntimeError('Unsupported WebGL Extension: ' + extension);
                } else if (!context.elementIndexUint) {
                    throw new RuntimeError('OES_element_index_uint WebGL extension is not enabled.');
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    var scratchDisplayConditionCartesian = new Cartesian3();
    var scratchDistanceDisplayConditionCartographic = new Cartographic();

    function distanceDisplayConditionVisible(model, frameState) {
        var distance2;
        var ddc = model.distanceDisplayCondition;
        var nearSquared = ddc.near * ddc.near;
        var farSquared = ddc.far * ddc.far;

        if (frameState.mode === SceneMode.SCENE2D) {
            var frustum2DWidth = frameState.camera.frustum.right - frameState.camera.frustum.left;
            distance2 = frustum2DWidth * 0.5;
            distance2 = distance2 * distance2;
        } else {
            // Distance to center of primitive's reference frame
            var position = Matrix4.getTranslation(model.modelMatrix, scratchDisplayConditionCartesian);
            if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
                var projection = frameState.mapProjection;
                var ellipsoid = projection.ellipsoid;
                var cartographic = ellipsoid.cartesianToCartographic(position, scratchDistanceDisplayConditionCartographic);
                position = projection.project(cartographic, position);
                Cartesian3.fromElements(position.z, position.x, position.y, position);
            }
            distance2 = Cartesian3.distanceSquared(position, frameState.camera.positionWC);
        }

        return (distance2 >= nearSquared) && (distance2 <= farSquared);
    }

    ClassificationModel.prototype.updateCommands = function(batchId, color) {
        var nodeCommands = this._nodeCommands;
        var length = nodeCommands.length;
        for (var i = 0; i < length; ++i) {
            nodeCommands[i].updateCommands(batchId, color);
        }
    };

    ClassificationModel.prototype.update = function(frameState) {
        if (frameState.mode === SceneMode.MORPHING) {
            return;
        }

        if ((this._state === ModelState.NEEDS_LOAD) && defined(this.gltf)) {
            this._state = ModelState.LOADING;
            if (this._state !== ModelState.FAILED) {
                var extensions = this.gltf.extensions;
                if (defined(extensions) && defined(extensions.CESIUM_RTC)) {
                    var center = Cartesian3.fromArray(extensions.CESIUM_RTC.center);
                    if (!Cartesian3.equals(center, Cartesian3.ZERO)) {
                        this._rtcCenter3D = center;

                        var projection = frameState.mapProjection;
                        var ellipsoid = projection.ellipsoid;
                        var cartographic = ellipsoid.cartesianToCartographic(this._rtcCenter3D);
                        var projectedCart = projection.project(cartographic);
                        Cartesian3.fromElements(projectedCart.z, projectedCart.x, projectedCart.y, projectedCart);
                        this._rtcCenter2D = projectedCart;

                        this._rtcCenterEye = new Cartesian3();
                        this._rtcCenter = this._rtcCenter3D;
                    }
                }

                this._loadResources = new LoadResources();
                parseBuffers(this);
            }
        }

        var loadResources = this._loadResources;
        var justLoaded = false;

        if (this._state === ModelState.LOADING) {
            // Transition from LOADING -> LOADED once resources are downloaded and created.
            // Textures may continue to stream in while in the LOADED state.
            if (loadResources.pendingBufferLoads === 0) {
                if (!this._updatedGltfVersion) {
                    checkSupportedExtensions(this);
                    // We do this after to make sure that the ids don't change
                    addBuffersToLoadResources(this);

                    parseBufferViews(this);
                    parsePrograms(this);
                    parseMaterials(this);
                    parseMeshes(this);

                    this._boundingSphere = computeBoundingSphere(this);
                    this._initialRadius = this._boundingSphere.radius;
                    this._updatedGltfVersion = true;
                }
                if (this._updatedGltfVersion && loadResources.pendingShaderLoads === 0) {
                    createResources(this, frameState);
                }
            }
            if (loadResources.finished()) {
                this._state = ModelState.LOADED;
                justLoaded = true;
            }
        }

        if (defined(loadResources) && (this._state === ModelState.LOADED)) {
            if (!justLoaded) {
                createResources(this, frameState);
            }

            if (loadResources.finished()) {
                this._loadResources = undefined;  // Clear CPU memory since WebGL resources were created.
            }
        }

        var displayConditionPassed = defined(this.distanceDisplayCondition) ? distanceDisplayConditionVisible(this, frameState) : true;
        var show = this.show && displayConditionPassed;

        if ((show && this._state === ModelState.LOADED) || justLoaded) {
            this._dirty = false;
            var modelMatrix = this.modelMatrix;

            var modeChanged = frameState.mode !== this._mode;
            this._mode = frameState.mode;

            // ClassificationModel's model matrix needs to be updated
            var modelTransformChanged = !Matrix4.equals(this._modelMatrix, modelMatrix) || modeChanged;

            if (modelTransformChanged || justLoaded) {
                Matrix4.clone(modelMatrix, this._modelMatrix);

                var computedModelMatrix = this._computedModelMatrix;
                Matrix4.clone(modelMatrix, computedModelMatrix);
                if (this._upAxis === Axis.Y) {
                    Matrix4.multiplyTransformation(computedModelMatrix, Axis.Y_UP_TO_Z_UP, computedModelMatrix);
                } else if (this._upAxis === Axis.X) {
                    Matrix4.multiplyTransformation(computedModelMatrix, Axis.X_UP_TO_Z_UP, computedModelMatrix);
                }
            }

            // Update modelMatrix throughout the graph as needed
            if (modelTransformChanged || justLoaded) {
                updateNodeHierarchyModelMatrix(this, modelTransformChanged, justLoaded, frameState.mapProjection);
                this._dirty = true;
            }
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

        if (show && !this._ignoreCommands) {
            var nodeCommands = this._nodeCommands;
            var length = nodeCommands.length;
            for (var i = 0; i < length; ++i) {
                nodeCommands[i].update(frameState);
            }
        }
    };

    ClassificationModel.prototype.isDestroyed = function() {
        return false;
    };

    ClassificationModel.prototype.destroy = function() {
        this._rendererResources = undefined;
        return destroyObject(this);
    };

    return ClassificationModel;
});
