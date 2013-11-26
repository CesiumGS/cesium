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
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Event',
        '../Core/JulianDate',
        '../Renderer/TextureWrap',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/DrawCommand',
        '../Renderer/CommandLists',
        '../Renderer/createShaderSource',
        './ModelConstants',
        './ModelTypes',
        './ModelCache',
        './ModelAnimationCollection',
        './SceneMode'
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
        IndexDatatype,
        CesiumMath,
        Event,
        JulianDate,
        TextureWrap,
        TextureMinificationFilter,
        TextureMagnificationFilter,
        BufferUsage,
        BlendingState,
        DrawCommand,
        CommandLists,
        createShaderSource,
        ModelConstants,
        ModelTypes,
        ModelCache,
        ModelAnimationCollection,
        SceneMode) {
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
        this.createRenderStates = true;
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
        this.gltf = options.gltf;

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

        this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and scale
        this._state = ModelState.NEEDS_LOAD;
        this._loadResources = undefined;

        this._skinnedNodes = [];
        this._commandLists = new CommandLists();
        this._pickIds = [];
    };

    /**
     * DOC_TBA
     */
    Model.fromText = function(options) {
        if (!defined(options) || !defined(options.url)) {
            throw new DeveloperError('options.url is required');
        }

        var url = options.url;
        var basePath = '';
        var i = url.lastIndexOf('/');
        if (i !== -1) {
            basePath = url.substring(0, i + 1);
        }

        var model = new Model({
            show : options.show,
            modelMatrix : options.modelMatrix,
            scale : options.scale,
            id : options.id,
            debugShowBoundingVolume : options.debugShowBoundingVolume
        });

        loadText(url, options.headers).then(function(data) {
            model.gltf = JSON.parse(data);
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

    var defaultTranslation = Cartesian3.ZERO;
    var defaultRotation = Quaternion.IDENTITY;
    var defaultScale = new Cartesian3(1.0, 1.0, 1.0);
    var scratchAxis = new Cartesian3();

    function parseNodes(model) {
        var nodes = model.gltf.nodes;
        var skinnedNodes = model._skinnedNodes;

        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                var node = nodes[name];

                node.czm = {
                    meshesCommands : undefined,
                    transformToRoot : new Matrix4(),
                    computedMatrix : undefined,
                    translation : undefined,
                    rotation : undefined,
                    scale : undefined
                };

                if (defined(node.instanceSkin)) {
                    skinnedNodes.push(node);
                }

                // TRS converted to Cesium types
                if (defined(node.translation)) {
                    node.czm.translation = Cartesian3.fromArray(node.translation);
                } else {
                    node.czm.translation = Cartesian3.clone(defaultTranslation);
                }

                if (defined(node.rotation)) {
                    var axis = Cartesian3.fromArray(node.rotation, 0, scratchAxis);
                    var angle = node.rotation[3];
                    node.czm.rotation = Quaternion.fromAxisAngle(axis, angle);
                } else {
                    node.czm.rotation = Quaternion.clone(defaultRotation);
                }

                if (defined(node.scale)) {
                    node.czm.scale = Cartesian3.fromArray(node.scale);
                } else {
                    node.czm.scale = Cartesian3.clone(defaultScale);
                }
            }
        }
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

    var gltfIndexDatatype = {
    };
    gltfIndexDatatype[ModelConstants.UNSIGNED_BYTE] = IndexDatatype.UNSIGNED_BYTE;
    gltfIndexDatatype[ModelConstants.UNSIGNED_SHORT] = IndexDatatype.UNSIGNED_SHORT;
    gltfIndexDatatype[ModelConstants.UNSIGNED_INT] = IndexDatatype.UNSIGNED_INT;

    function createBuffers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.pendingBufferLoads !== 0) {
            return;
        }

        var raw;
        var bufferView;
        var bufferViews = model.gltf.bufferViews;
        var buffers = loadResources.buffers;

        while (loadResources.bufferViewsToCreate.length > 0) {
            var bufferViewName = loadResources.bufferViewsToCreate.dequeue();
            bufferView = bufferViews[bufferViewName];
            bufferView.czm = {
                webglBuffer : undefined
            };

            if (bufferView.target === ModelConstants.ARRAY_BUFFER) {
                // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
                raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                var vertexBuffer = context.createVertexBuffer(raw, BufferUsage.STATIC_DRAW);
                vertexBuffer.setVertexArrayDestroyable(false);
                bufferView.czm.webglBuffer = vertexBuffer;
            }

            // bufferViews referencing animations are ignored here and handled in createAnimations.
        }

        // The Cesium Renderer requires knowing the datatype for an index buffer
        // at creation type, which is not part of the glTF bufferview so loop
        // through glTF indices to create the bufferview's index buffer.
        var indices = model.gltf.indices;
        for (var name in indices) {
            if (indices.hasOwnProperty(name)) {
                var instance = indices[name];
                bufferView = bufferViews[instance.bufferView];

                if (!defined(bufferView.czm.webglBuffer)) {
                    raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                    var indexBuffer = context.createIndexBuffer(raw, BufferUsage.STATIC_DRAW, gltfIndexDatatype[instance.type]);
                    indexBuffer.setVertexArrayDestroyable(false);
                    bufferView.czm.webglBuffer = indexBuffer;
                    // In theory, several glTF indices with different types could
                    // point to the same glTF bufferView, which would break this.
                    // In practice, it is unlikely as it will be UNSIGNED_SHORT.
                }
            }
        }
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

            var vs = shaders[program.vertexShader];
            var fs = shaders[program.fragmentShader];
// TODO: Can optimize this shader with a glTF hint. https://github.com/KhronosGroup/glTF/issues/181
            var pickFS = createShaderSource({
                sources : [fs],
                pickColorQualifier : 'uniform'
            });

            program.czm = {
                program : context.getShaderCache().getShaderProgram(vs, fs),
                pickProgram : context.getShaderCache().getShaderProgram(vs, pickFS)
            };
// TODO: in theory, pickProgram could have a different set of attribute locations
        }
    }

    var gltfTextureWrap = {
    };
    gltfTextureWrap[ModelConstants.CLAMP_TO_EDGE] = TextureWrap.CLAMP_TO_EDGE;
    gltfTextureWrap[ModelConstants.REPEAT] = TextureWrap.REPEAT;
    gltfTextureWrap[ModelConstants.MIRRORED_REPEAT] = TextureWrap.MIRRORED_REPEAT;

    var gltfTextureMinificationFilter = {
    };
    gltfTextureMinificationFilter[ModelConstants.NEAREST] = TextureMinificationFilter.NEAREST;
    gltfTextureMinificationFilter[ModelConstants.LINEAR] = TextureMinificationFilter.LINEAR;
    gltfTextureMinificationFilter[ModelConstants.NEAREST_MIPMAP_NEAREST] = TextureMinificationFilter.NEAREST_MIPMAP_NEAREST;
    gltfTextureMinificationFilter[ModelConstants.LINEAR_MIPMAP_NEAREST] = TextureMinificationFilter.LINEAR_MIPMAP_NEAREST;
    gltfTextureMinificationFilter[ModelConstants.NEAREST_MIPMAP_LINEAR] = TextureMinificationFilter.NEAREST_MIPMAP_LINEAR;
    gltfTextureMinificationFilter[ModelConstants.LINEAR_MIPMAP_LINEAR] = TextureMinificationFilter.LINEAR_MIPMAP_LINEAR;

    var gltfTextureMagnificationFilter = {
    };
    gltfTextureMagnificationFilter[ModelConstants.NEAREST] = TextureMagnificationFilter.NEAREST;
    gltfTextureMagnificationFilter[ModelConstants.LINEAR] = TextureMagnificationFilter.LINEAR;

    function createSamplers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createSamplers) {
            loadResources.createSamplers = false;

            var samplers = model.gltf.samplers;
            for (var name in samplers) {
                if (samplers.hasOwnProperty(name)) {
                    var sampler = samplers[name];

                    sampler.czm = {
                        sampler : context.createSampler({
                            wrapS : gltfTextureWrap[sampler.wrapS],
                            wrapT : gltfTextureWrap[sampler.wrapT],
                            minificationFilter : gltfTextureMinificationFilter[sampler.minFilter],
                            magnificationFilter : gltfTextureMagnificationFilter[sampler.magFilter]
                        })
                    };
                }
            }
        }
    }

    function createTextures(model, context) {
        var loadResources = model._loadResources;
        var textures = model.gltf.textures;
        var samplers = model.gltf.samplers;

        // Create one texture per frame
        if (loadResources.texturesToCreate.length > 0) {
            var textureToCreate = loadResources.texturesToCreate.dequeue();
            var texture = textures[textureToCreate.name];
            var sampler = samplers[texture.sampler];

            var mipmap =
                (sampler.minFilter === ModelConstants.NEAREST_MIPMAP_NEAREST) ||
                (sampler.minFilter === ModelConstants.NEAREST_MIPMAP_LINEAR) ||
                (sampler.minFilter === ModelConstants.LINEAR_MIPMAP_NEAREST) ||
                (sampler.minFilter === ModelConstants.LINEAR_MIPMAP_LINEAR);
            var requiresNpot = mipmap ||
                (sampler.wrapS === ModelConstants.REPEAT) ||
                (sampler.wrapS === ModelConstants.MIRRORED_REPEAT) ||
                (sampler.wrapT === ModelConstants.REPEAT) ||
                (sampler.wrapT === ModelConstants.MIRRORED_REPEAT);

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

// TODO: consider format in addition to internalFormat?  https://github.com/KhronosGroup/glTF/issues/195
// TODO: texture cache
            var tx;

            if (texture.target === ModelConstants.TEXTURE_2D) {
                tx = context.createTexture2D({
                    source : source,
                    pixelFormat : texture.internalFormat,
                    flipY : false
                });
            }
            // TODO: else handle ModelConstants.TEXTURE_CUBE_MAP.  https://github.com/KhronosGroup/glTF/issues/40

            if (mipmap) {
                tx.generateMipmap();
            }
            tx.setSampler(sampler.czm.sampler);

            texture.czm = {
                texture : tx
            };
        }
    }

    function getAttributeLocations(model, primitive) {
// TODO: this could be done per material, not per mesh, if we don't change glTF
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
        var program = programs[instanceProgram.program];
        var attributes = instanceProgram.attributes;
        var programAttributeLocations = program.czm.program.getVertexAttributes();

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

                if (type === ModelConstants.FLOAT_MAT4) {
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

    function createAnimations(model) {
        var loadResources = model._loadResources;

         if (!loadResources.finishedPendingLoads()) {
             return;
         }

         var animations = model.gltf.animations;
         var name;

         for (var animationName in animations) {
             if (animations.hasOwnProperty(animationName)) {
                 var animation = animations[animationName];
                 var channels = animation.channels;
                 var parameters = animation.parameters;
                 var samplers = animation.samplers;

                 for (name in parameters) {
                     if (parameters.hasOwnProperty(name)) {
                         var parameter = parameters[name];
                         parameter.czm = {
                             values : ModelCache.getAnimationParameterValues(model, parameter)
                         };
                     }
                 }

                 for (name in samplers) {
                     if (samplers.hasOwnProperty(name)) {
                         var sampler = samplers[name];
                         sampler.czm = {
                             spline : ModelCache.getAnimationSpline(model, animationName, animation, name, sampler)
                         };
                     }
                 }

                 // Find start and stop time for the entire animation
                 var startTime = Number.MAX_VALUE;
                 var stopTime = -Number.MAX_VALUE;

                 for (name in channels) {
                     if (channels.hasOwnProperty(name)) {
                         var channel = channels[name];
                         var timeParameter = parameters[samplers[channel.sampler].input];
                         var times = timeParameter.czm.values;

                         startTime = Math.min(startTime, times[0]);
                         stopTime = Math.max(stopTime, times[timeParameter.count - 1]);
                     }
                 }

                 animation.czm = {
                     startTime : startTime,
                     stopTime : stopTime
                 };
             }
         }
    }

    function createVertexArrays(model, context) {
        var loadResources = model._loadResources;

         if (!loadResources.finishedBufferViewsCreation() || !loadResources.finishedProgramCreation()) {
             return;
         }

         var gltf = model.gltf;
         var bufferViews = gltf.bufferViews;
         var attributes = gltf.attributes;
         var indices = gltf.indices;
         var meshes = gltf.meshes;
         var name;

         for (name in meshes) {
             if (meshes.hasOwnProperty(name)) {
                 var primitives = meshes[name].primitives;

                 for (name in primitives) {
                     if (primitives.hasOwnProperty(name)) {
                         var primitive = primitives[name];

                         var attributeLocations = getAttributeLocations(model, primitive);
                         var attrs = [];
                         var primitiveAttributes = primitive.attributes;
                         for (name in primitiveAttributes) {
                             if (primitiveAttributes.hasOwnProperty(name)) {
                                 var a = attributes[primitiveAttributes[name]];

                                 var type = ModelTypes[a.type];
                                 attrs.push({
                                     index                  : attributeLocations[name],
                                     vertexBuffer           : bufferViews[a.bufferView].czm.webglBuffer,
                                     componentsPerAttribute : type.componentsPerAttribute,
                                     componentDatatype      : type.componentDatatype,
                                     normalize              : false,
                                     offsetInBytes          : a.byteOffset,
                                     strideInBytes          : a.byteStride
                                 });
                             }
                         }

                         var i = indices[primitive.indices];
                         var indexBuffer = bufferViews[i.bufferView].czm.webglBuffer;

                         primitive.czm = {
                             vertexArray : context.createVertexArray(attrs, indexBuffer)
                         };
                     }
                 }
             }
         }
    }

    function createRenderStates(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createRenderStates) {
            loadResources.createRenderStates = false;

            var techniques = model.gltf.techniques;
            for (var name in techniques) {
                if (techniques.hasOwnProperty(name)) {
                    var technique = techniques[name];
                    var pass = technique.passes[technique.pass];
                    var states = pass.states;

                    states.czm = {
                        renderState : context.createRenderState({
                            cull : {
                                enabled : !!states.cullFaceEnable
                            },
                            depthTest : {
                                enabled : !!states.depthTestEnable
                            },
                            depthMask : !!states.depthMask,
                            blending : !!states.blendEnable ? BlendingState.ALPHA_BLEND : BlendingState.DISABLED
                        })
                    };
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

    function getScalarUniformFunction(value, gltf) {
        return function() {
            return value;
        };
    }

    function getVec2UniformFunction(value, gltf) {
        var v = Cartesian2.fromArray(value);

        return function() {
            return v;
        };
    }

    function getVec3UniformFunction(value, gltf) {
        var v = Cartesian3.fromArray(value);

        return function() {
            return v;
        };
    }

    function getVec4UniformFunction(value, gltf) {
        var v = Cartesian4.fromArray(value);

        return function() {
            return v;
        };
    }

    function getMat2UniformFunction(value, gltf) {
        var v = Matrix2.fromColumnMajorArray(value);

        return function() {
            return v;
        };
    }

    function getMat3UniformFunction(value, gltf) {
        var v = Matrix3.fromColumnMajorArray(value);

        return function() {
            return v;
        };
    }

    function getMat4UniformFunction(value, gltf) {
        var v = Matrix4.fromColumnMajorArray(value);

        return function() {
            return v;
        };
    }

    function getTextureUniformFunction(value, gltf) {
        var texture = gltf.textures[value];
        var tx = texture.czm.texture;

        return function() {
            return tx;
        };
    }

    var gltfUniformFunctions = {
    };

    gltfUniformFunctions[ModelConstants.FLOAT] = getScalarUniformFunction;
    gltfUniformFunctions[ModelConstants.FLOAT_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[ModelConstants.FLOAT_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[ModelConstants.FLOAT_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[ModelConstants.INT] = getScalarUniformFunction;
    gltfUniformFunctions[ModelConstants.INT_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[ModelConstants.INT_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[ModelConstants.INT_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[ModelConstants.BOOL] = getScalarUniformFunction;
    gltfUniformFunctions[ModelConstants.BOOL_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[ModelConstants.BOOL_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[ModelConstants.BOOL_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[ModelConstants.FLOAT_MAT2] = getMat2UniformFunction;
    gltfUniformFunctions[ModelConstants.FLOAT_MAT3] = getMat3UniformFunction;
    gltfUniformFunctions[ModelConstants.FLOAT_MAT4] = getMat4UniformFunction;
    gltfUniformFunctions[ModelConstants.SAMPLER_2D] = getTextureUniformFunction;
    // TODO: function for gltfUniformFunctions[ModelConstants.SAMPLER_CUBE].  https://github.com/KhronosGroup/glTF/issues/40

    function getUniformFunctionFromSource(source, gltf) {
        var nodes = gltf.nodes;
        var czm = nodes[source].czm;

        return function() {
            return czm.computedMatrix;
        };
    }

    function createUniformMaps(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedTextureCreation() || !loadResources.finishedProgramCreation()) {
            return;
        }

        var name;
        var gltf = model.gltf;
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var programs = gltf.programs;

        for (name in materials) {
            if (materials.hasOwnProperty(name)) {
                var material = materials[name];
                var instanceTechnique = material.instanceTechnique;
                var instanceParameters = instanceTechnique.values;
                var technique = techniques[instanceTechnique.technique];
                var parameters = technique.parameters;
                var pass = technique.passes[technique.pass];
                var instanceProgram = pass.instanceProgram;
                var uniforms = instanceProgram.uniforms;
                var activeUniforms = programs[instanceProgram.program].czm.program.getAllUniforms();

                var parameterValues = {};
                var jointMatrices = [];

                // Uniform parameters for this pass
                for (name in uniforms) {
                    if (uniforms.hasOwnProperty(name)) {
                        // Only add active uniforms
                        if (defined(activeUniforms[name])) {
                            var parameterName = uniforms[name];
                            var parameter = parameters[parameterName];

                            var func;

                            if (defined(instanceParameters[parameterName])) {
                                // Parameter overrides by the instance technique
                                func = gltfUniformFunctions[parameter.type](instanceParameters[parameterName], gltf);
                            } else if (defined(parameter.semantic)) {
// TODO: account for parameter.type with semantic
                                // Map glTF semantic to Cesium automatic uniform
                                func = gltfSemanticUniforms[parameter.semantic](context.getUniformState(), jointMatrices);
                            } else if (defined(parameter.source)) {
                                func = getUniformFunctionFromSource(parameter.source, gltf);
                            } else if (defined(parameter.value)) {
                                // Default technique value that may be overridden by a material
                                func = gltfUniformFunctions[parameter.type](parameter.value, gltf);
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
                    uniformMap : uniformMap,
                    jointMatrices : jointMatrices
                };
            }
        }
    }

    function createPickColorFunction(color) {
        return function() {
            return color;
        };
    }

    function createCommand(model, node, context) {
        node.czm.meshesCommands = defaultValue(node.czm.meshesCommands, {});
        var czmMeshesCommands = node.czm.meshesCommands;

        var opaqueColorCommands = model._commandLists.opaqueList;
        var translucentColorCommands = model._commandLists.translucentList;
        var opaquePickCommands = model._commandLists.pickList.opaqueList;
        var translucentPickCommands = model._commandLists.pickList.translucentList;

        var pickIds = model._pickIds;
        var debugShowBoundingVolume = model.debugShowBoundingVolume;

        var gltf = model.gltf;

        var attributes = gltf.attributes;
        var indices = gltf.indices;
        var gltfMeshes = gltf.meshes;

        var programs = gltf.programs;
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
            czmMeshesCommands[name] = defaultValue(czmMeshesCommands[name], []);
            var meshesCommands = czmMeshesCommands[name];

            for (var i = 0; i < length; ++i) {
                var primitive = primitives[i];
                var ix = indices[primitive.indices];
                var instanceTechnique = materials[primitive.material].instanceTechnique;
                var technique = techniques[instanceTechnique.technique];
                var pass = technique.passes[technique.pass];
                var instanceProgram = pass.instanceProgram;

                var boundingSphere;
                var positionAttribute = primitive.attributes.POSITION;
                if (defined(positionAttribute)) {
                    var a = attributes[positionAttribute];
                    boundingSphere = BoundingSphere.fromCornerPoints(Cartesian3.fromArray(a.min), Cartesian3.fromArray(a.max));
                }

                var vertexArray = primitive.czm.vertexArray;
                var count = ix.count;
                var offset = (ix.byteOffset / gltfIndexDatatype[ix.type].sizeInBytes);  // glTF has offset in bytes.  Cesium has offsets in indices
                var uniformMap = instanceTechnique.czm.uniformMap;
                var isTranslucent = pass.states.blendEnable; // TODO: Offical way to test this: https://github.com/KhronosGroup/glTF/issues/105
                var rs = pass.states.czm.renderState;
                var owner = {
                    primitive : model,
                    id : model.id,
                    gltf : {
                        node : node,
                        mesh : mesh,
                        primitive : primitive
                    }
                };

                var command = new DrawCommand();
                command.boundingVolume = new BoundingSphere(); // updated in update()
                command.modelMatrix = new Matrix4();           // computed in update()
                command.primitiveType = primitive.primitive;
                command.vertexArray = vertexArray;
                command.count = count;
                command.offset = offset;
                command.shaderProgram = programs[instanceProgram.program].czm.program;
                command.uniformMap = uniformMap;
                command.renderState = rs;
                command.owner = owner;
                command.debugShowBoundingVolume = debugShowBoundingVolume;
                if (isTranslucent) {
                    translucentColorCommands.push(command);
                } else {
                    opaqueColorCommands.push(command);
                }

                var pickId = context.createPickId(owner);
                pickIds.push(pickId);

                var pickUniformMap = combine([
                    uniformMap, {
                        czm_pickColor : createPickColorFunction(pickId.color)
                    }], false, false);

                var pickCommand = new DrawCommand();
                pickCommand.boundingVolume = new BoundingSphere(); // updated in update()
                pickCommand.modelMatrix = new Matrix4();           // computed in update()
                pickCommand.primitiveType = primitive.primitive;
                pickCommand.vertexArray = vertexArray;
                pickCommand.count = count;
                pickCommand.offset = offset;
                pickCommand.shaderProgram = programs[instanceProgram.program].czm.pickProgram;
                pickCommand.uniformMap = pickUniformMap;
                pickCommand.renderState = rs;
                pickCommand.owner = owner;
                if (isTranslucent) {
                    translucentPickCommands.push(pickCommand);
                } else {
                    opaquePickCommands.push(pickCommand);
                }

                meshesCommands.push({
                    command : command,
                    pickCommand : pickCommand,
                    boundingSphere : boundingSphere
                });
            }
        }
    }

    function createCommands(model, context) {
        var loadResources = model._loadResources;

        if (!loadResources.finishedPendingLoads() || !loadResources.finishedResourceCreation()) {
            return;
        }

        // Create commands for nodes in the default scene.

        var gltf = model.gltf;
        var nodes = gltf.nodes;

        var scene = gltf.scenes[gltf.scene];
        var sceneNodes = scene.nodes;
        var length = sceneNodes.length;

        var stack = [];

        for (var i = 0; i < length; ++i) {
            stack.push(nodes[sceneNodes[i]]);

            while (stack.length > 0) {
                var node = stack.pop();

                if (defined(node.meshes) || defined(node.instanceSkin)) {
                    createCommand(model, node, context);
                }

                var children = node.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    stack.push(nodes[children[k]]);
                }
            }
        }
    }

    function createResources(model, context) {
        createBuffers(model, context);      // using glTF bufferViews
        createPrograms(model, context);
        createSamplers(model, context);
        createTextures(model, context);

        createSkins(model);
        createAnimations(model);
        createVertexArrays(model, context); // using glTF meshes
        createRenderStates(model, context); // using glTF materials/techniques/passes/states
        createUniformMaps(model, context);  // using glTF materials/techniques/passes/instanceProgram

        createCommands(model, context);     // using glTF scene
    }

    ///////////////////////////////////////////////////////////////////////////

    function getNodeMatrix(node, result) {
        if (defined(node.matrix)) {
            return Matrix4.fromColumnMajorArray(node.matrix, result);
        }

        var czm = node.czm;
        return Matrix4.fromTranslationQuaternionRotationScale(czm.translation, czm.rotation, czm.scale, result);
    }

    // To reduce allocations in update()
    var scratchNodeStack = [];
    var scratchSpheres = [];

    function updateModelMatrix(model) {
        var gltf = model.gltf;
        var scenes = gltf.scenes;
        var nodes = gltf.nodes;

        var scene = scenes[gltf.scene];
        var sceneNodes = scene.nodes;
        var length = sceneNodes.length;

        var nodeStack = scratchNodeStack;
        var computedModelMatrix = model._computedModelMatrix;

        // Compute bounding sphere that includes all transformed nodes
        var spheres = scratchSpheres;
        var sphereCenter = new Cartesian3();

        for (var i = 0; i < length; ++i) {
            var n = nodes[sceneNodes[i]];

            getNodeMatrix(n, n.czm.transformToRoot);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n.czm.transformToRoot;
                var meshCommands = n.czm.meshesCommands;

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
                                var pickCommand = primitiveCommand.pickCommand;

                                Matrix4.multiply(computedModelMatrix, transformToRoot, command.modelMatrix);
                                Matrix4.clone(command.modelMatrix, pickCommand.modelMatrix);

                                BoundingSphere.transform(primitiveCommand.boundingSphere, command.modelMatrix, command.boundingVolume);
                                BoundingSphere.clone(command.boundingVolume, pickCommand.boundingVolume);

                                Cartesian3.add(command.boundingVolume.center, sphereCenter, sphereCenter);
                                spheres.push(command.boundingVolume);
                            }
                        }
                    }
                } else {
                    // Node has a light or camera
                    n.czm.computedMatrix = Matrix4.multiply(computedModelMatrix, transformToRoot, n.czm.computedMatrix);
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var child = nodes[children[k]];

                    var childMatrix = getNodeMatrix(child, child.czm.transformToRoot);
                    Matrix4.multiply(transformToRoot, childMatrix, child.czm.transformToRoot);
                    nodeStack.push(child);
                }
            }
        }

        // Compute bounding sphere around the model
        var radius = 0;

        length = spheres.length;
        Cartesian3.divideByScalar(sphereCenter, length, sphereCenter);
        for (i = 0; i < length; ++i) {
            var bbs = spheres[i];
            var r = Cartesian3.magnitude(Cartesian3.subtract(bbs.center, sphereCenter)) + bbs.radius;

            if (r > radius) {
                radius = r;
            }
        }

        Cartesian3.clone(sphereCenter, model.worldBoundingSphere.center);
        model.worldBoundingSphere.radius = radius;
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
        }

        if (justLoaded) {
            // Called after modelMatrix update.
            frameState.events.push({
                event : this.readyToRender
            });
        }

        updatePickIds(this, context);

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

    function destroyCzm(property, resourceName) {
        for (var name in property) {
            if (property.hasOwnProperty(name)) {
                var czm = property[name].czm;
                if (defined(czm) && defined(czm[resourceName])) {
                    czm[resourceName] = czm[resourceName].destroy();
                }
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
        var gltf = this.gltf;
        destroyCzm(gltf.bufferViews, 'webglBuffer');
        destroyCzm(gltf.programs, 'program');
        destroyCzm(gltf.programs, 'pickProgram');
        destroyCzm(gltf.textures, 'texture');

        var meshes = gltf.meshes;
        var name;

        for (name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var primitives = meshes[name].primitives;

                for (name in primitives) {
                    if (primitives.hasOwnProperty(name)) {
                        var czm = primitives[name].czm;
                        if (defined(czm) && defined(czm.vertexArray)) {
                            czm.vertexArray = czm.vertexArray.destroy();
                        }
                    }
                }
            }
        }

        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        return destroyObject(this);
    };

    return Model;
});
