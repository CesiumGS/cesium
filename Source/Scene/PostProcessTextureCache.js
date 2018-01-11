define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/combine',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/loadImage',
        '../Core/Math',
        '../Core/PixelFormat',
        '../Core/destroyObject',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../ThirdParty/when',
        './PostProcessSampleMode'
    ], function(
        BoundingRectangle,
        Color,
        combine,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        loadImage,
        CesiumMath,
        PixelFormat,
        destroyObject,
        ClearCommand,
        Framebuffer,
        PassState,
        PixelDatatype,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        when,
        PostProcessSampleMode) {
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
            if (defined(process.outputTexture)) {
                return process.name;
            }
        }
        return process.name;
    }

    function getProcessDependencies(collection, dependencies, process, previousName) {
        if (!process.enabled) {
            return;
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

        var currentName = previousName;
        var length = composite.length;
        for (var i = 0; i < length; ++i) {
            var process = composite.get(i);
            if (defined(process.length)) {
                currentName = getCompositeDependencies(collection, dependencies, process, previousName);
            } else {
                currentName = getProcessDependencies(collection, dependencies, process, previousName);
            }
            if (!defined(composite.executeInSeries) || composite.executeInSeries) {
                previousName = currentName;
            }
        }
        return currentName;
    }

    function getDependencies(collection) {
        var dependencies = {};

        var ao = collection.ambientOcclusion;
        var bloom = collection.bloom;
        var fxaa = collection.fxaa;

        var previousName = getCompositeDependencies(collection, dependencies, ao, undefined);
        previousName = getCompositeDependencies(collection, dependencies, bloom, previousName);
        previousName = getCompositeDependencies(collection, dependencies, collection, previousName);
        getProcessDependencies(collection, dependencies, fxaa, previousName);

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
            buffer : undefined
        };

        framebuffers.push(framebuffer);
        return framebuffer;
    }

    function createFramebuffers(cache) {
        var dependencies = getDependencies(cache._collection);
        for (var processName in dependencies) {
            if (dependencies.hasOwnProperty(processName)) {
                cache._processNameToFramebuffer[processName] = getFramebuffer(this, processName, dependencies[processName]);
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

    PostProcessTextureCache.prototype.update = function(context) {
        var collection = this._collection;
        var needsUpdate = collection.length > 0 || collection.ambientOcclusion.enabled || collection.bloom.enabled || collection.fxaa.enabled;
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

        // TODO: update/create framebuffers
    };

    PostProcessTextureCache.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessTextureCache.prototype.destroy = function() {
        return destroyObject(this);
    };

    return PostProcessTextureCache;
});
