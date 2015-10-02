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
        '../Core/PrimitiveType',
        '../Core/RuntimeError',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../ThirdParty/when',
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
        Matrix4,
        PrimitiveType,
        RuntimeError,
        Buffer,
        BufferUsage,
        DrawCommand,
        ShaderSource,
        when,
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

        this._instances = [];

        var instances = defaultValue(options.instances, []);
        var length = instances.length;
        for (var i = 0; i < length; i++) {
            this.add(instances[i]);
        }

        this._instancingSupported = false;
        this._dynamic = defaultValue(options.dynamic, false);
        this._show = defaultValue(options.show, true);
        this._allowPicking = defaultValue(options.allowPicking, true);
        this._ready = false;
        this._readyPromise = when.defer();
        this._state = LoadState.NEEDS_LOAD;

        this._model = undefined;
        this._instanceBufferData = undefined;
        this._vertexBuffer = undefined;
        this._createVertexBuffer = true;
        this._vertexBufferDirty = false;
        this._instancedUniformsByProgram = undefined;

        this._drawCommands = [];
        this._pickCommands = [];
        this._modelCommands = undefined;

        this._boundingSphere = new BoundingSphere();
        this._boundingSphereModel = new Matrix4();
        this._boundingSphereModelView = new Matrix4();

        // Passed on to Model
        this._url = options.url;
        this._headers = options.headers;
        this._gltf = options.gltf;
        this._basePath = options.basePath;
        this._cacheKey = options.cacheKey;
        this._asynchronous = options.asynchronous;

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
    };

    defineProperties(ModelInstanceCollection.prototype, {
        show : {
            get : function() {
                return this._show;
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
        length : {
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

    ModelInstanceCollection.prototype._updateInstance = function(instance) {
        // TODO : update the whole buffer for now, but later do sub-commits
        this._vertexBufferDirty = true;
    };

    ModelInstanceCollection.prototype.add = function(instance) {
        var instance = new ModelInstance(instance, this);
        instance._index = this.length;
        this._instances.push(instance);
        this._vertexBufferDirty = true;
        this._createVertexBuffer = true;

        return instance;
    };

    ModelInstanceCollection.prototype.remove = function(instance) {
        // TODO : finish later
    };

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
            var regex;

            var renamedSource = ShaderSource.replaceMain(vs, 'gltf_main');

            // TODO : can I add all these global vars and just let the shader compiler optimize them out
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

            var dataFromAttr =
                'const float SHIFT_LEFT8 = 256.0;\n' +
                'const float SHIFT_RIGHT8 = 1.0 / 256.0;\n' +
                '#ifdef RENDER_FOR_PICK\n' +
                'varying vec4 czm_pickColor;\n' +
                '#else\n' +
                'varying vec4 czm_color;\n' +
                '#endif\n' +
                'attribute vec4 czm_instanceData;\n' +
                'void czm_setColorShow() {\n' +
                '   #ifdef RENDER_FOR_PICK\n' +
                '   float temp = czm_instanceData.y;\n' +
                '   #else\n' +
                '   float temp = czm_instanceData.x;\n' +
                '   #endif\n' +
                '   vec4 color;\n' +
                '   temp = temp * SHIFT_RIGHT8;\n' +
                '   color.b = (temp - floor(temp)) * SHIFT_LEFT8;\n' +
                '   temp = floor(temp) * SHIFT_RIGHT8;\n' +
                '   color.g = (temp - floor(temp)) * SHIFT_LEFT8;\n' +
                '   color.r = floor(temp);\n' +
                '   temp = czm_instanceData.z * SHIFT_RIGHT8;\n' +
                '   #ifdef RENDER_FOR_PICK\n' +
                '   color.a = (temp - floor(temp)) * SHIFT_LEFT8;\n' +
                '   color /= 255.0;\n' +
                '   czm_pickColor = color;\n' +
                '   #else\n' +
                '   color.a = floor(temp);\n' +
                '   color /= 255.0;\n' +
                '   czm_color = color;\n' +
                '   #endif\n' +
                '   float show = czm_instanceData.w;\n' +
                '   gl_Position *= show;\n' +
                '}\n';

            var dynamicDefine = dynamic ? '#define DYNAMIC\n' : '';

            var newVS =
                dataFromAttr +
                dynamicDefine +
                globalVarsHeader +
                'attribute vec4 czm_modelMatrixRow0;\n' +
                'attribute vec4 czm_modelMatrixRow1;\n' +
                'attribute vec4 czm_modelMatrixRow2;\n' +
                'uniform mat4 czm_instanced_nodeLocal;\n' +
                'mat4 czm_instanced_modelView;\n' +
                '#ifndef DYNAMIC\n' +
                'uniform mat4 czm_instanced_collectionModelView;\n' +
                '#endif\n' +
                renamedSource +
                'void main()\n' +
                '{\n' +
                '    mat4 czm_instanced_model = mat4(czm_modelMatrixRow0.x, czm_modelMatrixRow1.x, czm_modelMatrixRow2.x, 0.0, czm_modelMatrixRow0.y, czm_modelMatrixRow1.y, czm_modelMatrixRow2.y, 0.0, czm_modelMatrixRow0.z, czm_modelMatrixRow1.z, czm_modelMatrixRow2.z, 0.0, czm_modelMatrixRow0.w, czm_modelMatrixRow1.w, czm_modelMatrixRow2.w, 1.0);\n' +
                '    #ifdef DYNAMIC\n' + // czm_instanced_model is the modelView matrix
                '    czm_instanced_modelView = czm_instanced_model * czm_instanced_nodeLocal;\n' +
                '    #else\n' + // czm_instanced_model is the model's local offset from the bounding volume
                '    czm_instanced_modelView = czm_instanced_collectionModelView * czm_instanced_model * czm_instanced_nodeLocal;\n' +
                '    #endif\n' +
                     globalVarsMain +
                '    gltf_main();\n' +
                '    czm_setColorShow();\n' +
                '}';
            vertexShaderCached = newVS;
            return newVS;
        };
    }

    function getFragmentShaderCallback() {
        return function(fs) {
            var renamedSource = ShaderSource.replaceMain(fs, 'gltf_main');
            var newMain =
                'varying vec4 czm_color;\n' +
                'void main()\n' +
                '{\n' +
                '    gltf_main();\n' +
                '    gl_FragColor.rgb *= czm_color.rgb;\n' +
                '}';

            return renamedSource + '\n' + newMain;
        }
    }

    function getPickVertexShaderCallback() {
        return function (vs) {
            // Use the vertex shader that was generated earlier
            return '#define RENDER_FOR_PICK\n' + vertexShaderCached;
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
                czm_instanced_collectionModelView : (collection._dynamic ? undefined : createBoundsModelViewFunction(collection, context)),
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
    var LEFT_SHIFT16 = 65536.0; // 2^16
    var LEFT_SHIFT8 = 256.0;    // 2^8

    function updateVertexBuffer(collection, context) {
        if (!collection._instancingSupported) {
            return;
        }

        var instanceBufferData = collection._instanceBufferData;
        var vertexBuffer = collection._vertexBuffer;
        var createVertexBuffer = collection._createVertexBuffer;

        var instancesLength = collection.length;
        var dynamic = collection._dynamic;
        var viewMatrix = context.uniformState.view;
        var center = dynamic ? Cartesian3.ZERO : collection._boundingSphere.center;

        if (createVertexBuffer) {
            instanceBufferData = new Float32Array(instancesLength * 16);
        }

        for (var i = 0; i < instancesLength; ++i) {
            var instance = collection._instances[i];
            var modelMatrix = instance.modelMatrix;

            if (dynamic) {
                Matrix4.multiplyTransformation(viewMatrix, modelMatrix, instanceMatrix);
            } else {
                instanceMatrix = modelMatrix;
            }

            // TODO : check if has color/pickColor first
            var color = instance.color;
            var pickColor = instance.getPickId(context).color;
            var show = instance.show ? 1.0 : 0.0;

            var red = Color.floatToByte(color.red);
            var green = Color.floatToByte(color.green);
            var blue = Color.floatToByte(color.blue);
            var compressed0 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

            red = Color.floatToByte(pickColor.red);
            green = Color.floatToByte(pickColor.green);
            blue = Color.floatToByte(pickColor.blue);
            var compressed1 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

            var compressed2 = Color.floatToByte(color.alpha) * LEFT_SHIFT8 + Color.floatToByte(pickColor.alpha);
            var compressed3 = show ? 1.0 : 0.0;

            var offset = i * 16;

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

            // Other instance data: color, pickColor, show
            instanceBufferData[offset + 12] = compressed0;
            instanceBufferData[offset + 13] = compressed1;
            instanceBufferData[offset + 14] = compressed2;
            instanceBufferData[offset + 15] = compressed3;
        }

        if (createVertexBuffer) {
            vertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : instanceBufferData,
                usage : dynamic ? BufferUsage.STREAM_DRAW : BufferUsage.STATIC_DRAW
            });
            collection._vertexBuffer = vertexBuffer;
            collection._instanceBufferData = instanceBufferData;
            collection._createVertexBuffer = false;
        } else {
            vertexBuffer.copyFromArrayView(instanceBufferData);
        }
    }

    function updateBoundingSphere(collection) {
        var points = [];
        var instancesLength = collection.length;
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
        var instancingSupported = collection._instancingSupported;
        var modelOptions = {
            url : collection._url,
            headers : collection._headers,
            gltf : collection._gltf,
            basePath : collection._basePath,
            cacheKey : collection._cacheKey,
            asynchronous : collection._asynchronous,
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

            for (var i = 0; i < 4; ++i) {
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

            // Instanced models will create different renderer resources, so change the cache key.
            var cacheKey = collection._cacheKey;
            var url = collection._url;
            if (defined(url)) {
                cacheKey = defaultValue(cacheKey, Model._getDefaultCacheKey(url));
            }
            if (defined(cacheKey)) {
                cacheKey += '#instanced';
            }

            modelOptions.precreatedAttributes = instancedAttributes;
            modelOptions.vertexShaderLoaded = getVertexShaderCallback(collection);
            modelOptions.fragmentShaderLoaded = getFragmentShaderCallback();
            modelOptions.uniformMapLoaded = getUniformMapCallback(collection, context);
            modelOptions.pickVertexShaderLoaded = getPickVertexShaderCallback();
            modelOptions.pickFragmentShaderLoaded = getPickFragmentShaderCallback();
            modelOptions.pickUniformMapLoaded = getPickUniformMapCallback();
            modelOptions.cacheKey = cacheKey;
            modelOptions.ignoreCommands = true;
        }

        if (defined(collection._url)) {
            collection._model = Model.fromGltf(modelOptions);
        } else {
            collection._model = new Model(modelOptions);
        }
    }

    function createCommands(collection, drawCommands, pickCommands) {
        collection._modelCommands = drawCommands;

        var i;
        var j;
        var command;
        var commandsLength = drawCommands.length;
        var instancesLength = collection.length;
        var allowPicking = collection.allowPicking;

        var boundingSphere = collection._boundingSphere;
        var boundingSphereModel = collection._boundingSphereModel;
        boundingSphere.radius += collection._model.boundingSphere.radius;

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
            var instances = collection._instances;
            for (i = 0; i < commandsLength; ++i) {
                for (j = 0; j < instancesLength; ++j) {
                    command = clone(drawCommands[i]);
                    command.modelMatrix = new Matrix4();
                    command.boundingVolume = new BoundingSphere();
                    //command.show = instances[j].show; TODO : show isn't part of DrawCommand, instead prevent it from being added
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

    function updateWireframe(collection) {
        if (collection._debugWireframe !== collection.debugWireframe) {
            collection._debugWireframe = collection.debugWireframe;

            // This assumes the original primitive was TRIANGLES and that the triangles
            // are connected for the wireframe to look perfect.
            var primitiveType = collection.debugWireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES;
            var commands = collection._drawCommands;
            var length = commands.length;
            for (var i = 0; i < length; i++) {
                commands[i].primitiveType = primitiveType;
            }
        }
    }
    function updateShowBoundingVolume(collection) {
        if (collection.debugShowBoundingVolume !== collection._debugShowBoundingVolume) {
            collection._debugShowBoundingVolume = collection.debugShowBoundingVolume;

            var commands = collection._drawCommands;
            var length = commands.length;
            for (var i = 0; i < length; i++) {
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

        this._instancingSupported = context.instancedArrays;

        if (this._state === LoadState.NEEDS_LOAD) {
            this._state = LoadState.LOADING;
            createModel(this, context);
        }

        var model = this._model;
        model.update(context, frameState, emptyCommandList);

        if (model.ready && (this._state === LoadState.LOADING)) {
            this._state = LoadState.LOADED;
            this._ready = true;

            var modelCommands = getModelCommands(model);
            createCommands(this, modelCommands.draw, modelCommands.pick);

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
        }

        updateWireframe(this);
        updateShowBoundingVolume(this);

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
