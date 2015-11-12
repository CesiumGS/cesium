/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PixelFormat',
        '../Core/PrimitiveType',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/ClearCommand',
        '../Renderer/ComputeCommand',
        '../Renderer/DrawCommand',
        '../Renderer/Framebuffer',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/Texture',
        '../Renderer/VertexArray',
        '../Shaders/SunFS',
        '../Shaders/SunTextureFS',
        '../Shaders/SunVS',
        './BlendingState',
        './SceneMode',
        './SceneTransforms'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Color,
        ComponentDatatype,
        defined,
        defineProperties,
        destroyObject,
        IndexDatatype,
        CesiumMath,
        Matrix4,
        PixelFormat,
        PrimitiveType,
        Buffer,
        BufferUsage,
        ClearCommand,
        ComputeCommand,
        DrawCommand,
        Framebuffer,
        RenderState,
        ShaderProgram,
        Texture,
        VertexArray,
        SunFS,
        SunTextureFS,
        SunVS,
        BlendingState,
        SceneMode,
        SceneTransforms) {
    "use strict";

    /**
     * Draws a sun billboard.
     * <p>This is only supported in 3D and Columbus view.</p>
     *
     * @alias Sun
     * @constructor
     *
     * @see Scene#sun
     *
     * @example
     * scene.sun = new Cesium.Sun();
     */
    var Sun = function() {
        /**
         * Determines if the sun will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        this._drawCommand = new DrawCommand({
            primitiveType : PrimitiveType.TRIANGLES,
            boundingVolume : new BoundingSphere(),
            owner : this
        });
        this._commands = {
            drawCommand : this._drawCommand,
            computeCommand : undefined
        };
        this._boundingVolume = new BoundingSphere();
        this._boundingVolume2D = new BoundingSphere();

        this._texture = undefined;
        this._drawingBufferWidth = undefined;
        this._drawingBufferHeight = undefined;
        this._radiusTS = undefined;
        this._size = undefined;

        this.glowFactor = 1.0;
        this._glowFactorDirty = false;

        var that = this;
        this._uniformMap = {
            u_texture : function() {
                return that._texture;
            },
            u_size : function() {
                return that._size;
            }
        };
    };

    defineProperties(Sun.prototype, {
        /**
         * Gets or sets a number that controls how "bright" the Sun's lens flare appears
         * to be.  Zero shows just the Sun's disc without any flare.
         * Use larger values for a more pronounced flare around the Sun.
         *
         * @memberof Sun.prototype
         * @type {Number}
         * @default 1.0
         */
        glowFactor : {
            get : function () { return this._glowFactor; },
            set : function (glowFactor) {
                glowFactor = Math.max(glowFactor, 0.0);
                this._glowFactor = glowFactor;
                this._glowFactorDirty = true;
            }
        }
    });

    var scratchPositionWC = new Cartesian2();
    var scratchLimbWC = new Cartesian2();
    var scratchPositionEC = new Cartesian4();
    var scratchCartesian4 = new Cartesian4();

    /**
     * @private
     */
    Sun.prototype.update = function(scene) {
        var frameState = scene.frameState;
        var context = scene.context;

        if (!this.show) {
            return undefined;
        }

        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D || mode === SceneMode.MORPHING) {
            return undefined;
        }

        if (!frameState.passes.render) {
            return undefined;
        }

        var drawingBufferWidth = scene.drawingBufferWidth;
        var drawingBufferHeight = scene.drawingBufferHeight;

        if (!defined(this._texture) ||
                drawingBufferWidth !== this._drawingBufferWidth ||
                drawingBufferHeight !== this._drawingBufferHeight ||
                this._glowFactorDirty) {
            this._texture = this._texture && this._texture.destroy();
            this._drawingBufferWidth = drawingBufferWidth;
            this._drawingBufferHeight = drawingBufferHeight;
            this._glowFactorDirty = false;

            var size = Math.max(drawingBufferWidth, drawingBufferHeight);
            size = Math.pow(2.0, Math.ceil(Math.log(size) / Math.log(2.0)) - 2.0);

            this._texture = new Texture({
                context : context,
                width : size,
                height : size,
                pixelFormat : PixelFormat.RGBA
            });

            this._glowLengthTS = this._glowFactor * 5.0;
            this._radiusTS = (1.0 / (1.0 + 2.0 * this._glowLengthTS)) * 0.5;

            var that = this;
            var uniformMap = {
                u_glowLengthTS : function() {
                    return that._glowLengthTS;
                },
                u_radiusTS : function() {
                    return that._radiusTS;
                }
            };

            this._commands.computeCommand = new ComputeCommand({
                fragmentShaderSource : SunTextureFS,
                outputTexture  : this._texture,
                uniformMap : uniformMap,
                persists : false,
                owner : this,
                postExecute : function() {
                    that._commands.computeCommand = undefined;
                }
            });
        }

        var drawCommand = this._drawCommand;

        if (!defined(drawCommand.vertexArray)) {
            var attributeLocations = {
                direction : 0
            };

            var directions = new Uint8Array(4 * 2);
            directions[0] = 0;
            directions[1] = 0;

            directions[2] = 255;
            directions[3] = 0.0;

            directions[4] = 255;
            directions[5] = 255;

            directions[6] = 0.0;
            directions[7] = 255;

            var vertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : directions,
                usage : BufferUsage.STATIC_DRAW
            });
            var attributes = [{
                index : attributeLocations.direction,
                vertexBuffer : vertexBuffer,
                componentsPerAttribute : 2,
                normalize : true,
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE
            }];
            // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
            var indexBuffer = Buffer.createIndexBuffer({
                context : context,
                typedArray : new Uint16Array([0, 1, 2, 0, 2, 3]),
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
            drawCommand.vertexArray = new VertexArray({
                context : context,
                attributes : attributes,
                indexBuffer : indexBuffer
            });

            drawCommand.shaderProgram = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : SunVS,
                fragmentShaderSource : SunFS,
                attributeLocations : attributeLocations
            });

            drawCommand.renderState = RenderState.fromCache({
                blending : BlendingState.ALPHA_BLEND
            });
            drawCommand.uniformMap = this._uniformMap;
        }

        var sunPosition = context.uniformState.sunPositionWC;
        var sunPositionCV = context.uniformState.sunPositionColumbusView;

        var boundingVolume = this._boundingVolume;
        var boundingVolume2D = this._boundingVolume2D;

        Cartesian3.clone(sunPosition, boundingVolume.center);
        boundingVolume2D.center.x = sunPositionCV.z;
        boundingVolume2D.center.y = sunPositionCV.x;
        boundingVolume2D.center.z = sunPositionCV.y;

        boundingVolume.radius = CesiumMath.SOLAR_RADIUS + CesiumMath.SOLAR_RADIUS * this._glowLengthTS;
        boundingVolume2D.radius = boundingVolume.radius;

        if (mode === SceneMode.SCENE3D) {
            BoundingSphere.clone(boundingVolume, drawCommand.boundingVolume);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            BoundingSphere.clone(boundingVolume2D, drawCommand.boundingVolume);
        }

        var position = SceneTransforms.computeActualWgs84Position(frameState, sunPosition, scratchCartesian4);

        var dist = Cartesian3.magnitude(Cartesian3.subtract(position, scene.camera.position, scratchCartesian4));
        var projMatrix = context.uniformState.projection;

        var positionEC = scratchPositionEC;
        positionEC.x = 0;
        positionEC.y = 0;
        positionEC.z = -dist;
        positionEC.w = 1;

        var positionCC = Matrix4.multiplyByVector(projMatrix, positionEC, scratchCartesian4);
        var positionWC = SceneTransforms.clipToDrawingBufferCoordinates(scene, positionCC, scratchPositionWC);

        positionEC.x = CesiumMath.SOLAR_RADIUS;
        var limbCC = Matrix4.multiplyByVector(projMatrix, positionEC, scratchCartesian4);
        var limbWC = SceneTransforms.clipToDrawingBufferCoordinates(scene, limbCC, scratchLimbWC);

        this._size = Math.ceil(Cartesian2.magnitude(Cartesian2.subtract(limbWC, positionWC, scratchCartesian4)));
        this._size = 2.0 * this._size * (1.0 + 2.0 * this._glowLengthTS);

        return this._commands;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Sun#destroy
     */
    Sun.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Sun#isDestroyed
     *
     * @example
     * sun = sun && sun.destroy();
     */
    Sun.prototype.destroy = function() {
        var command = this._drawCommand;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy();

        this._texture = this._texture && this._texture.destroy();

        return destroyObject(this);
    };

    return Sun;
});
