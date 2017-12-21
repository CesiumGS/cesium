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

        var processes = new Array(2);
        processes[0] = new PostProcess({
            name : 'czm_silhouette_depth',
            fragmentShader : Silhouette
        });
        var edgeDetection = processes[1] = new PostProcess({
            name : 'czm_silhouette_edge_detection',
            fragmentShader : EdgeDetection,
            uniformValues : {
                length : 0.5,
                color : Color.clone(Color.BLACK)
            }
        });
        this._silhouetteGenerateProcess = new PostProcessComposite({
            name : 'czm_silhouette_generate',
            processes : processes
        });
        this._silhouetteProcess = new PostProcess({
            name : 'czm_silhouette_composite',
            fragmentShader : SilhouetteComposite,
            uniformValues : {
                silhouetteTexture : this._silhouetteGenerateProcess.name
            }
        });

        this._edgeDetectionUniformValues = edgeDetection.uniformValues;

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
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
        outputTexture : {
            get : function() {
                return this._silhouetteProcess.outputTexture;
            }
        },
        length : {
            get : function() {
                return 2;
            }
        }
    });

    PostProcessSilhouette.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, this.length);
        //>>includeEnd('debug');
        if (index === 0) {
            return this._silhouetteGenerateProcess;
        }
        return this._silhouetteProcess;
    };

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
