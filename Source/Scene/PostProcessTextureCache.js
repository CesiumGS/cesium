define([
        '../Core/Color',
        '../Core/defined',
        '../Core/Math',
        '../Core/destroyObject',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/Texture'
    ], function(
        Color,
        defined,
        CesiumMath,
        destroyObject,
        ClearCommand,
        Framebuffer,
        Texture) {
    'use strict';

    function PostProcessTextureCache(postProcessCollection) {
        this._collection = postProcessCollection;

        this._framebuffers = [];
        this._processNameToFramebuffer = {};

        this._width = undefined;
        this._height = undefined;
    }

    function getLastProcessName(process) {
        while (defined(process.length)) {
            process = process.get(process.length - 1);
        }
        return process.name;
    }

    function getProcessDependencies(collection, dependencies, process, previousName) {
        if (!process.enabled) {
            return previousName;
        }

        var processDependencies = dependencies[process.name] = {};
        if (defined(previousName)) {
            var previous = collection.getProcessByName(previousName);
            processDependencies[getLastProcessName(previous)] = true;
        }
        var uniforms = process.uniformValues;
        for (var name in uniforms) {
            if (uniforms.hasOwnProperty(name)) {
                var value = uniforms[name];
                if (typeof value === 'string') {
                    var dependent = collection.getProcessByName(value);
                    if (defined(dependent)) {
                        processDependencies[getLastProcessName(dependent)] = true;
                    }
                }
            }
        }

        return process.name;
    }

    function getCompositeDependencies(collection, dependencies, composite, previousName) {
        if (defined(composite.enabled) && !composite.enabled) {
            return previousName;
        }

        var inSeries = !defined(composite.executeInSeries) || composite.executeInSeries;
        var currentName = previousName;
        var length = composite.length;
        for (var i = 0; i < length; ++i) {
            var process = composite.get(i);
            if (defined(process.length)) {
                currentName = getCompositeDependencies(collection, dependencies, process, previousName);
            } else {
                currentName = getProcessDependencies(collection, dependencies, process, previousName);
            }
            if (inSeries) {
                previousName = currentName;
            }
        }

        if (!inSeries) {
            for (var j = 1; j < length; ++j) {
                var current = composite.get(j);
                var currentDependencies = dependencies[current.name];
                for (var k = 0; k < j; ++k) {
                    currentDependencies[getLastProcessName(composite.get(k))] = true;
                }
            }
        }

        return currentName;
    }

    function getDependencies(collection) {
        var dependencies = {};

        if (defined(collection.ambientOcclusion)) {
            var ao = collection.ambientOcclusion;
            var bloom = collection.bloom;
            var fxaa = collection.fxaa;

            var previousName = getCompositeDependencies(collection, dependencies, ao, undefined);
            previousName = getCompositeDependencies(collection, dependencies, bloom, previousName);
            previousName = getCompositeDependencies(collection, dependencies, collection, previousName);
            getProcessDependencies(collection, dependencies, fxaa, previousName);
        } else {
            getCompositeDependencies(collection, dependencies, collection, undefined);
        }

        return dependencies;
    }

    function getFramebuffer(cache, processName, dependencies) {
        var collection = cache._collection;
        var process = collection.getProcessByName(processName);

        var textureScale = process._textureScale;
        var forcePowerOfTwo = process._forcePowerOfTwo;
        var pixelFormat = process._pixelFormat;
        var pixelDatatype = process._pixelDatatype;
        var clearColor = process._clearColor;

        var i;
        var framebuffer;
        var framebuffers = cache._framebuffers;
        var length = framebuffers.length;
        for (i = 0; i < length; ++i) {
            framebuffer = framebuffers[i];

            if (textureScale !== framebuffer.textureScale || forcePowerOfTwo !== framebuffer.forcePowerOfTwo ||
                pixelFormat !== framebuffer.pixelFormat || pixelDatatype !== framebuffer.pixelDatatype ||
                !Color.equals(clearColor, framebuffer.clearColor)) {
                continue;
            }

            var processNames = framebuffer.processes;
            var processesLength = processNames.length;
            var foundConflict = false;
            for (var j = 0; j < processesLength; ++j) {
                if (dependencies[processNames[j]]) {
                    foundConflict = true;
                    break;
                }
            }

            if (!foundConflict) {
                break;
            }
        }

        if (defined(framebuffer) && i < length) {
            framebuffer.processes.push(processName);
            return framebuffer;
        }

        framebuffer = {
            textureScale : textureScale,
            forcePowerOfTwo : forcePowerOfTwo,
            pixelFormat : pixelFormat,
            pixelDatatype : pixelDatatype,
            clearColor : clearColor,
            processes : [processName],
            buffer : undefined,
            clear : undefined
        };

        framebuffers.push(framebuffer);
        return framebuffer;
    }

    function createFramebuffers(cache) {
        var dependencies = getDependencies(cache._collection);
        for (var processName in dependencies) {
            if (dependencies.hasOwnProperty(processName)) {
                cache._processNameToFramebuffer[processName] = getFramebuffer(cache, processName, dependencies[processName]);
            }
        }
    }

    function releaseResources(cache) {
        var framebuffers = cache._framebuffers;
        var length = framebuffers.length;
        for (var i = 0; i < length; ++i) {
            var framebuffer = framebuffers[i];
            framebuffer.buffer = framebuffer.buffer && framebuffer.buffer.destroy();
            framebuffer.buffer = undefined;
        }
    }

    function updateFramebuffers(cache, context) {
        var width = cache._width;
        var height = cache._height;

        var framebuffers = cache._framebuffers;
        var length = framebuffers.length;
        for (var i = 0; i < length; ++i) {
            var framebuffer = framebuffers[i];

            var scale = framebuffer.textureScale;
            var textureWidth = Math.ceil(width * scale);
            var textureHeight = Math.ceil(height * scale);

            var size = Math.min(textureWidth, textureHeight);
            if (framebuffer.forcePowerOfTwo) {
                if (!CesiumMath.isPowerOfTwo(size)) {
                    size = CesiumMath.nextPowerOfTwo(size);
                }
                textureWidth = size;
                textureHeight = size;
            }

            framebuffer.buffer = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : framebuffer.pixelFormat,
                    pixelDatatype : framebuffer.pixelDatatype
                })]
            });
            framebuffer.clear = new ClearCommand({
                color : framebuffer.clearColor,
                framebuffer : framebuffer.buffer
            });
        }
    }

    PostProcessTextureCache.prototype.update = function(context) {
        var collection = this._collection;
        var needsUpdate = !defined(collection._activeProcesses) || collection._activeProcesses.length > 0 || collection.ambientOcclusion.enabled || collection.bloom.enabled || collection.fxaa.enabled;
        if (!needsUpdate && this._framebuffers.length > 0) {
            releaseResources(this);
            this._framebuffers.length = 0;
            this._processNameToFramebuffer = {};
            this._width = undefined;
            this._height = undefined;
        }

        if (!needsUpdate) {
            return;
        }

        if (this._framebuffers.length === 0) {
            createFramebuffers(this);
        }

        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;
        var dimensionsChanged = this._width !== width || this._height !== height;
        if (!dimensionsChanged) {
            return;
        }

        this._width = width;
        this._height = height;
        releaseResources(this);
        updateFramebuffers(this, context);
    };

    PostProcessTextureCache.prototype.clear = function(context) {
        var framebuffers = this._framebuffers;
        var length = 0;
        for (var i = 0; i < length; ++i) {
            framebuffers[i].clear.execute(context);
        }
    };

    PostProcessTextureCache.prototype.getFramebuffer = function(name) {
        var framebuffer = this._processNameToFramebuffer[name];
        if (!defined(framebuffer)) {
            return undefined;
        }
        return framebuffer.buffer;
    };

    PostProcessTextureCache.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessTextureCache.prototype.destroy = function() {
        releaseResources(this);
        return destroyObject(this);
    };

    return PostProcessTextureCache;
});
