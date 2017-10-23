define([
        '../Core/Check',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/loadImage',
        '../Renderer/Texture',
        '../Renderer/Sampler',   
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
    ], function(
        Check,
        clone,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        loadImage,
        Texture,
        Sampler,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
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
         * @default true
         */
        this.show = true;
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
                return this._textures.length === this._texturesLength;
            }
        },

        /**
         * Uniform values that modify the behavior of the post process stage.
         * @memberof PostProcessStage.prototype
         * @type {Object}
         */
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },

        /**
         * The fragment shader text used by the post process stage.
         * @memberof PostProcessState.prototype
         * @type {String}
         */
        fragmentShader : {
            get : function() {
                return this._fragmentShader;
            }
        }
    });

    function createSampler() {
        return new Sampler({
            wrapS: TextureWrap.REPEAT,
            wrapT: TextureWrap.REPEAT,
            minificationFilter: TextureMinificationFilter.NEAREST,
            magnificationFilter: TextureMagnificationFilter.NEAREST
        });
    }

    function loadTexture(stage, uniformName, imagePath, frameState) {
        return loadImage(imagePath).then(function(image) {
            frameState.afterRender.push(function() {
                var texture = new Texture({
                    context : frameState.context,
                    source : image,
                    sampler: createSampler()
                });
                stage._uniformValues[uniformName] = texture;
                stage._textures.push(texture);
            });
        });
    }

    /**
     * @private
     */
    PostProcessStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
        if (!this.show) {
            return;
        }

        if (!this.ready) {
            var uniformValues = this._uniformValues;
            for (var name in uniformValues) {
                if (uniformValues.hasOwnProperty(name)) {
                    var value = uniformValues[name];
                    if (typeof value === 'string') {
                        uniformValues[name] = loadTexture(this, name, value, frameState);
                    }
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
        destroyTextures(this);
        return destroyObject(this);
    };

    return PostProcessStage;
});
