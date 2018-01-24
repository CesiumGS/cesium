define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/PostProcessFilters/PassThrough',
        './PostProcess',
        './PostProcessLibrary',
        './PostProcessSampleMode',
        './PostProcessTextureCache'
    ], function(
        Check,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        PixelFormat,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        PassThrough,
        PostProcess,
        PostProcessLibrary,
        PostProcessSampleMode,
        PostProcessTextureCache) {
    'use strict';

    var stackScratch = [];

    /**
     * A collection of {@link PostProcess}es and/or {@link PostProcessComposite}s.
     * <p>
     * The texture modified by each post process is the texture rendered to by the scene or the texture rendered
     * to by the previous post-process or composite in the collection.
     * </p>
     * <p>
     * If the ambient occlusion or bloom post-processes are enabled, they will execute before all other post-processes.
     * </p>
     * <p>
     * If the FXAA post-process is enabled, it will execute after all other post-processes.
     * </p>
     *
     * @alias PostProcessCollection
     * @constructor
     */
    function PostProcessCollection() {
        this._processes = [];
        this._activeProcesses = [];

        this._fxaa = PostProcessLibrary.createFXAAStage();
        this._ao = PostProcessLibrary.createAmbientOcclusionStage();
        this._bloom = PostProcessLibrary.createBloomStage();

        this._ao.enabled = false;
        this._bloom.enabled = false;

        this._randomTexture = undefined; // For AO

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

        var that = this;
        this._ao.uniformValues.randomTexture = function() {
            return that._randomTexture;
        };
    }

    defineProperties(PostProcessCollection.prototype, {
        /**
         * Determines if all of the post-processes in the collection are ready to be executed.
         *
         * @memberof PostProcessCollection.prototype
         * @type {Boolean}
         * @readonly
         */
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
        /**
         * A post-process for Fast Approximate Anti-aliasing.
         * <p>
         * When enabled, this post-process will execute after all others.
         * </p>
         *
         * @memberof PostProcessCollection.prototype
         * @type {PostProcess}
         * @readonly
         */
        fxaa : {
            get : function() {
                return this._fxaa;
            }
        },
        /**
         * A post-process stage that applies Horizon-based Ambient Occlusion (HBAO) to the input texture.
         * <p>
         * Ambient occlusion simulates shadows from ambient light. These shadows would always be present when the
         * surface receives light and regardless of the light's position.
         * </p>
         * <p>
         * The uniforms have the following properties: <code>intensity</code>, <code>bias</code>, <code>lengthCap</code>,
         * <code>stepSize</code>, <code>frustumLength</code>, <code>ambientOcclusionOnly</code>,
         * <code>delta</code>, <code>sigma</code>, and <code>kernelSize</code>.
         * </p>
         * <p>
         * <code>intensity</code> is a scalar value used to lighten or darken the shadows exponentially. Higher values make the shadows darker. The default value is <code>3.0</code>.
         * <code>bias</code> is a scalar value representing an angle in radians. If the dot product between the normal of the sample and the vector to the camera is less than this value,
         * sampling stops in the current direction. This is used to remove shadows from near planar edges. The default value is <code>0.1</code>.
         * <code>lengthCap</code> is a scalar value representing a length in meters. If the distance from the current sample to first sample is greater than this value,
         * sampling stops in the current direction. The default value is <code>0.26</code>.
         * <code>stepSize</code> is a scalar value indicating the distance to the next texel sample in the current direction. The default value is <code>1.95</code>.
         * <code>frustumLength</code> is a scalar value in meters. If the current fragment has a distance from the camera greater than this value, ambient occlusion is not computed for the fragment.
         * The default value is <code>1000.0</code>.
         * <code>ambientOcclusionOnly</code> is a boolean value. When <code>true</code>, only the shadows generated are written to the output. When <code>false</code>, the input texture is modulated
         * with the ambient occlusion. This is a useful debug option for seeing the effects of changing the uniform values. The default value is <code>false</code>.
         * </p>
         * <p>
         * <code>delta</code>, <code>sigma</code>, and <code>kernelSize</code> are the same properties as {@link PostProcessLibrary#createBlurStage}.
         * The blur is applied to the shadows generated from the image to make them smoother.
         * </p>
         * <p>
         * When enabled, this post-process will execute before all others.
         * </p>
         *
         * @memberof PostProcessCollection.prototype
         * @type {PostProcessComposite}
         * @readonly
         */
        ambientOcclusion : {
            get : function() {
                return this._ao;
            }
        },
        /**
         * A post-process for a bloom effect.
         * <p>
         * A bloom effect adds glow effect, makes bright areas brighter, and dark areas darker.
         * </p>
         * <p>
         * This post-process stage has the following uniforms: <code>contrast</code>, <code>brightness</code>, <code>glowOnly</code>,
         * <code>delta</code>, <code>sigma</code>, and <code>kernelSize</code>.
         * </p>
         * <p>
         * <code>contrast</code> is a scalar value in the range [-255.0, 255.0] and affects the contract of the effect. The default value is <code>128.0</code>.
         * <code>brightness</code> is a scalar value. The input texture RGB value is converted to hue, saturation, and brightness (HSB) then this value is
         * added to the brightness. The default value is <code>-0.3</code>.
         * <code>glowOnly</code> is a boolean value. When <code>true</code>, only the glow effect will be shown. When <code>false</code>, the glow will be added to the input texture.
         * The default value is <code>false</code>. This is a debug option for viewing the effects when changing the other uniform values.
         * </p>
         * <p>
         * <code>delta</code>, <code>sigma</code>, and <code>kernelSize</code> are the same properties as {@link PostProcessLibrary#createBlurStage}.
         * The blur is applied to the shadows generated from the image to make them smoother.
         * </p>
         * <p>
         * When enabled, this post-process will execute before all others.
         * </p>
         *
         * @memberOf PostProcessCollection.prototype
         * @type {PostProcessComposite}
         * @readonly
         */
        bloom : {
            get : function() {
                return this._bloom;
            }
        },
        /**
         * The number of post-processes in this collection.
         *
         * @memberof PostProcessCollection.prototype
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._processes.length;
            }
        },
        /**
         * A reference to the last texture written to when executing the post-processes in this collection.
         *
         * @memberof PostProcessCollection.prototype
         * @type {Texture}
         * @readonly
         * @private
         */
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

    /**
     * Adds the post-process to the collection.
     *
     * @param {PostProcess|PostProcessComposite} postProcess The post-process to add to the collection.
     * @return {PostProcess|PostProcessComposite} The post-process that was added to the collection.
     *
     * @exception {DeveloperError} The process has already been added to the collection or does not have a unique name.
     */
    PostProcessCollection.prototype.add = function(postProcess) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('postProcess', postProcess);
        //>>includeEnd('debug');

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

    /**
     * Removes a post-process from the collection and destroys it.
     *
     * @param {PostProcess|PostProcessComposite} postProcess The post-process to remove from the collection.
     * @return {Boolean} Whether the post-process was removed.
     */
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

    /**
     * Returns whether the collection contains a post-process.
     *
     * @param {PostProcess|PostProcessComposite} postProcess The post-process.
     * @return {Boolean} Whether the collection contains the post-process.
     */
    PostProcessCollection.prototype.contains = function(postProcess) {
        return defined(postProcess) && defined(postProcess._index) && postProcess._collection === this;
    };

    /**
     * Gets the post-process at <code>index</code>.
     *
     * @param {Number} index The index of the post-process.
     * @return {PostProcess|PostProcessComposite} The post-process at index.
     */
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

    /**
     * Removes all processes from the collection and destroys them.
     */
    PostProcessCollection.prototype.removeAll = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            this.remove(processes[i]);
        }
        processes.length = 0;
    };

    /**
     * Gets a post-process in the collection by its name.
     *
     * @param {String} name The name of the post-process.
     * @return {PostProcess|PostProcessComposite} The post-process.
     *
     * @private
     */
    PostProcessCollection.prototype.getProcessByName = function(name) {
        return this._processNames[name];
    };

    /**
     * Gets the framebuffer to be used for a post-process with the given name.
     *
     * @param {String} name The name of a post-process.
     * @return {Framebuffer} The framebuffer to be used for a post-process with the given name.
     *
     * @private
     */
    PostProcessCollection.prototype.getFramebuffer = function(name) {
        return this._textureCache.getFramebuffer(name);
    };

    /**
     * Called before the processes in the collection are executed. Calls update for each process and creates WebGL resources.
     *
     * @param {Context} context The context.
     *
     * @private
     */
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
            // The number of processes to execute has changed.
            // Update dependencies and recreate framebuffers.
            this._textureCache = this._textureCache && this._textureCache.destroy();
            this._textureCache = new PostProcessTextureCache(this);

            this._lastLength = count;
            this._aoEnabled = ao.enabled;
            this._bloomEnabled = bloom.enabled;
            this._fxaaEnabled = fxaa.enabled;
            this._cacheDirty = false;
        }

        if (defined(this._randomTexture) && !ao.enabled) {
            this._randomTexture.destroy();
            this._randomTexture = undefined;
        }

        if (!defined(this._randomTexture) && ao.enabled) {
            length = 256 * 256 * 3;
            var random = new Uint8Array(length);
            for (i = 0; i < length; i += 3) {
                random[i] = Math.floor(Math.random() * 255.0);
            }

            this._randomTexture = new Texture({
                context : context,
                pixelFormat : PixelFormat.RGB,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    arrayBufferView : random,
                    width : 256,
                    height : 256
                },
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });
        }

        this._textureCache.update(context);

        fxaa.update(context);
        ao.update(context);
        bloom.update(context);

        length = activeProcesses.length;
        for (i = 0; i < length; ++i) {
            processes[i].update(context);
        }
    };

    /**
     * Clears all of the framebuffers used by the processes.
     *
     * @param {Context} context The context.
     *
     * @private
     */
    PostProcessCollection.prototype.clear = function(context) {
        this._textureCache.clear(context);
    };

    function getOutputTexture(process) {
        while (defined(process.length)) {
            process = process.get(process.length - 1);
        }
        return process.outputTexture;
    }

    /**
     * Gets the output texture of a process with the given name.
     *
     * @param {String} processName The name of the process.
     * @return {Texture|undefined} The texture rendered to by the process with the given name.
     *
     * @private
     */
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

    /**
     * Executes all ready and enabled processes in the collection.
     *
     * @param {Context} context The context.
     * @param {Texture} colorTexture The color texture rendered to by the scene.
     * @param {Texture} depthTexture The depth texture written to by the scene.
     *
     * @private
     */
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

    /**
     * Copies the output of all executed processes to the color texture of a framebuffer.
     *
     * @param {Context} context The context.
     * @param {Framebuffer} framebuffer The framebuffer to copy to.
     *
     * @private
     */
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

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see PostProcessCollection#destroy
     */
    PostProcessCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PostProcessCollection#isDestroyed
     */
    PostProcessCollection.prototype.destroy = function() {
        this._fxaa.destroy();
        this._ao.destroy();
        this._bloom.destroy();
        this.removeAll();
        this._textureCache = this._textureCache && this._textureCache.destroy();
        return destroyObject(this);
    };

    return PostProcessCollection;
});
