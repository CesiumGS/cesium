define([
        '../Core/Check',
        '../Core/Color',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/EdgeDetection',
        '../Shaders/PostProcessFilters/Silhouette',
        '../Shaders/PostProcessFilters/SilhouetteComposite',
        './PostProcess',
        './PostProcessComposite'
    ], function(
        Check,
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
        this._name = 'czm_silhouette';

        var silhouetteDepth = new PostProcess({
            name : 'czm_silhouette_depth',
            fragmentShader : Silhouette
        });
        var edgeDetection = new PostProcess({
            name : 'czm_silhouette_edge_detection',
            fragmentShader : EdgeDetection,
            uniformValues : {
                length : 0.5,
                color : Color.clone(Color.BLACK)
            }
        });
        var silhouetteGenerateProcess = new PostProcessComposite({
            name : 'czm_silhouette_generate',
            processes : [silhouetteDepth, edgeDetection]
        });
        var silhouetteProcess = new PostProcess({
            name : 'czm_silhouette_composite',
            fragmentShader : SilhouetteComposite,
            uniformValues : {
                silhouetteTexture : silhouetteGenerateProcess.name
            }
        });
        this._composite = new PostProcessComposite({
            name : 'czm_silhouette_composite',
            processes : [silhouetteGenerateProcess, silhouetteProcess],
            executeInSeries : false
        });

        this._edgeDetectionUniformValues = edgeDetection.uniformValues;

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
    }

    defineProperties(PostProcessSilhouette.prototype, {
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
        edgeDetectionUniformValues : {
            get : function() {
                return this._edgeDetectionUniformValues;
            }
        },
        length : {
            get : function() {
                return this._composite.length;
            }
        }
    });

    PostProcessSilhouette.prototype.get = function(index) {
        return this._composite.get(index);
    };

    PostProcessSilhouette.prototype.update = function(context) {
        this._composite.update(context);
    };

    PostProcessSilhouette.prototype.execute = function(context, colorTexture, depthTexture) {
        this._composite.execute(context, colorTexture, depthTexture);
    };

    PostProcessSilhouette.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessSilhouette.prototype.destroy = function() {
        this._composite.destroy();
        return destroyObject(this);
    };

    return PostProcessSilhouette;
});
