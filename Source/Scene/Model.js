/*global define*/
define([
        '../Core/combine',
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Enumeration',
        '../Core/loadArrayBuffer',
        '../Core/loadText',
        '../Core/loadImage',
        '../Core/Queue',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Quaternion',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/BoundingSphere',
        '../Core/PrimitiveType',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Event',
        '../Core/JulianDate',
        '../Renderer/TextureWrap',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/DrawCommand',
        '../Renderer/CommandLists',
        '../Renderer/createShaderSource',
        './ModelTypes',
        './ModelCache',
        './ModelAnimationCollection',
        './SceneMode',
        './gltfDefaults'
    ], function(
        combine,
        defined,
        defaultValue,
        destroyObject,
        DeveloperError,
        RuntimeError,
        Enumeration,
        loadArrayBuffer,
        loadText,
        loadImage,
        Queue,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Quaternion,
        Matrix2,
        Matrix3,
        Matrix4,
        BoundingSphere,
        PrimitiveType,
        IndexDatatype,
        CesiumMath,
        Event,
        JulianDate,
        TextureWrap,
        TextureMinificationFilter,
        BufferUsage,
        BlendingState,
        DrawCommand,
        CommandLists,
        createShaderSource,
        ModelTypes,
        ModelCache,
        ModelAnimationCollection,
        SceneMode,
        gltfDefaults) {
    "use strict";

    var ModelState = {
        NEEDS_LOAD : new Enumeration(0, 'NEEDS_LOAD'),
        LOADING : new Enumeration(1, 'LOADING'),
        LOADED : new Enumeration(2, 'LOADED')
    };

    function LoadResources() {
        this.bufferViewsToCreate = new Queue();
        this.buffers = {};
        this.pendingBufferLoads = 0;

        this.programsToCreate = new Queue();
        this.shaders = {};
        this.pendingShaderLoads = 0;

        this.texturesToCreate = new Queue();
        this.pendingTextureLoads = 0;

        this.createSamplers = true;
        this.createSkins = true;
        this.createRuntimeAnimations = true;
        this.createVertexArrays = true;
        this.createRenderStates = true;
        this.createUniformMaps = true;
        this.createRuntimeNodes = true;
    }

    LoadResources.prototype.finishedPendingLoads = function() {
        return ((this.pendingBufferLoads === 0) &&
                (this.pendingShaderLoads === 0) &&
                (this.pendingTextureLoads === 0));
    };

    LoadResources.prototype.finishedResourceCreation = function() {
        return ((this.bufferViewsToCreate.length === 0) &&
                (this.programsToCreate.length === 0) &&
                (this.texturesToCreate.length === 0));
    };

    LoadResources.prototype.finishedBufferViewsCreation = function() {
        return ((this.pendingBufferLoads === 0) && (this.bufferViewsToCreate.length === 0));
    };

    LoadResources.prototype.finishedProgramCreation = function() {
        return ((this.pendingShaderLoads === 0) && (this.programsToCreate.length === 0));
    };

    LoadResources.prototype.finishedTextureCreation = function() {
        return ((this.pendingTextureLoads === 0) && (this.texturesToCreate.length === 0));
    };

// TODO: what data should we pass to all events?

    /**
     * DOC_TBA
     *
     * @alias Model
     * @constructor
     */
    var Model = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.gltf = gltfDefaults(options.gltf);

        /**
         * DOC_TBA
         *
         * @readonly
         */
        this.basePath = defaultValue(options.basePath, '');

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
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         *
         * @type {Matrix4}
         *
         * @default {@link Matrix4.IDENTITY}
         *
         * @example
         * var origin = ellipsoid.cartographicToCartesian(
         *   Cartographic.fromDegrees(-95.0, 40.0, 200000.0));
         * m.modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see czm_model
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
         * DOC_TBA
         *
         * @type {Boolean}
         *
         * @default true
         *
         * @readonly
         */
        this.allowPicking = defaultValue(options.allowPicking, true);

        /**
         * DOC_TBA
         */
        this.jsonLoad = new Event();

        /**
         * DOC_TBA
         */
        this.readyToRender = new Event();

// TODO: will change with animation
// TODO: only load external files if within bounding sphere
// TODO: cull whole model, not commands?  Good for our use-cases, but not buildings, etc.
        /**
         * DOC_TBA
         */
        this.worldBoundingSphere = new BoundingSphere();

        /**
         * DOC_TBA
         */
        this.animations = new ModelAnimationCollection(this);

        /**
         * DOC_TBA
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * DOC_TBA
         */
        this.debugWireframe = defaultValue(options.debugWireframe, false);
        this._debugWireframe = false;

        this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and scale
        this._state = ModelState.NEEDS_LOAD;
        this._loadResources = undefined;

        this._runtime = {
            animations : undefined,
            rootNodes : undefined,
            nodes : undefined
        };
        this._rendererResources = {
            bufferViews : {},
            vertexArrays : {},
            programs : {},
            pickPrograms : {},
            textures : {},

            samplers : {},
            renderStates : {},
            uniformMaps : {}
        };

        this._skinnedNodes = [];
        this._commandLists = new CommandLists();
        this._pickIds = [];
    };

    /**
     * DOC_TBA
     */
    Model.fromText = function(options) {
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

        var model = new Model(options);

        loadText(url, options.headers).then(function(data) {
            model.gltf = gltfDefaults(JSON.parse(data));
            model.basePath = basePath;
            model.jsonLoad.raiseEvent();
        });

        return model;
    };

    ///////////////////////////////////////////////////////////////////////////

    function getFailedLoadFunction(type, path) {
        return function() {
            throw new RuntimeError('Failed to load external ' + type + ': ' + path);
        };
    }

    function bufferLoad(model, name) {
        return function(arrayBuffer) {
            var loadResources = model._loadResources;
            loadResources.buffers[name] = arrayBuffer;
            --loadResources.pendingBufferLoads;
         };
    }

    function parseBuffers(model) {
        var buffers = model.gltf.buffers;
        for (var name in buffers) {
            if (buffers.hasOwnProperty(name)) {
                ++model._loadResources.pendingBufferLoads;
                var bufferPath = model.basePath + buffers[name].path;
                loadArrayBuffer(bufferPath).then(bufferLoad(model, name), getFailedLoadFunction('buffer', bufferPath));
            }
        }
    }

    function parseBufferViews(model) {
        var bufferViews = model.gltf.bufferViews;
        for (var name in bufferViews) {
            if (bufferViews.hasOwnProperty(name)) {
                model._loadResources.bufferViewsToCreate.enqueue(name);
            }
        }
    }

    function shaderLoad(model, name) {
        return function(source) {
            var loadResources = model._loadResources;
            loadResources.shaders[name] = source;
            --loadResources.pendingShaderLoads;
         };
    }

    function parseShaders(model) {
        var shaders = model.gltf.shaders;
        for (var name in shaders) {
            if (shaders.hasOwnProperty(name)) {
                ++model._loadResources.pendingShaderLoads;
                var shaderPath = model.basePath + shaders[name].path;
                loadText(shaderPath).then(shaderLoad(model, name), getFailedLoadFunction('shader', shaderPath));
            }
        }
    }

    function parsePrograms(model) {
        var programs = model.gltf.programs;
        for (var name in programs) {
            if (programs.hasOwnProperty(name)) {
                model._loadResources.programsToCreate.enqueue(name);
            }
        }
    }

    function imageLoad(model, name) {
        return function(image) {
            var loadResources = model._loadResources;
            --loadResources.pendingTextureLoads;
            loadResources.texturesToCreate.enqueue({
                 name : name,
                 image : image
             });
         };
    }

    function parseTextures(model) {
        var images = model.gltf.images;
        var textures = model.gltf.textures;
        for (var name in textures) {
            if (textures.hasOwnProperty(name)) {
                ++model._loadResources.pendingTextureLoads;
                var imagePath = model.basePath + images[textures[name].source].path;
                loadImage(imagePath).then(imageLoad(model, name), getFailedLoadFunction('image', imagePath));
            }
        }
    }

    function parseNodes(model) {
        var runtimeNodes = {};

        var nodes = model.gltf.nodes;
        var skinnedNodes = model._skinnedNodes;

        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                var node = nodes[name];

                runtimeNodes[name] = {
                    matrix : undefined,
                    translation : undefined,
                    rotation : undefined,
                    scale : undefined,

                    transformToRoot : new Matrix4(),
                    computedMatrix : new Matrix4(),

                    commands : undefined,

                    children : [],
                    parents : []
                };

                if (defined(node.instanceSkin)) {
                    skinnedNodes.push(node);
                }
            }
        }

        model._runtime.nodes = runtimeNodes;
    }

    function parse(model) {
        parseBuffers(model);
        parseBufferViews(model);
        parseShaders(model);
        parsePrograms(model);
        parseTextures(model);
        parseNodes(model);
    }

    ///////////////////////////////////////////////////////////////////////////

    function createBuffers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        var raw;
        var bufferView;
        var bufferViews = model.gltf.bufferViews;
        var buffers = loadResources.buffers;
        var rendererBufferViews = model._rendererResources.bufferViews;

        while (loadResources.bufferViewsToCreate.length > 0) {
            var bufferViewName = loadResources.bufferViewsToCreate.dequeue();
            bufferView = bufferViews[bufferViewName];

            if (bufferView.target === WebGLRenderingContext.ARRAY_BUFFER) {
                // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
                raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                var vertexBuffer = context.createVertexBuffer(raw, BufferUsage.STATIC_DRAW);
                vertexBuffer.setVertexArrayDestroyable(false);
                rendererBufferViews[bufferViewName] = vertexBuffer;
            }

            // bufferViews referencing animations are ignored here and handled in createRuntimeAnimations.
        }

        // The Cesium Renderer requires knowing the datatype for an index buffer
        // at creation type, which is not part of the glTF bufferview so loop
        // through glTF accessors to create the bufferview's index buffer.
        var accessors = model.gltf.accessors;
        for (var name in accessors) {
            if (accessors.hasOwnProperty(name)) {
                var instance = accessors[name];
                bufferView = bufferViews[instance.bufferView];

                if ((bufferView.target === WebGLRenderingContext.ELEMENT_ARRAY_BUFFER) && !defined(rendererBufferViews[instance.bufferView])) {
                    raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                    var indexBuffer = context.createIndexBuffer(raw, BufferUsage.STATIC_DRAW, instance.type);
                    indexBuffer.setVertexArrayDestroyable(false);
                    rendererBufferViews[instance.bufferView] = indexBuffer;
                    // In theory, several glTF accessors with different types could
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

    function createPrograms(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.pendingShaderLoads !== 0) {
            return;
        }

        var programs = model.gltf.programs;
        var shaders = loadResources.shaders;

        // Create one program per frame
        if (loadResources.programsToCreate.length > 0) {
            var name = loadResources.programsToCreate.dequeue();
            var program = programs[name];

            var attributeLocations = createAttributeLocations(program.attributes);
            var vs = shaders[program.vertexShader];
            var fs = shaders[program.fragmentShader];

            model._rendererResources.programs[name] = context.getShaderCache().getShaderProgram(vs, fs, attributeLocations);

            if (model.allowPicking) {
             // TODO: Can optimize this shader with a glTF hint. https://github.com/KhronosGroup/glTF/issues/181
                var pickFS = createShaderSource({
                    sources : [fs],
                    pickColorQualifier : 'uniform'
                });
                model._rendererResources.pickPrograms[name] = context.getShaderCache().getShaderProgram(vs, pickFS, attributeLocations);
            }
        }
    }

    function createSamplers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createSamplers) {
            loadResources.createSamplers = false;

            var rendererSamplers = model._rendererResources.samplers;
            var samplers = model.gltf.samplers;
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

    function createTextures(model, context) {
        var loadResources = model._loadResources;
        var textures = model.gltf.textures;
        var rendererSamplers = model._rendererResources.samplers;

        // Create one texture per frame
        if (loadResources.texturesToCreate.length > 0) {
            var textureToCreate = loadResources.texturesToCreate.dequeue();
            var texture = textures[textureToCreate.name];
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

            var source = textureToCreate.image;
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

// TODO: texture cache
            var tx;

            if (texture.target === WebGLRenderingContext.TEXTURE_2D) {
                tx = context.createTexture2D({
                    source : source,
                    pixelFormat : texture.internalFormat,
                    flipY : false
                });
            }
            // TODO: else handle WebGLRenderingContext.TEXTURE_CUBE_MAP.  https://github.com/KhronosGroup/glTF/issues/40

            if (mipmap) {
                tx.generateMipmap();
            }
            tx.setSampler(sampler);

            model._rendererResources.textures[textureToCreate.name] = tx;
        }
    }

    function getAttributeLocations(model, primitive) {
        var gltf = model.gltf;
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
        var programAttributeLocations = model._rendererResources.programs[instanceProgram.program].getVertexAttributes();

        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var parameter = parameters[attributes[name]];

                attributeLocations[parameter.semantic] = programAttributeLocations[name].index;
            }
        }

        return attributeLocations;
    }

    function createSkins(model) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedBufferViewsCreation()) {
            return;
        }

        if (!loadResources.createSkins) {
            return;
        }
        loadResources.createSkins = false;

        var gltf = model.gltf;
        var buffers = loadResources.buffers;
        var bufferViews = gltf.bufferViews;
        var skins = gltf.skins;

        for (var name in skins) {
            if (skins.hasOwnProperty(name)) {
                var skin = skins[name];
                var inverseBindMatrices = skin.inverseBindMatrices;
                var bufferView = bufferViews[inverseBindMatrices.bufferView];

                var type = inverseBindMatrices.type;
                var count = inverseBindMatrices.count;

// TODO: move to ModelCache.
                var typedArray = ModelTypes[type].createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + inverseBindMatrices.byteOffset, count);
                var matrices =  new Array(count);

                if (type === WebGLRenderingContext.FLOAT_MAT4) {
                    for (var i = 0; i < count; ++i) {
                        matrices[i] = Matrix4.fromArray(typedArray, 16 * i);
                    }
                }
                // TODO: else handle all valid types: https://github.com/KhronosGroup/glTF/issues/191

                var bindShapeMatrix;
                if (!Matrix4.equals(skin.bindShapeMatrix, Matrix4.IDENTITY)) {
                    bindShapeMatrix = Matrix4.clone(skin.bindShapeMatrix);
                }

                skin.czm = {
                    inverseBindMatrices : matrices,
                    bindShapeMatrix : bindShapeMatrix // not used when undefined
                };
            }
        }
    }

    function getChannelEvaluator(runtimeNode, targetPath, spline) {
        return function(localAnimationTime) {
            runtimeNode[targetPath] = spline.evaluate(localAnimationTime, runtimeNode[targetPath]);
        };
    }

    function createRuntimeAnimations(model) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedPendingLoads()) {
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
                         parameterValues[name] = ModelCache.getAnimationParameterValues(model, accessors[parameters[name]]);
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

                     var spline = ModelCache.getAnimationSpline(model, animationName, animation, channel.sampler, sampler, parameterValues);
                     // TODO: Support other targets when glTF does: https://github.com/KhronosGroup/glTF/issues/142
                     channelEvaluators[i] = getChannelEvaluator(runtimeNodes[target.id], target.path, spline);
                 }

                 model._runtime.animations[animationName] = {
                     startTime : startTime,
                     stopTime : stopTime,
                     channelEvaluators : channelEvaluators
                 };
             }
         }
    }

    function createVertexArrays(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedBufferViewsCreation() || !loadResources.finishedProgramCreation()) {
            return;
        }

        if (!loadResources.createVertexArrays) {
            return;
        }
        loadResources.createVertexArrays = false;

        var rendererBufferViews = model._rendererResources.bufferViews;
        var rendererVertexArrays = model._rendererResources.vertexArrays;
        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var meshes = gltf.meshes;

        for (var meshName in meshes) {
            if (meshes.hasOwnProperty(meshName)) {
                var primitives = meshes[meshName].primitives;
                var primitivesLength = primitives.length;

                for (var i = 0; i < primitivesLength; ++i) {
                    var primitive = primitives[i];

                    var attributeLocations = getAttributeLocations(model, primitive);
                    var attrs = [];
                    var primitiveAttributes = primitive.attributes;
                    for (var attrName in primitiveAttributes) {
                        if (primitiveAttributes.hasOwnProperty(attrName)) {
                            var a = accessors[primitiveAttributes[attrName]];

                            var type = ModelTypes[a.type];
                            attrs.push({
                                index                  : attributeLocations[attrName],
                                vertexBuffer           : rendererBufferViews[a.bufferView],
                                componentsPerAttribute : type.componentsPerAttribute,
                                componentDatatype      : type.componentDatatype,
                                normalize              : false,
                                offsetInBytes          : a.byteOffset,
                                strideInBytes          : a.byteStride
                            });
                        }
                    }

                    var accessor = accessors[primitive.indices];
                    var indexBuffer = rendererBufferViews[accessor.bufferView];
                    rendererVertexArrays[meshName + '.primitive.' + i] = context.createVertexArray(attrs, indexBuffer);
                }
            }
        }
    }

    function createRenderStates(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createRenderStates) {
            loadResources.createRenderStates = false;
            var rendererRenderStates = model._rendererResources.renderStates;
            var techniques = model.gltf.techniques;
            for (var name in techniques) {
                if (techniques.hasOwnProperty(name)) {
                    var technique = techniques[name];
                    var pass = technique.passes[technique.pass];
                    var states = pass.states;

                    rendererRenderStates[name] = context.createRenderState({
                        cull : {
                            enabled : !!states.cullFaceEnable
                        },
                        depthTest : {
                            enabled : !!states.depthTestEnable
                        },
                        depthMask : !!states.depthMask,
                        blending : !!states.blendEnable ? BlendingState.ALPHA_BLEND : BlendingState.DISABLED
                    });
                }
            }
        }
    }

    var gltfSemanticUniforms = {
// TODO: All semantics from https://github.com/KhronosGroup/glTF/issues/83
        MODEL : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getModel();
            };
        },
        VIEW : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getView();
            };
        },
        PROJECTION : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getProjection();
            };
        },
        MODELVIEW : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getModelView();
            };
        },
        VIEWPROJECTION : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getViewProjection();
            };
        },
        MODELVIEWPROJECTION : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getModelViewProjection();
            };
        },
        MODELINVERSE : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getInverseModel();
            };
        },
        VIEWINVERSE : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getInverseView();
            };
        },
        PROJECTIONINVERSE : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getInverseProjection();
            };
        },
        MODELVIEWINVERSE : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getInverseModelView();
            };
        },
        VIEWPROJECTIONINVERSE : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getInverseViewProjection();
            };
        },
        MODELVIEWINVERSETRANSPOSE : function(uniformState, jointMatrices) {
            return function() {
                return uniformState.getNormal();
            };
        },
        JOINT_MATRIX : function(uniformState, jointMatrices) {
            return function() {
                return jointMatrices;
            };
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    function getScalarUniformFunction(value, model) {
        return function() {
            return value;
        };
    }

    function getVec2UniformFunction(value, model) {
        var v = Cartesian2.fromArray(value);

        return function() {
            return v;
        };
    }

    function getVec3UniformFunction(value, model) {
        var v = Cartesian3.fromArray(value);

        return function() {
            return v;
        };
    }

    function getVec4UniformFunction(value, model) {
        var v = Cartesian4.fromArray(value);

        return function() {
            return v;
        };
    }

    function getMat2UniformFunction(value, model) {
        var v = Matrix2.fromColumnMajorArray(value);

        return function() {
            return v;
        };
    }

    function getMat3UniformFunction(value, model) {
        var v = Matrix3.fromColumnMajorArray(value);

        return function() {
            return v;
        };
    }

    function getMat4UniformFunction(value, model) {
        var v = Matrix4.fromColumnMajorArray(value);

        return function() {
            return v;
        };
    }

    function getTextureUniformFunction(value, model) {
        var tx = model._rendererResources.textures[value];

        return function() {
            return tx;
        };
    }

    var gltfUniformFunctions = {
    };

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
    // TODO: function for gltfUniformFunctions[WebGLRenderingContext.SAMPLER_CUBE].  https://github.com/KhronosGroup/glTF/issues/40

    function getUniformFunctionFromSource(source, model) {
        var runtimeNode = model._runtime.nodes[source];
        return function() {
            return runtimeNode.computedMatrix;
        };
    }

    function createUniformMaps(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedTextureCreation() || !loadResources.finishedProgramCreation()) {
            return;
        }

        if (!loadResources.createUniformMaps) {
            return;
        }
        loadResources.createUniformMaps = false;

        var gltf = model.gltf;
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var programs = gltf.programs;
        var rendererUniformMaps = model._rendererResources.uniformMaps;

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
                var activeUniforms = model._rendererResources.programs[instanceProgram.program].getAllUniforms();

                var parameterValues = {};
                var jointMatrices = [];

                // Uniform parameters for this pass
                for (var name in uniforms) {
                    if (uniforms.hasOwnProperty(name)) {
                        // Only add active uniforms
                        if (defined(activeUniforms[name])) {
                            var parameterName = uniforms[name];
                            var parameter = parameters[parameterName];

                            var func;

                            if (defined(instanceParameters[parameterName])) {
                                // Parameter overrides by the instance technique
                                func = gltfUniformFunctions[parameter.type](instanceParameters[parameterName], model);
                            } else if (defined(parameter.semantic)) {
// TODO: account for parameter.type with semantic
                                // Map glTF semantic to Cesium automatic uniform
                                func = gltfSemanticUniforms[parameter.semantic](context.getUniformState(), jointMatrices);
                            } else if (defined(parameter.source)) {
                                func = getUniformFunctionFromSource(parameter.source, model);
                            } else if (defined(parameter.value)) {
                                // Default technique value that may be overridden by a material
                                func = gltfUniformFunctions[parameter.type](parameter.value, model);
                            }

                            parameterValues[parameterName] = {
                                uniformName : name,
                                func : func
                            };
                        }
                    }
                }

                // Create uniform map
                var uniformMap = {};
                for (name in parameterValues) {
                    if (parameterValues.hasOwnProperty(name)) {
                        var pv = parameterValues[name];
                        uniformMap[pv.uniformName] = pv.func;
                    }
                }

                instanceTechnique.czm = {
                    jointMatrices : jointMatrices
                };
                rendererUniformMaps[materialName] = uniformMap;
            }
        }
    }

    function createPickColorFunction(color) {
        return function() {
            return color;
        };
    }

    function createCommand(model, node, nodeCommands, context) {
        var opaqueColorCommands = model._commandLists.opaqueList;
        var translucentColorCommands = model._commandLists.translucentList;

        var opaquePickCommands = model._commandLists.pickList.opaqueList;
        var translucentPickCommands = model._commandLists.pickList.translucentList;
        var pickIds = model._pickIds;
        var allowPicking = model.allowPicking;

        var debugShowBoundingVolume = model.debugShowBoundingVolume;

        var resources = model._rendererResources;
        var rendererVertexArrays = resources.vertexArrays;
        var rendererPrograms = resources.programs;
        var rendererPickPrograms = resources.pickPrograms;
        var rendererRenderStates = resources.renderStates;
        var rendererUniformMaps = resources.uniformMaps;

        var gltf = model.gltf;
        var accessors = gltf.accessors;
        var gltfMeshes = gltf.meshes;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        var meshes = defined(node.meshes) ? node.meshes : node.instanceSkin.sources;
        var meshesLength = meshes.length;

        for (var j = 0; j < meshesLength; ++j) {
            var name = meshes[j];
            var mesh = gltfMeshes[name];
            var primitives = mesh.primitives;
            var length = primitives.length;

            // The glTF node hierarchy is a DAG so a node can have more than one
            // parent, so a node may already have commands.  If so, append more
            // since they will have a different model matrix.
            nodeCommands[name] = defaultValue(nodeCommands[name], []);
            var meshCommands = nodeCommands[name];

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
                var offset = (ix.byteOffset / IndexDatatype.getSizeInBytes(ix.type));  // glTF has offset in bytes.  Cesium has offsets in indices
                var uniformMap = rendererUniformMaps[primitive.material];
                var isTranslucent = pass.states.blendEnable; // TODO: Offical way to test this: https://github.com/KhronosGroup/glTF/issues/105
                var rs = rendererRenderStates[instanceTechnique.technique];
                var owner = {
                    primitive : model,
                    id : model.id,
                    gltf : {
                        node : node,
                        mesh : mesh,
                        primitive : primitive,
                        primitiveIndex : i
                    }
                };

                var command = new DrawCommand();
                command.boundingVolume = new BoundingSphere(); // updated in update()
                command.modelMatrix = new Matrix4();           // computed in update()
                command.primitiveType = primitive.primitive;
                command.vertexArray = vertexArray;
                command.count = count;
                command.offset = offset;
                command.shaderProgram = rendererPrograms[instanceProgram.program];
                command.uniformMap = uniformMap;
                command.renderState = rs;
                command.owner = owner;
                command.debugShowBoundingVolume = debugShowBoundingVolume;
                if (isTranslucent) {
                    translucentColorCommands.push(command);
                } else {
                    opaqueColorCommands.push(command);
                }

                var pickCommand;

                if (allowPicking) {
                    var pickId = context.createPickId(owner);
                    pickIds.push(pickId);

                    var pickUniformMap = combine([
                        uniformMap, {
                            czm_pickColor : createPickColorFunction(pickId.color)
                        }], false, false);

                    pickCommand = new DrawCommand();
                    pickCommand.boundingVolume = new BoundingSphere(); // updated in update()
                    pickCommand.modelMatrix = new Matrix4();           // computed in update()
                    pickCommand.primitiveType = primitive.primitive;
                    pickCommand.vertexArray = vertexArray;
                    pickCommand.count = count;
                    pickCommand.offset = offset;
                    pickCommand.shaderProgram = rendererPickPrograms[instanceProgram.program];
                    pickCommand.uniformMap = pickUniformMap;
                    pickCommand.renderState = rs;
                    pickCommand.owner = owner;
                    if (isTranslucent) {
                        translucentPickCommands.push(pickCommand);
                    } else {
                        opaquePickCommands.push(pickCommand);
                    }
                }

                meshCommands.push({
                    command : command,
                    pickCommand : pickCommand,
                    boundingSphere : boundingSphere
                });
            }
        }
    }

    function createRuntimeNodes(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedPendingLoads() || !loadResources.finishedResourceCreation()) {
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
        var axis = new Cartesian3();

        var matrix;
        var translation;
        var rotation;
        var scale;

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
                    runtimeNode.commands = {};
                    createCommand(model, gltfNode, runtimeNode.commands, context);
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

    function createResources(model, context) {
        createBuffers(model, context);      // using glTF bufferViews
        createPrograms(model, context);
        createSamplers(model, context);
        createTextures(model, context);

        createSkins(model);
        createRuntimeAnimations(model);
        createVertexArrays(model, context); // using glTF meshes
        createRenderStates(model, context); // using glTF materials/techniques/passes/states
        createUniformMaps(model, context);  // using glTF materials/techniques/passes/instanceProgram
        createRuntimeNodes(model, context); // using glTF scene
    }

    ///////////////////////////////////////////////////////////////////////////

    function getNodeMatrix(node, result) {
        if (defined(node.matrix)) {
            result = node.matrix;
            return node.matrix;
        }

        return Matrix4.fromTranslationQuaternionRotationScale(node.translation, node.rotation, node.scale, result);
    }

    // To reduce allocations in updateModelMatrix()
    var scratchNodeStack = [];

    var scratchSphereCenter = new Cartesian3();
    var scratchSpheres = [];
    var scratchSubtract = new Cartesian3();

    function updateModelMatrix(model) {
        var allowPicking = model.allowPicking;
        var gltf = model.gltf;

        var rootNodes = model._runtime.rootNodes;
        var length = rootNodes.length;

        var nodeStack = scratchNodeStack;
        var computedModelMatrix = model._computedModelMatrix;

        // Compute bounding sphere that includes all transformed nodes
        Cartesian3.clone(Cartesian3.ZERO, scratchSphereCenter);
        scratchSpheres.length = 0;
        var spheres = scratchSpheres;

        for (var i = 0; i < length; ++i) {
            var n = rootNodes[i];

            n.transformToRoot = getNodeMatrix(n);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n.transformToRoot;
                var meshCommands = n.commands;

                if (defined(meshCommands)) {
                    // Node has meshes.  Update their commands.

                    var name;
                    for (name in meshCommands) {
                        if (meshCommands.hasOwnProperty(name)) {
                            var meshCommand = meshCommands[name];
                            var meshCommandLength = meshCommand.length;
                            for (var j = 0 ; j < meshCommandLength; ++j) {
                                var primitiveCommand = meshCommand[j];
                                var command = primitiveCommand.command;
                                Matrix4.multiplyTransformation(computedModelMatrix, transformToRoot, command.modelMatrix);

                                // TODO: Use transformWithoutScale if no node up to the root has scale (included targeted scale from animation).
                                // Preprocess this and store it with each node.
                                BoundingSphere.transform(primitiveCommand.boundingSphere, command.modelMatrix, command.boundingVolume);
                                //BoundingSphere.transformWithoutScale(primitiveCommand.boundingSphere, command.modelMatrix, command.boundingVolume);

                                if (allowPicking) {
                                    var pickCommand = primitiveCommand.pickCommand;
                                    Matrix4.clone(command.modelMatrix, pickCommand.modelMatrix);
                                    BoundingSphere.clone(command.boundingVolume, pickCommand.boundingVolume);
                                }

                                Cartesian3.add(command.boundingVolume.center, scratchSphereCenter, scratchSphereCenter);
                                spheres.push(command.boundingVolume);
                            }
                        }
                    }
                } else {
                    // Node has a light or camera
                    n.computedMatrix = Matrix4.multiplyTransformation(computedModelMatrix, transformToRoot, n.computedMatrix);
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var child = children[k];

                    var childMatrix = getNodeMatrix(child, child.transformToRoot);
                    Matrix4.multiplyTransformation(transformToRoot, childMatrix, child.transformToRoot);
                    nodeStack.push(child);
                }
            }
        }

        // Compute bounding sphere around the model
        var radiusSquared = 0;
        var index = 0;

        length = spheres.length;
        Cartesian3.divideByScalar(scratchSphereCenter, length, scratchSphereCenter);
        for (i = 0; i < length; ++i) {
            var bbs = spheres[i];
            var r = Cartesian3.magnitudeSquared(Cartesian3.subtract(bbs.center, scratchSphereCenter, scratchSubtract));

            if (r > radiusSquared) {
                radiusSquared = r;
                index = i;
            }
        }

        Cartesian3.clone(scratchSphereCenter, model.worldBoundingSphere.center);
        model.worldBoundingSphere.radius = Math.sqrt(radiusSquared) + spheres[index].radius;
    }

    var scratchObjectSpace = new Matrix4();

    function applySkins(model) {
        var gltf = model.gltf;
        var skins = gltf.skins;
        var nodes = gltf.nodes;
        var meshes = gltf.meshes;
        var materials = gltf.materials;
        var techniques = gltf.techniques;

        var skinnedNodes = model._skinnedNodes;
        var length = skinnedNodes.length;

        for (var i = 0; i < length; ++i) {
            var node = skinnedNodes[i];

            scratchObjectSpace = Matrix4.inverse(node.czm.transformToRoot);

            var instanceSkin = skinnedNodes[i].instanceSkin;
            var skin = skins[instanceSkin.skin];

            var joints = skin.joints;
            var bindShapeMatrix = skin.czm.bindShapeMatrix;
            var inverseBindMatrices = skin.czm.inverseBindMatrices;
            var inverseBindMatricesLength = inverseBindMatrices.length;

            var nodeNeshes = instanceSkin.sources;
            var meshesLength = nodeNeshes.length;
            for (var j = 0; j < meshesLength; ++j) {
                var mesh = meshes[nodeNeshes[j]];

                var primitives = mesh.primitives;
                var primitivesLength = primitives.length;
                for (var k = 0; k < primitivesLength; ++k) {
                    var jointMatrices = materials[primitives[k].material].instanceTechnique.czm.jointMatrices;
                    for (var m = 0; m < inverseBindMatricesLength; ++m) {
// TODO: replace these with Matrix4.multiplyTransformation below

                        // [joint-matrix] = [node-to-root^-1][joint-to-root][inverse-bind][bind-shape]
                        jointMatrices[m] = Matrix4.multiply(scratchObjectSpace, nodes[joints[m]].czm.transformToRoot, jointMatrices[m]);
                        jointMatrices[m] = Matrix4.multiply(jointMatrices[m], inverseBindMatrices[m], jointMatrices[m]);
                        if (defined(bindShapeMatrix)) {
                            // Optimization for when bind shape matrix is the identity.
                            jointMatrices[m] = Matrix4.multiply(jointMatrices[m], bindShapeMatrix, jointMatrices[m]);
                        }
                    }
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
                context.getObjectByPickColor(pickIds[i].color).id = id;
            }
        }
    }

    function updateWireframe(model) {
        if (model._debugWireframe !== model.debugWireframe) {
            model._debugWireframe = model.debugWireframe;

            // This assumes the original primitive was TRIANGLES and that the triangles
            // are connected for the wireframe to look perfect.
            var primitiveType = model.debugWireframe ? PrimitiveType.LINES : PrimitiveType.TRIANGLES;
            var opaqueCommands = model._commandLists.opaqueList;
            var translucentCommands = model._commandLists.translucentList;
            var i;
            var length;

            length = opaqueCommands.length;
            for (i = 0; i < length; ++i) {
                opaqueCommands[i].primitiveType = primitiveType;
            }

            length = translucentCommands.length;
            for (i = 0; i < length; ++i) {
                translucentCommands[i].primitiveType = primitiveType;
            }
        }
    }

    /**
     * @exception {RuntimeError} Failed to load external reference.
     *
     * @private
     */
    Model.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        if ((this._state === ModelState.NEEDS_LOAD) && defined(this.gltf)) {
            this._state = ModelState.LOADING;
            this._loadResources = new LoadResources();
            parse(this);
        }

        var justLoaded = false;

        if (this._state === ModelState.LOADING) {
            // Incrementally create WebGL resources as buffers/shaders/textures are downloaded
            createResources(this, context);

            var loadResources = this._loadResources;
            if (loadResources.finishedPendingLoads() && loadResources.finishedResourceCreation()) {
                this._state = ModelState.LOADED;
                this._loadResources = undefined;  // Clear CPU memory since WebGL resources were created.
                justLoaded = true;
            }
        }

        if (this._state === ModelState.LOADED) {
            var animated = this.animations.update(frameState);

            // Update modelMatrix throughout the tree as needed
            if (animated || !Matrix4.equals(this._modelMatrix, this.modelMatrix) || (this._scale !== this.scale) || justLoaded) {
                Matrix4.clone(this.modelMatrix, this._modelMatrix);
                this._scale = this.scale;
                Matrix4.multiplyByUniformScale(this.modelMatrix, this.scale, this._computedModelMatrix);

                updateModelMatrix(this);

                if (animated || justLoaded) {
                    // Apply skins if animation changed any node transforms
                    applySkins(this);
                }
            }

            updatePickIds(this, context);
            updateWireframe(this);
        }

        if (justLoaded) {
            // Called after modelMatrix update.
            frameState.events.push({
                event : this.readyToRender
            });
        }

        commandList.push(this._commandLists);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Model
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Model
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Model#isDestroyed
     *
     * @example
     * model = model && model.destroy();
     */
    Model.prototype.destroy = function() {
        var resources = this._rendererResources;
        destroy(resources.bufferViews);
        destroy(resources.vertexArrays);
        destroy(resources.programs);
        destroy(resources.pickPrograms);
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

    return Model;
});
