/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/IndexDatatype',
        '../Core/loadArrayBuffer',
        '../Core/loadImage',
        '../Core/loadText',
        '../Core/Math',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/Quaternion',
        '../Core/Queue',
        '../Core/RuntimeError',
        '../Renderer/BufferUsage',
        '../Renderer/createShaderSource',
        '../Renderer/DrawCommand',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../ThirdParty/gltfDefaults',
        '../ThirdParty/Uri',
        './getModelAccessor',
        './ModelAnimationCache',
        './ModelAnimationCollection',
        './ModelMaterial',
        './ModelResources',
        './ModelResourceCache',
        './ModelMesh',
        './ModelNode',
        './Pass',
        './SceneMode'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        combine,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        IndexDatatype,
        loadArrayBuffer,
        loadImage,
        loadText,
        CesiumMath,
        Matrix2,
        Matrix3,
        Matrix4,
        PrimitiveType,
        Quaternion,
        Queue,
        RuntimeError,
        BufferUsage,
        createShaderSource,
        DrawCommand,
        TextureMinificationFilter,
        TextureWrap,
        gltfDefaults,
        Uri,
        getModelAccessor,
        ModelAnimationCache,
        ModelAnimationCollection,
        ModelMaterial,
        ModelResources,
        ModelResourceCache,
        ModelMesh,
        ModelNode,
        Pass,
        SceneMode) {
    "use strict";
    /*global WebGLRenderingContext*/

    var yUpToZUp = Matrix4.fromRotationTranslation(Matrix3.fromRotationX(CesiumMath.PI_OVER_TWO), Cartesian3.ZERO);

    var ModelState = {
        NEEDS_LOAD : 0,
        LOADING : 1,
        LOADED : 2,
        FAILED : 3
    };


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
     * {@link Model#readyToRender} event is fired when the model is ready to render, i.e.,
     * when the external binary, image, and shader files are downloaded and the WebGL
     * resources are created.
     * </p>
     *
     * @alias Model
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Object} [options.gltf] The object for the glTF JSON.
     * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
     * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
     * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
     * @param {Object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
     *
     * @see Model.fromGltf
     * @see Model#readyToRender
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Models.html|Cesium Sandcastle Models Demo}
     */
    var Model = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (defined(options.modelResources))
        {
            this._modelResources = options.modelResources;
        }
        else
        {
            this._modelResources = new ModelResources(options);
        }

        
        this._uniformMaps = {};
        this.skinnedNodesNames = [];

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

        /**
         * The event fired when this model is ready to render, i.e., when the external binary, image,
         * and shader files were downloaded and the WebGL resources were created.
         * <p>
         * This event is fired at the end of the frame before the first frame the model is rendered in.
         * </p>
         *
         * @type {Event}
         * @default new Event()
         *
         * @example
         * // Play all animations at half-speed when the model is ready to render
         * model.readyToRender.addEventListener(function(model) {
         *   model.activeAnimations.addAll({
         *     speedup : 0.5
         *   });
         * });
         *
         * @see Model#ready
         */
        this.readyToRender = new Event();
        this._ready = false;

        /**
         * The currently playing glTF animations.
         *
         * @type {ModelAnimationCollection}
         */
        this.activeAnimations = new ModelAnimationCollection(this);

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

        this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and scale
        this._initialRadius = undefined;           // Radius without model's scale property, model-matrix scale, animations, or skins
        this._boundingSphere = undefined;

        this._cesiumAnimationsDirty = false;       // true when the Cesium API, not a glTF animation, changed a node transform
        this._maxDirtyNumber = 0;                  // Used in place of a dirty boolean flag to avoid an extra graph traversal

        this._renderCommands = [];
        this._pickCommands = [];
        this._pickIds = [];

        this._needsUpdate = true;
        this._needsInit = true;
    };

    defineProperties(Model.prototype, {
        modelResources: {
            get : function() {
                return this._modelResources;
            }
        },

        gltf: {
            get : function() {
                return this._modelResources.gltf;
            }
        },


        /**
         * The base path that paths in the glTF JSON are relative to.  The base
         * path is the same path as the path containing the .json file
         * minus the .json file, when binary, image, and shader files are
         * in the same directory as the .json.  When this is <code>''</code>,
         * the app's base path is used.
         *
         * @memberof Model.prototype
         *
         * @type {String}
         * @readonly
         *
         * @default ''
         */
        basePath: {
            get : function() {
                return this._modelResources.basePath;
            }
        },

        /**
         * The model's bounding sphere in its local coordinate system.  This does not take into
         * account glTF animation and skins or {@link Model#scale}.
         *
         * @memberof Model.prototype
         *
         * @type {BoundingSphere}
         * @readonly
         *
         * @default undefined
         *
         * @exception {DeveloperError} The model is not loaded.  Wait for the model's readyToRender event or ready property.
         *
         * @example
         * // Center in WGS84 coordinates
         * var center = Cesium.Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cesium.Cartesian3());
         */
        boundingSphere : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (this._modelResources._state !== ModelState.LOADED) {
                    throw new DeveloperError('The model is not loaded.  Wait for the model\'s readyToRender event or ready property.');
                }
                //>>includeEnd('debug');

                this._boundingSphere.radius = (this.scale * Matrix4.getMaximumScale(this.modelMatrix)) * this._initialRadius;
                return this._boundingSphere;
            }
        },

        /**
         * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
         * and shader files were downloaded and the WebGL resources were created.  This is set to
         * <code>true</code> right before {@link Model#readyToRender} is fired.
         *
         * @memberof Model.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         *
         * @see Model#readyToRender
         */
        ready : {
            get : function() {
                return this._ready;
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
        }
    });

    /**
     * Creates a model from a glTF asset.  When the model is ready to render, i.e., when the external binary, image,
     * and shader files are downloaded and the WebGL resources are created, the {@link Model#readyToRender} event is fired.
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url to the glTF .json file.
     * @param {Object} [options.headers] HTTP headers to send with the request.
     * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
     * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
     * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {ModelResourceCache} [options.cache] Selects what cache to use for the model resources. If not specified the model will not cache resources.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each {@link DrawCommand} in the model.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
     * @returns {Model} The newly created model.
     *
     * @see Model#readyToRender
     *
     * @example
     * // Example 1. Create a model from a glTF asset
     * var model = scene.primitives.add(Cesium.Model.fromGltf({
     *   url : './duck/duck.json'
     * }));
     *
     * @example
     * // Example 2. Create model and provide all properties and events
     * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
     * var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
     *
     * var model = scene.primitives.add(Model.fromGltf({
     *   url : './duck/duck.json',
     *   show : true,                     // default
     *   modelMatrix : modelMatrix,
     *   scale : 2.0,                     // double size
     *   minimumPixelSize : 128,          // never smaller than 128 pixels
     *   allowPicking : false,            // not pickable
     *   debugShowBoundingVolume : false, // default
     *   debugWireframe : false
     * }));
     *
     * model.readyToRender.addEventListener(function(model) {
     *   // Play all animations when the model is ready to render
     *   model.activeAnimations.addAll();
     * });
     *
     * @example
     * // Example 3. Using a custom cache for resources
     * var customModelCache = new Cesium.ModelResourceCache();
     * var modelURL = './duck/duck.json';
     * var model1 = scene.primitives.add(Cesium.Model.fromGltf({
     *   url : modelURL,
     *   cache : customModelCache
     * }));
     * var model2 = scene.primitives.add(Cesium.Model.fromGltf({
     *   url : modelURL,
     *   cache : customModelCache
     * }));
     *
     */
     
    var globalModelCache = new ModelResourceCache();
     
    Model.fromGltf = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.url)) {
            throw new DeveloperError('options.url is required');
        }

        //>>includeEnd('debug');

        var modelCache = defaultValue(options.cache, globalModelCache);
        var  modelResources = modelCache.getModel(options.url);

        if (!defined(modelResources))
        {
            modelResources = new ModelResources(options);
            modelCache.putModel(modelResources, options.url);
        }

        options.modelResources = modelResources;
        var model = new Model(options, modelResources);

        return model;
    };

    function getRuntime(model, runtimeName, name) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(model)) {
            throw new DeveloperError('model is required.');
        }

        if (model._modelResources._state !== ModelState.LOADED) {
            throw new DeveloperError('The model is not loaded.  Wait for the model\'s readyToRender event or ready property.');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        return model._runtime[runtimeName][name];
    }


    /**
     * Returns the glTF node with the given <code>name</code> property.  This is used to
     * modify a node's transform for animation outside of glTF animations.
     *
     * @param {String} name The glTF name of the node.
     * @returns {ModelNode} The node or <code>undefined</code> if no node with <code>name</code> exists.
     *
     * @exception {DeveloperError} The model is not loaded.  Wait for the model's readyToRender event or ready property.
     *
     * @example
     * // Apply non-uniform scale to node LOD3sp
     * var node = model.getNode('LOD3sp');
     * node.matrix =Cesium. Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
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
     * @exception {DeveloperError} The model is not loaded.  Wait for the model's readyToRender event or ready property.
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
     * @exception {DeveloperError} The model is not loaded.  Wait for the model's readyToRender event or ready property.
     */
    Model.prototype.getMaterial = function(name) {
        return getRuntime(this, 'materialsByName', name);
    };

    var nodeAxisScratch = new Cartesian3();
    var nodeTranslationScratch = new Cartesian3();
    var nodeQuaternionScratch = new Quaternion();
    var nodeScaleScratch = new Cartesian3();

    function getTransform(node) {
        if (defined(node.matrix)) {
            return Matrix4.fromArray(node.matrix);
        }

        var axis = Cartesian3.fromArray(node.rotation, 0, nodeAxisScratch);

        return Matrix4.fromTranslationQuaternionRotationScale(
            Cartesian3.fromArray(node.translation, 0, nodeTranslationScratch),
            Quaternion.fromAxisAngle(axis, node.rotation[3], nodeQuaternionScratch),
            Cartesian3.fromArray(node.scale, 0 , nodeScaleScratch));
    }

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

                var meshes = defaultValue(n.meshes, defined(n.instanceSkin) ? n.instanceSkin.meshes : undefined);
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


    var scratchDrawingBufferDimensions = new Cartesian2();
    var scratchToCenter = new Cartesian3();
    var scratchProj = new Cartesian3();

    function scaleInPixels(positionWC, radius, context, frameState) {
        var camera = frameState.camera;
        var frustum = camera.frustum;

        var toCenter = Cartesian3.subtract(camera.positionWC, positionWC, scratchToCenter);
        var proj = Cartesian3.multiplyByScalar(camera.directionWC, Cartesian3.dot(toCenter, camera.directionWC), scratchProj);
        var distance = Math.max(frustum.near, Cartesian3.magnitude(proj) - radius);

        scratchDrawingBufferDimensions.x = context.drawingBufferWidth;
        scratchDrawingBufferDimensions.y = context.drawingBufferHeight;
        var pixelSize = frustum.getPixelSize(scratchDrawingBufferDimensions, distance);
        var pixelScale = Math.max(pixelSize.x, pixelSize.y);

        return pixelScale;
    }

    var scratchPosition = new Cartesian3();

    function getScale(model, context, frameState) {
        var scale = model._scale;

        if (model.minimumPixelSize !== 0.0) {
            // Compute size of bounding sphere in pixels
            var maxPixelSize = Math.max(context.drawingBufferWidth, context.drawingBufferHeight);
            var m = model.modelMatrix;
            scratchPosition.x = m[12];
            scratchPosition.y = m[13];
            scratchPosition.z = m[14];
            var radius = model.boundingSphere.radius;
            var metersPerPixel = scaleInPixels(scratchPosition, radius, context, frameState);

            // metersPerPixel is always > 0.0
            var pixelsPerMeter = 1.0 / metersPerPixel;
            var diameterInPixels = Math.min(pixelsPerMeter * (2.0 * radius), maxPixelSize);

            // Maintain model's minimum pixel size
            if (diameterInPixels < model.minimumPixelSize) {
                scale = (model.minimumPixelSize * metersPerPixel) / (2.0 * model._initialRadius);
            }
        }

        return scale;
    }

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
        }
    }


    var scratchNodeStack = [];

    function updateNodeHierarchyModelMatrix(model, modelTransformChanged) {
        var modelResources = model._modelResources;
        var maxDirtyNumber = model._maxDirtyNumber;
        var allowPicking = model.allowPicking;

        var rootNodes = model._runtime.rootNodes;
        var length = rootNodes.length;

        var nodeStack = scratchNodeStack;
        var computedModelMatrix = model._computedModelMatrix;

        var justLoaded = model._needsUpdate;

        for (var i = 0; i < length; ++i) {
            var n = rootNodes[i];

            getNodeMatrix(n, n.transformToRoot);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n.transformToRoot;
                var commands = n.commands;

                if ((n.dirtyNumber === maxDirtyNumber) || modelTransformChanged || justLoaded) {
                    var commandsLength = commands.length;
                    if (commandsLength > 0) {
                        // Node has meshes, which has primitives.  Update their commands.
                        for (var j = 0 ; j < commandsLength; ++j) {
                            var primitiveCommand = commands[j];
                            var command = primitiveCommand.command;
                            Matrix4.multiplyTransformation(computedModelMatrix, transformToRoot, command.modelMatrix);

                            // PERFORMANCE_IDEA: Can use transformWithoutScale if no node up to the root has scale (inclug animation)
                            BoundingSphere.transform(primitiveCommand.boundingSphere, command.modelMatrix, command.boundingVolume);
                            
                            if (allowPicking) {
                                var pickCommand = primitiveCommand.pickCommand;
                                Matrix4.clone(command.modelMatrix, pickCommand.modelMatrix);
                                BoundingSphere.clone(command.boundingVolume, pickCommand.boundingVolume);
                            }
                        }
                    } else {
                        // Node has a light or camera
                        n.computedMatrix = Matrix4.multiplyTransformation(computedModelMatrix, transformToRoot, n.computedMatrix);
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
        ++modelResources._maxDirtyNumber;
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
        var commands = model._renderCommands;
        var pickCommands = model._pickCommands;
        var pickIds = model._pickIds;
        var allowPicking = model.allowPicking;
        var runtimeMeshes = model._runtime.meshesByName;

        var debugShowBoundingVolume = model.debugShowBoundingVolume;

        var modelResources = model._modelResources;
        var resources = modelResources._rendererResources;
        var rendererVertexArrays = resources.vertexArrays;
        var rendererPrograms = resources.programs;
        var rendererPickPrograms = resources.pickPrograms;
        var rendererRenderStates = resources.renderStates;

        var rendererUniformMaps = model._uniformMaps;

        var gltf = modelResources.gltf;
        var accessors = gltf.accessors;
        var gltfMeshes = gltf.meshes;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        var meshes = defined(gltfNode.meshes) ? gltfNode.meshes : gltfNode.instanceSkin.meshes;
        var meshesLength = meshes.length;

        for (var j = 0; j < meshesLength; ++j) {
            var name = meshes[j];
            var mesh = gltfMeshes[name];
            var primitives = mesh.primitives;
            var length = primitives.length;

            // The glTF node hierarchy is a DAG so a node can have more than one
            // parent, so a node may already have commands.  If so, append more
            // since they will have a different model matrix.

            for (var i = 0; i < length; ++i) {
                var primitive = primitives[i];
                var ix = accessors[primitive.indices];
                var instanceTechnique = materials[primitive.material].instanceTechnique;
                var technique = techniques[instanceTechnique.technique];
                var pass = technique.passes[technique.pass];
                var instanceProgram = pass.instanceProgram;

                var boundingSphere;
                var positionAttribute = primitive.attributes.POSITION;
                if (defined(positionAttribute)) {
                    var a = accessors[positionAttribute];
                    boundingSphere = BoundingSphere.fromCornerPoints(Cartesian3.fromArray(a.min), Cartesian3.fromArray(a.max));
                }

                var vertexArray = rendererVertexArrays[name + '.primitive.' + i];
                var count = ix.count;
                var offset = (ix.byteOffset / IndexDatatype.getSizeInBytes(ix.componentType));  // glTF has offset in bytes.  Cesium has offsets in indices

                var um = rendererUniformMaps[primitive.material];
                var uniformMap = um.uniformMap;
                if (defined(um.jointMatrixUniformName)) {
                    var jointUniformMap = {};
                    jointUniformMap[um.jointMatrixUniformName] = createJointMatricesFunction(runtimeNode);

                    uniformMap = combine(uniformMap, jointUniformMap);
                }

                var rs = rendererRenderStates[instanceTechnique.technique];
                // GLTF_SPEC: Offical means to determine translucency. https://github.com/KhronosGroup/glTF/issues/105
                var isTranslucent = rs.blending.enabled;
                var owner = {
                    primitive : defaultValue(model.pickPrimitive, model),
                    id : model.id,
                    node : runtimeNode.publicNode,
                    mesh : runtimeMeshes[mesh.name]
                };

                var command = new DrawCommand({
                    boundingVolume : new BoundingSphere(), // updated in update()
                    modelMatrix : new Matrix4(),           // computed in update()
                    primitiveType : primitive.primitive,
                    vertexArray : vertexArray,
                    count : count,
                    offset : offset,
                    shaderProgram : rendererPrograms[instanceProgram.program],
                    uniformMap : uniformMap,
                    renderState : rs,
                    owner : owner,
                    debugShowBoundingVolume : debugShowBoundingVolume,
                    pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE
                });
                commands.push(command);

                var pickCommand;

                if (allowPicking) {
                    var pickId = context.createPickId(owner);
                    pickIds.push(pickId);

                    var pickUniformMap = combine(
                        uniformMap, {
                            czm_pickColor : createPickColorFunction(pickId.color)
                        });

                    pickCommand = new DrawCommand({
                        boundingVolume : new BoundingSphere(), // updated in update()
                        modelMatrix : new Matrix4(),           // computed in update()
                        primitiveType : primitive.primitive,
                        vertexArray : vertexArray,
                        count : count,
                        offset : offset,
                        shaderProgram : rendererPickPrograms[instanceProgram.program],
                        uniformMap : pickUniformMap,
                        renderState : rs,
                        owner : owner,
                        pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE
                    });
                    pickCommands.push(pickCommand);
                }

                runtimeNode.commands.push({
                    command : command,
                    pickCommand : pickCommand,
                    boundingSphere : boundingSphere
                });
            }
        }
    }


    ///////////////////////////////////////////////////////////////////////////

    // This doesn't support LOCAL, which we could add if it is ever used.
    var gltfSemanticUniforms = {
        MODEL : function(uniformState) {
            return function() {
                return uniformState.model;
            };
        },
        VIEW : function(uniformState) {
            return function() {
                return uniformState.view;
            };
        },
        PROJECTION : function(uniformState) {
            return function() {
                return uniformState.projection;
            };
        },
        MODELVIEW : function(uniformState) {
            return function() {
                return uniformState.modelView;
            };
        },
        MODELVIEWPROJECTION : function(uniformState) {
            return function() {
                return uniformState.modelViewProjection;
            };
        },
        MODELINVERSE : function(uniformState) {
            return function() {
                return uniformState.inverseModel;
            };
        },
        VIEWINVERSE : function(uniformState) {
            return function() {
                return uniformState.inverseView;
            };
        },
        PROJECTIONINVERSE : function(uniformState) {
            return function() {
                return uniformState.inverseProjection;
            };
        },
        MODELVIEWINVERSE : function(uniformState) {
            return function() {
                return uniformState.inverseModelView;
            };
        },
        MODELVIEWPROJECTIONINVERSE : function(uniformState) {
            return function() {
                return uniformState.inverseModelViewProjection;
            };
        },
        MODELINVERSETRANSPOSE : function(uniformState) {
            return function() {
                return uniformState.inverseTranposeModel;
            };
        },
        MODELVIEWINVERSETRANSPOSE : function(uniformState) {
            return function() {
                return uniformState.normal;
            };
        },
        VIEWPORT : function(uniformState) {
            return function() {
                return uniformState.viewportCartesian4;
            };
        }
        // JOINTMATRIX created in createCommands()
    };

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

    function getTextureUniformFunction(value, modelResources) {
        var that = {
            value : modelResources._rendererResources.textures[value],
            clone : function(source, result) {
                return source;
            },
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getUniformFunctionFromSource(source, model) {
        var runtimeNode = model._runtime.nodes[source];
        return function() {
            return runtimeNode.computedMatrix;
        };
    }

    var gltfUniformFunctions = {};

    // this check must use typeof, not defined, because defined doesn't work with undeclared variables.
    if (typeof WebGLRenderingContext !== 'undefined') {
        gltfUniformFunctions[WebGLRenderingContext.FLOAT] = getScalarUniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.FLOAT_VEC2] = getVec2UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.FLOAT_VEC3] = getVec3UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.FLOAT_VEC4] = getVec4UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.INT] = getScalarUniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.INT_VEC2] = getVec2UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.INT_VEC3] = getVec3UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.INT_VEC4] = getVec4UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.BOOL] = getScalarUniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.BOOL_VEC2] = getVec2UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.BOOL_VEC3] = getVec3UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.BOOL_VEC4] = getVec4UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.FLOAT_MAT2] = getMat2UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.FLOAT_MAT3] = getMat3UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.FLOAT_MAT4] = getMat4UniformFunction;
        gltfUniformFunctions[WebGLRenderingContext.SAMPLER_2D] = getTextureUniformFunction;
        // GLTF_SPEC: Support SAMPLER_CUBE. https://github.com/KhronosGroup/glTF/issues/40
    }

    function createUniformMaps(model, context)
    {
        var modelResources = model._modelResources;
        var gltf = modelResources.gltf;
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var programs = gltf.programs;
        var rendererUniformMaps = model._uniformMaps;

        for (var materialName in materials) {
            if (materials.hasOwnProperty(materialName)) {
                var material = materials[materialName];
                var instanceTechnique = material.instanceTechnique;
                var instanceParameters = instanceTechnique.values;
                var technique = techniques[instanceTechnique.technique];
                var parameters = technique.parameters;
                var pass = technique.passes[technique.pass];
                var instanceProgram = pass.instanceProgram;
                var uniforms = instanceProgram.uniforms;
                var activeUniforms = modelResources._rendererResources.programs[instanceProgram.program].allUniforms;

                var uniformMap = {};
                var uniformValues = {};
                var jointMatrixUniformName;

                // Uniform parameters for this pass
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
                            var uv = gltfUniformFunctions[parameter.type](instanceParameters[parameterName], modelResources);
                            uniformMap[name] = uv.func;
                            uniformValues[parameterName] = uv;
                        } else if (defined(parameter.semantic)) {
                            if (parameter.semantic !== 'JOINTMATRIX') {
                                // Map glTF semantic to Cesium automatic uniform
                                uniformMap[name] = gltfSemanticUniforms[parameter.semantic](context.uniformState);
                            } else {
                                jointMatrixUniformName = name;
                            }
                        } else if (defined(parameter.source)) {
                            uniformMap[name] = getUniformFunctionFromSource(parameter.source, model);
                        } else if (defined(parameter.value)) {
                            // Technique value that isn't overridden by a material
                            var uv2 = gltfUniformFunctions[parameter.type](parameter.value, model);
                            uniformMap[name] = uv2.func;
                            uniformValues[parameterName] = uv2;
                        }
                    }
                }

                var u = rendererUniformMaps[materialName];
                u.uniformMap = uniformMap;                          // uniform name -> function for the renderer
                u.values = uniformValues;                           // material parameter name -> ModelMaterial for modifying the parameter at runtime
                u.jointMatrixUniformName = jointMatrixUniformName;
            }
        }
    }

    function parseNodes(model) {
        var modelResources = model._modelResources;
        var runtimeNodes = {};
        var runtimeNodesByName = {};
        var skinnedNodes = [];

        var skinnedNodesNames = model.skinnedNodesNames;
        var nodes = modelResources.gltf.nodes;

        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                var node = nodes[name];

                var runtimeNode = {
                    // Animation targets
                    matrix : undefined,
                    translation : undefined,
                    rotation : undefined,
                    scale : undefined,

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
                runtimeNode.publicNode = new ModelNode(model, node, runtimeNode, name);

                runtimeNodes[name] = runtimeNode;
                runtimeNodesByName[node.name] = runtimeNode;

                if (defined(node.instanceSkin)) {
                    skinnedNodesNames.push(name);
                    skinnedNodes.push(runtimeNode);
                }
            }
        }

        model._runtime.nodes = runtimeNodes;
        model._runtime.nodesByName = runtimeNodesByName;
        model._runtime.skinnedNodes = skinnedNodes;
    }

    function parseMaterials(model) {
        var modelResources = model._modelResources;
        var runtimeMaterials = {};
        var runtimeMaterialsById = {};
        var materials = modelResources.gltf.materials;
        var rendererUniformMaps = model._uniformMaps;

        for (var name in materials) {
            if (materials.hasOwnProperty(name)) {
                // Allocated now so ModelMaterial can keep a reference to it.
                rendererUniformMaps[name] = {
                    uniformMap : undefined,
                    values : undefined,
                    jointMatrixUniformName : undefined
                };

                var material = materials[name];
                var modelMaterial = new ModelMaterial(model, material, name);
                runtimeMaterials[material.name] = modelMaterial;
                runtimeMaterialsById[name] = modelMaterial;
            }
        }

        model._runtime.materialsByName = runtimeMaterials;
        model._runtime.materialsById = runtimeMaterialsById;
    }

    function parseMeshes(model) {
        var modelResources = model._modelResources;
        var runtimeMeshes = {};
        var runtimeMaterialsById = model._runtime.materialsById;
        var meshes = modelResources.gltf.meshes;

        for (var name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var mesh = meshes[name];
                runtimeMeshes[mesh.name] = new ModelMesh(mesh, runtimeMaterialsById, name);
            }
        }

        model._runtime.meshesByName = runtimeMeshes;
    }

    function parse(model) {
        parseMaterials(model);
        parseMeshes(model);
        parseNodes(model);
    }

     function createRuntimeNodes(model, context) {
        var modelResources = model._modelResources;

        var rootNodes = [];
        var runtimeNodes = model._runtime.nodes;

        var gltf = modelResources.gltf;
        var nodes = gltf.nodes;

        var scene = gltf.scenes[gltf.scene];
        var sceneNodes = scene.nodes;
        var length = sceneNodes.length;

        var stack = [];
        var axis = new Cartesian3();

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
                        axis = Cartesian3.fromArray(gltfNode.rotation, 0, axis);
                        runtimeNode.translation = Cartesian3.fromArray(gltfNode.translation);
                        runtimeNode.rotation = Quaternion.fromAxisAngle(axis, gltfNode.rotation[3]);
                        runtimeNode.scale = Cartesian3.fromArray(gltfNode.scale);
                    }
                }

                if (defined(parentRuntimeNode)) {
                    parentRuntimeNode.children.push(runtimeNode);
                    runtimeNode.parents.push(parentRuntimeNode);
                } else {
                    rootNodes.push(runtimeNode);
                }


                if (defined(gltfNode.meshes) || defined(gltfNode.instanceSkin)) {
                    runtimeNode.gltfNode = gltfNode; // maybe this should changed later
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

    function searchForest(forest, jointName) {
        var length = forest.length;
        for (var i = 0; i < length; ++i) {
            var stack = [forest[i]]; // Push root node of tree

            while (stack.length > 0) {
                var n = stack.pop();

                if (n.jointName === jointName) {
                    return n;
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
        var modelResources = model._modelResources;
        var gltf = modelResources.gltf;
        var skins = gltf.skins;
        var nodes = gltf.nodes;
        var runtimeNodes = model._runtime.nodes;

        var skinnedNodesNames = model.skinnedNodesNames;
        if (!defined(skinnedNodesNames)) {
            return;
        }

        var length = skinnedNodesNames.length;
        for (var j = 0; j < length; ++j) {
            var name = skinnedNodesNames[j];
            var skinnedNode = runtimeNodes[name];
            var instanceSkin = nodes[name].instanceSkin;

            var runtimeSkin = runtimeSkins[instanceSkin.skin];
            skinnedNode.inverseBindMatrices = runtimeSkin.inverseBindMatrices;
            skinnedNode.bindShapeMatrix = runtimeSkin.bindShapeMatrix;

            // 1. Find nodes with the names in instanceSkin.skeletons (the node's skeletons)
            // 2. These nodes form the root nodes of the forest to search for each joint in skin.jointNames.  This search uses jointName, not the node's name.

            var forest = [];
            var gltfSkeletons = instanceSkin.skeletons;
            var skeletonsLength = gltfSkeletons.length;
            for (var k = 0; k < skeletonsLength; ++k) {
                forest.push(runtimeNodes[gltfSkeletons[k]]);
            }

            var gltfJointNames = skins[instanceSkin.skin].jointNames;
            var jointNamesLength = gltfJointNames.length;
            for (var i = 0; i < jointNamesLength; ++i) {
                var jointName = gltfJointNames[i];
                skinnedNode.joints.push(searchForest(forest, jointName));
            }
        }
    }

    function createSkins(model) {
        var modelResources = model._modelResources;
        var gltf = modelResources.gltf;
        var buffers = modelResources.buffers;
        var accessors = gltf.accessors;
        var bufferViews = gltf.bufferViews;
        var skins = gltf.skins;
        var runtimeSkins = {};

        for (var name in skins) {
            if (skins.hasOwnProperty(name)) {
                var skin = skins[name];
                var accessor = accessors[skin.inverseBindMatrices];
                var bufferView = bufferViews[accessor.bufferView];

                var componentType = accessor.componentType;
                var type = accessor.type;
                var count = accessor.count;
                var typedArray = getModelAccessor(accessor).createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + accessor.byteOffset, count);
                var matrices =  new Array(count);

                if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'MAT4')) {
                    for (var i = 0; i < count; ++i) {
                        matrices[i] = Matrix4.fromArray(typedArray, 16 * i);
                    }
                }

                var bindShapeMatrix;
                if (!Matrix4.equals(skin.bindShapeMatrix, Matrix4.IDENTITY)) {
                    bindShapeMatrix = Matrix4.clone(skin.bindShapeMatrix);
                }

                runtimeSkins[name] = {
                    inverseBindMatrices : matrices,
                    bindShapeMatrix : bindShapeMatrix // not used when undefined
                };
            }
        }

        createJoints(model, runtimeSkins);
    }

    var scratchObjectSpace = new Matrix4();


    function applySkins(model) {
        var modelResources = model._modelResources;
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

    function getChannelEvaluator(model, runtimeNode, targetPath, spline) {
        return function(localAnimationTime) {
//  Workaround for https://github.com/KhronosGroup/glTF/issues/219
/*
            if (targetPath === 'translation') {
                return;
            }
*/
            runtimeNode[targetPath] = spline.evaluate(localAnimationTime, runtimeNode[targetPath]);
            runtimeNode.dirtyNumber = model._modelResources._maxDirtyNumber;
        };
    }

    function createAnimations(model) {
        var modelResources = model._modelResources;

        model._runtime.animations = { };

        var runtimeNodes = model._runtime.nodes;
        var animations = modelResources.gltf.animations;
        var accessors = modelResources.gltf.accessors;
        var name;

         for (var animationName in animations) {
             if (animations.hasOwnProperty(animationName)) {
                 var animation = animations[animationName];
                 var channels = animation.channels;
                 var parameters = animation.parameters;
                 var samplers = animation.samplers;

                 var parameterValues = {};

                 for (name in parameters) {
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

                     var spline = ModelAnimationCache.getAnimationSpline(modelResources, animationName, animation, channel.sampler, sampler, parameterValues);
                     // GLTF_SPEC: Support more targets like materials. https://github.com/KhronosGroup/glTF/issues/142
                     channelEvaluators[i] = getChannelEvaluator(model, runtimeNodes[target.id], target.path, spline);
                 }

                 model._runtime.animations[animationName] = {
                     startTime : startTime,
                     stopTime : stopTime,
                     channelEvaluators : channelEvaluators
                 };
             }
         }
    }

    function updateWireframe(model) {
        if (model._debugWireframe !== model.debugWireframe) {
            model._debugWireframe = model.debugWireframe;

            // This assumes the original primitive was TRIANGLES and that the triangles
            // are connected for the wireframe to look perfect.
            var primitiveType = model.debugWireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES;
            var commands = model._renderCommands;
            var length = commands.length;

            for (var i = 0; i < length; ++i) {
                commands[i].primitiveType = primitiveType;
            }
        }
    }

    var scratchDrawingBufferDimensions = new Cartesian2();
    var scratchToCenter = new Cartesian3();
    var scratchProj = new Cartesian3();

    function scaleInPixels(positionWC, radius, context, frameState) {
        var camera = frameState.camera;
        var frustum = camera.frustum;

        var toCenter = Cartesian3.subtract(camera.positionWC, positionWC, scratchToCenter);
        var proj = Cartesian3.multiplyByScalar(camera.directionWC, Cartesian3.dot(toCenter, camera.directionWC), scratchProj);
        var distance = Math.max(frustum.near, Cartesian3.magnitude(proj) - radius);

        scratchDrawingBufferDimensions.x = context.drawingBufferWidth;
        scratchDrawingBufferDimensions.y = context.drawingBufferHeight;
        var pixelSize = frustum.getPixelSize(scratchDrawingBufferDimensions, distance);
        var pixelScale = Math.max(pixelSize.x, pixelSize.y);

        return pixelScale;
    }

    var scratchPosition = new Cartesian3();

    function getScale(model, context, frameState) {
        var scale = model.scale;

        if (model.minimumPixelSize !== 0.0) {
            // Compute size of bounding sphere in pixels
            var maxPixelSize = Math.max(context.drawingBufferWidth, context.drawingBufferHeight);
            var m = model.modelMatrix;
            scratchPosition.x = m[12];
            scratchPosition.y = m[13];
            scratchPosition.z = m[14];
            var radius = model.boundingSphere.radius;
            var metersPerPixel = scaleInPixels(scratchPosition, radius, context, frameState);

            // metersPerPixel is always > 0.0
            var pixelsPerMeter = 1.0 / metersPerPixel;
            var diameterInPixels = Math.min(pixelsPerMeter * (2.0 * radius), maxPixelSize);

            // Maintain model's minimum pixel size
            if (diameterInPixels < model.minimumPixelSize) {
                scale = (model.minimumPixelSize * metersPerPixel) / (2.0 * model._initialRadius);
            }
        }

        return scale;
    }
    
    function initModel(model, context){
        
    	parse(model);
    	createSkins(model);
        createAnimations(model);
        createUniformMaps(model, context) ;
        createRuntimeNodes(model, context); // using glTF scene
        
        model._needsInit = false;
	}

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
    Model.prototype.update = function(context, frameState, commandList) {
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        if ((this._modelResources._state === ModelState.NEEDS_LOAD) && defined(this._modelResources.gltf)) {
            this._modelResources.startLoading();
        }

        if (this._modelResources._state === ModelState.LOADED && defined(this._modelResources.gltf) && !defined(this._boundingSphere)) {
            this._boundingSphere = computeBoundingSphere(this._modelResources.gltf);
            this._initialRadius = this._boundingSphere.radius;
        }
        
        this._modelResources.update(context, frameState);
        
        if (!this._ready && this._modelResources._state === ModelState.LOADED)
        {
            var model = this;
            frameState.afterRender.push(function() {
            
            	initModel(model, context);
                model._ready = true;
                model.readyToRender.raiseEvent(model);
            });
            
            return;
        }


        var show = this.show && (this.scale !== 0.0);

        if (show && this._modelResources._state === ModelState.LOADED) {


            var animated = this.activeAnimations.update(frameState) || this._cesiumAnimationsDirty;
            this._cesiumAnimationsDirty = false;

            // Model's model matrix needs to be updated
            var modelTransformChanged = !Matrix4.equals(this._modelMatrix, this.modelMatrix) ||
                (this._scale !== this.scale) ||
                (this._minimumPixelSize !== this.minimumPixelSize) || (this.minimumPixelSize !== 0.0); // Minimum pixel size changed or is enabled

            if (modelTransformChanged || this._needsUpdate) {
                Matrix4.clone(this.modelMatrix, this._modelMatrix);
                this._scale = this.scale;
                this._minimumPixelSize = this.minimumPixelSize;

                var scale = getScale(this, context, frameState);
                var computedModelMatrix = this._computedModelMatrix;
                Matrix4.multiplyByUniformScale(this.modelMatrix, scale, computedModelMatrix);
                Matrix4.multiplyTransformation(computedModelMatrix, yUpToZUp, computedModelMatrix);
            }

            if (this._needsUpdate && this._needsInit){
            	initModel(this, context);
            }

            // Update modelMatrix throughout the graph as needed
            if (animated || modelTransformChanged || this._needsUpdate) {
                updateNodeHierarchyModelMatrix(this, modelTransformChanged);

                if (animated || this._needsUpdate) {
                    // Apply skins if animation changed any node transforms
                    applySkins(this);
                }
            }

            updatePickIds(this, context);
            updateWireframe(this);

            this._needsUpdate = false;
        }


        // We don't check show at the top of the function since we
        // want to be able to progressively load models when they are not shown,
        // and then have them visible immediately when show is set to true.
        if (show) {
// PERFORMANCE_IDEA: This is terrible
            var passes = frameState.passes;
            var i;
            var length;
            var commands;
            if (passes.render) {
                commands = this._renderCommands;
                length = commands.length;
                for (i = 0; i < length; ++i) {
                    commandList.push(commands[i]);
                }

                if (this.debugShowBoundingVolume !== this._debugShowBoundingVolume) {
                    this._debugShowBoundingVolume = this.debugShowBoundingVolume;
                    for (i = 0; i < commands.length; i++) {
                        commands[i].debugShowBoundingVolume = this.debugShowBoundingVolume;
                    }
                }
            }

            if (passes.pick) {
                commands = this._pickCommands;
                length = commands.length;
                for (i = 0; i < length; ++i) {
                    commandList.push(commands[i]);
                }
            }
        }
    };

    /**
     * Compares if two models share same resources.
     * <br /><br />
     *
     * @returns {Boolean} <code>true</code> if this object swas destroyed; otherwise, <code>false</code>.
     *
     * @see Model#destroy
     */
    Model.prototype.isSharingResources = function(otherModel) {
        if (!defined(otherModel) || !defined(otherModel._modelResources) || !defined(this._modelResources)) {
            return false;
        }

        return (otherModel._modelResources === this._modelResources);
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

    function destroy(property) {
        for (var name in property) {
            if (property.hasOwnProperty(name)) {
                property[name].destroy();
            }
        }
    }

    function release(property) {
        for (var name in property) {
            if (property.hasOwnProperty(name)) {
                property[name].destroy();
            }
        }
    }

    /**
     * Destroys the WebGL resources held by this object, only if the resources are not cached.
     * Destroying an object allows for deterministic release of WebGL resources, instead of
     * relying on the garbage collector to destroy this object. <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Model#isDestroyed
     *
     * @example
     * model = model && model.destroy();
     */
    Model.prototype.destroy = function() {
        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        return destroyObject(this);
    };


    return Model;
});
