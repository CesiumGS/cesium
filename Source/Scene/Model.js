/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/loadText',
        '../Core/loadImage',
        '../Core/Queue',
        './SceneMode'
    ], function(
        defined,
        defaultValue,
        DeveloperError,
        destroyObject,
        loadText,
        loadImage,
        Queue,
        SceneMode) {
    "use strict";

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

        this._programsToCreate = new Queue();
        this._texturesToCreate = new Queue();

        this._shaders = {};
        this._pendingShaderLoads = 0;
    };

    function parseShaders(model) {
        var shaders = model.json.shaders;
        for (var name in shaders) {
            if (shaders.hasOwnProperty(name)) {
                ++model._pendingShaderLoads;
                var shaderPath = model.basePath + shaders[name].path;
                loadText(shaderPath).then(function(source) {
                    model._shaders[name] = source;
                    --model._pendingShaderLoads;
                 }, function() {
                     // TODO
                 });
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

    function parseImages(model) {
        var images = model.json.images;
        for (var name in images) {
            if (images.hasOwnProperty(name)) {
                var imagePath = model.basePath + images[name].path;

                loadImage(imagePath).then(function(image) {
                   model._texturesToCreate.enqueue({
                        name : name,
                        image : image
                    });
                }, function() {
                    // TODO
                });
            }
        }
    }

    function parseJson(model) {
        parseShaders(model);
        parsePrograms(model);
        parseImages(model);
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
        createPrograms(model);
        createTextures(model);
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

        if (this._reload && defined(this.json)) {
            this._reload = false;
            parseJson(this);
        }

        createResources(this);
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
