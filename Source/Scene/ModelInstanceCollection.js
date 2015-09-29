/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/clone',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Core/RuntimeError',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../ThirdParty/when',
        './Model',
        './SceneMode'
    ], function(
        BoundingSphere,
        Cartesian3,
        clone,
        Color,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        destroyObject,
        Matrix4,
        RuntimeError,
        Buffer,
        BufferUsage,
        DrawCommand,
        ShaderSource,
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
     * @param {Boolean} [options.dynamic] Collection is set to stream instance data every frame.
     * @param {Object} [options.headers] HTTP headers to send with the request.
     * @param {Boolean} [options.show=true] Determines if the collection will be shown.
     * @param {Boolean} [options.allowPicking=false] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for the collection.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the instances in wireframe.
     *
     * @private
     */
    var ModelInstanceCollection = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._instances = defaultValue(options.instances, []);
        this._instancingSupported = false;
        this._dynamic = defaultValue(options.dynamic, false);
        this._show = options.show;
        this._allowPicking = defaultValue(options.allowPicking, false);
        this._ready = false;
        this._readyPromise = when.defer();
        this._state = LoadState.NEEDS_LOAD;

        this._model = undefined;
        this._typedArray = undefined;
        this._vertexBuffer = undefined;
        this._createVertexBuffer = true;
        this._instancedAttributes = undefined;
        this._instancedUniformsByProgram = undefined;

        this._drawCommands = [];
        this._pickCommands = [];
        this._modelCommands = undefined;

        this._boundingSphere = new BoundingSphere();
        this._boundingSphereModel = new Matrix4();
        this._boundingSphereModelView = new Matrix4();

        // Passed on to Model
        this._url = options.url;
        this._cacheKey = options.cacheKey;
        this._headers = options.headers;
        this._asynchronous = options.asynchronous;
        this._debugShowBoundingVolume = options.debugShowBoundingVolume;
        this._debugWireframe = options.debugWireframe;
    };

    defineProperties(ModelInstanceCollection.prototype, {
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
        instancesLength : {
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

    function getInstancedUniforms(collection, programName) {
        if (defined(collection._instancedUniformsByProgram)) {
            return collection._instancedUniformsByProgram[programName];
        }

        var instancedUniformsByProgram = {};

        var modelSemantics = ['MODEL', 'MODELVIEW', 'MODELVIEWPROJECTION', 'MODELINVERSE', 'MODELVIEWINVERSE', 'MODELVIEWPROJECTIONINVERSE', 'MODELINVERSETRANSPOSE', 'MODELVIEWINVERSETRANSPOSE'];
        var supportedSemantics = ['MODELVIEW', 'MODELVIEWPROJECTION', 'MODELVIEWINVERSETRANSPOSE'];

        var gltf = collection._model.gltf;
        var techniques = gltf.techniques;
        for (var techniqueName in techniques) {
            if (techniques.hasOwnProperty(techniqueName)) {
                var technique = techniques[techniqueName];
                var parameters = technique.parameters;
                var pass = technique.passes[technique.pass];
                var instanceProgram = pass.instanceProgram;
                var instanceProgramName = instanceProgram.program;
                // Different techniques may share the same program, skip if already processed.
                // This assumes techniques that share a program do not declare different semantics for the same uniforms.
                if (!defined(instancedUniformsByProgram[instanceProgramName])) {
                    var uniformMap = {};
                    instancedUniformsByProgram[instanceProgramName] = uniformMap;
                    var uniforms = instanceProgram.uniforms;
                    for (var uniformName in uniforms) {
                        if (uniforms.hasOwnProperty(uniformName)) {
                            var parameterName = uniforms[uniformName];
                            var parameter = parameters[parameterName];
                            var semantic = parameter.semantic;
                            if (defined(semantic) && (modelSemantics.indexOf(semantic) > -1)) {
                                if (supportedSemantics.indexOf(semantic) > -1) {
                                    uniformMap[uniformName] = semantic;
                                } else {
                                    // TODO : Maybe fail silently and fallback to a different approach
                                    throw new RuntimeError('Model shader cannot be optimized for instancing');
                                }
                            }
                        }
                    }
                }
            }
        }

        collection._instancedUniformsByProgram = instancedUniformsByProgram;
        return instancedUniformsByProgram[programName];
    }

    var vertexShaderCached;

    function getVertexShaderCallback(collection) {
        return function(vs, programName) {
            var instancedUniforms = getInstancedUniforms(collection, programName);
            var dynamic = collection._dynamic;

            // All per-instance uniforms will be replaced with global variables.
            var shaderHeader = '';
            var shaderMain = '';
            var regex;

            // Add instanced attributes
            var instancedAttributes = collection._instancedAttributes;
            for (var attrName in instancedAttributes) {
                if (instancedAttributes.hasOwnProperty(attrName)) {
                    shaderHeader += 'attribute vec4 ' + attrName + ';\n';
                }
            }

            shaderHeader += 'uniform mat4 czm_instanced_nodeLocal;\n';
            shaderHeader += 'uniform mat4 czm_instanced_boundsModelView;\n';
            shaderHeader += 'mat4 czm_instanced_modelView;\n';
            shaderMain += 'mat4 czm_instanced_model = mat4(czm_modelMatrixRow0.x, czm_modelMatrixRow1.x, czm_modelMatrixRow2.x, 0.0, czm_modelMatrixRow0.y, czm_modelMatrixRow1.y, czm_modelMatrixRow2.y, 0.0, czm_modelMatrixRow0.z, czm_modelMatrixRow1.z, czm_modelMatrixRow2.z, 0.0, czm_modelMatrixRow0.w, czm_modelMatrixRow1.w, czm_modelMatrixRow2.w, 1.0);\n';

            if (dynamic) {
                // czm_instanced_model is the modelView matrix
                shaderMain += 'czm_instanced_modelView = czm_instanced_model * czm_instanced_nodeLocal;\n';
            } else {
                // czm_instanced_model is the model's local offset from the bounding volume
                shaderMain += 'czm_instanced_modelView = czm_instanced_boundsModelView * czm_instanced_model * czm_instanced_nodeLocal;\n';
            }

            for (var uniform in instancedUniforms) {
                if (instancedUniforms.hasOwnProperty(uniform)) {
                    var semantic = instancedUniforms[uniform];

                    var varName;
                    if (semantic === 'MODELVIEW') {
                        varName = 'czm_instanced_modelView';
                    } else if (semantic === 'MODELVIEWPROJECTION') {
                        varName = 'czm_instanced_modelViewProjection';
                        shaderHeader += 'mat4 czm_instanced_modelViewProjection;\n';
                        shaderMain += 'czm_instanced_modelViewProjection = czm_projection * czm_instanced_modelView;\n';
                    } else if (semantic === 'MODELVIEWINVERSETRANSPOSE') {
                        varName = 'czm_instanced_modelViewInverseTranspose';
                        shaderHeader += 'mat3 czm_instanced_modelViewInverseTranspose;\n';
                        shaderMain += 'czm_instanced_modelViewInverseTranspose = mat3(czm_instanced_modelView);\n';
                    }

                    // Remove the uniform declaration
                    regex = new RegExp('uniform.*' + uniform + '.*');
                    vs = vs.replace(regex, '');

                    // Replace all occurrences of the uniform with the global variable
                    regex = new RegExp(uniform + '\\b', 'g');
                    vs = vs.replace(regex, varName);
                }
            }

            // Place the instancing code into the shader
            var instancingCode = shaderHeader + 'void main() {\n' + shaderMain;
            vs = vs.replace(/void\s+main\s*\([\s\S]*?{/, instancingCode);

            vertexShaderCached = vs;
            return vs;
        };
    }

    function getPickVertexShaderCallback() {
        return function (vs) {
            // Use the vertex shader that was generated earlier
            vs = vertexShaderCached;
            var pickCode =
                'varying vec4 czm_pickColor;\n' +
                'void main() {\n' +
                'vec4 pickColor = czm_instanceData;\n' +
                'czm_pickColor = pickColor;\n';
            return vs.replace(/void\s+main\s*\([\s\S]*?{/, pickCode);
        };
    }

    function getPickFragmentShaderCallback() {
        return function(fs) {
            return ShaderSource.createPickFragmentShaderSource(fs, 'varying');
        };
    }

    function createBoundsModelViewFunction(collection, context) {
        return function() {
            return Matrix4.multiplyTransformation(context.uniformState.view, collection._boundingSphereModel, collection._boundingSphereModelView);
        };
    }

    function createNodeLocalFunction(node) {
        return function() {
            return node.computedMatrix;
        };
    }

    function getUniformMapCallback(collection, context) {
        return function(uniformMap, programName, node) {
            uniformMap = combine(uniformMap, {
                czm_instanced_boundsModelView : (collection._dynamic ? undefined : createBoundsModelViewFunction(collection, context)),
                czm_instanced_nodeLocal : createNodeLocalFunction(node)
            });

            // Remove instanced uniforms from the uniform map
            var instancedUniforms = getInstancedUniforms(collection, programName);
            for (var uniform in instancedUniforms) {
                if (instancedUniforms.hasOwnProperty(uniform)) {
                    uniformMap[uniform] = undefined;
                }
            }

            return uniformMap;
        };
    }

    function getPickUniformMapCallback() {
        return function(uniformMap) {
            uniformMap.czm_pickColor = undefined;
            return uniformMap;
        };
    }

    var instanceMatrix = new Matrix4();

    function updateVertexBuffer(collection, context) {
        if (!collection._instancingSupported) {
            return;
        }

        var typedArray = collection._typedArray;
        var vertexBuffer = collection._vertexBuffer;
        var createVertexBuffer = collection._createVertexBuffer;

        var instancesLength = collection.instancesLength;
        var dynamic = collection._dynamic;
        var viewMatrix = context.uniformState.view;
        var center = dynamic ? Cartesian3.ZERO : collection._boundingSphere.center;

        if (createVertexBuffer) {
            typedArray = new Float32Array(instancesLength * 16);
        }

        for (var i = 0; i < instancesLength; ++i) {
            var instance = collection._instances[i];
            var modelMatrix = instance.modelMatrix;
            var pickColor = defined(instance.pickId) ? instance.pickId.color : Color.WHITE;

            if (dynamic) {
                Matrix4.multiplyTransformation(viewMatrix, modelMatrix, instanceMatrix);
            } else {
                instanceMatrix = modelMatrix;
            }

            // First three rows of the model matrix
            typedArray[i * 16 + 0] = instanceMatrix[0];
            typedArray[i * 16 + 1] = instanceMatrix[4];
            typedArray[i * 16 + 2] = instanceMatrix[8];
            typedArray[i * 16 + 3] = instanceMatrix[12] - center.x;
            typedArray[i * 16 + 4] = instanceMatrix[1];
            typedArray[i * 16 + 5] = instanceMatrix[5];
            typedArray[i * 16 + 6] = instanceMatrix[9];
            typedArray[i * 16 + 7] = instanceMatrix[13] - center.y;
            typedArray[i * 16 + 8] = instanceMatrix[2];
            typedArray[i * 16 + 9] = instanceMatrix[6];
            typedArray[i * 16 + 10] = instanceMatrix[10];
            typedArray[i * 16 + 11] = instanceMatrix[14] - center.z;

            // Other instance data like pickColor, color, etc. Colors can be packed like in BillboardCollection as needed.
            typedArray[i * 16 + 12] = pickColor.red;
            typedArray[i * 16 + 13] = pickColor.green;
            typedArray[i * 16 + 14] = pickColor.blue;
            typedArray[i * 16 + 15] = pickColor.alpha;
        }

        if (createVertexBuffer) {
            var usage = dynamic ? BufferUsage.STREAM_DRAW : BufferUsage.STATIC_DRAW;
            vertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : typedArray,
                usage : usage
            });
            collection._vertexBuffer = vertexBuffer;
            collection._typedArray = typedArray;
            collection._createVertexBuffer = false;
        } else {
            vertexBuffer.copyFromArrayView(typedArray);
        }
    }

    function updateBoundingSphere(collection) {
        var points = [];
        var instancesLength = collection.instancesLength;
        for (var i = 0; i < instancesLength; i++) {
            var translation = new Cartesian3();
            Matrix4.getTranslation(collection._instances[i].modelMatrix, translation);
            points.push(translation);
        }

        var boundingSphere = collection._boundingSphere;
        BoundingSphere.fromPoints(points, boundingSphere);
        Matrix4.fromTranslation(boundingSphere.center, collection._boundingSphereModel);
    }

    function createModel(collection, context) {
        var i;
        var instancingSupported = collection._instancingSupported;
        var modelOptions = {
            url : collection._url,
            cacheKey : collection._cacheKey,
            headers : collection._headers,
            asynchronous : collection._asynchronous,
            debugShowBoundingVolume : collection._debugShowBoundingVolume,
            debugWireframe : collection._debugWireframe,
            allowPicking : collection._allowPicking,
            precreatedAttributes : undefined,
            vertexShaderLoaded : undefined,
            fragmentShaderLoaded : undefined,
            uniformMapLoaded : undefined,
            pickVertexShaderLoaded : undefined,
            pickFragmentShaderLoaded : undefined,
            pickUniformMapLoaded : undefined,
            ignoreCommands : false
        };

        updateBoundingSphere(collection);

        if (instancingSupported) {
            updateVertexBuffer(collection, context);

            var attributeNames = ['czm_modelMatrixRow0', 'czm_modelMatrixRow1', 'czm_modelMatrixRow2', 'czm_instanceData'];
            var componentSizeInBytes = ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT);
            var instancedAttributes = {};

            for (i = 0; i < 4; ++i) {
                instancedAttributes[attributeNames[i]] = {
                    index                  : 0, // updated in Model
                    vertexBuffer           : collection._vertexBuffer,
                    componentsPerAttribute : 4,
                    componentDatatype      : ComponentDatatype.FLOAT,
                    normalize              : false,
                    offsetInBytes          : componentSizeInBytes * 4 * i,
                    strideInBytes          : componentSizeInBytes * 16,
                    instanceDivisor        : 1
                };
            }

            collection._instancedAttributes = instancedAttributes;

            // Instanced models will create different renderer resources, so change the cache key.
            var url = collection._url;
            var cacheKey = defaultValue(collection._cacheKey, Model.getDefaultCacheKey(url));
            cacheKey += '(instanced)';

            modelOptions.precreatedAttributes = instancedAttributes;
            modelOptions.vertexShaderLoaded = getVertexShaderCallback(collection);
            modelOptions.uniformMapLoaded = getUniformMapCallback(collection, context);
            modelOptions.pickVertexShaderLoaded = getPickVertexShaderCallback();
            modelOptions.pickFragmentShaderLoaded = getPickFragmentShaderCallback();
            modelOptions.pickUniformMapLoaded = getPickUniformMapCallback();
            modelOptions.cacheKey = cacheKey;
            modelOptions.ignoreCommands = true;
        }

        collection._model = Model.fromGltf(modelOptions);
    }

    function createCommands(collection, drawCommands, pickCommands) {
        collection._modelCommands = drawCommands;

        var i;
        var j;
        var command;
        var commandsLength = drawCommands.length;
        var instancesLength = collection.instancesLength;
        var allowPicking = collection.allowPicking;

        var boundingSphere = collection._boundingSphere;
        var boundingSphereModel = collection._boundingSphereModel;
        boundingSphere.radius += collection._model._boundingSphere.radius;

        if (collection._instancingSupported) {
            for (i = 0; i < commandsLength; ++i) {
                command = clone(drawCommands[i]);
                command.instanceCount = instancesLength;
                command.modelMatrix = boundingSphereModel;
                command.boundingVolume = boundingSphere;
                collection._drawCommands.push(command);

                if (allowPicking) {
                    command = clone(pickCommands[i]);
                    command.instanceCount = instancesLength;
                    command.modelMatrix = boundingSphereModel;
                    command.boundingVolume = boundingSphere;
                    collection._pickCommands.push(command);
                }
            }
        } else {
            // When instancing is disabled, create commands for every instance.
            for (i = 0; i < commandsLength; ++i) {
                for (j = 0; j < instancesLength; ++j) {
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
        if (collection._instancingSupported) {
            return;
        }

        var i;
        var j;
        var modelCommands = collection._modelCommands;
        var commandsLength = modelCommands.length;
        var instancesLength = collection.instancesLength;
        var allowPicking = collection.allowPicking;

        for (i = 0; i < commandsLength; ++i) {
            var modelCommand = modelCommands[i];
            for (j = 0; j < instancesLength; ++j) {
                var commandIndex = i*instancesLength+j;
                var drawCommand = collection._drawCommands[commandIndex];
                var instanceMatrix = collection._instances[j].modelMatrix;
                var nodeMatrix = modelCommand.modelMatrix;
                var modelMatrix = drawCommand.modelMatrix;
                Matrix4.multiplyTransformation(instanceMatrix, nodeMatrix, modelMatrix);

                var nodeBoundingSphere = modelCommand.boundingVolume;
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

        if (this.instancesLength === 0) {
            return;
        }

        this._instancingSupported = context.instancedArrays;

        if (this._state === LoadState.NEEDS_LOAD) {
            this._state = LoadState.LOADING;
            createModel(this, context);
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

        if (this._dynamic) {
            updateVertexBuffer(this, context);
        }

        var passes = frameState.passes;
        var commands;
        var commandsLength;
        var i;

        if (passes.render) {
            commands = this._drawCommands;
            commandsLength = commands.length;
            for (i = 0; i < commandsLength; i++) {
                commandList.push(commands[i]);
            }
        } else if (passes.pick) {
            commands = this._pickCommands;
            commandsLength = commands.length;
            for (i = 0; i < commandsLength; i++) {
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
