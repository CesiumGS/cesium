import Cartesian2 from '../Core/Cartesian2.js';
import Color from '../Core/Color.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';
import PixelFormat from '../Core/PixelFormat.js';
import ClearCommand from '../Renderer/ClearCommand.js';
import Framebuffer from '../Renderer/Framebuffer.js';
import PixelDatatype from '../Renderer/PixelDatatype.js';
import Sampler from '../Renderer/Sampler.js';
import Texture from '../Renderer/Texture.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import TextureWrap from '../Renderer/TextureWrap.js';

    /**
     * A post process stage that will get the luminance value at each pixel and
     * uses parallel reduction to compute the average luminance in a 1x1 texture.
     * This texture can be used as input for tone mapping.
     *
     * @constructor
     * @private
     */
    function AutoExposure() {
        this._uniformMap = undefined;
        this._command = undefined;

        this._colorTexture = undefined;
        this._depthTexture = undefined;

        this._ready = false;

        this._name = 'czm_autoexposure';

        this._logDepthChanged = undefined;
        this._useLogDepth = undefined;

        this._framebuffers = undefined;
        this._previousLuminance = undefined;

        this._commands = undefined;
        this._clearCommand = undefined;

        this._minMaxLuminance = new Cartesian2();

        /**
         * Whether or not to execute this post-process stage when ready.
         *
         * @type {Boolean}
         */
        this.enabled = true;
        this._enabled = true;

        /**
         * The minimum value used to clamp the luminance.
         *
         * @type {Number}
         * @default 0.1
         */
        this.minimumLuminance = 0.1;

        /**
         * The maximum value used to clamp the luminance.
         *
         * @type {Number}
         * @default 10.0
         */
        this.maximumLuminance = 10.0;
    }

    defineProperties(AutoExposure.prototype, {
        /**
         * Determines if this post-process stage is ready to be executed. A stage is only executed when both <code>ready</code>
         * and {@link AutoExposure#enabled} are <code>true</code>. A stage will not be ready while it is waiting on textures
         * to load.
         *
         * @memberof AutoExposure.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },
        /**
         * The unique name of this post-process stage for reference by other stages.
         *
         * @memberof AutoExposure.prototype
         * @type {String}
         * @readonly
         */
        name : {
            get : function() {
                return this._name;
            }
        },

        /**
         * A reference to the texture written to when executing this post process stage.
         *
         * @memberof AutoExposure.prototype
         * @type {Texture}
         * @readonly
         * @private
         */
        outputTexture : {
            get : function() {
                var framebuffers = this._framebuffers;
                if (!defined(framebuffers)) {
                    return undefined;
                }
                return framebuffers[framebuffers.length - 1].getColorTexture(0);
            }
        }
    });

    function destroyFramebuffers(autoexposure) {
        var framebuffers = autoexposure._framebuffers;
        if (!defined(framebuffers)) {
            return;
        }

        var length = framebuffers.length;
        for (var i = 0; i < length; ++i) {
            framebuffers[i].destroy();
        }
        autoexposure._framebuffers = undefined;

        autoexposure._previousLuminance.destroy();
        autoexposure._previousLuminance = undefined;
    }

    function createFramebuffers(autoexposure, context) {
        destroyFramebuffers(autoexposure);

        var width = autoexposure._width;
        var height = autoexposure._height;

        var pixelFormat = PixelFormat.RGBA;
        var pixelDatatype = context.halfFloatingPointTexture ? PixelDatatype.HALF_FLOAT : PixelDatatype.FLOAT;
        var sampler = new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });

        var length = Math.ceil(Math.log(Math.max(width, height)) / Math.log(3.0));
        var framebuffers = new Array(length);
        for (var i = 0; i < length; ++i) {
            width = Math.max(Math.ceil(width / 3.0), 1.0);
            height = Math.max(Math.ceil(height / 3.0), 1.0);
            framebuffers[i] = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : pixelFormat,
                    pixelDatatype : pixelDatatype,
                    sampler : sampler
                })]
            });
        }

        var lastTexture = framebuffers[length - 1].getColorTexture(0);
        autoexposure._previousLuminance = new Framebuffer({
            context : context,
            colorTextures : [new Texture({
                context : context,
                width : lastTexture.width,
                height : lastTexture.height,
                pixelFormat : pixelFormat,
                pixelDatatype : pixelDatatype,
                sampler : sampler
            })]
        });

        autoexposure._framebuffers = framebuffers;
    }

    function destroyCommands(autoexposure) {
        var commands = autoexposure._commands;
        if (!defined(commands)) {
            return;
        }

        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            commands[i].shaderProgram.destroy();
        }
        autoexposure._commands = undefined;
    }

    function createUniformMap(autoexposure, index) {
        var uniforms;
        if (index === 0) {
            uniforms = {
                colorTexture : function() {
                    return autoexposure._colorTexture;
                },
                colorTextureDimensions : function() {
                    return autoexposure._colorTexture.dimensions;
                }
            };
        } else {
            var texture = autoexposure._framebuffers[index - 1].getColorTexture(0);
            uniforms = {
                colorTexture : function() {
                    return texture;
                },
                colorTextureDimensions : function() {
                    return texture.dimensions;
                }
            };
        }

        uniforms.minMaxLuminance = function() {
            return autoexposure._minMaxLuminance;
        };
        uniforms.previousLuminance = function() {
            return autoexposure._previousLuminance.getColorTexture(0);
        };

        return uniforms;
    }

    function getShaderSource(index, length) {
        var source =
            'uniform sampler2D colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'float sampleTexture(vec2 offset) { \n';

        if (index === 0) {
            source +=
                '    vec4 color = texture2D(colorTexture, v_textureCoordinates + offset); \n' +
                '    return czm_luminance(color.rgb); \n';
        } else {
            source +=
                '    return texture2D(colorTexture, v_textureCoordinates + offset).r; \n';
        }

        source += '}\n\n';

        source +=
            'uniform vec2 colorTextureDimensions; \n' +
            'uniform vec2 minMaxLuminance; \n' +
            'uniform sampler2D previousLuminance; \n' +
            'void main() { \n' +
            '    float color = 0.0; \n' +
            '    float xStep = 1.0 / colorTextureDimensions.x; \n' +
            '    float yStep = 1.0 / colorTextureDimensions.y; \n' +
            '    int count = 0; \n' +
            '    for (int i = 0; i < 3; ++i) { \n' +
            '        for (int j = 0; j < 3; ++j) { \n' +
            '            vec2 offset; \n' +
            '            offset.x = -xStep + float(i) * xStep; \n' +
            '            offset.y = -yStep + float(j) * yStep; \n' +
            '            if (offset.x < 0.0 || offset.x > 1.0 || offset.y < 0.0 || offset.y > 1.0) { \n' +
            '                continue; \n' +
            '            } \n' +
            '            color += sampleTexture(offset); \n' +
            '            ++count; \n' +
            '        } \n' +
            '    } \n' +
            '    if (count > 0) { \n' +
            '        color /= float(count); \n' +
            '    } \n';

        if (index === length - 1) {
            source +=
                '    float previous = texture2D(previousLuminance, vec2(0.5)).r; \n' +
                '    color = clamp(color, minMaxLuminance.x, minMaxLuminance.y); \n' +
                '    color = previous + (color - previous) / (60.0 * 1.5); \n' +
                '    color = clamp(color, minMaxLuminance.x, minMaxLuminance.y); \n';
        }

        source +=
            '    gl_FragColor = vec4(color); \n' +
            '} \n';
        return source;
    }

    function createCommands(autoexposure, context) {
        destroyCommands(autoexposure);
        var framebuffers = autoexposure._framebuffers;
        var length = framebuffers.length;

        var commands = new Array(length);

        for (var i = 0; i < length; ++i) {
            commands[i] = context.createViewportQuadCommand(getShaderSource(i, length), {
                framebuffer : framebuffers[i],
                uniformMap : createUniformMap(autoexposure, i)
            });
        }
        autoexposure._commands = commands;
    }

    /**
     * A function that will be called before execute. Used to clear any textures attached to framebuffers.
     * @param {Context} context The context.
     * @private
     */
    AutoExposure.prototype.clear = function(context) {
        var framebuffers = this._framebuffers;
        if (!defined(framebuffers)) {
            return;
        }

        var clearCommand = this._clearCommand;
        if (!defined(clearCommand)) {
            clearCommand = this._clearCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                framebuffer : undefined
            });
        }

        var length = framebuffers.length;
        for (var i = 0; i < length; ++i) {
            clearCommand.framebuffer = framebuffers[i];
            clearCommand.execute(context);
        }
    };

    /**
     * A function that will be called before execute. Used to create WebGL resources and load any textures.
     * @param {Context} context The context.
     * @private
     */
    AutoExposure.prototype.update = function(context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;

            createFramebuffers(this, context);
            createCommands(this, context);

            if (!this._ready) {
                this._ready = true;
            }
        }

        this._minMaxLuminance.x = this.minimumLuminance;
        this._minMaxLuminance.y = this.maximumLuminance;

        var framebuffers = this._framebuffers;
        var temp = framebuffers[framebuffers.length - 1];
        framebuffers[framebuffers.length - 1] = this._previousLuminance;
        this._commands[this._commands.length - 1].framebuffer = this._previousLuminance;
        this._previousLuminance = temp;
    };

    /**
     * Executes the post-process stage. The color texture is the texture rendered to by the scene or from the previous stage.
     * @param {Context} context The context.
     * @param {Texture} colorTexture The input color texture.
     * @private
     */
    AutoExposure.prototype.execute = function(context, colorTexture) {
        this._colorTexture = colorTexture;

        var commands = this._commands;
        if (!defined(commands)) {
            return;
        }

        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            commands[i].execute(context);
        }
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
     * @see AutoExposure#destroy
     */
    AutoExposure.prototype.isDestroyed = function() {
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
     * @see AutoExposure#isDestroyed
     */
    AutoExposure.prototype.destroy = function() {
        destroyFramebuffers(this);
        destroyCommands(this);
        return destroyObject(this);
    };
export default AutoExposure;
