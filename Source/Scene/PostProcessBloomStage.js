define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/BloomComposite',
        '../Shaders/PostProcessFilters/ContrastBias',
        './PostProcess',
        './PostProcessBlurStage'
    ], function(
        defineProperties,
        destroyObject,
        BloomComposite,
        ContrastBias,
        PostProcess,
        PostProcessBlurStage) {
    'use strict';

    /**
     * Post process stage for bloom. Implements {@link PostProcess}.
     *
     * @alias PostProcessBloomStage
     * @constructor
     *
     * @private
     */
    function PostProcessBloomStage() {
        var that = this;
        this._contrastBias = new PostProcess({
            fragmentShader : ContrastBias,
            uniformValues : {
                contrast : 0.0,
                brightness : 0.0
            }
        });
        this._blur = new PostProcessBlurStage();
        this._bloomComposite = new PostProcess({
            fragmentShader : BloomComposite,
            uniformValues : {
                glowOnly : false,
                bloomTexture : function() {
                    return that._blur.outputTexture;
                }
            }
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            glowOnly : {
                get : function() {
                    return that._bloomComposite.uniformValues.glowOnly;
                },
                set : function(value) {
                    that._bloomComposite.uniformValues.glowOnly = value;
                }
            }
        });
    }

    defineProperties(PostProcessBloomStage.prototype, {
        ready : {
            get : function() {
                return this._contrastBias.ready && this._blur.ready && this._bloomComposite.ready;
            }
        },
        enabled : {
            get : function() {
                return this._contrastBias.enabled;
            },
            set : function(value) {
                this._bloomComposite.enabled = this._blur.enabled = this._contrastBias.enabled = value;
            }
        },
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        contrastBiasUniformValues : {
            get : function() {
                return this._contrastBias.uniformValues;
            }
        },
        blurUniformValues : {
            get : function() {
                return this._blur.uniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._bloomComposite.outputTexture;
            }
        }
    });

    PostProcessBloomStage.prototype.update = function(context) {
        this._contrastBias.update(context);
        this._blur.update(context);
        this._bloomComposite.update(context);
    };

    PostProcessBloomStage.prototype.clear = function(context) {
        this._contrastBias.clear(context);
        this._blur.clear(context);
        this._bloomComposite.clear(context);
    };

    PostProcessBloomStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._contrastBias.execute(context, colorTexture, depthTexture);
        this._blur.execute(context, this._contrastBias.outputTexture, depthTexture);
        this._bloomComposite.execute(context, colorTexture, depthTexture);
    };

    PostProcessBloomStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessBloomStage.prototype.destroy = function() {
        this._contrastBias.destroy();
        this._blur.destroy();
        this._bloomComposite.destroy();
        return destroyObject(this);
    };

    return PostProcessBloomStage;
});
