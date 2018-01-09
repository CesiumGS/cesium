define([
        '../Core/Check',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/BloomComposite',
        '../Shaders/PostProcessFilters/ContrastBias',
        './PostProcess',
        './PostProcessBlurStage',
        './PostProcessComposite'
    ], function(
        Check,
        defineProperties,
        destroyObject,
        BloomComposite,
        ContrastBias,
        PostProcess,
        PostProcessBlurStage,
        PostProcessComposite) {
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
        this._name = 'czm_bloom';

        this._contrastBias = new PostProcess({
            name : 'czm_bloom_contrast_bias',
            fragmentShader : ContrastBias,
            uniformValues : {
                contrast : 0.0,
                brightness : 0.0
            }
        });
        this._blur = new PostProcessBlurStage({
            name : 'czm_bloom_blur'
        });
        var generateComposite = new PostProcessComposite({
            name : 'czm_bloom_contrast_bias_bloom',
            processes : [this._contrastBias, this._blur]
        });

        var bloomComposite = new PostProcess({
            name : 'czm_bloom_generate_composite',
            fragmentShader : BloomComposite,
            uniformValues : {
                glowOnly : false,
                bloomTexture : generateComposite.name
            }
        });

        this._composite = new PostProcessComposite({
            name : 'czm_bloom_composite',
            processes : [generateComposite, bloomComposite],
            executeInSeries : false
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            glowOnly : {
                get : function() {
                    return bloomComposite.uniformValues.glowOnly;
                },
                set : function(value) {
                    bloomComposite.uniformValues.glowOnly = value;
                }
            }
        });

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
    }

    defineProperties(PostProcessBloomStage.prototype, {
        ready : {
            get : function() {
                return this._composite.ready;
            }
        },
        enabled : {
            get : function() {
                return this._composite.enabled;
            },
            set : function(value) {
                this._composite.enabled = value;
            }
        },
        name : {
            get : function() {
                return this._name;
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
        length : {
            get : function() {
                return this._composite.length;
            }
        }
    });

    PostProcessBloomStage.prototype.get = function(index) {
        return this._composite.get(index);
    };

    PostProcessBloomStage.prototype.update = function(context) {
        this._composite.update(context);
    };

    PostProcessBloomStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._composite.execute(context, colorTexture, depthTexture);
    };

    PostProcessBloomStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessBloomStage.prototype.destroy = function() {
        this._composite.destroy();
        return destroyObject(this);
    };

    return PostProcessBloomStage;
});
