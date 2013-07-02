/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/loadImage',
        '../Core/Queue',
        './SceneMode'
    ], function(
        defined,
        defaultValue,
        DeveloperError,
        destroyObject,
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

        this._pendingRequests = 0;
        this._texturesToCreate = new Queue();
    };

    function parseJson(model) {
        var name;
        var json = model.json;

        var images = json.images;
        for (name in images) {
            if (images.hasOwnProperty(name)) {
                var imagePath = model.basePath + images[name].path;

                loadImage(imagePath).then(function(image) {
                   model. _texturesToCreate.enqueue({
                        name : name,
                        image : image
                    });

                    --model._pendingRequests;
                }, function() {
                    // TODO
                });
            }
        }
    }

    function createTextures(texturesToCreate) {
        while (texturesToCreate.length > 0) {
            var textureToCreate = texturesToCreate.dequeue();
            console.log(textureToCreate);
        }
    }

    function createResources(model) {
        createTextures(model._texturesToCreate);
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
