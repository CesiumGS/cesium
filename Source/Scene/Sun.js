/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/PrimitiveType',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/Color',
        '../Core/BoundingRectangle',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/PixelFormat',
        '../Renderer/ClearCommand',
        './SceneTransforms',
        './SceneMode',
        '../Shaders/SunVS',
        '../Shaders/SunFS',
        '../Shaders/ViewportQuadVS',
        '../Shaders/SunTextureFS'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        ComponentDatatype,
        defined,
        defineProperties,
        destroyObject,
        CesiumMath,
        PrimitiveType,
        Geometry,
        GeometryAttribute,
        Color,
        BoundingRectangle,
        BlendingState,
        BufferUsage,
        DrawCommand,
        PixelFormat,
        ClearCommand,
        SceneTransforms,
        SceneMode,
        SunVS,
        SunFS,
        ViewportQuadVS,
        SunTextureFS) {
    "use strict";

    /**
     * Draws a sun billboard.
     * <p>This is only supported in 3D and Columbus view.</p>
     *
     * @alias Sun
     * @constructor
     *
     * @example
     * scene.sun = new Cesium.Sun();
     *
     * @see Scene.sun
     */
    var Sun = function() {
        /**
         * Determines if the sun will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        this._command = new DrawCommand();
        this._boundingVolume = new BoundingSphere();
        this._boundingVolume2D = new BoundingSphere();

        this._texture = undefined;
        this._dimensions = undefined;
        this._radiusTS = undefined;
        this._size = undefined;

        this.glowFactor = 0.3;
        this._glowFactorChanged = false;

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
         * @default 0.3
         */
        glowFactor : {
            get : function () { return this._glowFactor; },
            set : function (glowFactor) {
                glowFactor = Math.max(glowFactor, 0.0);
                this._glowFactor = glowFactor;
                this._glowFactorChanged = true;
            }
        }
    });

    var viewportAttributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (defined(vertexArray)) {
            return vertexArray;
        }

        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                }),

                textureCoordinates : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                })
            },
            primitiveType : PrimitiveType.TRIANGLES
        });

        vertexArray = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeIndices : viewportAttributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    /**
     * @private
     */
    Sun.prototype.update = function(context, frameState) {
        if (!this.show) {
            return undefined;
        }

        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D || mode === SceneMode.MORPHING) {
            return undefined;
        }

        if (!frameState.passes.color) {
            return undefined;
        }

        var canvasDimensions = frameState.canvasDimensions;

        if (!defined(this._texture) || !Cartesian2.equals(canvasDimensions, this._dimensions) || this._glowFactorChanged) {
            this._texture = this._texture && this._texture.destroy();
            this._dimensions = Cartesian2.clone(canvasDimensions, this._dimensions);
            this._glowFactorChanged = false;

            var size = Math.max(canvasDimensions.x, canvasDimensions.y);
            size = Math.pow(2.0, Math.ceil(Math.log(size) / Math.log(2)) - 2);

            this._texture = context.createTexture2D({
                width : size,
                height : size,
                pixelFormat : PixelFormat.RGBA
            });

            var fbo = context.createFramebuffer({
                colorTexture : this._texture
            });
            fbo.destroyAttachments = false;

            var clearCommand = new ClearCommand();
            clearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
            clearCommand.framebuffer = fbo;

            var drawCommand = new DrawCommand();
            drawCommand.owner = this;
            drawCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
            drawCommand.vertexArray = getVertexArray(context);
            drawCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, SunTextureFS, viewportAttributeIndices);
            drawCommand.framebuffer = fbo;
            drawCommand.renderState = context.createRenderState({
                viewport : new BoundingRectangle(0.0, 0.0, size, size)
            });

            this._glowLengthTS = this._glowFactor * 10.0;
            this._radiusTS = (1.0 / (1.0 + 2.0 * this._glowLengthTS)) * 0.5;

            var that = this;
            drawCommand.uniformMap = {
                u_glowLengthTS : function() {
                    return that._glowLengthTS;
                },
                u_radiusTS : function() {
                    return that._radiusTS;
                }
            };

            clearCommand.execute(context);
            drawCommand.execute(context);

            drawCommand.shaderProgram.release();
            fbo.destroy();
        }

        var command = this._command;

        if (!defined(command.vertexArray)) {
            var attributeIndices = {
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

            var vertexBuffer = context.createVertexBuffer(directions, BufferUsage.STATIC_DRAW);
            var attributes = [{
                index : attributeIndices.direction,
                vertexBuffer : vertexBuffer,
                componentsPerAttribute : 2,
                normalize : true,
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE
            }];
            command.vertexArray = context.createVertexArray(attributes);
            command.primitiveType = PrimitiveType.TRIANGLE_FAN;

            command.shaderProgram = context.getShaderCache().getShaderProgram(SunVS, SunFS, attributeIndices);
            command.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });
            command.uniformMap = this._uniformMap;
            command.boundingVolume = new BoundingSphere();
        }

        var sunPosition = context.getUniformState().getSunPositionWC();
        var sunPositionCV = context.getUniformState().getSunPositionColumbusView();

        var boundingVolume = this._boundingVolume;
        var boundingVolume2D = this._boundingVolume2D;

        Cartesian3.clone(sunPosition, boundingVolume.center);
        boundingVolume2D.center.x = sunPositionCV.z;
        boundingVolume2D.center.y = sunPositionCV.x;
        boundingVolume2D.center.z = sunPositionCV.y;

        boundingVolume.radius = CesiumMath.SOLAR_RADIUS + CesiumMath.SOLAR_RADIUS * this._glowLengthTS;
        boundingVolume2D.radius = boundingVolume.radius;

        if (mode === SceneMode.SCENE3D) {
            BoundingSphere.clone(boundingVolume, command.boundingVolume);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            BoundingSphere.clone(boundingVolume2D, command.boundingVolume);
        }

        var position = SceneTransforms.computeActualWgs84Position(frameState, sunPosition);

        var viewProjection = context.getUniformState().getViewProjection();
        var positionCC = viewProjection.multiplyByPoint(position);
        var positionWC = SceneTransforms.clipToWindowCoordinates(context.getCanvas(), positionCC);

        var limb = Cartesian3.add(position, Cartesian3.multiplyByScalar(frameState.camera.right, CesiumMath.SOLAR_RADIUS));
        var limbCC = viewProjection.multiplyByPoint(limb);
        var limbWC = SceneTransforms.clipToWindowCoordinates(context.getCanvas(), limbCC);

        this._size = Math.ceil(Cartesian2.magnitude(Cartesian2.subtract(limbWC, positionWC)));
        this._size = 2.0 * this._size * (1.0 + 2.0 * this._glowLengthTS);

        return command;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Sun
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
     * @memberof Sun
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
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        command.shaderProgram = command.shaderProgram && command.shaderProgram.release();

        this._texture = this._texture && this._texture.destroy();

        return destroyObject(this);
    };

    return Sun;
});
