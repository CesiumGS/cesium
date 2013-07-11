/*global define*/
define([
        '../Core/defaultValue',
        '../Core/EllipsoidGeometry',
        '../Core/destroyObject',
        '../Core/GeometryPipeline',
        '../Core/PrimitiveType',
        '../Core/Ellipsoid',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Scene/SceneMode',
        '../Shaders/SkyAtmosphereVS',
        '../Shaders/SkyAtmosphereFS'
    ], function(
        defaultValue,
        EllipsoidGeometry,
        destroyObject,
        GeometryPipeline,
        PrimitiveType,
        Ellipsoid,
        BufferUsage,
        DrawCommand,
        CullFace,
        BlendingState,
        SceneMode,
        SkyAtmosphereVS,
        SkyAtmosphereFS) {
    "use strict";

    /**
     * An atmosphere drawn around the limb of the provided ellipsoid.  Based on
     * <a href="http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html" target="_blank">Accurate Atmospheric Scattering</a>
     * in GPU Gems 2.
     * <p>
     * This is only supported in 3D.  atmosphere is faded out when morphing to 2D or Columbus view.
     * </p>
     *
     * @alias SkyAtmosphere
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid that the atmosphere is drawn around.
     *
     * @example
     * scene.skyAtmosphere = new SkyAtmosphere();
     *
     * @see Scene.skyAtmosphere
     */
    var SkyAtmosphere = function(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        /**
         * Determines if the atmosphere is shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        this._ellipsoid = ellipsoid;
        this._command = new DrawCommand();
        this._spSkyFromSpace = undefined;
        this._spSkyFromAtmosphere = undefined;

        this._fCameraHeight = undefined;
        this._fCameraHeight2 = undefined;
        this._outerRadius = ellipsoid.getRadii().multiplyByScalar(1.025).getMaximumComponent();
        var innerRadius = ellipsoid.getMaximumRadius();
        var rayleighScaleDepth = 0.25;

        var that = this;

        this._command.uniformMap = {
            fCameraHeight : function() {
                return that._fCameraHeight;
            },
            fCameraHeight2 : function() {
                return that._fCameraHeight2;
            },
            fOuterRadius : function() {
                return that._outerRadius;
            },
            fOuterRadius2 : function() {
                return that._outerRadius * that._outerRadius;
            },
            fInnerRadius : function() {
                return innerRadius;
            },
            fScale : function() {
                return 1.0 / (that._outerRadius - innerRadius);
            },
            fScaleDepth : function() {
                return rayleighScaleDepth;
            },
            fScaleOverScaleDepth : function() {
                return (1.0 / (that._outerRadius - innerRadius)) / rayleighScaleDepth;
            }
        };
    };

    /**
     * Gets the ellipsoid the atmosphere is drawn around.
     *
     * @memberof SkyAtmosphere
     *
     * @return {Ellipsoid}
     */
    SkyAtmosphere.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * @private
     */
    SkyAtmosphere.prototype.update = function(context, frameState) {
        if (!this.show) {
            return undefined;
        }

        if ((frameState.mode !== SceneMode.SCENE3D) &&
            (frameState.mode !== SceneMode.MORPHING)) {
            return undefined;
        }

        // The atmosphere is only rendered during the color pass; it is not pickable, it doesn't cast shadows, etc.
        if (!frameState.passes.color) {
            return undefined;
        }

        var command = this._command;

        if (typeof command.vertexArray === 'undefined') {
            var geometry = new EllipsoidGeometry({
                radii : this._ellipsoid.getRadii().multiplyByScalar(1.025),
                numberOfPartitions : 60
            });
            command.vertexArray = context.createVertexArrayFromGeometry({
                geometry : geometry,
                attributeIndices : GeometryPipeline.createAttributeIndices(geometry),
                bufferUsage : BufferUsage.STATIC_DRAW
            });
            command.primitiveType = PrimitiveType.TRIANGLES;
            command.renderState = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                blending : BlendingState.ALPHA_BLEND
            });

            var vs;
            var fs;
            var shaderCache = context.getShaderCache();

            vs = '#define SKY_FROM_SPACE\n' +
                 '#line 0\n' +
                 SkyAtmosphereVS;
            fs = '#line 0\n' +
                 SkyAtmosphereFS;
            this._spSkyFromSpace = shaderCache.getShaderProgram(vs, fs);

            vs = '#define SKY_FROM_ATMOSPHERE\n' +
                 '#line 0\n' +
                 SkyAtmosphereVS;
            this._spSkyFromAtmosphere = shaderCache.getShaderProgram(vs, fs);
        }

        var cameraPosition = frameState.camera.getPositionWC();

        this._fCameraHeight2 = cameraPosition.magnitudeSquared();
        this._fCameraHeight = Math.sqrt(this._fCameraHeight2);

        if (this._fCameraHeight > this._outerRadius) {
            // Camera in space
            command.shaderProgram = this._spSkyFromSpace;
        } else {
            // Camera in atmosphere
            command.shaderProgram = this._spSkyFromAtmosphere;
        }

        return command;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof SkyAtmosphere
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see SkyAtmosphere#destroy
     */
    SkyAtmosphere.prototype.isDestroyed = function() {
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
     * @memberof SkyAtmosphere
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see SkyAtmosphere#isDestroyed
     *
     * @example
     * skyAtmosphere = skyAtmosphere && skyAtmosphere.destroy();
     */
    SkyAtmosphere.prototype.destroy = function() {
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        this._spSkyFromSpace = this._spSkyFromSpace && this._spSkyFromSpace.release();
        this._spSkyFromAtmosphere = this._spSkyFromAtmosphere && this._spSkyFromAtmosphere.release();
        return destroyObject(this);
    };

    return SkyAtmosphere;
});
