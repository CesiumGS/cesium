/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/loadArrayBuffer',
        '../Core/loadText',
        '../Core/loadImage',
        '../Core/Queue',
        '../Core/IndexDatatype',
        '../Renderer/BufferUsage',
        './SceneMode'
    ], function(
        defined,
        defaultValue,
        DeveloperError,
        destroyObject,
        loadArrayBuffer,
        loadText,
        loadImage,
        Queue,
        IndexDatatype,
        BufferUsage,
        SceneMode) {
    "use strict";
// TODO: remove before merge to master
/*global console*/

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

        this._reload = true;

        this._bufferViewsToCreate = new Queue();
        this._buffers = {};
        this._pendingBufferLoads = 0;

        this._programsToCreate = new Queue();
        this._shaders = {};
        this._pendingShaderLoads = 0;

        this._texturesToCreate = new Queue();
        this._pendingTextureLoads = 0;
    };

    ///////////////////////////////////////////////////////////////////////////

    function bufferLoad(model, name) {
        return function(arrayBuffer) {
            model._buffers[name] = arrayBuffer;
            --model._pendingBufferLoads;
         };
    }

    function failedBufferLoad() {
        // TODO
    }

    function parseBuffers(model) {
        var buffers = model.json.buffers;
        for (var name in buffers) {
            if (buffers.hasOwnProperty(name)) {
                ++model._pendingBufferLoads;
                var bufferPath = model.basePath + buffers[name].path;
                loadArrayBuffer(bufferPath).then(bufferLoad(model, name), failedBufferLoad);
            }
        }
    }

    function parseBufferViews(model) {
        var bufferViews = model.json.bufferViews;
        for (var name in bufferViews) {
            if (bufferViews.hasOwnProperty(name)) {
                var bufferView = bufferViews[name];
                model._bufferViewsToCreate.enqueue({
                     name : name,
                     buffer : bufferView.buffer,
                     byteLength : bufferView.byteLength,
                     byteOffset : bufferView.byteOffset,
                     target : bufferView.target
                 });
            }
        }
    }

    function shaderLoad(model, name) {
        return function(source) {
            model._shaders[name] = source;
            --model._pendingShaderLoads;
         };
    }

    function failedShaderLoad() {
        // TODO
    }

    function parseShaders(model) {
        var shaders = model.json.shaders;
        for (var name in shaders) {
            if (shaders.hasOwnProperty(name)) {
                ++model._pendingShaderLoads;
                var shaderPath = model.basePath + shaders[name].path;
                loadText(shaderPath).then(shaderLoad(model, name), failedShaderLoad);
            }
        }
    }

    function parsePrograms(model) {
        var programs = model.json.programs;
        for (var name in programs) {
            if (programs.hasOwnProperty(name)) {
                var program = programs[name];
                model._programsToCreate.enqueue({
                     name : name,
                     vertexShader : program.vertexShader,
                     fragmentShader : program.fragmentShader
                 });
            }
        }
    }

    function imageLoad(model, name) {
        return function(image) {
            --model._pendingTextureLoads;
            model._texturesToCreate.enqueue({
                 name : name,
                 image : image
             });
         };
    }

    function failedImageLoad() {
        // TODO
    }

    function parseImages(model) {
        var images = model.json.images;
        for (var name in images) {
            if (images.hasOwnProperty(name)) {
                ++model._pendingTextureLoads;
                var imagePath = model.basePath + images[name].path;
                loadImage(imagePath).then(imageLoad(model, name), failedImageLoad);
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

    function createBufferViews(model, context) {
        if (model._pendingBufferLoads !== 0) {
            return;
        }

        var gltfBufferViews = model.json.bufferViews;
        var buffers = model._buffers;

        while (model._bufferViewsToCreate.length > 0) {
            var bufferView = model._bufferViewsToCreate.dequeue();

            var gltfBufferView = gltfBufferViews[bufferView.name];
            gltfBufferView.extra = defaultValue(gltfBufferView.extra, {});

            var raw = new Uint8Array(buffers[bufferView.buffer], bufferView.byteOffset, bufferView.byteLength);

            if (bufferView.target === 'ARRAY_BUFFER') {
                gltfBufferView.extra.czmBuffer = context.createVertexBuffer(raw, BufferUsage.STATIC_DRAW);
            } else { // ELEMENT_ARRAY_BUFFER
// TODO: we don't know the index datatype yet...and createIndexBuffer() should not require it.
                gltfBufferView.extra.czmBuffer = context.createIndexBuffer(raw, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
            }
        }
    }

    function createPrograms(model, context) {
        if (model._pendingShaderLoads !== 0) {
            return;
        }

        var gltfPrograms = model.json.programs;
        var shaders = model._shaders;

        while (model._programsToCreate.length > 0) {
            var programToCreate = model._programsToCreate.dequeue();

            var gltfProgram = gltfPrograms[programToCreate.name];
            gltfProgram.extra = defaultValue(gltfProgram.extra, {});
            gltfProgram.extra.czmProgram = context.getShaderCache().getShaderProgram(
                shaders[programToCreate.vertexShader],
                shaders[programToCreate.fragmentShader]);
        }
    }

    function createTextures(model, context) {
        var gltfImages = model.json.images;

        while (model._texturesToCreate.length > 0) {
            var textureToCreate = model._texturesToCreate.dequeue();

            var gltfImage = gltfImages[textureToCreate.name];
            gltfImage.extra = defaultValue(gltfImage.extra, {});
            gltfImage.extra.czmTexture = context.createTexture2D({
                source : textureToCreate.image,
                flipY : false
            });
        }
    }

    function createResources(model, context) {
        createBufferViews(model, context);
        createPrograms(model, context);
        createTextures(model, context);
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

        if (this._reload && defined(this.json)) {
            this._reload = false;
            parseJson(this);
        }

        createResources(this, context);

        if ((this._pendingBufferLoads === 0) &&
            (this._pendingShaderLoads === 0) &&
            (this._pendingTextureLoads === 0)) {

            // Clear CPU memory since WebGL resources were created.
            this._buffers = {};
            this._shaders = {};
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
        destroyExtra(this.json.buffers, 'czmBuffer');
        destroyExtra(this.json.program, 'czmProgram');
        destroyExtra(this.json.images, 'czmTexture');

        return destroyObject(this);
    };

    return Model;
});
