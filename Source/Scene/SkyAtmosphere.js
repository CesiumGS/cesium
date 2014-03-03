/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Cartesian3',
        '../Core/EllipsoidGeometry',
        '../Core/destroyObject',
        '../Core/GeometryPipeline',
        '../Core/PrimitiveType',
        '../Core/Ellipsoid',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Renderer/createShaderSource',
        '../Scene/SceneMode',
        '../Shaders/SkyAtmosphereVS',
        '../Shaders/SkyAtmosphereFS'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        Cartesian3,
        EllipsoidGeometry,
        destroyObject,
        GeometryPipeline,
        PrimitiveType,
        Ellipsoid,
        BufferUsage,
        DrawCommand,
        CullFace,
        BlendingState,
        createShaderSource,
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
     * scene.skyAtmosphere = new Cesium.SkyAtmosphere();
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
        this._command.owner = this;
        this._spSkyFromSpace = undefined;
        this._spSkyFromAtmosphere = undefined;

        this._fCameraHeight = undefined;
        this._fCameraHeight2 = undefined;
        this._outerRadius = Cartesian3.getMaximumComponent(Cartesian3.multiplyByScalar(ellipsoid.radii, 1.025));
        var innerRadius = ellipsoid.maximumRadius;
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

    defineProperties(SkyAtmosphere.prototype, {
        /**
         * Gets the ellipsoid the atmosphere is drawn around.
         * @memberof SkyAtmosphere.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        }
    });

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

        // The atmosphere is only rendered during the render pass; it is not pickable, it doesn't cast shadows, etc.
        if (!frameState.passes.render) {
            return undefined;
        }

        var command = this._command;

        if (!defined(command.vertexArray)) {
            var geometry = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
                radii : Cartesian3.multiplyByScalar(this._ellipsoid.radii, 1.025),
                slicePartitions : 256,
                stackPartitions : 256
            }));
            command.vertexArray = context.createVertexArrayFromGeometry({
                geometry : geometry,
                attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
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

            var shaderCache = context.getShaderCache();
            var vs = createShaderSource({
                defines : ['SKY_FROM_SPACE'],
                sources : [SkyAtmosphereVS]
            });
            this._spSkyFromSpace = shaderCache.getShaderProgram(vs, SkyAtmosphereFS);

            vs = createShaderSource({
                defines : ['SKY_FROM_ATMOSPHERE'],
                sources : [SkyAtmosphereVS]
            });
            this._spSkyFromAtmosphere = shaderCache.getShaderProgram(vs, SkyAtmosphereFS);
        }

        var cameraPosition = frameState.camera.positionWC;

        this._fCameraHeight2 = Cartesian3.magnitudeSquared(cameraPosition);
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
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
     * @returns {undefined}
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