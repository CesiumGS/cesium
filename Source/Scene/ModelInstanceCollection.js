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
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/RuntimeError',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../ThirdParty/when',
        './Cesium3DTileBatchTable',
        './Model',
        './ModelInstance',
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
        CesiumMath,
        Matrix4,
        PrimitiveType,
        RuntimeError,
        Buffer,
        BufferUsage,
        DrawCommand,
        ShaderSource,
        when,
        Cesium3DTileBatchTable,
        Model,
        ModelInstance,
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
     * @param {String} [options.url] The url to the .gltf file.
     * @param {Object} [options.headers] HTTP headers to send with the request.
     * @param {Object|ArrayBuffer|Uint8Array} [options.gltf] The object for the glTF JSON or an arraybuffer of Binary glTF defined by the CESIUM_binary_glTF extension.
     * @param {String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
     * @param {Boolean} [options.dynamic] Collection is set to stream instance data every frame.
     * @param {Boolean} [options.show=true] Determines if the collection will be shown.
     * @param {Boolean} [options.allowPicking=false] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
     * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for the collection.
     * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the instances in wireframe.
     *
     * @exception {DeveloperError} Must specify either <options.gltf> or <options.url>, but not both.
     * @exception {DeveloperError} Shader program cannot be optimized for instancing. Parameters cannot have any of the following semantics: MODEL, MODELINVERSE, MODELVIEWINVERSE, MODELVIEWPROJECTIONINVERSE, MODELINVERSETRANSPOSE.
     *
     * @private
     */
    var ModelInstanceCollection = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.gltf) && !defined(options.url)) {
            throw new DeveloperError('Either options.gltf or options.url is required.');
        }

        if (defined(options.gltf) && defined(options.url)) {
            throw new DeveloperError('Cannot pass in both options.gltf and options.url.');
        }
        //>>includeEnd('debug');

        this._instancingSupported = false;
        this._dynamic = defaultValue(options.dynamic, false);
        this._show = defaultValue(options.show, true);
        this._allowPicking = defaultValue(options.allowPicking, true);
        this._cull = defaultValue(options.cull, true);
        this._ready = false;
        this._readyPromise = when.defer();
        this._state = LoadState.NEEDS_LOAD;

        var instances = defaultValue(options.instances, []);
        var length = instances.length;
        var batchTable = options.batchTable;
        if (!defined(batchTable)) {
            batchTable = new Cesium3DTileBatchTable(this, length);
        }
        this._batchTable = batchTable;
        this._pickPrimitive = options.pickPrimitive;

        this._instances = new Array(length);
        for (var i = 0; i < length; ++i) {
            this._instances[i] = new ModelInstance(instances[i], this, i, this._pickPrimitive);
        }

        this._model = undefined;
        this._vertexBufferValues = undefined;
        this._vertexBuffer = undefined;
        this._createVertexBuffer = true;
        this._vertexBufferDirty = false;
        this._instancedUniformsByProgram = undefined;

        // Set to true if nodes in the model have off-center transforms. When false, the vertex shader can be optimized.
        this._offCenter = undefined;

        this._drawCommands = [];
        this._pickCommands = [];
        this._modelCommands = undefined;

        this._boundingVolume = options.boundingVolume;
        this._boundingVolumeModel = new Matrix4();
        this._boundingVolumeModelView = new Matrix4();

        // Passed on to Model
        this._url = options.url;
        this._headers = options.headers;
        this._gltf = options.gltf;
        this._basePath = options.basePath;
        this._asynchronous = options.asynchronous;

        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);
        this._debugShowBoundingVolume = false;

        this.debugWireframe = defaultValue(options.debugWireframe, false);
        this._debugWireframe = false;
    };

    defineProperties(ModelInstanceCollection.prototype, {
        show : {
            get : function() {
                return this._show;
            }
        },
        allowPicking : {
            get : function() {
                return this._allowPicking;
            }
        },
        length : {
            get : function() {
                return this._instances.length;
            }
        },
        activeAnimations : {
            get : function() {
                return this._model.activeAnimations;
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

    ModelInstanceCollection.prototype.getModel = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index) || (index < 0) || (index >= this.length)) {
            throw new DeveloperError('index is required and between zero and length - 1 (' + (this.length - 1) + ').');
        }
        //>>includeEnd('debug');

        return this._instances[index];
    };

    ModelInstanceCollection.prototype._updateInstance = function(instance) {
        // PERFORMANCE_IDEA: do sub-commits based on the instance's index instead of updating the whole buffer
        this._vertexBufferDirty = true;
    };

    ModelInstanceCollection.prototype.add = function(instance) {
        var i = new ModelInstance(instance, this, this.length, this._pickPrimitive);
        this._instances.push(i);
        this._vertexBufferDirty = true;
        this._createVertexBuffer = true;
        return i;
    };

    // TODO : maybe this whole step should be a pre-process as part of the 3d tile toolchain
    function isOffCenter(collection) {
        if (defined(collection._offCenter)) {
            return collection._offCenter;
        }

        var nodes = collection._model._runtime.nodes;
        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                if(!Matrix4.equalsEpsilon(nodes[name].publicNode._matrix, Matrix4.IDENTITY, CesiumMath.EPSILON2)) {
                    collection._offCenter = true;
                    return true;
                }
            }
        }
        collection._offCenter = false;
        return false;
    }

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
                                    //>>includeStart('debug', pragmas.debug);
                                    throw new DeveloperError('Shader program cannot be optimized for instancing. ' +
                                        'Parameter "' + parameter + '" in program "' + programName +
                                        '" uses unsupported semantic "' + semantic + '"'
                                    );
                                    //>>includeEnd('debug');
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
            var offCenter = isOffCenter(collection);
            var regex;

            var renamedSource = ShaderSource.replaceMain(vs, 'czm_old_main');

            var globalVarsHeader = '';
            var globalVarsMain = '';
            for (var uniform in instancedUniforms) {
                if (instancedUniforms.hasOwnProperty(uniform)) {
                    var semantic = instancedUniforms[uniform];
                    var varName;
                    if (semantic === 'MODELVIEW') {
                        varName = 'czm_instanced_modelView';
                    } else if (semantic === 'MODELVIEWPROJECTION') {
                        varName = 'czm_instanced_modelViewProjection';
                        globalVarsHeader += 'mat4 czm_instanced_modelViewProjection;\n';
                        globalVarsMain += 'czm_instanced_modelViewProjection = czm_projection * czm_instanced_modelView;\n';
                    } else if (semantic === 'MODELVIEWINVERSETRANSPOSE') {
                        varName = 'czm_instanced_modelViewInverseTranspose';
                        globalVarsHeader += 'mat3 czm_instanced_modelViewInverseTranspose;\n';
                        globalVarsMain += 'czm_instanced_modelViewInverseTranspose = mat3(czm_instanced_modelView);\n';
                    }

                    // Remove the uniform declaration
                    regex = new RegExp('uniform.*' + uniform + '.*');
                    renamedSource = renamedSource.replace(regex, '');

                    // Replace all occurrences of the uniform with the global variable
                    regex = new RegExp(uniform + '\\b', 'g');
                    renamedSource = renamedSource.replace(regex, varName);
                }
            }

            var uniforms = '';
            if (!dynamic) {
                uniforms += 'uniform mat4 czm_instanced_collectionModelView;\n';
            }
            if (offCenter) {
                uniforms += 'uniform mat4 czm_instanced_nodeTransform;\n';
            }

            // When dynamic, czm_instanced_model is the modelView matrix.
            // Otherwise, czm_instanced_model is the model's local offset from the bounding volume.
            // czm_instanced_nodeTransform is the local offset of the node within the model
            var modelView = '';
            if (dynamic && offCenter) {
                modelView = 'czm_instanced_modelView = czm_instanced_model * czm_instanced_nodeTransform;\n';
            } else if (dynamic && !offCenter) {
                modelView = 'czm_instanced_modelView = czm_instanced_model;\n';
            } else if (!dynamic && offCenter) {
                modelView = 'czm_instanced_modelView = czm_instanced_collectionModelView * czm_instanced_model * czm_instanced_nodeTransform;\n';
            } else if (!dynamic && !offCenter) {
                modelView = 'czm_instanced_modelView = czm_instanced_collectionModelView * czm_instanced_model;\n';
            }

            var newMain =
                uniforms +
                globalVarsHeader +
                'mat4 czm_instanced_modelView;\n' +
                'attribute vec4 czm_modelMatrixRow0;\n' +
                'attribute vec4 czm_modelMatrixRow1;\n' +
                'attribute vec4 czm_modelMatrixRow2;\n' +
                'attribute float a_batchId;\n' +
                renamedSource +
                'void main()\n' +
                '{\n' +
                '    mat4 czm_instanced_model = mat4(czm_modelMatrixRow0.x, czm_modelMatrixRow1.x, czm_modelMatrixRow2.x, 0.0, czm_modelMatrixRow0.y, czm_modelMatrixRow1.y, czm_modelMatrixRow2.y, 0.0, czm_modelMatrixRow0.z, czm_modelMatrixRow1.z, czm_modelMatrixRow2.z, 0.0, czm_modelMatrixRow0.w, czm_modelMatrixRow1.w, czm_modelMatrixRow2.w, 1.0);\n' +
                     modelView +
                     globalVarsMain +
                '    czm_old_main();\n' +
                '}';

            vertexShaderCached = newMain;
            return collection._batchTable.getVertexShaderCallback()(newMain);
        };
    }

    function getFragmentShaderCallback(collection) {
        return function(fs) {
            return collection._batchTable.getFragmentShaderCallback()(fs);
        };
    }

    function getFragmentShaderNonInstancedCallback() {
        return function(fs) {
            var renamedSource = ShaderSource.replaceMain(fs, 'czm_old_main');
            var newMain =
                'uniform vec4 czm_color;\n' +
                'void main()\n' +
                '{\n' +
                '    czm_old_main();\n' +
                '    gl_FragColor.rgb *= czm_color.rgb;\n' +
                '}';

            return renamedSource + '\n' + newMain;
        };
    }
    
    function getPickVertexShaderCallback(collection) {
        return function (vs) {
            // Use the vertex shader that was generated earlier
            return collection._batchTable.getPickVertexShaderCallback()(vertexShaderCached);
        };
    }

    function getPickFragmentShaderCallback(collection) {
        return function(fs) {
            return collection._batchTable.getPickFragmentShaderCallback()(fs);
        };
    }

    function createBoundsModelViewFunction(collection, context) {
        return function() {
            return Matrix4.multiplyTransformation(context.uniformState.view, collection._boundingVolumeModel, collection._boundingVolumeModelView);
        };
    }

    function createNodeTransformFunction(node) {
        return function() {
            return node.computedMatrix;
        };
    }

    function getUniformMapCallback(collection, context) {
        return function(uniformMap, programName, node) {
            uniformMap = clone(uniformMap);

            if (!collection._dynamic) {
                uniformMap.czm_instanced_collectionModelView = createBoundsModelViewFunction(collection, context);
            }

            if (isOffCenter(collection)) {
                uniformMap.czm_instanced_nodeTransform = createNodeTransformFunction(node);
            }

            // Remove instanced uniforms from the uniform map
            var instancedUniforms = getInstancedUniforms(collection, programName);
            for (var uniform in instancedUniforms) {
                if (instancedUniforms.hasOwnProperty(uniform)) {
                    delete uniformMap[uniform];
                }
            }

            return collection._batchTable.getUniformMapCallback()(uniformMap);
        };
    }

    function getPickUniformMapCallback(collection) {
        return function(uniformMap) {
            return collection._batchTable.getPickUniformMapCallback()(uniformMap);
        };
    }

    var instanceMatrix = new Matrix4();

    function updateVertexBuffer(collection, context) {
        if (!collection._instancingSupported) {
            return;
        }

        var instanceBufferData = collection._vertexBufferValues;
        var vertexBuffer = collection._vertexBuffer;
        var createVertexBuffer = collection._createVertexBuffer;

        var instancesLength = collection.length;
        var dynamic = collection._dynamic;
        var viewMatrix = context.uniformState.view;
        var center = dynamic ? Cartesian3.ZERO : collection._boundingVolume.center;

        if (createVertexBuffer) {
            instanceBufferData = new Float32Array(instancesLength * 13);
        }

        for (var i = 0; i < instancesLength; ++i) {
            var instance = collection._instances[i];
            var modelMatrix = instance.modelMatrix;

            if (dynamic) {
                Matrix4.multiplyTransformation(viewMatrix, modelMatrix, instanceMatrix);
            } else {
                instanceMatrix = modelMatrix;
            }

            var offset = i * 13;

            // First three rows of the model matrix
            instanceBufferData[offset + 0]  = instanceMatrix[0];
            instanceBufferData[offset + 1]  = instanceMatrix[4];
            instanceBufferData[offset + 2]  = instanceMatrix[8];
            instanceBufferData[offset + 3]  = instanceMatrix[12] - center.x;
            instanceBufferData[offset + 4]  = instanceMatrix[1];
            instanceBufferData[offset + 5]  = instanceMatrix[5];
            instanceBufferData[offset + 6]  = instanceMatrix[9];
            instanceBufferData[offset + 7]  = instanceMatrix[13] - center.y;
            instanceBufferData[offset + 8]  = instanceMatrix[2];
            instanceBufferData[offset + 9]  = instanceMatrix[6];
            instanceBufferData[offset + 10] = instanceMatrix[10];
            instanceBufferData[offset + 11] = instanceMatrix[14] - center.z;
            instanceBufferData[offset + 12] = instance._batchId;
        }

        if (createVertexBuffer) {
            vertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : instanceBufferData,
                usage : dynamic ? BufferUsage.STREAM_DRAW : BufferUsage.STATIC_DRAW
            });
            collection._vertexBuffer = vertexBuffer;
            collection._vertexBufferValues = instanceBufferData;
            collection._createVertexBuffer = false;
        } else {
            vertexBuffer.copyFromArrayView(instanceBufferData);
        }
    }

    function createBoundingVolume(collection) {
        if (!defined(collection._boundingVolume)) {
            var instancesLength = collection.length;
            var points = new Array(instancesLength);
            for (var i = 0; i < instancesLength; ++i) {
                var translation = new Cartesian3();
                Matrix4.getTranslation(collection._instances[i].modelMatrix, translation);
                points[i] = translation;
            }

            var boundingSphere = new BoundingSphere();
            BoundingSphere.fromPoints(points, boundingSphere);
            collection._boundingVolume = boundingSphere;
        }

        Matrix4.fromTranslation(collection._boundingVolume.center, collection._boundingVolumeModel);
    }

    function createModel(collection, context) {
        var instancingSupported = collection._instancingSupported;
        var modelOptions = {
            url : collection._url,
            headers : collection._headers,
            gltf : collection._gltf,
            basePath : collection._basePath,
            cacheKey : undefined,
            asynchronous : collection._asynchronous,
            allowPicking : collection._allowPicking,
            releaseGltfJson : false,
            precreatedAttributes : undefined,
            vertexShaderLoaded : undefined,
            fragmentShaderLoaded : undefined,
            uniformMapLoaded : undefined,
            pickVertexShaderLoaded : undefined,
            pickFragmentShaderLoaded : undefined,
            pickUniformMapLoaded : undefined,
            ignoreCommands : false
        };

        createBoundingVolume(collection);

        if (instancingSupported) {
            updateVertexBuffer(collection, context);

            var componentSizeInBytes = ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT);
            var instancedAttributes = {
                czm_modelMatrixRow0 : {
                    index                  : 0, // updated in Model
                    vertexBuffer           : collection._vertexBuffer,
                    componentsPerAttribute : 4,
                    componentDatatype      : ComponentDatatype.FLOAT,
                    normalize              : false,
                    offsetInBytes          : 0,
                    strideInBytes          : componentSizeInBytes * 13,
                    instanceDivisor        : 1
                },
                czm_modelMatrixRow1 : {
                    index                  : 0, // updated in Model
                    vertexBuffer           : collection._vertexBuffer,
                    componentsPerAttribute : 4,
                    componentDatatype      : ComponentDatatype.FLOAT,
                    normalize              : false,
                    offsetInBytes          : componentSizeInBytes * 4,
                    strideInBytes          : componentSizeInBytes * 13,
                    instanceDivisor        : 1
                },
                czm_modelMatrixRow2 : {
                    index                  : 0, // updated in Model
                    vertexBuffer           : collection._vertexBuffer,
                    componentsPerAttribute : 4,
                    componentDatatype      : ComponentDatatype.FLOAT,
                    normalize              : false,
                    offsetInBytes          : componentSizeInBytes * 8,
                    strideInBytes          : componentSizeInBytes * 13,
                    instanceDivisor        : 1
                },
                a_batchId : {
                    index                  : 0, // updated in Model
                    vertexBuffer           : collection._vertexBuffer,
                    componentsPerAttribute : 1,
                    componentDatatype      : ComponentDatatype.FLOAT,
                    normalize              : false,
                    offsetInBytes          : componentSizeInBytes * 12,
                    strideInBytes          : componentSizeInBytes * 13,
                    instanceDivisor        : 1
                }
            };

            modelOptions.precreatedAttributes = instancedAttributes;
            modelOptions.vertexShaderLoaded = getVertexShaderCallback(collection);
            modelOptions.fragmentShaderLoaded = getFragmentShaderCallback(collection);
            modelOptions.uniformMapLoaded = getUniformMapCallback(collection, context);
            modelOptions.pickVertexShaderLoaded = getPickVertexShaderCallback(collection);
            modelOptions.pickFragmentShaderLoaded = getPickFragmentShaderCallback(collection);
            modelOptions.pickUniformMapLoaded = getPickUniformMapCallback(collection);
            modelOptions.ignoreCommands = true;
            modelOptions.releaseGltfJson = true;

            // Collections cannot share the same models, so create a unique cache key
            modelOptions.cacheKey = 'ModelInstanceCollection' + Math.random();
        } else {
            modelOptions.fragmentShaderLoaded = getFragmentShaderNonInstancedCallback();
        }

        if (defined(collection._url)) {
            collection._model = Model.fromGltf(modelOptions);
        } else {
            collection._model = new Model(modelOptions);
        }
    }

    function createColorFunction(instance) {
        return function() {
            return instance.color;
        };
    }

    function createPickColorFunction(instance, context) {
        return function() {
            return instance.getPickId(context).color; // Fix this
        };
    }

    function createCommands(collection, drawCommands, pickCommands, context) {
        collection._modelCommands = drawCommands;

        var i;
        var j;
        var command;
        var commandsLength = drawCommands.length;
        var instancesLength = collection.length;
        var allowPicking = collection.allowPicking;

        var boundingVolume = collection._boundingVolume;

        if (collection._instancingSupported) {
            for (i = 0; i < commandsLength; ++i) {
                command = clone(drawCommands[i]);
                command.instanceCount = instancesLength;
                command.boundingVolume = boundingVolume;
                command.cull = collection._cull;
                collection._drawCommands.push(command);

                if (allowPicking) {
                    command = clone(pickCommands[i]);
                    command.instanceCount = instancesLength;
                    command.boundingVolume = boundingVolume;
                    command.cull = collection._cull;
                    collection._pickCommands.push(command);
                }
            }
        } else {
            // When instancing is disabled, create commands for every instance.
            var instances = collection._instances;
            for (i = 0; i < commandsLength; ++i) {
                for (j = 0; j < instancesLength; ++j) {
                    command = clone(drawCommands[i]);
                    command.modelMatrix = new Matrix4();
                    command.boundingVolume = new BoundingSphere();
                    command.cull = collection._cull;
                    command.uniformMap = clone(command.uniformMap);
                    command.uniformMap.czm_color = createColorFunction(instances[j]);
                    collection._drawCommands.push(command);

                    if (allowPicking) {
                        command = clone(pickCommands[i]);
                        command.modelMatrix = new Matrix4();
                        command.boundingVolume = new BoundingSphere();
                        command.cull = collection._cull;
                        command.uniformMap = clone(command.uniformMap);
                        command.uniformMap.czm_pickColor = createPickColorFunction(instances[j], context);
                        collection._pickCommands.push(command);
                    }
                }
            }
        }
    }

    function updateWireframe(collection) {
        if (collection._debugWireframe !== collection.debugWireframe) {
            collection._debugWireframe = collection.debugWireframe;

            // This assumes the original primitive was TRIANGLES and that the triangles
            // are connected for the wireframe to look perfect.
            var primitiveType = collection.debugWireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES;
            var commands = collection._drawCommands;
            var length = commands.length;
            for (var i = 0; i < length; ++i) {
                commands[i].primitiveType = primitiveType;
            }
        }
    }
    function updateShowBoundingVolume(collection) {
        if (collection.debugShowBoundingVolume !== collection._debugShowBoundingVolume) {
            collection._debugShowBoundingVolume = collection.debugShowBoundingVolume;

            var commands = collection._drawCommands;
            var length = commands.length;
            for (var i = 0; i < length; ++i) {
                commands[i].debugShowBoundingVolume = collection.debugShowBoundingVolume;
            }
        }
    }

    function updateCommands(collection) {
        // Only applies when instancing is disabled. The instanced shader handles node transformations.
        if (collection._instancingSupported) {
            return;
        }

        var modelCommands = collection._modelCommands;
        var commandsLength = modelCommands.length;
        var instancesLength = collection.length;
        var allowPicking = collection.allowPicking;

        for (var i = 0; i < commandsLength; ++i) {
            var modelCommand = modelCommands[i];
            for (var j = 0; j < instancesLength; ++j) {
                var commandIndex = i * instancesLength + j;
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

        var drawCommands = [];
        var pickCommands = [];

        for (var i = 0; i < length; ++i) {
            var nc = nodeCommands[i];
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

    var emptyCommandList = [];

    ModelInstanceCollection.prototype.update = function(context, frameState, commandList) {
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        if (!this.show) {
            return;
        }

        if (this.length === 0) {
            return;
        }

        var instancingSupported = context.instancedArrays;
        this._instancingSupported = instancingSupported;

        if (this._state === LoadState.NEEDS_LOAD) {
            this._state = LoadState.LOADING;
            createModel(this, context);
        }

        if (instancingSupported) {
            this._batchTable.update(context, frameState);
        }

        var model = this._model;
        model.update(context, frameState, emptyCommandList);

        if (model.ready && (this._state === LoadState.LOADING)) {
            this._state = LoadState.LOADED;
            this._ready = true;

            var modelCommands = getModelCommands(model);
            createCommands(this, modelCommands.draw, modelCommands.pick, context);

            this.readyPromise.resolve(this);
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

        if (this._dynamic || this._vertexBufferDirty) {
            updateVertexBuffer(this, context);
            this._vertexBufferDirty = false;
        }

        updateWireframe(this);
        updateShowBoundingVolume(this);

        var passes = frameState.passes;
        var commands = passes.render ? this._drawCommands : this._pickCommands;
        var commandsLength = commands.length;
        var i;
        
        if (instancingSupported) {
            for (i = 0; i < commandsLength; ++i) {
                commandList.push(commands[i]);
            }
        } else {
            // Don't push commands if the instance's show is false
            var instances = this._instances;
            var instancesLength = this.length;
            for (i = 0; i < commandsLength; ++i) {
                var instance = instances[i%instancesLength];
                if (instance.show) {
                    commandList.push(commands[i]);
                }
            }
        }
    };

    ModelInstanceCollection.prototype.isDestroyed = function() {
        return false;
    };

    ModelInstanceCollection.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();

        return destroyObject(this);
    };

    return ModelInstanceCollection;
});
