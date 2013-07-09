/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/Enumeration',
        '../Core/loadArrayBuffer',
        '../Core/loadText',
        '../Core/loadImage',
        '../Core/Queue',
        '../Core/IndexDatatype',
        '../Core/ComponentDatatype',
        '../Renderer/BufferUsage',
        './SceneMode'
    ], function(
        defined,
        defaultValue,
        destroyObject,
        Enumeration,
        loadArrayBuffer,
        loadText,
        loadImage,
        Queue,
        IndexDatatype,
        ComponentDatatype,
        BufferUsage,
        SceneMode) {
    "use strict";
// TODO: remove before merge to master
/*global console*/

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
        this.json = options.json;

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
        this.show = true;

        this._state = ModelState.NEEDS_LOAD;
        this._loadResources = undefined;
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
        var buffers = model.json.buffers;
        for (var name in buffers) {
            if (buffers.hasOwnProperty(name)) {
                ++model._loadResources.pendingBufferLoads;
                var bufferPath = model.basePath + buffers[name].path;
                loadArrayBuffer(bufferPath).then(bufferLoad(model, name), failedLoad);
            }
        }
    }

    function parseBufferViews(model) {
        var bufferViews = model.json.bufferViews;
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
        var shaders = model.json.shaders;
        for (var name in shaders) {
            if (shaders.hasOwnProperty(name)) {
                ++model._loadResources.pendingShaderLoads;
                var shaderPath = model.basePath + shaders[name].path;
                loadText(shaderPath).then(shaderLoad(model, name), failedLoad);
            }
        }
    }

    function parsePrograms(model) {
        var programs = model.json.programs;
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

    function parseImages(model) {
        var images = model.json.images;
        for (var name in images) {
            if (images.hasOwnProperty(name)) {
                ++model._loadResources.pendingTextureLoads;
                var imagePath = model.basePath + images[name].path;
                loadImage(imagePath).then(imageLoad(model, name), failedLoad);
            }
        }
    }

    function parseJson(model) {
        parseBuffers(model);
        parseBufferViews(model);
        parseShaders(model);
        parsePrograms(model);
        parseImages(model);
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
        var bufferViews = model.json.bufferViews;
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
        var indices = model.json.indices;
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

        var programs = model.json.programs;
        var shaders = loadResources.shaders;

        // Create one program per frame
        if (loadResources.programsToCreate.length > 0) {
            var name = loadResources.programsToCreate.dequeue();
            var program = programs[name];
            program.extra = defaultValue(program.extra, {});
            program.extra.czmProgram = context.getShaderCache().getShaderProgram(
                shaders[program.vertexShader],
                shaders[program.fragmentShader]);
        }
    }

    function createTextures(model, context) {
        var loadResources = model._loadResources;
        var images = model.json.images;

        // Create one texture per frame
        if (loadResources.texturesToCreate.length > 0) {
            var textureToCreate = loadResources.texturesToCreate.dequeue();

            var image = images[textureToCreate.name];
            image.extra = defaultValue(image.extra, {});
            image.extra.czmTexture = context.createTexture2D({
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
        var programs = model.json.programs;
        var techniques = model.json.techniques;
        var materials = model.json.materials;

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
         if (!loadResources.finishedBufferViewsCreation()) {
             return;
         }

         var bufferViews = model.json.bufferViews;
         var attributes = model.json.attributes;
         var indices = model.json.indices;
         var meshes = model.json.meshes;
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

    function createResources(model, context) {
        createBuffers(model, context);      // using glTF bufferViews
        createPrograms(model, context);
        createTextures(model, context);

        createVertexArrays(model, context); // using glTF meshes
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * @private
     */
    Model.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D)) {
// TODO: models in 2D and Columbus view
            return;
        }

        if ((this._state === ModelState.NEEDS_LOAD) && defined(this.json)) {
            this._state = ModelState.LOADING;
            this._loadResources = new LoadResources();
            parseJson(this);
        }

        if (this._state === ModelState.LOADING) {
            // Incrementally create WebGL resources as buffers/shaders/textures are downloaded
            createResources(this, context);

            var loadResources = this._loadResources;
            if (loadResources.finishedPendingLoads() && loadResources.finishedResourceCreation()) {
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
        var json = this.json;
        destroyExtra(json.bufferViews, 'czmBuffer');
        destroyExtra(json.program, 'czmProgram');
        destroyExtra(json.images, 'czmTexture');

        return destroyObject(this);
    };

    return Model;
});
