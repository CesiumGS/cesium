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
        var that = this;
        var processes = new Array(3);

        processes[0] = new PostProcess({
            fragmentShader : Silhouette
        });
        processes[1] = new PostProcess({
            fragmentShader : EdgeDetection,
            uniformValues : {
                length : 0.5,
                color : Color.clone(Color.BLACK)
            }
        });
        processes[2] = new PostProcess({
            fragmentShader : SilhouetteComposite,
            uniformValues : {
                originalColorTexture : function() {
                    return that._initialTexture;
                }
            }
        });

        this._initialTexture = undefined;
        this._postProcess = new PostProcessComposite({
            processes : processes
        });
    }

    defineProperties(PostProcessSilhouette.prototype, {
        edgeDetectionUniformValues : {
            get : function() {
                return this._postProcess.processes[1].uniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._postProcess.outputTexture;
            }
        }
    });

    PostProcessSilhouette.prototype.update = function(context) {
        this._postProcess.update(context);
    };

    PostProcessSilhouette.prototype.clear = function(context) {
        this._postProcess.clear(context);
    };

    PostProcessSilhouette.prototype._setColorTexture = function(texture) {
        this._initialTexture = texture;
        this._postProcess._setColorTexture(texture);
    };

    PostProcessSilhouette.prototype._setDepthTexture = function(texture) {
        this._postProcess._setDepthTexture(texture);
    };

    PostProcessSilhouette.prototype.execute = function(context) {
        this._postProcess.execute(context);
    };

    PostProcessSilhouette.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessSilhouette.prototype.destroy = function() {
        this._postProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessSilhouette;
});
