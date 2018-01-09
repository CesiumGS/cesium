define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
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
        DeveloperError,
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

    var stackScratch = [];

    function PostProcessCollection() {
        this._processes = [];
        this._activeProcesses = [];

        this._fxaa = new PostProcess({
            name : 'czm_FXAA',
            fragmentShader : fxaaFS,
            sampleMode : PostProcessSampleMode.LINEAR
        });
        this._ao = new PostProcessAmbientOcclusionStage();
        this._bloom = new PostProcessBloomStage();

        this._ao.enabled = false;
        this._bloom.enabled = false;

        this._processesRemoved = false;

        this._processNames = {};

        var processNames = this._processNames;

        var stack = stackScratch;
        stack.push(this._fxaa, this._ao, this._bloom);
        while (stack.length > 0) {
            var process = stack.pop();
            processNames[process.name] = process;
            process._collection = this;

            var length = process.length;
            if (defined(length)) {
                for (var i = 0; i < length; ++i) {
                    stack.push(process.get(i));
                }
            }
        }
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
        },
        length : {
            get : function() {
                return this._processes.length;
            }
        }
    });

    function removeProcesses(collection) {
        if (!collection._processesRemoved) {
            return;
        }

        collection._processesRemoved = false;

        var newProcesses = [];
        var processes = collection._processes;
        var length = processes.length;
        for (var i = 0, j = 0; i < length; ++i) {
            var process = processes[i];
            if (process) {
                process._index = j++;
                newProcesses.push(process);
            }
        }

        collection._processes = newProcesses;
    }

    PostProcessCollection.prototype.add = function(postProcess) {
        if (!defined(postProcess)) {
            return;
        }

        var processNames = this._processNames;

        var stack = stackScratch;
        stack.push(postProcess);
        while (stack.length > 0) {
            var process = stack.pop();
            //>>includeStart('debug', pragmas.debug);
            if (defined(processNames[process.name])) {
                throw new DeveloperError(process.name + ' has already been added to the collection or does not have a unique name.');
            }
            //>>includeEnd('debug');
            processNames[process.name] = process;
            process._collection = this;

            var length = process.length;
            if (defined(length)) {
                for (var i = 0; i < length; ++i) {
                    stack.push(process.get(i));
                }
            }
        }

        postProcess._index = this._processes.length;
        this._processes.push(postProcess);
        return postProcess;
    };

    PostProcessCollection.prototype.remove = function(postProcess) {
        if (!this.contains(postProcess)) {
            return false;
        }

        var processNames = this._processNames;

        var stack = stackScratch;
        stack.push(postProcess);
        while (stack.length > 0) {
            var process = stack.pop();
            delete processNames[process.name];

            var length = process.length;
            if (defined(length)) {
                for (var i = 0; i < length; ++i) {
                    stack.push(process.get(i));
                }
            }
        }

        this._processes[postProcess._index] = undefined;
        this._processesRemoved = true;
        postProcess.destroy();
        return true;
    };

    PostProcessCollection.prototype.contains = function(postProcess) {
        return defined(postProcess) && defined(postProcess._index) && postProcess._collection === this;
    };

    PostProcessCollection.prototype.get = function(index) {
        removeProcesses(this);
        //>>includeStart('debug', pragmas.debug);
        var length = this._process.length;
        Check.typeOf.number.greaterThanOrEquals('processes length', length, 0);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, length);
        //>>includeEnd('debug');
        return this._processes[index];
    };

    PostProcessCollection.prototype.removeAll = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            this.remove(processes[i]);
        }
        processes.length = 0;
    };

    PostProcessCollection.prototype.getProcessByName = function(name) {
        return this._processNames[name];
    };

    PostProcessCollection.prototype.update = function(context) {
        removeProcesses(this);

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
        // POST TODO: clear all framebuffers in cache
        var processNames = this._processNames;
        for (var name in processNames) {
            if (processNames.hasOwnProperty(name)) {
                var process = processNames[name];
                if (defined(process.clear)) {
                    process.clear(context);
                }
            }
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
        this._fxaa.destroy();
        this._ao.destroy();
        this._bloom.destroy();
        this.removeAll();
        return destroyObject(this);
    };

    return PostProcessCollection;
});
