define([
        '../Core/Color',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/EdgeDetection',
        '../Shaders/PostProcessFilters/Silhouette',
        '../Shaders/PostProcessFilters/SilhouetteComposite',
        './PostProcess',
        './PostProcessComposite'
    ], function(
        Color,
        defineProperties,
        destroyObject,
        EdgeDetection,
        Silhouette,
        SilhouetteComposite,
        PostProcess,
        PostProcessComposite) {
    'use strict';

    /**
     * Post process stage for a silhouette. Implements {@link PostProcess}.
     *
     * @alias PostProcessSilhouette
     * @constructor
     *
     * @private
     */
    function PostProcessSilhouette() {
        var processes = new Array(2);
        processes[0] = new PostProcess({
            fragmentShader : Silhouette
        });
        var edgeDetection = processes[1] = new PostProcess({
            fragmentShader : EdgeDetection,
            uniformValues : {
                length : 0.5,
                color : Color.clone(Color.BLACK)
            }
        });

        this._silhouetteGenerateProcess = new PostProcessComposite({
            processes : processes
        });

        var that = this;
        this._silhouetteProcess = new PostProcess({
            fragmentShader : SilhouetteComposite,
            uniformValues : {
                silhouetteTexture : function() {
                    return that._silhouetteGenerateProcess.outputTexture;
                }
            }
        });

        this._edgeDetectionUniformValues = edgeDetection.uniformValues;
    }

    defineProperties(PostProcessSilhouette.prototype, {
        ready : {
            get : function() {
                return this._silhouetteGenerateProcess.ready && this._silhouetteProcess.ready;
            }
        },
        enabled : {
            get : function() {
                return this._silhouetteProcess.enabled;
            },
            set : function(value) {
                this._silhouetteProcess.enabled = this._silhouetteGenerateProcess.enabled = value;
            }
        },
        edgeDetectionUniformValues : {
            get : function() {
                return this._edgeDetectionUniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._silhouetteProcess.outputTexture;
            }
        }
    });

    PostProcessSilhouette.prototype.update = function(context) {
        this._silhouetteGenerateProcess.update(context);
        this._silhouetteProcess.update(context);
    };

    PostProcessSilhouette.prototype.clear = function(context) {
        this._silhouetteGenerateProcess.clear(context);
        this._silhouetteProcess.clear(context);
    };

    PostProcessSilhouette.prototype.execute = function(context, colorTexture, depthTexture) {
        this._silhouetteGenerateProcess.execute(context, colorTexture, depthTexture);
        this._silhouetteProcess.execute(context, colorTexture, depthTexture);
    };

    PostProcessSilhouette.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessSilhouette.prototype.destroy = function() {
        this._silhouetteGenerateProcess.destroy();
        this._silhouetteProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessSilhouette;
});
