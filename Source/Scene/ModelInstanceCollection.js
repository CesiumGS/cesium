/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/clone',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Renderer/Buffer',
        '../Renderer/DrawCommand',
        '../Renderer/WebGLConstants',
        '../ThirdParty/when',
        './Model',
        './SceneMode'
    ], function(
        BoundingSphere,
        Cartesian3,
        clone,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        destroyObject,
        Matrix4,
        Buffer,
        DrawCommand,
        WebGLConstants,
        when,
        Model,
        SceneMode) {
    "use strict";

    var LoadState = {
        NEEDS_LOAD : 0,
        LOADING : 1,
        LOADED : 2,
        FAILED : 3
    };

    /**
     * A 3D model instance collection. All instances reference the same underlying model, but have unique
     * per-instance properties like model matrix, pick id, etc.
     *
     * @alias ModelInstanceCollection
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url to the .gltf file.
     * @param {String} [options.cacheKey] The cache key for the model.
     * @param {Object} [options.headers] HTTP headers to send with the request.
     * @param {Boolean} [options.show=true] Determines if the collection will be shown.
     * @param {Boolean} [options.allowPicking=false] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for the collection.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the instances in wireframe.
     *
     * @see Model
     * @see Model.fromGltf
     */

    var ModelInstanceCollection = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._model = undefined;
        this._boundingSphere = undefined;
        this._instancingEnabled = false;
        this._instances = defaultValue(options.instances, []);
        this._show = options.show;
        this._allowPicking = defaultValue(options.allowPicking, false);
        this._ready = false;
        this._readyPromise = when.defer();
        this._state = LoadState.NEEDS_LOAD;
        this._drawCommands = [];
        this._pickCommands = [];
        this._modelCommands = undefined;

        // Passed on to Model
        this._url = options.url;
        this._cacheKey = options.cacheKey;
        this._headers = options.headers;
        this._asynchronous = options.asynchronous;
        this._debugShowBoundingVolume = options.debugShowBoundingVolume;
        this._debugWireframe = options.debugWireframe;
    };

    defineProperties(ModelInstanceCollection.prototype, {
        model : {
            get : function() {
                return this._model;
            }
        },
        boundingSphere : {
            get : function() {
                return this._boundingSphere;
            }
        },
        allowPicking : {
            get : function() {
                return this._allowPicking;
            }
        },
        instanceCount : {
            get : function() {
                return this._instances.length;
            }
        },
        ready : {
            get : function() {
                return this._ready;
            }
        },
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        }
    });

    function createModel(context, frameState, commandList, collection) {
        var i;
        var instanceCount = collection.instanceCount;
        var modelOptions = {
            url : collection._url,
            cacheKey : collection._cacheKey,
            headers : collection._headers,
            asynchronous : collection._asynchronous,
            debugShowBoundingVolume : collection._debugShowBoundingVolume,
            debugWireframe : collection._debugWireframe,
            allowPicking : collection._allowPicking
        };

        if (collection._instancingEnabled) {
            var typedArray = new Float32Array(instanceCount * 16);
            for (i = 0; i < instanceCount; ++i) {
                var instance = collection._instances[i];
                var modelMatrix = instance.modelMatrix;
                var pickColor = defined(instance.pickId) ? instance.pickId.color : Color.WHITE;

                // First three rows of the model matrix
                typedArray[i * 16 + 0] = modelMatrix[0];
                typedArray[i * 16 + 1] = modelMatrix[4];
                typedArray[i * 16 + 2] = modelMatrix[8];
                typedArray[i * 16 + 3] = modelMatrix[12];
                typedArray[i * 16 + 4] = modelMatrix[1];
                typedArray[i * 16 + 5] = modelMatrix[5];
                typedArray[i * 16 + 6] = modelMatrix[9];
                typedArray[i * 16 + 7] = modelMatrix[13];
                typedArray[i * 16 + 8] = modelMatrix[2];
                typedArray[i * 16 + 9] = modelMatrix[6];
                typedArray[i * 16 + 10] = modelMatrix[10];
                typedArray[i * 16 + 11] = modelMatrix[14];

                // Other instance data like pickColor, color, etc. Colors can be packed like in BillboardCollection as needed.
                typedArray[i * 16 + 12] = pickColor.red;
                typedArray[i * 16 + 13] = pickColor.green;
                typedArray[i * 16 + 14] = pickColor.blue;
                typedArray[i * 16 + 15] = pickColor.alpha;
            }

            var vertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : typedArray,
                usage : WebGLConstants.STATIC_DRAW
            });

            var attributeNames = ['czm_modelMatrixRow0', 'czm_modelMatrixRow1', 'czm_modelMatrixRow2', 'czm_instanceData'];
            var componentSizeInBytes = ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT);
            var instancedAttributes = {};

            for (i = 0; i < 4; ++i) {
                instancedAttributes[attributeNames[i]] = {
                    index                  : 0, // updated in Model
                    vertexBuffer           : vertexBuffer,
                    componentsPerAttribute : 4,
                    componentDatatype      : ComponentDatatype.FLOAT,
                    normalize              : false,
                    offsetInBytes          : componentSizeInBytes * 4 * i,
                    strideInBytes          : componentSizeInBytes * 16,
                    instanceDivisor        : 1
                };
            }

            modelOptions.instanced = true;
            modelOptions.instancedAttributes = instancedAttributes;
        }

        collection._model = Model.fromGltf(modelOptions);
    }

    function computeBoundingSphere(collection) {
        var points = [];
        var instanceCount = collection.instanceCount;
        for (var i = 0; i < instanceCount; i++) {
            var translation = new Cartesian3();
            Matrix4.getTranslation(collection._instances[i].modelMatrix, translation);
            points.push(translation);
        }

        var boundingSphere = BoundingSphere.fromPoints(points);
        boundingSphere.radius += collection.model._boundingSphere.radius;
        return boundingSphere;
    }

    function createCommands(collection, drawCommands, pickCommands) {
        collection._modelCommands = drawCommands;

        var i, j;
        var command;
        var commandCount = drawCommands.length;
        var instanceCount = collection.instanceCount;
        var allowPicking = collection.allowPicking;

        var boundingSphere = computeBoundingSphere(collection);
        var modelMatrix = Matrix4.fromTranslation(boundingSphere.center);
        collection._boundingSphere = boundingSphere;

        if (collection._instancingEnabled) {
            for (i = 0; i < commandCount; ++i) {
                command = clone(drawCommands[i]);
                command.instanceCount = instanceCount;
                command.modelMatrix = modelMatrix;
                command.boundingVolume = boundingSphere;
                collection._drawCommands.push(command);

                if (allowPicking) {
                    command = clone(pickCommands[i]);
                    command.instanceCount = instanceCount;
                    command.modelMatrix = modelMatrix;
                    command.boundingVolume = boundingSphere;
                    collection._pickCommands.push(command);
                }
            }
        } else {
            // When instancing is disabled, create commands for every instance.
            for (i = 0; i < commandCount; ++i) {
                for (j = 0; j < instanceCount; ++j) {
                    command = clone(drawCommands[i]);
                    command.modelMatrix = new Matrix4();
                    command.boundingVolume = new BoundingSphere();
                    collection._drawCommands.push(command);

                    if (allowPicking) {
                        command = clone(pickCommands[i]);
                        command.modelMatrix = new Matrix4();
                        command.boundingVolume = new BoundingSphere();
                        collection._pickCommands.push(command);
                    }
                }
            }
        }
    }

    function updateCommands(collection) {
        // Only applies when instancing is disabled. The instanced shader handles node transformations.
        if (collection._instancingEnabled) {
            return;
        }

        var i, j;
        var modelCommands = collection._modelCommands;
        var commandCount = modelCommands.length;
        var instanceCount = collection.instanceCount;
        var allowPicking = collection.allowPicking;

        for (i = 0; i < commandCount; ++i) {
            var command = modelCommands[i];
            for (j = 0; j < instanceCount; ++j) {
                var commandIndex = i*instanceCount+j;
                var drawCommand = collection._drawCommands[commandIndex];
                var instanceMatrix = collection._instances[j].modelMatrix;
                var nodeMatrix = command.modelMatrix;
                var modelMatrix = drawCommand.modelMatrix;
                Matrix4.multiplyTransformation(instanceMatrix, nodeMatrix, modelMatrix);

                var nodeBoundingSphere = command.boundingVolume;
                var boundingSphere = drawCommand.boundingVolume;
                BoundingSphere.transform(nodeBoundingSphere, instanceMatrix, boundingSphere);

                if (allowPicking) {
                    var pickCommand = collection._pickCommands[commandIndex];
                    Matrix4.clone(modelMatrix, pickCommand.modelMatrix);
                    BoundingSphere.clone(boundingSphere, pickCommand.boundingVolume);
                }
            }
        }
    }

    function getModelCommands(model) {
        var nodeCommands = model._nodeCommands;
        var length = nodeCommands.length;
        var i;
        var nc;

        var drawCommands = [];
        var pickCommands = [];

        for (i = 0; i < length; ++i) {
            nc = nodeCommands[i];
            if (nc.show) {
                drawCommands.push(nc.command);
                pickCommands.push(nc.pickCommand);
            }
        }

        return {
            draw: drawCommands,
            pick: pickCommands
        };
    }

    ModelInstanceCollection.prototype.update = function(context, frameState, commandList) {
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        if (this._show === false) {
            return;
        }

        if (this.instanceCount === 0) {
            return;
        }

        this._instancingEnabled = context.instancedArrays;

        if (this._state === LoadState.NEEDS_LOAD) {
            this._state = LoadState.LOADING;
            createModel(context, frameState, commandList, this);
        }

        var model = this._model;
        model.update(context, frameState, []);

        if (model._ready && (this._state === LoadState.LOADING)) {
            this._state = LoadState.LOADED;
            this._ready = true;

            var modelCommands = getModelCommands(model);
            createCommands(this, modelCommands.draw, modelCommands.pick);

            this._readyPromise.resolve(this);
            return;
        }

        if (this._state !== LoadState.LOADED) {
            return;
        }

        // If any node changes due to an animation, update the commands. This could be inefficient if the model is
        // composed of many nodes and only one changes, however it is probably fine in the general use case.
        if (model._maxDirtyNumber > 0) {
            updateCommands(this);
        }

        var passes = frameState.passes;
        var commands;
        var commandCount;
        var i;

        if (passes.render) {
            commands = this._drawCommands;
            commandCount = commands.length;
            for (i = 0; i < commandCount; i++) {
                commandList.push(commands[i]);
            }
        } else if (passes.pick) {
            commands = this._pickCommands;
            commandCount = commands.length;
            for (i = 0; i < commandCount; i++) {
                commandList.push(commands[i]);
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
     * @see ModelInstanceCollection#destroy
     */
    ModelInstanceCollection.prototype.isDestroyed = function() {
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
     * @see ModelInstanceCollection#isDestroyed
     *
     * @example
     * instanceCollection = instanceCollection && instanceCollection.destroy();
     */
    ModelInstanceCollection.prototype.destroy = function() {
        this._model.destroy();

        return destroyObject(this);
    };

    return ModelInstanceCollection;
});
