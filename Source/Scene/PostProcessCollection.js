define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/FXAA',
        '../Shaders/PostProcessFilters/PassThrough',
        '../ThirdParty/Shaders/FXAA3_11',
        './PostProcess',
        './PostProcessAmbientOcclusionStage',
        './PostProcessBloomStage',
        './PostProcessSampleMode'
    ], function(
        Check,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        FXAAFS,
        PassThrough,
        FXAA3_11,
        PostProcess,
        PostProcessAmbientOcclusionStage,
        PostProcessBloomStage,
        PostProcessSampleMode) {
    'use strict';

    var fxaaFS =
        '#define FXAA_QUALITY_PRESET 39 \n' +
        FXAA3_11 + '\n' +
        FXAAFS;

    function PostProcessCollection() {
        this._processes = [];
        this._activeProcesses = [];

        this._fxaa = new PostProcess({
            fragmentShader : fxaaFS,
            sampleMode : PostProcessSampleMode.LINEAR
        });
        this._ao = new PostProcessAmbientOcclusionStage();
        this._bloom = new PostProcessBloomStage();

        this._ao.enabled = false;
        this._bloom.enabled = false;
    }

    defineProperties(PostProcessCollection.prototype, {
        ready : {
            get : function() {
                var readyAndEnabled = false;
                var processes = this._processes;
                var length = processes.length;
                for (var i = length - 1; i >= 0; --i) {
                    var process = processes[i];
                    readyAndEnabled = readyAndEnabled || (process.ready && process.enabled);
                }

                readyAndEnabled = readyAndEnabled || (this._fxaa.ready && this._fxaa.enabled);
                readyAndEnabled = readyAndEnabled || (this._ao.ready && this._ao.enabled);
                readyAndEnabled = readyAndEnabled || (this._bloom.ready && this._bloom.enabled);

                return readyAndEnabled;
            }
        },
        processes : {
            get : function() {
                return this._processes;
            }
        },
        outputTexture : {
            get : function() {
                if (this._fxaa.enabled && this._fxaa.ready) {
                    return this._fxaa.outputTexture;
                }

                var processes = this._processes;
                var length = processes.length;
                for (var i = length - 1; i >= 0; --i) {
                    var process = processes[i];
                    if (process.ready && process.enabled) {
                        return process.outputTexture;
                    }
                }

                if (this._bloom.enabled && this._bloom.ready) {
                    return this._bloom.outputTexture;
                }

                if (this._ao.enabled && this._ao.ready) {
                    return this._ao.outputTexture;
                }

                return undefined;
            }
        },
        fxaa : {
            get : function() {
                return this._fxaa;
            }
        },
        ambientOcclusion : {
            get : function() {
                return this._ao;
            }
        },
        bloom : {
            get : function() {
                return this._bloom;
            }
        }
    });

    PostProcessCollection.prototype.add = function(postProcess) {
        this._processes.push(postProcess);
        return postProcess;
    };

    PostProcessCollection.prototype.removeAll = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].destroy();
        }
        processes.length = 0;
    };

    PostProcessCollection.prototype.update = function(context) {
        this._fxaa.update(context);
        this._ao.update(context);
        this._bloom.update(context);

        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            var process = processes[i];
            process.update(context);
        }
    };

    PostProcessCollection.prototype.clear = function(context) {
        this._fxaa.clear(context);
        this._ao.clear(context);
        this._bloom.clear(context);

        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].clear(context);
        }
    };

    PostProcessCollection.prototype.execute = function(context, colorTexture, depthTexture) {
        var activeProcesses = this._activeProcesses;
        var processes = this._processes;
        var length = activeProcesses.length = processes.length;

        var i;
        var count = 0;
        for (i = 0; i < length; ++i) {
            var process = processes[i];
            if (process.ready && process.enabled) {
                activeProcesses[count++] = process;
            }
        }

        var fxaa = this._fxaa;
        var ao = this._ao;
        var bloom = this._bloom;
        if (!fxaa.enabled && !ao.enabled && !bloom.enabled && count === 0) {
            return;
        }

        var initialTexture = colorTexture;
        if (ao.enabled && ao.ready) {
            ao.execute(context, initialTexture, depthTexture);
            initialTexture = ao.outputTexture;
        }
        if (bloom.enabled && bloom.ready) {
            bloom.execute(context, initialTexture, depthTexture);
            initialTexture = bloom.outputTexture;
        }

        var lastTexture = initialTexture;

        if (count > 0) {
            activeProcesses[0].execute(context, initialTexture, depthTexture);
            for (i = 1; i < count; ++i) {
                activeProcesses[i].execute(context, activeProcesses[i - 1].outputTexture, depthTexture);
            }
            lastTexture = activeProcesses[count - 1].outputTexture;
        }

        if (fxaa.enabled && fxaa.ready) {
            fxaa.execute(context, lastTexture, depthTexture);
        }
    };

    PostProcessCollection.prototype.copy = function(context, framebuffer) {
        if (!defined(this._copyColorCommand)) {
            var that = this;
            this._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return that.outputTexture;
                    }
                },
                owner : this
            });
        }

        this._copyColorCommand.framebuffer = framebuffer;
        this._copyColorCommand.execute(context);
    };

    PostProcessCollection.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessCollection.prototype.destroy = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].destroy();
        }
        return destroyObject(this);
    };

    return PostProcessCollection;
});
