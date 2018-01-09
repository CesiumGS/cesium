define([
        '../Core/Check',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/DepthOfField',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessBlurStage',
        './PostProcessComposite'
    ], function(
        Check,
        defineProperties,
        destroyObject,
        DepthOfField,
        GaussianBlur1D,
        PostProcess,
        PostProcessBlurStage,
        PostProcessComposite) {
    'use strict';

    /**
     * Post process stage for depth of field. Implements {@link PostProcess}.
     *
     * @alias PostProcessDepthOfFieldStage
     * @constructor
     *
     * @private
     */
    function PostProcessDepthOfFieldStage() {
        this._name = 'czm_depth_of_field';

        this._blurProcess = new PostProcessBlurStage({
            name : 'czm_depth_of_field_blur'
        });
        var depthOfFieldProcess = new PostProcess({
            name : 'czm_depth_of_field_composite',
            fragmentShader : DepthOfField,
            uniformValues : {
                focalDistance : 5.0,
                blurTexture : this._blurProcess.name
            }
        });
        this._composite = new PostProcessComposite({
            name : 'czm_depth_of_field_composite',
            processes : [this._blurProcess, depthOfFieldProcess],
            executeInSeries : false
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            focalDistance : {
                get : function() {
                    return depthOfFieldProcess.uniformValues.focalDistance;
                },
                set : function(value) {
                    depthOfFieldProcess.uniformValues.focalDistance = value;
                }
            }
        });

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
    }

    defineProperties(PostProcessDepthOfFieldStage.prototype, {
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
        blurUniformValues : {
            get : function() {
                return this._blurProcess.uniformValues;
            }
        },
        length : {
            get : function() {
                return this._composite.length;
            }
        }
    });

    PostProcessDepthOfFieldStage.prototype.get = function(index) {
        return this._composite.get(index);
    };

    PostProcessDepthOfFieldStage.prototype.update = function(context) {
        this._composite.update(context);
    };

    PostProcessDepthOfFieldStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._composite.execute(context, colorTexture, depthTexture);
    };

    PostProcessDepthOfFieldStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessDepthOfFieldStage.prototype.destroy = function() {
        this._composite.destroy();
        return destroyObject(this);
    };

    return PostProcessDepthOfFieldStage;
});
