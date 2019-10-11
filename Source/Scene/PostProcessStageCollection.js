import arraySlice from '../Core/arraySlice.js';
import Check from '../Core/Check.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';
import DeveloperError from '../Core/DeveloperError.js';
import PixelFormat from '../Core/PixelFormat.js';
import PixelDatatype from '../Renderer/PixelDatatype.js';
import Sampler from '../Renderer/Sampler.js';
import Texture from '../Renderer/Texture.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import TextureWrap from '../Renderer/TextureWrap.js';
import PassThrough from '../Shaders/PostProcessStages/PassThrough.js';
import PostProcessStageLibrary from './PostProcessStageLibrary.js';
import PostProcessStageTextureCache from './PostProcessStageTextureCache.js';
import Tonemapper from './Tonemapper.js';

    var stackScratch = [];

    /**
     * A collection of {@link PostProcessStage}s and/or {@link PostProcessStageComposite}s.
     * <p>
     * The input texture for each post-process stage is the texture rendered to by the scene or the texture rendered
     * to by the previous stage in the collection.
     * </p>
     * <p>
     * If the ambient occlusion or bloom stages are enabled, they will execute before all other stages.
     * </p>
     * <p>
     * If the FXAA stage is enabled, it will execute after all other stages.
     * </p>
     *
     * @alias PostProcessStageCollection
     * @constructor
     */
    function PostProcessStageCollection() {
        var fxaa = PostProcessStageLibrary.createFXAAStage();
        var ao = PostProcessStageLibrary.createAmbientOcclusionStage();
        var bloom = PostProcessStageLibrary.createBloomStage();

        // Auto-exposure is currently disabled because most shaders output a value in [0.0, 1.0].
        // Some shaders, such as the atmosphere and ground atmosphere, output values slightly over 1.0.
        this._autoExposureEnabled = false;
        this._autoExposure = PostProcessStageLibrary.createAutoExposureStage();
        this._tonemapping = undefined;
        this._tonemapper = undefined;

        // set tonemapper and tonemapping
        this.tonemapper = Tonemapper.ACES;

        var tonemapping = this._tonemapping;

        fxaa.enabled = false;
        ao.enabled = false;
        bloom.enabled = false;
        tonemapping.enabled = false; // will be enabled if necessary in update

        var textureCache = new PostProcessStageTextureCache(this);

        var stageNames = {};
        var stack = stackScratch;
        stack.push(fxaa, ao, bloom, tonemapping);
        while (stack.length > 0) {
            var stage = stack.pop();
            stageNames[stage.name] = stage;
            stage._textureCache = textureCache;

            var length = stage.length;
            if (defined(length)) {
                for (var i = 0; i < length; ++i) {
                    stack.push(stage.get(i));
                }
            }
        }

        this._stages = [];
        this._activeStages = [];
        this._previousActiveStages = [];

        this._randomTexture = undefined; // For AO

        var that = this;
        ao.uniforms.randomTexture = function() {
            return that._randomTexture;
        };

        this._ao = ao;
        this._bloom = bloom;
        this._fxaa = fxaa;

        this._lastLength = undefined;
        this._aoEnabled = undefined;
        this._bloomEnabled = undefined;
        this._tonemappingEnabled = undefined;
        this._fxaaEnabled = undefined;

        this._stagesRemoved = false;
        this._textureCacheDirty = false;

        this._stageNames = stageNames;
        this._textureCache = textureCache;
    }

    defineProperties(PostProcessStageCollection.prototype, {
        /**
         * Determines if all of the post-process stages in the collection are ready to be executed.
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                var readyAndEnabled = false;
                var stages = this._stages;
                var length = stages.length;
                for (var i = length - 1; i >= 0; --i) {
                    var stage = stages[i];
                    readyAndEnabled = readyAndEnabled || (stage.ready && stage.enabled);
                }

                var fxaa = this._fxaa;
                var ao = this._ao;
                var bloom = this._bloom;
                var tonemapping = this._tonemapping;

                readyAndEnabled = readyAndEnabled || (fxaa.ready && fxaa.enabled);
                readyAndEnabled = readyAndEnabled || (ao.ready && ao.enabled);
                readyAndEnabled = readyAndEnabled || (bloom.ready && bloom.enabled);
                readyAndEnabled = readyAndEnabled || (tonemapping.ready && tonemapping.enabled);

                return readyAndEnabled;
            }
        },
        /**
         * A post-process stage for Fast Approximate Anti-aliasing.
         * <p>
         * When enabled, this stage will execute after all others.
         * </p>
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {PostProcessStage}
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
         * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code>.
         * </p>
         * <ul>
         * <li><code>intensity</code> is a scalar value used to lighten or darken the shadows exponentially. Higher values make the shadows darker. The default value is <code>3.0</code>.</li>
         *
         * <li><code>bias</code> is a scalar value representing an angle in radians. If the dot product between the normal of the sample and the vector to the camera is less than this value,
         * sampling stops in the current direction. This is used to remove shadows from near planar edges. The default value is <code>0.1</code>.</li>
         *
         * <li><code>lengthCap</code> is a scalar value representing a length in meters. If the distance from the current sample to first sample is greater than this value,
         * sampling stops in the current direction. The default value is <code>0.26</code>.</li>
         *
         * <li><code>stepSize</code> is a scalar value indicating the distance to the next texel sample in the current direction. The default value is <code>1.95</code>.</li>
         *
         * <li><code>frustumLength</code> is a scalar value in meters. If the current fragment has a distance from the camera greater than this value, ambient occlusion is not computed for the fragment.
         * The default value is <code>1000.0</code>.</li>
         *
         * <li><code>ambientOcclusionOnly</code> is a boolean value. When <code>true</code>, only the shadows generated are written to the output. When <code>false</code>, the input texture is modulated
         * with the ambient occlusion. This is a useful debug option for seeing the effects of changing the uniform values. The default value is <code>false</code>.</li>
         * </ul>
         * <p>
         * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
         * The blur is applied to the shadows generated from the image to make them smoother.
         * </p>
         * <p>
         * When enabled, this stage will execute before all others.
         * </p>
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {PostProcessStageComposite}
         * @readonly
         */
        ambientOcclusion : {
            get : function() {
                return this._ao;
            }
        },
        /**
         * A post-process stage for a bloom effect.
         * <p>
         * A bloom effect adds glow effect, makes bright areas brighter, and dark areas darker.
         * </p>
         * <p>
         * This stage has the following uniforms: <code>contrast</code>, <code>brightness</code>, <code>glowOnly</code>,
         * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
         * </p>
         * <ul>
         * <li><code>contrast</code> is a scalar value in the range [-255.0, 255.0] and affects the contract of the effect. The default value is <code>128.0</code>.</li>
         *
         * <li><code>brightness</code> is a scalar value. The input texture RGB value is converted to hue, saturation, and brightness (HSB) then this value is
         * added to the brightness. The default value is <code>-0.3</code>.</li>
         *
         * <li><code>glowOnly</code> is a boolean value. When <code>true</code>, only the glow effect will be shown. When <code>false</code>, the glow will be added to the input texture.
         * The default value is <code>false</code>. This is a debug option for viewing the effects when changing the other uniform values.</li>
         * </ul>
         * <p>
         * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
         * The blur is applied to the shadows generated from the image to make them smoother.
         * </p>
         * <p>
         * When enabled, this stage will execute before all others.
         * </p>
         *
         * @memberOf PostProcessStageCollection.prototype
         * @type {PostProcessStageComposite}
         * @readonly
         */
        bloom : {
            get : function() {
                return this._bloom;
            }
        },
        /**
         * The number of post-process stages in this collection.
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                removeStages(this);
                return this._stages.length;
            }
        },
        /**
         * A reference to the last texture written to when executing the post-process stages in this collection.
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {Texture}
         * @readonly
         * @private
         */
        outputTexture : {
            get : function() {
                var fxaa = this._fxaa;
                if (fxaa.enabled && fxaa.ready) {
                    return this.getOutputTexture(fxaa.name);
                }

                var stages = this._stages;
                var length = stages.length;
                for (var i = length - 1; i >= 0; --i) {
                    var stage = stages[i];
                    if (defined(stage) && stage.ready && stage.enabled) {
                        return this.getOutputTexture(stage.name);
                    }
                }

                var tonemapping = this._tonemapping;
                if (tonemapping.enabled && tonemapping.ready) {
                    return this.getOutputTexture(tonemapping.name);
                }

                var bloom = this._bloom;
                if (bloom.enabled && bloom.ready) {
                    return this.getOutputTexture(bloom.name);
                }

                var ao = this._ao;
                if (ao.enabled && ao.ready) {
                    return this.getOutputTexture(ao.name);
                }

                return undefined;
            }
        },
        /**
         * Whether the collection has a stage that has selected features.
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {Boolean}
         * @readonly
         * @private
         */
        hasSelected : {
            get : function() {
                var stages = arraySlice(this._stages);
                while (stages.length > 0) {
                    var stage = stages.pop();
                    if (!defined(stage)) {
                        continue;
                    }
                    if (defined(stage.selected)) {
                        return true;
                    }
                    var length = stage.length;
                    if (defined(length)) {
                        for (var i = 0; i < length; ++i) {
                            stages.push(stage.get(i));
                        }
                    }
                }
                return false;
            }
        },
        /**
         * Gets and sets the tonemapping algorithm used when rendering with high dynamic range.
         *
         * @memberof PostProcessStageCollection.prototype
         * @type {Tonemapper}
         * @private
         */
        tonemapper : {
            get : function() {
                return this._tonemapper;
            },
            set : function(value) {
                if (this._tonemapper === value) {
                    return;
                }
                //>>includeStart('debug', pragmas.debug);
                if (!Tonemapper.validate(value)) {
                    throw new DeveloperError('tonemapper was set to an invalid value.');
                }
                //>>includeEnd('debug');

                if (defined(this._tonemapping)) {
                    delete this._stageNames[this._tonemapping.name];
                    this._tonemapping.destroy();
                }

                var useAutoExposure = this._autoExposureEnabled;
                var tonemapper;

                switch(value) {
                    case Tonemapper.REINHARD:
                        tonemapper = PostProcessStageLibrary.createReinhardTonemappingStage(useAutoExposure);
                        break;
                    case Tonemapper.MODIFIED_REINHARD:
                        tonemapper = PostProcessStageLibrary.createModifiedReinhardTonemappingStage(useAutoExposure);
                        break;
                    case Tonemapper.FILMIC:
                        tonemapper = PostProcessStageLibrary.createFilmicTonemappingStage(useAutoExposure);
                        break;
                    default:
                        tonemapper = PostProcessStageLibrary.createAcesTonemappingStage(useAutoExposure);
                        break;
                }

                if (useAutoExposure) {
                    var autoexposure = this._autoExposure;
                    tonemapper.uniforms.autoExposure = function() {
                        return autoexposure.outputTexture;
                    };
                }

                this._tonemapper = value;
                this._tonemapping = tonemapper;

                if (defined(this._stageNames)) {
                    this._stageNames[tonemapper.name] = tonemapper;
                    tonemapper._textureCache = this._textureCache;
                }

                this._textureCacheDirty = true;
            }
        }
    });

    function removeStages(collection) {
        if (!collection._stagesRemoved) {
            return;
        }

        collection._stagesRemoved = false;

        var newStages = [];
        var stages = collection._stages;
        var length = stages.length;
        for (var i = 0, j = 0; i < length; ++i) {
            var stage = stages[i];
            if (stage) {
                stage._index = j++;
                newStages.push(stage);
            }
        }

        collection._stages = newStages;
    }

    /**
     * Adds the post-process stage to the collection.
     *
     * @param {PostProcessStage|PostProcessStageComposite} stage The post-process stage to add to the collection.
     * @return {PostProcessStage|PostProcessStageComposite} The post-process stage that was added to the collection.
     *
     * @exception {DeveloperError} The post-process stage has already been added to the collection or does not have a unique name.
     */
    PostProcessStageCollection.prototype.add = function(stage) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('stage', stage);
        //>>includeEnd('debug');

        var stageNames = this._stageNames;

        var stack = stackScratch;
        stack.push(stage);
        while (stack.length > 0) {
            var currentStage = stack.pop();
            //>>includeStart('debug', pragmas.debug);
            if (defined(stageNames[currentStage.name])) {
                throw new DeveloperError(currentStage.name + ' has already been added to the collection or does not have a unique name.');
            }
            //>>includeEnd('debug');
            stageNames[currentStage.name] = currentStage;
            currentStage._textureCache = this._textureCache;

            var length = currentStage.length;
            if (defined(length)) {
                for (var i = 0; i < length; ++i) {
                    stack.push(currentStage.get(i));
                }
            }
        }

        var stages = this._stages;
        stage._index = stages.length;
        stages.push(stage);
        this._textureCacheDirty = true;
        return stage;
    };

    /**
     * Removes a post-process stage from the collection and destroys it.
     *
     * @param {PostProcessStage|PostProcessStageComposite} stage The post-process stage to remove from the collection.
     * @return {Boolean} Whether the post-process stage was removed.
     */
    PostProcessStageCollection.prototype.remove = function(stage) {
        if (!this.contains(stage)) {
            return false;
        }

        var stageNames = this._stageNames;

        var stack = stackScratch;
        stack.push(stage);
        while (stack.length > 0) {
            var currentStage = stack.pop();
            delete stageNames[currentStage.name];

            var length = currentStage.length;
            if (defined(length)) {
                for (var i = 0; i < length; ++i) {
                    stack.push(currentStage.get(i));
                }
            }
        }

        this._stages[stage._index] = undefined;
        this._stagesRemoved = true;
        this._textureCacheDirty = true;
        stage._index = undefined;
        stage._textureCache = undefined;
        stage.destroy();
        return true;
    };

    /**
     * Returns whether the collection contains a post-process stage.
     *
     * @param {PostProcessStage|PostProcessStageComposite} stage The post-process stage.
     * @return {Boolean} Whether the collection contains the post-process stage.
     */
    PostProcessStageCollection.prototype.contains = function(stage) {
        return defined(stage) && defined(stage._index) && stage._textureCache === this._textureCache;
    };

    /**
     * Gets the post-process stage at <code>index</code>.
     *
     * @param {Number} index The index of the post-process stage.
     * @return {PostProcessStage|PostProcessStageComposite} The post-process stage at index.
     */
    PostProcessStageCollection.prototype.get = function(index) {
        removeStages(this);
        var stages = this._stages;
        //>>includeStart('debug', pragmas.debug);
        var length = stages.length;
        Check.typeOf.number.greaterThanOrEquals('stages length', length, 0);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, length);
        //>>includeEnd('debug');
        return stages[index];
    };

    /**
     * Removes all post-process stages from the collection and destroys them.
     */
    PostProcessStageCollection.prototype.removeAll = function() {
        var stages = this._stages;
        var length = stages.length;
        for (var i = 0; i < length; ++i) {
            this.remove(stages[i]);
        }
        stages.length = 0;
    };

    /**
     * Gets a post-process stage in the collection by its name.
     *
     * @param {String} name The name of the post-process stage.
     * @return {PostProcessStage|PostProcessStageComposite} The post-process stage.
     *
     * @private
     */
    PostProcessStageCollection.prototype.getStageByName = function(name) {
        return this._stageNames[name];
    };

    /**
     * Called before the post-process stages in the collection are executed. Calls update for each stage and creates WebGL resources.
     *
     * @param {Context} context The context.
     * @param {Boolean} useLogDepth Whether the scene uses a logarithmic depth buffer.
     *
     * @private
     */
    PostProcessStageCollection.prototype.update = function(context, useLogDepth, useHdr) {
        removeStages(this);

        var previousActiveStages = this._activeStages;
        var activeStages = this._activeStages = this._previousActiveStages;
        this._previousActiveStages = previousActiveStages;

        var stages = this._stages;
        var length = activeStages.length = stages.length;

        var i;
        var stage;
        var count = 0;
        for (i = 0; i < length; ++i) {
            stage = stages[i];
            if (stage.ready && stage.enabled && stage._isSupported(context)) {
                activeStages[count++] = stage;
            }
        }
        activeStages.length = count;

        var activeStagesChanged = count !== previousActiveStages.length;
        if (!activeStagesChanged) {
            for (i = 0; i < count; ++i) {
                if (activeStages[i] !== previousActiveStages[i]) {
                    activeStagesChanged = true;
                    break;
                }
            }
        }

        var ao = this._ao;
        var bloom = this._bloom;
        var autoexposure = this._autoExposure;
        var tonemapping = this._tonemapping;
        var fxaa = this._fxaa;

        tonemapping.enabled = useHdr;

        var aoEnabled = ao.enabled && ao._isSupported(context);
        var bloomEnabled = bloom.enabled && bloom._isSupported(context);
        var tonemappingEnabled = tonemapping.enabled && tonemapping._isSupported(context);
        var fxaaEnabled = fxaa.enabled && fxaa._isSupported(context);

        if (activeStagesChanged || this._textureCacheDirty || count !== this._lastLength || aoEnabled !== this._aoEnabled ||
            bloomEnabled !== this._bloomEnabled || tonemappingEnabled !== this._tonemappingEnabled || fxaaEnabled !== this._fxaaEnabled) {
            // The number of stages to execute has changed.
            // Update dependencies and recreate framebuffers.
            this._textureCache.updateDependencies();

            this._lastLength = count;
            this._aoEnabled = aoEnabled;
            this._bloomEnabled = bloomEnabled;
            this._tonemappingEnabled = tonemappingEnabled;
            this._fxaaEnabled = fxaaEnabled;
            this._textureCacheDirty = false;
        }

        if (defined(this._randomTexture) && !aoEnabled) {
            this._randomTexture.destroy();
            this._randomTexture = undefined;
        }

        if (!defined(this._randomTexture) && aoEnabled) {
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
                    wrapS : TextureWrap.REPEAT,
                    wrapT : TextureWrap.REPEAT,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });
        }

        this._textureCache.update(context);

        fxaa.update(context, useLogDepth);
        ao.update(context, useLogDepth);
        bloom.update(context, useLogDepth);
        tonemapping.update(context, useLogDepth);

        if (this._autoExposureEnabled) {
            autoexposure.update(context, useLogDepth);
        }

        length = stages.length;
        for (i = 0; i < length; ++i) {
            stages[i].update(context, useLogDepth);
        }
    };

    /**
     * Clears all of the framebuffers used by the stages.
     *
     * @param {Context} context The context.
     *
     * @private
     */
    PostProcessStageCollection.prototype.clear = function(context) {
        this._textureCache.clear(context);

        if (this._autoExposureEnabled) {
            this._autoExposure.clear(context);
        }
    };

    function getOutputTexture(stage) {
        while (defined(stage.length)) {
            stage = stage.get(stage.length - 1);
        }
        return stage.outputTexture;
    }

    /**
     * Gets the output texture of a stage with the given name.
     *
     * @param {String} stageName The name of the stage.
     * @return {Texture|undefined} The texture rendered to by the stage with the given name.
     *
     * @private
     */
    PostProcessStageCollection.prototype.getOutputTexture = function(stageName) {
        var stage = this.getStageByName(stageName);
        if (!defined(stage)) {
            return undefined;
        }
        return getOutputTexture(stage);
    };

    function execute(stage, context, colorTexture, depthTexture, idTexture) {
        if (defined(stage.execute)) {
            stage.execute(context, colorTexture, depthTexture, idTexture);
            return;
        }

        var length = stage.length;
        var i;

        if (stage.inputPreviousStageTexture) {
            execute(stage.get(0), context, colorTexture, depthTexture, idTexture);
            for (i = 1; i < length; ++i) {
                execute(stage.get(i), context, getOutputTexture(stage.get(i - 1)), depthTexture, idTexture);
            }
        } else {
            for (i = 0; i < length; ++i) {
                execute(stage.get(i), context, colorTexture, depthTexture, idTexture);
            }
        }
    }

    /**
     * Executes all ready and enabled stages in the collection.
     *
     * @param {Context} context The context.
     * @param {Texture} colorTexture The color texture rendered to by the scene.
     * @param {Texture} depthTexture The depth texture written to by the scene.
     * @param {Texture} idTexture The id texture written to by the scene.
     *
     * @private
     */
    PostProcessStageCollection.prototype.execute = function(context, colorTexture, depthTexture, idTexture) {
        var activeStages = this._activeStages;
        var length = activeStages.length;

        var fxaa = this._fxaa;
        var ao = this._ao;
        var bloom = this._bloom;
        var autoexposure = this._autoExposure;
        var tonemapping = this._tonemapping;

        var aoEnabled = ao.enabled && ao._isSupported(context);
        var bloomEnabled = bloom.enabled && bloom._isSupported(context);
        var autoExposureEnabled = this._autoExposureEnabled;
        var tonemappingEnabled = tonemapping.enabled && tonemapping._isSupported(context);
        var fxaaEnabled = fxaa.enabled && fxaa._isSupported(context);

        if (!fxaaEnabled && !aoEnabled && !bloomEnabled && !tonemappingEnabled && length === 0) {
            return;
        }

        var initialTexture = colorTexture;
        if (aoEnabled && ao.ready) {
            execute(ao, context, initialTexture, depthTexture, idTexture);
            initialTexture = getOutputTexture(ao);
        }
        if (bloomEnabled && bloom.ready) {
            execute(bloom, context, initialTexture, depthTexture, idTexture);
            initialTexture = getOutputTexture(bloom);
        }
        if (autoExposureEnabled && autoexposure.ready) {
            execute(autoexposure, context, initialTexture, depthTexture, idTexture);
        }
        if (tonemappingEnabled && tonemapping.ready) {
            execute(tonemapping, context, initialTexture, depthTexture, idTexture);
            initialTexture = getOutputTexture(tonemapping);
        }

        var lastTexture = initialTexture;

        if (length > 0) {
            execute(activeStages[0], context, initialTexture, depthTexture, idTexture);
            for (var i = 1; i < length; ++i) {
                execute(activeStages[i], context, getOutputTexture(activeStages[i - 1]), depthTexture, idTexture);
            }
            lastTexture = getOutputTexture(activeStages[length - 1]);
        }

        if (fxaaEnabled && fxaa.ready) {
            execute(fxaa, context, lastTexture, depthTexture, idTexture);
        }
    };

    /**
     * Copies the output of all executed stages to the color texture of a framebuffer.
     *
     * @param {Context} context The context.
     * @param {Framebuffer} framebuffer The framebuffer to copy to.
     *
     * @private
     */
    PostProcessStageCollection.prototype.copy = function(context, framebuffer) {
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
     * @see PostProcessStageCollection#destroy
     */
    PostProcessStageCollection.prototype.isDestroyed = function() {
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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PostProcessStageCollection#isDestroyed
     */
    PostProcessStageCollection.prototype.destroy = function() {
        this._fxaa.destroy();
        this._ao.destroy();
        this._bloom.destroy();
        this._autoExposure.destroy();
        this._tonemapping.destroy();
        this.removeAll();
        this._textureCache = this._textureCache && this._textureCache.destroy();
        return destroyObject(this);
    };
export default PostProcessStageCollection;
