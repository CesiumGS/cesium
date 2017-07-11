/*global define*/
define([
        '../Core/Check',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/loadImage',
        '../Renderer/Texture'
    ], function(
        Check,
        clone,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        loadImage,
        Texture) {
    'use strict';

    /**
     * A post process stage for {@link PostProcess}.
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.fragmentShader The fragment shader used by the post process stage.
     * @param {Object} options.uniformValues Uniform values that modify the behavior of the post process stage.
     *
     * @alias PostProcessStage
     * @constructor
     */
    function PostProcessStage(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options', options);
        Check.typeOf.string('options.fragmentShader', options.fragmentShader);
        //>>includeEnd('debug');

        this._fragmentShader = options.fragmentShader;
        this._drawCommand = undefined;
        this._ready = false;

        var texturesLength = 0;
        var uniformValues = options.uniformValues;
        for (var name in uniformValues) {
            if (uniformValues.hasOwnProperty(name)) {
                if (typeof uniformValues[name] === 'string') {
                    ++texturesLength;
                }
            }
        }
        this._texturesLength = texturesLength;
        this._textures = [];

        this._uniformValues = uniformValues;

        /**
         * Whether to show the post process stage.
         * @type {Boolean}
         * @default false
         */
        this.show = false;
    }

    defineProperties(PostProcessStage.prototype, {
        /**
         * Whether the post process stage is ready.
         * @memberof PostProcessStage.prototype
         * @type {Boolean}
         * @default false
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Uniform values that modify the behavior of the post process stage.
         * @type {Object}
         */
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        }
    });

    function loadTexture(stage, uniformName, imagePath, frameState) {
        return loadImage(imagePath).then(function(image) {
            frameState.afterRender.push(function() {
                var texture = new Texture({
                    context : frameState.context,
                    source : image
                });
                stage._uniformValues[uniformName] = texture;
                stage._textures.push(texture);
            });
        });
    }

    /**
     * @private
     */
    PostProcessStage.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        if (this._textures.length === this._texturesLength) {
            this._ready = true;
            return;
        }

        var uniformValues = this._uniformValues;
        for (var name in uniformValues) {
            if (uniformValues.hasOwnProperty(name)) {
                var value = uniformValues[name];
                if (typeof value === 'string') {
                    uniformValues[name] = loadTexture(this, name, value, frameState);
                }
            }
        }
    };

    function destroyTextures(stage) {
        var textures = stage._textures;
        var length = textures.length;
        for (var i = 0; i < length; ++i) {
            textures[i].destroy();
        }
        stage._textures.length = 0;
    }

    /**
     * @private
     */
    PostProcessStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    PostProcessStage.prototype.destroy = function() {
        destroyTextures();
        return destroyObject(this);
    };

    return PostProcessStage;
});
