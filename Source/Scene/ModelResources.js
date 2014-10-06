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
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../ThirdParty/gltfDefaults',
        '../ThirdParty/Uri',
        './getModelAccessor',
        './ModelAnimationCache',
        './ModelAnimationCollection',
        './ModelMaterial',
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
        TextureMinificationFilter,
        TextureWrap,
        gltfDefaults,
        Uri,
        getModelAccessor,
        ModelAnimationCache,
        ModelAnimationCollection,
		ModelMaterial,
        ModelMesh,
        ModelNode,
        Pass,
        SceneMode) {
    "use strict";
    /*global WebGLRenderingContext*/

    var yUpToZUp = Matrix4.fromRotationTranslation(Matrix3.fromRotationX(-CesiumMath.PI_OVER_TWO), Cartesian3.ZERO);

    var ModelState = {
        NEEDS_LOAD : 0,
        LOADING : 1,
        LOADED : 2,
        FAILED : 3
    };

    function LoadResources() {
        this.buffersToCreate = new Queue();
        this.buffers = {};
        this.pendingBufferLoads = 0;

        this.programsToCreate = new Queue();
        this.shaders = {};
        this.pendingShaderLoads = 0;

        this.texturesToCreate = new Queue();
        this.pendingTextureLoads = 0;

        this.createSamplers = true;
        this.createVertexArrays = true;
        this.createRenderStates = true;
    }

    LoadResources.prototype.finishedPendingLoads = function() {
        return ((this.pendingBufferLoads === 0) &&
                (this.pendingShaderLoads === 0) &&
                (this.pendingTextureLoads === 0));
    };

    LoadResources.prototype.finishedResourceCreation = function() {
        return ((this.buffersToCreate.length === 0) &&
                (this.programsToCreate.length === 0) &&
                (this.texturesToCreate.length === 0));
    };

    LoadResources.prototype.finishedBuffersCreation = function() {
        return ((this.pendingBufferLoads === 0) && (this.buffersToCreate.length === 0));
    };

    LoadResources.prototype.finishedProgramCreation = function() {
        return ((this.pendingShaderLoads === 0) && (this.programsToCreate.length === 0));
    };

    LoadResources.prototype.finishedTextureCreation = function() {
        return ((this.pendingTextureLoads === 0) && (this.texturesToCreate.length === 0));
    };

    var ModelResources = function(options) {
        this._state = ModelState.NEEDS_LOAD;
        this._loadError = undefined;
        this._loadResources = undefined;

        this._maxDirtyNumber = 0;                  // Used in place of a dirty boolean flag to avoid an extra graph traversal

         this._rendererResources = {
            buffers : {},
            vertexArrays : {},
            programs : {},
            pickPrograms : {},
            textures : {},

            samplers : {},
            renderStates : {}
        };
        
        var url = options.url;
        var headers = options.headers;

        if (defined(url))
        {
            var basePath = '';
            var i = url.lastIndexOf('/');
            if (i !== -1) {
                basePath = url.substring(0, i + 1);
            }
            
            this._basePath = basePath;
         }
         else
         {
            this._basePath = defaultValue(options.basePath, '');
         }
               

        var docUri = new Uri(document.location.href);
        var modelUri = new Uri(this._basePath);
        this._baseUri = modelUri.resolve(docUri);
        
        if (defined(url))
        {
            var that = this;
            loadText(url, headers).then(function(data) {
                var src = JSON.parse(data);
                that._gltf = gltfDefaults(src);
        
            }).otherwise(getFailedLoadFunction(that, 'gltf', url));
        }
        else
        {
            this._gltf = options.gltf;
        }
    };

    defineProperties(ModelResources.prototype, {
        /**
         * The object for the glTF JSON, including properties with default values omitted
         * from the JSON provided to this ModelResources.
         *
         * @memberof ModelResources.prototype
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
         * path is the same path as the path containing the .json file
         * minus the .json file, when binary, image, and shader files are
         * in the same directory as the .json.  When this is <code>''</code>,
         * the app's base path is used.
         *
         * @memberof ModelResources.prototype
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
        }


    });

    ModelResources.fromGltf = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.url)) {
            throw new DeveloperError('options.url is required');
        }
        //>>includeEnd('debug');

        var url = options.url;
        var basePath = '';
        var i = url.lastIndexOf('/');
        if (i !== -1) {
            basePath = url.substring(0, i + 1);
        }

        var modelResources = new ModelResources(options);

        loadText(url, options.headers).then(function(data) {
            modelResources._gltf = gltfDefaults(JSON.parse(data));
            modelResources._basePath = basePath;

            var docUri = new Uri(document.location.href);
            var modelUri = new Uri(modelResources._basePath);
            modelResources._baseUri = modelUri.resolve(docUri);
        }).otherwise(getFailedLoadFunction(modelResources, 'gltf', url));

        return modelResources;
    };


	ModelResources.prototype.startLoading = function() {
		this._state = ModelState.LOADING;

         this._loadResources = new LoadResources();
         parse(this);
	};

    ///////////////////////////////////////////////////////////////////////////

    function getFailedLoadFunction(modelResources, type, path) {
        return function() {
            modelResources._loadError = new RuntimeError('Failed to load external ' + type + ': ' + path);
            modelResources._state = ModelState.FAILED;
        };
    }

    function bufferLoad(modelResources, name) {
        return function(arrayBuffer) {
            var loadResources = modelResources._loadResources;
            loadResources.buffers[name] = arrayBuffer;
            --loadResources.pendingBufferLoads;
         };
    }

    function parseBuffers(modelResources) {
        var buffers = modelResources.gltf.buffers;
        for (var name in buffers) {
            if (buffers.hasOwnProperty(name)) {
                ++modelResources._loadResources.pendingBufferLoads;
                var buffer = buffers[name];
                var uri = new Uri(buffer.uri);
                var bufferPath = uri.resolve(modelResources._baseUri).toString();
                loadArrayBuffer(bufferPath).then(bufferLoad(modelResources, name)).otherwise(getFailedLoadFunction(modelResources, 'buffer', bufferPath));
            }
        }
    }

    function parseBufferViews(modelResources) {
        var bufferViews = modelResources.gltf.bufferViews;
        for (var name in bufferViews) {
            if (bufferViews.hasOwnProperty(name)) {
                modelResources._loadResources.buffersToCreate.enqueue(name);
            }
        }
    }

    function shaderLoad(modelResources, name) {
        return function(source) {
            var loadResources = modelResources._loadResources;
            loadResources.shaders[name] = source;
            --loadResources.pendingShaderLoads;
         };
    }

    function parseShaders(modelResources) {
        var shaders = modelResources.gltf.shaders;
        for (var name in shaders) {
            if (shaders.hasOwnProperty(name)) {
                ++modelResources._loadResources.pendingShaderLoads;
                var shader = shaders[name];
                var uri = new Uri(shader.uri);
                var shaderPath = uri.resolve(modelResources._baseUri).toString();
                loadText(shaderPath).then(shaderLoad(modelResources, name)).otherwise(getFailedLoadFunction(modelResources, 'shader', shaderPath));
            }
        }
    }

    function parsePrograms(modelResources) {
        var programs = modelResources.gltf.programs;
        for (var name in programs) {
            if (programs.hasOwnProperty(name)) {
                modelResources._loadResources.programsToCreate.enqueue(name);
            }
        }
    }

    function imageLoad(modelResources, name) {
        return function(image) {
            var loadResources = modelResources._loadResources;
            --loadResources.pendingTextureLoads;
            loadResources.texturesToCreate.enqueue({
                 name : name,
                 image : image
             });
         };
    }

    function parseTextures(modelResources) {
        var images = modelResources.gltf.images;
        var textures = modelResources.gltf.textures;
        for (var name in textures) {
            if (textures.hasOwnProperty(name)) {
                ++modelResources._loadResources.pendingTextureLoads;
                var texture = textures[name];

                var uri = new Uri(images[texture.source].uri);


                var imagePath = uri.resolve(modelResources._baseUri).toString();

                loadImage(imagePath).then(imageLoad(modelResources, name)).otherwise(getFailedLoadFunction(modelResources, 'image', imagePath));
            }
        }
    }


    function parse(modelResources) {
        parseBuffers(modelResources);
        parseBufferViews(modelResources);
        parseShaders(modelResources);
        parsePrograms(modelResources);
        parseTextures(modelResources);
    }

    ///////////////////////////////////////////////////////////////////////////

    function createBuffers(modelResources, context) {
        var loadResources = modelResources._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        var raw;
        var bufferView;
        var bufferViews = modelResources.gltf.bufferViews;
        var buffers = loadResources.buffers;
        var rendererBuffers = modelResources._rendererResources.buffers;

        while (loadResources.buffersToCreate.length > 0) {
            var bufferViewName = loadResources.buffersToCreate.dequeue();
            bufferView = bufferViews[bufferViewName];

            if (bufferView.target === WebGLRenderingContext.ARRAY_BUFFER) {
                // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
                raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                var vertexBuffer = context.createVertexBuffer(raw, BufferUsage.STATIC_DRAW);
                vertexBuffer.vertexArrayDestroyable = false;
                rendererBuffers[bufferViewName] = vertexBuffer;
            }

            // bufferViews referencing animations are ignored here and handled in createAnimations.
            // bufferViews referencing skins are ignored here and handled in createSkins.
        }

        // The Cesium Renderer requires knowing the datatype for an index buffer
        // at creation type, which is not part of the glTF bufferview so loop
        // through glTF accessors to create the bufferview's index buffer.
        var accessors = modelResources.gltf.accessors;
        for (var name in accessors) {
            if (accessors.hasOwnProperty(name)) {
                var accessor = accessors[name];
                bufferView = bufferViews[accessor.bufferView];

                if ((bufferView.target === WebGLRenderingContext.ELEMENT_ARRAY_BUFFER) && !defined(rendererBuffers[accessor.bufferView])) {
                    raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                    var indexBuffer = context.createIndexBuffer(raw, BufferUsage.STATIC_DRAW, accessor.componentType);
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

    function createProgram(name, modelResources, context) {
        var programs = modelResources.gltf.programs;
        var shaders = modelResources._loadResources.shaders;
        var program = programs[name];

        var attributeLocations = createAttributeLocations(program.attributes);
        var vs = shaders[program.vertexShader];
        var fs = shaders[program.fragmentShader];

        modelResources._rendererResources.programs[name] = context.createShaderProgram(vs, fs, attributeLocations);

		// PERFORMANCE_IDEA: Can optimize this shader with a glTF hint. https://github.com/KhronosGroup/glTF/issues/181
		var pickFS = createShaderSource({
			sources : [fs],
			pickColorQualifier : 'uniform'
		});
		modelResources._rendererResources.pickPrograms[name] = context.createShaderProgram(vs, pickFS, attributeLocations);
    }

    function createPrograms(modelResources, context) {
        var loadResources = modelResources._loadResources;
        var name;

        if (loadResources.pendingShaderLoads !== 0) {
            return;
        }

        if (modelResources.asynchronous) {
            // Create one program per frame
            if (loadResources.programsToCreate.length > 0) {
                name = loadResources.programsToCreate.dequeue();
                createProgram(name, modelResources, context);
            }
        } else {
            // Create all loaded programs this frame
            while (loadResources.programsToCreate.length > 0) {
                name = loadResources.programsToCreate.dequeue();
                createProgram(name, modelResources, context);
            }
        }
    }

    function createSamplers(modelResources, context) {
        var loadResources = modelResources._loadResources;

        if (loadResources.createSamplers) {
            loadResources.createSamplers = false;

            var rendererSamplers = modelResources._rendererResources.samplers;
            var samplers = modelResources.gltf.samplers;
            for (var name in samplers) {
                if (samplers.hasOwnProperty(name)) {
                    var sampler = samplers[name];

                    rendererSamplers[name] = context.createSampler({
                        wrapS : sampler.wrapS,
                        wrapT : sampler.wrapT,
                        minificationFilter : sampler.minFilter,
                        magnificationFilter : sampler.magFilter
                    });
                }
            }
        }
    }

    function createTexture(gltfTexture, modelResources, context) {
        var textures = modelResources.gltf.textures;
        var texture = textures[gltfTexture.name];

        var rendererSamplers = modelResources._rendererResources.samplers;
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

        if (texture.target === WebGLRenderingContext.TEXTURE_2D) {
            tx = context.createTexture2D({
                source : source,
                pixelFormat : texture.internalFormat,
                pixelDatatype : texture.type,
                flipY : false
            });
        }
        // GLTF_SPEC: Support TEXTURE_CUBE_MAP.  https://github.com/KhronosGroup/glTF/issues/40

        if (mipmap) {
            tx.generateMipmap();
        }
        tx.sampler = sampler;

        modelResources._rendererResources.textures[gltfTexture.name] = tx;
    }

    function createTextures(modelResources, context) {
        var loadResources = modelResources._loadResources;
        var gltfTexture;

        if (modelResources.asynchronous) {
            // Create one texture per frame
            if (loadResources.texturesToCreate.length > 0) {
                gltfTexture = loadResources.texturesToCreate.dequeue();
                createTexture(gltfTexture, modelResources, context);
            }
        } else {
            // Create all loaded textures this frame
            while (loadResources.texturesToCreate.length > 0) {
                gltfTexture = loadResources.texturesToCreate.dequeue();
                createTexture(gltfTexture, modelResources, context);
            }
        }
    }

    function getAttributeLocations(modelResources, primitive) {
        var gltf = modelResources.gltf;
        var programs = gltf.programs;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        // Retrieve the compiled shader program to assign index values to attributes
        var attributeLocations = {};

        var technique = techniques[materials[primitive.material].instanceTechnique.technique];
        var parameters = technique.parameters;
        var pass = technique.passes[technique.pass];
        var instanceProgram = pass.instanceProgram;
        var attributes = instanceProgram.attributes;
        var programAttributeLocations = modelResources._rendererResources.programs[instanceProgram.program].vertexAttributes;

        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var parameter = parameters[attributes[name]];

                attributeLocations[parameter.semantic] = programAttributeLocations[name].index;
            }
        }

        return attributeLocations;
    }




    function createVertexArrays(modelResources, context) {
        var loadResources = modelResources._loadResources;

        if (!loadResources.finishedBuffersCreation() || !loadResources.finishedProgramCreation()) {
            return;
        }

        if (!loadResources.createVertexArrays) {
            return;
        }
        loadResources.createVertexArrays = false;

        var rendererBuffers = modelResources._rendererResources.buffers;
        var rendererVertexArrays = modelResources._rendererResources.vertexArrays;
        var gltf = modelResources.gltf;
        var accessors = gltf.accessors;
        var meshes = gltf.meshes;

        for (var meshName in meshes) {
            if (meshes.hasOwnProperty(meshName)) {
                var primitives = meshes[meshName].primitives;
                var primitivesLength = primitives.length;

                for (var i = 0; i < primitivesLength; ++i) {
                    var primitive = primitives[i];

                    // GLTF_SPEC: This does not take into account attribute arrays,
                    // indicated by when an attribute points to a parameter with a
                    // count property.
                    //
                    // https://github.com/KhronosGroup/glTF/issues/258

                    var attributeLocations = getAttributeLocations(modelResources, primitive);
                    var attrs = [];
                    var primitiveAttributes = primitive.attributes;
                    for (var attrName in primitiveAttributes) {
                        if (primitiveAttributes.hasOwnProperty(attrName)) {
                            var attributeLocation = attributeLocations[attrName];
                            // Skip if the attribute is not used by the material, e.g., because the asset was exported
                            // with an attribute that wasn't used and the asset wasn't optimized.
                            if (defined(attributeLocation)) {
                                var a = accessors[primitiveAttributes[attrName]];
                                attrs.push({
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

                    var accessor = accessors[primitive.indices];
                    var indexBuffer = rendererBuffers[accessor.bufferView];
                    rendererVertexArrays[meshName + '.primitive.' + i] = context.createVertexArray(attrs, indexBuffer);
                }
            }
        }
    }

    function getBooleanStates(states) {
        // GLTF_SPEC: SAMPLE_ALPHA_TO_COVERAGE not used by Cesium
        var booleanStates = {};
        booleanStates[WebGLRenderingContext.BLEND] = false;
        booleanStates[WebGLRenderingContext.CULL_FACE] = false;
        booleanStates[WebGLRenderingContext.DEPTH_TEST] = false;
        booleanStates[WebGLRenderingContext.POLYGON_OFFSET_FILL] = false;
        booleanStates[WebGLRenderingContext.SAMPLE_COVERAGE] = false;
        booleanStates[WebGLRenderingContext.SCISSOR_TEST] = false;

        var enable = states.enable;
        var length = enable.length;
        var i;
        for (i = 0; i < length; ++i) {
            booleanStates[enable[i]] = true;
        }

        return booleanStates;
    }

    function createRenderStates(modelResources, context) {
        var loadResources = modelResources._loadResources;

        if (loadResources.createRenderStates) {
            loadResources.createRenderStates = false;
            var rendererRenderStates = modelResources._rendererResources.renderStates;
            var techniques = modelResources.gltf.techniques;
            for (var name in techniques) {
                if (techniques.hasOwnProperty(name)) {
                    var technique = techniques[name];
                    var pass = technique.passes[technique.pass];
                    var states = pass.states;

                    var booleanStates = getBooleanStates(states);
                    var statesFunctions = defaultValue(states.functions, defaultValue.EMPTY_OBJECT);
                    var blendColor = defaultValue(statesFunctions.blendColor, [0.0, 0.0, 0.0, 0.0]);
                    var blendEquationSeparate = defaultValue(statesFunctions.blendEquationSeparate, [
                        WebGLRenderingContext.FUNC_ADD,
                        WebGLRenderingContext.FUNC_ADD]);
                    var blendFuncSeparate = defaultValue(statesFunctions.blendFuncSeparate, [
                        WebGLRenderingContext.ONE,
                        WebGLRenderingContext.ONE,
                        WebGLRenderingContext.ZERO,
                        WebGLRenderingContext.ZERO]);
                    var colorMask = defaultValue(statesFunctions.colorMask, [true, true, true, true]);
                    var depthRange = defaultValue(statesFunctions.depthRange, [0.0, 1.0]);
                    var polygonOffset = defaultValue(statesFunctions.polygonOffset, [0.0, 0.0]);
                    var sampleCoverage = defaultValue(statesFunctions.sampleCoverage, [0.0, 0.0]);
                    var scissor = defaultValue(statesFunctions.scissor, [0.0, 0.0, 0.0, 0.0]);

                    rendererRenderStates[name] = context.createRenderState({
                        frontFace : defined(statesFunctions.frontFace) ? statesFunctions.frontFace[0] : WebGLRenderingContext.CCW,
                        cull : {
                            enabled : booleanStates[WebGLRenderingContext.CULL_FACE],
                            face : defined(statesFunctions.cullFace) ? statesFunctions.cullFace[0] : WebGLRenderingContext.BACK
                        },
                        lineWidth : defined(statesFunctions.lineWidth) ? statesFunctions.lineWidth[0] : 1.0,
                        polygonOffset : {
                            enabled : booleanStates[WebGLRenderingContext.POLYGON_OFFSET_FILL],
                            factor : polygonOffset[0],
                            units : polygonOffset[1]
                        },
                        scissorTest : {
                            enabled : booleanStates[WebGLRenderingContext.SCISSOR_TEST],
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
                            enabled : booleanStates[WebGLRenderingContext.DEPTH_TEST],
                            func : defined(statesFunctions.depthFunc) ? statesFunctions.depthFunc[0] : WebGLRenderingContext.LESS
                        },
                        colorMask : {
                            red : colorMask[0],
                            green : colorMask[1],
                            blue : colorMask[2],
                            alpha : colorMask[3]
                        },
                        depthMask : defined(statesFunctions.depthMask) ? statesFunctions.depthMask[0] : true,
                        blending : {
                            enabled : booleanStates[WebGLRenderingContext.BLEND],
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
                        },
                        sampleCoverage : {
                            enabled : booleanStates[WebGLRenderingContext.SAMPLE_COVERAGE],
                            value : sampleCoverage[0],
                            invert : sampleCoverage[1]
                        }
                    });
                }
            }
        }
    }


	function clone(obj)
	{
		if(obj === null || typeof(obj) !== 'object')
        {
			return obj;
        }

		var temp = obj.constructor(); // changed

		for(var key in obj) {
			if(obj.hasOwnProperty(key)) {
				temp[key] = clone(obj[key]);
			}
		}
		return temp;
	}
	

    function createResources(modelResources, context) {
        createBuffers(modelResources, context);      // using glTF bufferViews
        createPrograms(modelResources, context);
        createSamplers(modelResources, context);
        createTextures(modelResources, context);
        
        createVertexArrays(modelResources, context); // using glTF meshes
        createRenderStates(modelResources, context); // using glTF materials/techniques/passes/states
    }

    
    ModelResources.prototype.update = function(context, frameState) {

        if ((this._state === ModelState.NEEDS_LOAD) && defined(this.gltf)) {
            this._state = ModelState.LOADING;
            this._loadResources = new LoadResources();
            parse(this);
        }

        if (this._state === ModelState.FAILED) {
            throw this._loadError;
        }

        if (this._state === ModelState.LOADING) {
            // Incrementally create WebGL resources as buffers/shaders/textures are downloaded
            createResources(this, context);

            var loadResources = this._loadResources;
            if (loadResources.finishedPendingLoads() && loadResources.finishedResourceCreation()) {
			
				// for now lets keep those two online in ram until a better solution appears
				this.skinnedNodesName = loadResources.skinnedNodesNames;
				this.buffers = loadResources.buffers;
			
                this._state = ModelState.LOADED;
                this._loadResources = undefined;  // Clear CPU memory since WebGL resources were created.                
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
    ModelResources.prototype.isDestroyed = function() {
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
     * @see Model#isDestroyed
     *
     * @example
     * model = model && ModelResources.destroy();
     */
    ModelResources.prototype.destroy = function() {
        var resources = this._rendererResources;
        destroy(resources.buffers);
        destroy(resources.vertexArrays);
        release(resources.programs);
        release(resources.pickPrograms);
        destroy(resources.textures);
        resources = undefined;
        this._rendererResources = undefined;

        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        return destroyObject(this);
    };

    return ModelResources;
});
