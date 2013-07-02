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

    function createBufferViews(model) {
        if (model._pendingBufferLoads !== 0) {
            return;
        }

        while (model._bufferViewsToCreate.length > 0) {
            var bufferView = model._bufferViewsToCreate.dequeue();
            console.log(bufferView);
        }
    }

    function createPrograms(model) {
        if (model._pendingShaderLoads !== 0) {
            return;
        }

        while (model._programsToCreate.length > 0) {
            var programToCreate = model._programsToCreate.dequeue();
            console.log(programToCreate);
        }
    }

    function createTextures(model) {
        while (model._texturesToCreate.length > 0) {
            var textureToCreate = model._texturesToCreate.dequeue();
            console.log(textureToCreate);
        }
    }

    function createResources(model) {
        createBufferViews(model);
        createPrograms(model);
        createTextures(model);
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

        createResources(this);

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
        return destroyObject(this);
    };

    return Model;
});
