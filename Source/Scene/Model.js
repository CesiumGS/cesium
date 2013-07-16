/*global define*/
define([
        '../Core/combine',
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Enumeration',
        '../Core/loadArrayBuffer',
        '../Core/loadText',
        '../Core/loadImage',
        '../Core/Queue',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/BoundingSphere',
        '../Core/IndexDatatype',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/TextureWrap',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/DrawCommand',
        '../Renderer/CommandLists',
        '../Renderer/createPickFragmentShaderSource',
        './SceneMode'
    ], function(
        combine,
        defined,
        defaultValue,
        destroyObject,
        DeveloperError,
        Enumeration,
        loadArrayBuffer,
        loadText,
        loadImage,
        Queue,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Matrix4,
        BoundingSphere,
        IndexDatatype,
        ComponentDatatype,
        PrimitiveType,
        TextureWrap,
        TextureMinificationFilter,
        TextureMagnificationFilter,
        BufferUsage,
        BlendingState,
        DrawCommand,
        CommandLists,
        createPickFragmentShaderSource,
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
         */
        this.gltf = options.gltf;

        /**
         * DOC_TBA
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
         * DOC_TBA
         *
         * @readonly
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        this._computedModelMatrix = Matrix4.IDENTITY.clone();   // Derived from modelMatrix and scale
        this._nodeStack = [];                                   // To reduce allocations in update()

        this._state = ModelState.NEEDS_LOAD;
        this._loadResources = undefined;

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
            debugShowBoundingVolume : options.debugShowBoundingVolume
        });

        loadText(url, options.headers).then(function(data) {
            model.gltf = JSON.parse(data);
            model.basePath = basePath;
        });

        return model;
    };

    ///////////////////////////////////////////////////////////////////////////

    function failedLoad() {
        // TODO
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
                loadArrayBuffer(bufferPath).then(bufferLoad(model, name), failedLoad);
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
                loadText(shaderPath).then(shaderLoad(model, name), failedLoad);
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
                loadImage(imagePath).then(imageLoad(model, name), failedLoad);
            }
        }
    }

    function parse(model) {
        parseBuffers(model);
        parseBufferViews(model);
        parseShaders(model);
        parsePrograms(model);
        parseTextures(model);
    }

    ///////////////////////////////////////////////////////////////////////////

    function createBuffers(model, context) {
        var loadResources = model._loadResources;

// TODO: more fine-grained bufferView-to-buffer dependencies
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
            bufferView.extra = defaultValue(bufferView.extra, {});

            if (bufferView.target === 'ARRAY_BUFFER') {
                // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
                raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                var vertexBuffer = context.createVertexBuffer(raw, BufferUsage.STATIC_DRAW);
                vertexBuffer.setVertexArrayDestroyable(false);
                bufferView.extra.czmBuffer = vertexBuffer;
            }
        }

        // The Cesium Renderer requires knowing the datatype for an index buffer
        // at creation type, which is not part of the glTF bufferview so loop
        // through glTF indices to create the bufferview's index buffer.
        var indices = model.gltf.indices;
        for (var name in indices) {
            if (indices.hasOwnProperty(name)) {
                var instance = indices[name];
                bufferView = bufferViews[instance.bufferView];

                if (!defined(bufferView.extra.czmBuffer)) {
                    raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);
                    var indexBuffer = context.createIndexBuffer(raw, BufferUsage.STATIC_DRAW, IndexDatatype[instance.type]);
                    indexBuffer.setVertexArrayDestroyable(false);
                    bufferView.extra.czmBuffer = indexBuffer;
                    // In theory, several glTF indices with different types could
                    // point to the same glTF bufferView, which would break this.
                    // In practice, it is unlikely as it will be UNSIGNED_SHORT.
                }
            }
        }
    }

    function createPrograms(model, context) {
        var loadResources = model._loadResources;

// TODO: more fine-grained program-to-shader dependencies
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
// TODO: glTF needs translucent flag so we know if we need its fragment shader.
            var pickFS = createPickFragmentShaderSource(fs, 'uniform');

            program.extra = defaultValue(program.extra, {});
            program.extra.czmProgram = context.getShaderCache().getShaderProgram(vs, fs);
            program.extra.czmPickProgram = context.getShaderCache().getShaderProgram(vs, pickFS);
// TODO: in theory, czmPickProgram could have a different set of attribute locations
        }
    }

    function createSamplers(model, context) {
        var loadResources = model._loadResources;

        if (loadResources.createSamplers) {
            loadResources.createSamplers = false;

            var samplers = model.gltf.samplers;
            for (var name in samplers) {
                if (samplers.hasOwnProperty(name)) {
                    var sampler = samplers[name];

                    sampler.extra = defaultValue(sampler.extra, {});
                    sampler.extra.czmSampler = context.createSampler({
                        wrapS : TextureWrap[sampler.wrapS],
                        wrapT : TextureWrap[sampler.wrapT],
                        minificationFilter : TextureMinificationFilter[sampler.minFilter],
                        magnificationFilter : TextureMagnificationFilter[sampler.magFilter]
                    });

                }
            }
        }
    }

    function createTextures(model, context) {
        var loadResources = model._loadResources;
        var textures = model.gltf.textures;

        // Create one texture per frame
        if (loadResources.texturesToCreate.length > 0) {
            var textureToCreate = loadResources.texturesToCreate.dequeue();

// TODO: consider target, format, and internalFormat
            var texture = textures[textureToCreate.name];
            texture.extra = defaultValue(texture.extra, {});
            texture.extra.czmTexture = context.createTexture2D({
                source : textureToCreate.image,
                flipY : false
            });
// TODO: texture cache
        }
    }

    var gltfTypes = {
        FLOAT : {
            componentsPerAttribute : 1,
            componentDatatype : ComponentDatatype.FLOAT
        },
        FLOAT_VEC2 : {
            componentsPerAttribute : 2,
            componentDatatype : ComponentDatatype.FLOAT
        },
        FLOAT_VEC3 : {
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        },
        FLOAT_VEC4 : {
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT
        }
// TODO: add other types
    };

    function getSemanticToAttributeLocations(model, primitive) {
// TODO: this could be done per material, not per mesh, if we don't change glTF
        var gltf = model.gltf;
        var programs = gltf.programs;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        // Retrieve the compiled shader program to assign index values to attributes
        var semanticToAttributeLocations = {};

        var technique = techniques[materials[primitive.material].instanceTechnique.technique];
        var parameters = technique.parameters;
        var pass = technique.passes[technique.pass];
        var instanceProgram = pass.instanceProgram;
        var program = programs[instanceProgram.program];
        var attributes = instanceProgram.attributes;
        var attributeLocations = program.extra.czmProgram.getVertexAttributes();

        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                var parameter = parameters[attributes[name]];

                semanticToAttributeLocations[parameter.semantic] = attributeLocations[name].index;
            }
        }

        return semanticToAttributeLocations;
    }

    function createVertexArrays(model, context) {
        var loadResources = model._loadResources;

// TODO: more fine-grained mesh-to-buffer-views dependencies
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

                         var semanticToAttributeLocations = getSemanticToAttributeLocations(model, primitive);
                         var attrs = [];
                         var semantics = primitive.semantics;
                         for (name in semantics) {
                             if (semantics.hasOwnProperty(name)) {
                                 var a = attributes[semantics[name]];

                                 var type = gltfTypes[a.type];
                                 attrs.push({
                                     index                  : semanticToAttributeLocations[name],
                                     vertexBuffer           : bufferViews[a.bufferView].extra.czmBuffer,
                                     componentsPerAttribute : type.componentsPerAttribute,
                                     componentDatatype      : type.componentDatatype,
// TODO: is normalize part of glTF attribute?
                                     normalize              : false,
                                     offsetInBytes          : a.byteOffset,
                                     strideInBytes          : a.byteStride
                                 });
                             }
                         }

                         var i = indices[primitive.indices];
                         var indexBuffer = bufferViews[i.bufferView].extra.czmBuffer;

                         primitive.extra = defaultValue(primitive.extra, {});
                         primitive.extra.czmVertexArray = context.createVertexArray(attrs, indexBuffer);
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

                    states.extra = defaultValue(states.extra, {});
                    states.extra.czmRenderState = context.createRenderState({
                        cull : {
                            enabled : states.cullFaceEnable
                        },
                        depthTest : {
                            enabled : states.depthTestEnable
                        },
                        depthMask : states.depthMask,
                        blending : states.blendEnable ? BlendingState.ALPHA_BLEND : BlendingState.DISABLED
                    });
                }
            }
        }
    }

    var gltfSemanticUniforms = {
// TODO: All semantics
        WORLD : function(uniformState) {
            return function() {
                return uniformState.getModel();
            };
        },
        VIEW : function(uniformState) {
            return function() {
                return uniformState.getView();
            };
        },
        PROJECTION : function(uniformState) {
            return function() {
                return uniformState.getProjection();
            };
        },
        WORLDVIEW : function(uniformState) {
            return function() {
                return uniformState.getModelView();
            };
        },
        VIEWPROJECTION : function(uniformState) {
            return function() {
                return uniformState.getViewProjection();
            };
        },
        WORLDVIEWPROJECTION : function(uniformState) {
            return function() {
                return uniformState.getModelViewProjection();
            };
        },
        WORLDINVERSE : function(uniformState) {
            return function() {
                return uniformState.getInverseModel();
            };
        },
        VIEWINVERSE : function(uniformState) {
            return function() {
                return uniformState.getInverseView();
            };
        },
        PROJECTIONINVERSE : function(uniformState) {
            return function() {
                return uniformState.getInverseProjection();
            };
        },
        WORLDVIEWINVERSE : function(uniformState) {
            return function() {
                return uniformState.getInverseModelView();
            };
        },
        VIEWPROJECTIONINVERSE : function(uniformState) {
            return function() {
                return uniformState.getInverseViewProjection();
            };
        },
        WORLDVIEWINVERSETRANSPOSE : function(uniformState) {
            return function() {
                return uniformState.getNormal();
            };
        }
    };

    var gltfUniformFunctions = {
// TODO: All types
         FLOAT : function(value, model, context) {
             return function() {
                 return value;
             };
         },
         FLOAT_VEC2 : function(value, model, context) {
             var v = Cartesian2.fromArray(value);

             return function() {
                 return v;
             };
         },
         FLOAT_VEC3 : function(value, model, context) {
             var v = Cartesian3.fromArray(value);

             return function() {
                 return v;
             };
         },
         FLOAT_VEC4 : function(value, model, context) {
             var v = Cartesian4.fromArray(value);

             return function() {
                 return v;
             };
         },
         SAMPLER_2D : function(value, model, context) {
             var texture = model.gltf.textures[value];
             var tx = texture.extra.czmTexture;
             var sampler = model.gltf.samplers[texture.sampler];

             if ((sampler.minFilter === 'NEAREST_MIPMAP_NEAREST') ||
                 (sampler.minFilter === 'LINEAR_MIPMAP_NEAREST') ||
                 (sampler.minFilter === 'NEAREST_MIPMAP_LINEAR') ||
                 (sampler.minFilter === 'LINEAR_MIPMAP_LINEAR')) {
                 tx.generateMipmap();
             }

             tx.setSampler(sampler.extra.czmSampler);

             return function() {
                 return tx;
             };
         }
    };

    function createUniformMaps(model, context) {
        var loadResources = model._loadResources;

// TODO: more fine-grained texture dependencies
        if (!loadResources.finishedTextureCreation()) {
            return;
        }

        var name;
        var materials = model.gltf.materials;
        var techniques = model.gltf.techniques;

        for (name in materials) {
            if (materials.hasOwnProperty(name)) {
                var material = materials[name];
                var instanceTechnique = material.instanceTechnique;
                var technique = techniques[instanceTechnique.technique];
                var parameters = technique.parameters;
                var pass = technique.passes[technique.pass];
                var instanceProgram = pass.instanceProgram;
                var uniforms = instanceProgram.uniforms;

                var parameterValues = {};

                // Uniform parameters for this pass
                for (name in uniforms) {
                    if (uniforms.hasOwnProperty(name)) {
                        var parameterName = uniforms[name];
                        var parameter = parameters[parameterName];
                        parameterValues[parameterName] = {
                            uniformName : name,
// TODO: account for parameter.type with semantic
                            func : defined(parameter.semantic) ? gltfSemanticUniforms[parameter.semantic](context.getUniformState()) : undefined
                        };
                    }
                }

                // Parameter overrides by the instance technique
// TODO: this overrides semantics?  What should the glTF spec say?
                var instanceParameters = instanceTechnique.values;
                var length = instanceParameters.length;
                for (var i = 0; i < length; ++i) {
                    var instanceParam = instanceParameters[i];
                    var parameterValue = parameterValues[instanceParam.parameter];
                    parameterValue.func = gltfUniformFunctions[parameters[instanceParam.parameter].type](instanceParam.value, model, context);
                }

                // Create uniform map
                var uniformMap = {};
                for (name in parameterValues) {
                    if (parameterValues.hasOwnProperty(name)) {
                        var pv = parameterValues[name];
                        uniformMap[pv.uniformName] = pv.func;
                    }
                }

                instanceTechnique.extra = defaultValue(instanceProgram.extra, {});
                instanceTechnique.extra.czmUniformMap = uniformMap;
            }
        }
    }

    function createPickColorFunction(color) {
        return function() {
            return color;
        };
    }

    function createCommand(model, node, context) {
        node.extra = defaultValue(node.extra, {});
        node.extra.czmMeshesCommands = defaultValue(node.extra.czmMeshesCommands, {});
        var czmMeshesCommands = node.extra.czmMeshesCommands;

        var colorCommands = model._commandLists.colorList;
        var pickCommands = model._commandLists.pickList;
        var pickIds = model._pickIds;
        var debugShowBoundingVolume = model.debugShowBoundingVolume;

        var gltf = model.gltf;

        var attributes = gltf.attributes;
        var indices = gltf.indices;
        var gltfMeshes = gltf.meshes;

        var programs = gltf.programs;
        var techniques = gltf.techniques;
        var materials = gltf.materials;

        var meshes = node.meshes;
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
                var positionAttribute = primitive.semantics.POSITION;
                if (defined(positionAttribute)) {
                    var a = attributes[positionAttribute];
                    boundingSphere = BoundingSphere.fromCornerPoints(Cartesian3.fromArray(a.min), Cartesian3.fromArray(a.max));
                }

                var primitiveType = PrimitiveType[primitive.primitive];
                var vertexArray = primitive.extra.czmVertexArray;
                var count = ix.count;
                var offset = (ix.byteOffset / IndexDatatype[ix.type].sizeInBytes);  // glTF has offset in bytes.  Cesium has offsets in indices
                var uniformMap = instanceTechnique.extra.czmUniformMap;
                var rs = pass.states.extra.czmRenderState;
                var owner = {
                    instance : model,
                    node : node,
                    mesh : mesh,
                    primitive : primitive
                };

                var command = new DrawCommand();
                command.boundingVolume = BoundingSphere.clone(boundingSphere); // updated in update()
                command.modelMatrix = new Matrix4();                           // computed in update()
                command.primitiveType = primitiveType;
                command.vertexArray = vertexArray;
                command.count = count;
                command.offset = offset;
                command.shaderProgram = programs[instanceProgram.program].extra.czmProgram;
                command.uniformMap = uniformMap;
                command.renderState = rs;
                command.owner = owner;
                command.debugShowBoundingVolume = debugShowBoundingVolume;
                colorCommands.push(command);

// TODO: Create type for pick owner?  Use for all primitives.
                var pickId = context.createPickId(owner);
                pickIds.push(pickId);

                var pickUniformMap = combine([
                    uniformMap, {
                        czm_pickColor : createPickColorFunction(pickId.color)
                    }], false, false);

                var pickCommand = new DrawCommand();
                pickCommand.boundingVolume = BoundingSphere.clone(boundingSphere); // updated in update()
                pickCommand.modelMatrix = new Matrix4();                           // computed in update()
                pickCommand.primitiveType = primitiveType;
                pickCommand.vertexArray = vertexArray;
                pickCommand.count = count;
                pickCommand.offset = offset;
                pickCommand.shaderProgram = programs[instanceProgram.program].extra.czmPickProgram;
                pickCommand.uniformMap = pickUniformMap;
                pickCommand.renderState = rs;
                pickCommand.owner = owner;
                pickCommands.push(pickCommand);

                meshesCommands.push({
                    command : command,
                    pickCommand : pickCommand,
                    unscaledBoundingSphere : boundingSphere
                });
            }
        }
    }

    function createCommands(model, context) {
        var loadResources = model._loadResources;

// TODO: more fine-grained dependencies
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

                // TODO: handle camera and light nodes
                if (defined(node.meshes)) {
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

        createVertexArrays(model, context); // using glTF meshes
        createRenderStates(model, context); // using glTF materials/techniques/passes/states
        createUniformMaps(model, context);  // using glTF materials/techniques/passes/instanceProgram

        createCommands(model, context);     // using glTF scene
    }

    ///////////////////////////////////////////////////////////////////////////

    function updateModelMatrix(model) {
        var gltf = model.gltf;
        var scenes = gltf.scenes;
        var nodes = gltf.nodes;

        var scene = scenes[gltf.scene];
        var sceneNodes = scene.nodes;
        var length = sceneNodes.length;

        var nodeStack = model._nodeStack;
        var scale = model.scale;

        for (var i = 0; i < length; ++i) {
            var n = nodes[sceneNodes[i]];
            nodeStack.push({
                node : n,
                transformToRoot : Matrix4.fromColumnMajorArray(n.matrix)
            });

            while (nodeStack.length > 0) {
                var top = nodeStack.pop();
                var transformToRoot = top.transformToRoot;
                n = top.node;

//TODO: handle camera and light nodes
                if (defined(n.extra) && defined(n.extra.czmMeshesCommands)) {
                    var meshCommands = n.extra.czmMeshesCommands;
                    var name;
                    for (name in meshCommands) {
                        if (meshCommands.hasOwnProperty(name)) {
                            var meshCommand = meshCommands[name];
                            var meshCommandLength = meshCommand.length;
                            for (var j = 0 ; j < meshCommandLength; ++j) {
                                var primitiveCommand = meshCommand[j];
                                var command = primitiveCommand.command;
                                var pickCommand = primitiveCommand.pickCommand;

                                Matrix4.multiply(model._computedModelMatrix, transformToRoot, command.modelMatrix);
                                Matrix4.clone(command.modelMatrix, pickCommand.modelMatrix);

                                var bs = primitiveCommand.unscaledBoundingSphere;
                                if (defined(bs)) {
                                    var radius = bs.radius * scale;
                                    command.boundingVolume.radius = radius;
                                    pickCommand.boundingVolume.radius = radius;
                                }
                            }
                        }
                    }
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var k = 0; k < childrenLength; ++k) {
                    var child = nodes[children[k]];
                    nodeStack.push({
                        node : child,
                        transformToRoot : Matrix4.multiply(transformToRoot, Matrix4.fromColumnMajorArray(child.matrix))
                    });
                }
            }
        }
    }

    /**
     * @private
     */
    Model.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D)) {
// TODO: models in 2D and Columbus view
            return;
        }

        if ((this._state === ModelState.NEEDS_LOAD) && defined(this.gltf)) {
            this._state = ModelState.LOADING;
            this._loadResources = new LoadResources();
            parse(this);
        }

        var justLoaded = false;
        var commandLists = this._commandLists;

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

        // Update modelMatrix throughout the tree as needed
        if (this._state === ModelState.LOADED) {
            if (!Matrix4.equals(this._modelMatrix, this.modelMatrix) || (this._scale !== this.scale) || justLoaded) {

                Matrix4.clone(this.modelMatrix, this._modelMatrix);
                this._scale = this.scale;
                Matrix4.multiplyByUniformScale(this.modelMatrix, this.scale, this._computedModelMatrix);

                updateModelMatrix(this);
            }
        }

        commandList.push(commandLists);
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

    function destroyExtra(property, resourceName) {
        for (var name in property) {
            if (property.hasOwnProperty(name)) {
                var extra = property[name].extra;
                if (defined(extra) && defined(extra[resourceName])) {
                    extra[resourceName] = extra[resourceName].destroy();
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
        destroyExtra(gltf.bufferViews, 'czmBuffer');
        destroyExtra(gltf.programs, 'czmProgram');
        destroyExtra(gltf.programs, 'czmPickProgram');
        destroyExtra(gltf.textures, 'czmTexture');

        var meshes = gltf.meshes;
        var name;

        for (name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var primitives = meshes[name].primitives;

                for (name in primitives) {
                    if (primitives.hasOwnProperty(name)) {
                        var extra = primitives[name].extra;
                        if (defined(extra) && defined(extra.czmVertexArray)) {
                            extra.czmVertexArray = extra.czmVertexArray.destroy();
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
