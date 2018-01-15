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
        './PostProcessSampleMode',
        './PostProcessTextureCache'
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
        PostProcessSampleMode,
        PostProcessTextureCache) {
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
        this._cacheDirty = false;

        this._lastLength = undefined;
        this._aoEnabled = undefined;
        this._bloomEnabled = undefined;
        this._fxaaEnabled = undefined;

        this._processNames = {};
        this._textureCache = undefined;

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
                    return this.getOutputTexture(this._fxaa.name);
                }

                var processes = this._processes;
                var length = processes.length;
                for (var i = length - 1; i >= 0; --i) {
                    var process = processes[i];
                    if (process.ready && process.enabled) {
                        return this.getOutputTexture(process.name);
                    }
                }

                if (this._bloom.enabled && this._bloom.ready) {
                    return this.getOutputTexture(this._bloom.name);
                }

                if (this._ao.enabled && this._ao.ready) {
                    return this.getOutputTexture(this._ao.name);
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
        this._cacheDirty = true;
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
        this._cacheDirty = true;
        postProcess.destroy();
        return true;
    };

    PostProcessCollection.prototype.contains = function(postProcess) {
        return defined(postProcess) && defined(postProcess._index) && postProcess._collection === this;
    };

    PostProcessCollection.prototype.get = function(index) {
        removeProcesses(this);
        //>>includeStart('debug', pragmas.debug);
        var length = this._processes.length;
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

    PostProcessCollection.prototype.getFramebuffer = function(name) {
        return this._textureCache.getFramebuffer(name);
    };

    PostProcessCollection.prototype.update = function(context) {
        removeProcesses(this);

        var activeProcesses = this._activeProcesses;
        var processes = this._processes;
        var length = activeProcesses.length = processes.length;

        var i;
        var process;
        var count = 0;
        for (i = 0; i < length; ++i) {
            process = processes[i];
            if (process.ready && process.enabled) {
                activeProcesses[count++] = process;
            }
        }
        activeProcesses.length = count;

        var ao = this._ao;
        var bloom = this._bloom;
        var fxaa = this._fxaa;

        if (this._cacheDirty || count !== this._lastLength || ao.enabled !== this._aoEnabled || bloom.enabled !== this._bloomEnabled || fxaa.enabled !== this._fxaaEnabled) {
            this._textureCache = this._textureCache && this._textureCache.destroy();
            this._textureCache = new PostProcessTextureCache(this);

            this._lastLength = count;
            this._aoEnabled = ao.enabled;
            this._bloomEnabled = bloom.enabled;
            this._fxaaEnabled = fxaa.enabled;
            this._cacheDirty = false;
        }

        this._textureCache.update(context);

        fxaa.update(context);
        ao.update(context);
        bloom.update(context);

        for (i = 0; i < length; ++i) {
            process = processes[i];
            process.update(context);
        }
    };

    PostProcessCollection.prototype.clear = function(context) {
        this._textureCache.clear(context);
    };

    function getOutputTexture(process) {
        while (defined(process.length)) {
            process = process.get(process.length - 1);
        }
        return process.outputTexture;
    }

    PostProcessCollection.prototype.getOutputTexture = function(processName) {
        var process = this.getProcessByName(processName);
        if (!defined(process)) {
            return undefined;
        }
        return getOutputTexture(process);
    };

    function execute(process, context, colorTexture, depthTexture) {
        if (defined(process.execute)) {
            process.execute(context, colorTexture, depthTexture);
            return;
        }

        var length = process.length;
        var i;

        if (process.executeInSeries) {
            execute(process.get(0), context, colorTexture, depthTexture);
            for (i = 1; i < length; ++i) {
                execute(process.get(i), context, getOutputTexture(process.get(i - 1)), depthTexture);
            }
        } else {
            for (i = 0; i < length; ++i) {
                execute(process.get(i), context, colorTexture, depthTexture);
            }
        }
    }

    PostProcessCollection.prototype.execute = function(context, colorTexture, depthTexture) {
        var activeProcesses = this._activeProcesses;
        var length = activeProcesses.length;

        var fxaa = this._fxaa;
        var ao = this._ao;
        var bloom = this._bloom;
        if (!fxaa.enabled && !ao.enabled && !bloom.enabled && length === 0) {
            return;
        }

        var initialTexture = colorTexture;
        if (ao.enabled && ao.ready) {
            execute(ao, context, initialTexture, depthTexture);
            initialTexture = getOutputTexture(ao);
        }
        if (bloom.enabled && bloom.ready) {
            execute(bloom, context, initialTexture, depthTexture);
            initialTexture = getOutputTexture(bloom);
        }

        var lastTexture = initialTexture;

        if (length > 0) {
            execute(activeProcesses[0], context, initialTexture, depthTexture);
            for (var i = 1; i < length; ++i) {
                execute(activeProcesses[i], context, getOutputTexture(activeProcesses[i - 1]), depthTexture);
            }
            lastTexture = getOutputTexture(activeProcesses[length - 1]);
        }

        if (fxaa.enabled && fxaa.ready) {
            execute(fxaa, context, lastTexture, depthTexture);
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
