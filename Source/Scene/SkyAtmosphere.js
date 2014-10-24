/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/EllipsoidGeometry',
        '../Core/GeometryPipeline',
        '../Core/VertexFormat',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../Shaders/SkyAtmosphereFS',
        '../Shaders/SkyAtmosphereVS',
        './BlendingState',
        './CullFace',
        './SceneMode'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        Ellipsoid,
        EllipsoidGeometry,
        GeometryPipeline,
        VertexFormat,
        BufferUsage,
        DrawCommand,
        ShaderSource,
        SkyAtmosphereFS,
        SkyAtmosphereVS,
        BlendingState,
        CullFace,
        SceneMode) {
    "use strict";

    /**
     * An atmosphere drawn around the limb of the provided ellipsoid.  Based on
     * {@link http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html|Accurate Atmospheric Scattering}
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
        this._command = new DrawCommand({
            owner : this
        });
        this._spSkyFromSpace = undefined;
        this._spSkyFromAtmosphere = undefined;

        this._fCameraHeight = undefined;
        this._fCameraHeight2 = undefined;
        this._outerRadius = Cartesian3.maximumComponent(Cartesian3.multiplyByScalar(ellipsoid.radii, 1.025, new Cartesian3()));
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
         *
         * @type {Ellipsoid}
         * @readonly
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
                radii : Cartesian3.multiplyByScalar(this._ellipsoid.radii, 1.025, new Cartesian3()),
                slicePartitions : 256,
                stackPartitions : 256,
                vertexFormat : VertexFormat.POSITION_ONLY
            }));
            command.vertexArray = context.createVertexArrayFromGeometry({
                geometry : geometry,
                attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
                bufferUsage : BufferUsage.STATIC_DRAW
            });
            command.renderState = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                blending : BlendingState.ALPHA_BLEND
            });

            var vs = new ShaderSource({
                defines : ['SKY_FROM_SPACE'],
                sources : [SkyAtmosphereVS]
            });
            this._spSkyFromSpace = context.createShaderProgram(vs, SkyAtmosphereFS);

            vs = new ShaderSource({
                defines : ['SKY_FROM_ATMOSPHERE'],
                sources : [SkyAtmosphereVS]
            });
            this._spSkyFromAtmosphere = context.createShaderProgram(vs, SkyAtmosphereFS);
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
        this._spSkyFromSpace = this._spSkyFromSpace && this._spSkyFromSpace.destroy();
        this._spSkyFromAtmosphere = this._spSkyFromAtmosphere && this._spSkyFromAtmosphere.destroy();
        return destroyObject(this);
    };

    return SkyAtmosphere;
});
