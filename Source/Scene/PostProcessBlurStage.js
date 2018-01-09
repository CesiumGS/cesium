define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessComposite',
        './PostProcessSampleMode'
    ], function(
        defaultValue,
        defineProperties,
        destroyObject,
        GaussianBlur1D,
        PostProcess,
        PostProcessComposite,
        PostProcessSampleMode) {
    'use strict';

    /**
     * Post process stage for blur. Implements {@link PostProcess}.
     *
     * @alias PostProcessBlurStage
     * @constructor
     *
     * @private
     */
    function PostProcessBlurStage(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._name = defaultValue(options.name, 'czm_blur');

        var processes = new Array(2);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;
        var blurX = processes[0] = new PostProcess({
            name : this._name + '_x_direction',
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 0.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });
        var blurY = processes[1] = new PostProcess({
            name : this._name + '_y_direction',
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 1.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });
        this._blurPostProcess = new PostProcessComposite({
            name : this._name + '_composite',
            processes : processes
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            delta : {
                get : function() {
                    return blurX.uniformValues.delta;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.delta = blurYUniforms.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return blurX.uniformValues.sigma;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.sigma = blurYUniforms.sigma = value;
                }
            },
            kernelSize : {
                get : function() {
                    return blurX.uniformValues.kernelSize;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.kernelSize = blurYUniforms.kernelSize = value;
                }
            }
        });

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
    }

    defineProperties(PostProcessBlurStage.prototype, {
        ready : {
            get : function() {
                return this._blurPostProcess.ready;
            }
        },
        enabled : {
            get : function() {
                return this._blurPostProcess.enabled;
            },
            set : function(value) {
                this._blurPostProcess.enabled = value;
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
        outputTexture : {
            get : function() {
                return this._blurPostProcess.outputTexture;
            }
        },
        length : {
            get : function() {
                return this._blurPostProcess.length;
            }
        }
    });

    PostProcessBlurStage.prototype.get = function(index) {
        return this._blurPostProcess.get(index);
    };

    PostProcessBlurStage.prototype.update = function(context) {
        this._blurPostProcess.update(context);
    };

    PostProcessBlurStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._blurPostProcess.execute(context, colorTexture, depthTexture);
    };

    PostProcessBlurStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessBlurStage.prototype.destroy = function() {
        this._blurPostProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessBlurStage;
});
