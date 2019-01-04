define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/EllipsoidGeometry',
        '../Core/GeometryPipeline',
        '../Core/Math',
        '../Core/VertexFormat',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../Shaders/SkyAtmosphereFS',
        '../Shaders/SkyAtmosphereVS',
        './BlendingState',
        './CullFace',
        './SceneMode'
    ], function(
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        Ellipsoid,
        EllipsoidGeometry,
        GeometryPipeline,
        CesiumMath,
        VertexFormat,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        SkyAtmosphereFS,
        SkyAtmosphereVS,
        BlendingState,
        CullFace,
        SceneMode) {
    'use strict';

    /**
     * An atmosphere drawn around the limb of the provided ellipsoid.  Based on
     * {@link http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html|Accurate Atmospheric Scattering}
     * in GPU Gems 2.
     * <p>
     * This is only supported in 3D. Atmosphere is faded out when morphing to 2D or Columbus view.
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
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Sky%20Atmosphere.html|Sky atmosphere demo in Sandcastle}
     *
     * @see Scene.skyAtmosphere
     */
    function SkyAtmosphere(ellipsoid) {
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

        this._spSkyFromSpaceColorCorrect = undefined;
        this._spSkyFromAtmosphereColorCorrect = undefined;

        /**
         * The hue shift to apply to the atmosphere. Defaults to 0.0 (no shift).
         * A hue shift of 1.0 indicates a complete rotation of the hues available.
         * @type {Number}
         * @default 0.0
         */
        this.hueShift = 0.0;

        /**
         * The saturation shift to apply to the atmosphere. Defaults to 0.0 (no shift).
         * A saturation shift of -1.0 is monochrome.
         * @type {Number}
         * @default 0.0
         */
        this.saturationShift = 0.0;

        /**
         * The brightness shift to apply to the atmosphere. Defaults to 0.0 (no shift).
         * A brightness shift of -1.0 is complete darkness, which will let space show through.
         * @type {Number}
         * @default 0.0
         */
        this.brightnessShift = 0.0;

        this._hueSaturationBrightness = new Cartesian3();

        // camera height, outer radius, inner radius, dynamic atmosphere color flag
        var cameraAndRadiiAndDynamicAtmosphereColor = new Cartesian4();

        // Toggles whether the sun position is used. 0 treats the sun as always directly overhead.
        cameraAndRadiiAndDynamicAtmosphereColor.w = 0;
        cameraAndRadiiAndDynamicAtmosphereColor.y = Cartesian3.maximumComponent(Cartesian3.multiplyByScalar(ellipsoid.radii, 1.025, new Cartesian3()));
        cameraAndRadiiAndDynamicAtmosphereColor.z = ellipsoid.maximumRadius;

        this._cameraAndRadiiAndDynamicAtmosphereColor = cameraAndRadiiAndDynamicAtmosphereColor;

        var that = this;

        this._command.uniformMap = {
            u_cameraAndRadiiAndDynamicAtmosphereColor : function() {
                return that._cameraAndRadiiAndDynamicAtmosphereColor;
            },
            u_hsbShift : function() {
                that._hueSaturationBrightness.x = that.hueShift;
                that._hueSaturationBrightness.y = that.saturationShift;
                that._hueSaturationBrightness.z = that.brightnessShift;
                return that._hueSaturationBrightness;
            }
        };
    }

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
    SkyAtmosphere.prototype.setDynamicAtmosphereColor = function(enableLighting) {
        this._cameraAndRadiiAndDynamicAtmosphereColor.w = enableLighting ? 1 : 0;
    };

    /**
     * @private
     */
    SkyAtmosphere.prototype.update = function(frameState) {
        if (!this.show) {
            return undefined;
        }

        var mode = frameState.mode;
        if ((mode !== SceneMode.SCENE3D) &&
            (mode !== SceneMode.MORPHING)) {
            return undefined;
        }

        // The atmosphere is only rendered during the render pass; it is not pickable, it doesn't cast shadows, etc.
        if (!frameState.passes.render) {
            return undefined;
        }

        var command = this._command;

        if (!defined(command.vertexArray)) {
            var context = frameState.context;

            var geometry = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
                radii : Cartesian3.multiplyByScalar(this._ellipsoid.radii, 1.025, new Cartesian3()),
                slicePartitions : 256,
                stackPartitions : 256,
                vertexFormat : VertexFormat.POSITION_ONLY
            }));
            command.vertexArray = VertexArray.fromGeometry({
                context : context,
                geometry : geometry,
                attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
                bufferUsage : BufferUsage.STATIC_DRAW
            });
            command.renderState = RenderState.fromCache({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                blending : BlendingState.ALPHA_BLEND,
                depthMask : false
            });

            var vs = new ShaderSource({
                defines : ['SKY_FROM_SPACE'],
                sources : [SkyAtmosphereVS]
            });

            this._spSkyFromSpace = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : SkyAtmosphereFS
            });

            vs = new ShaderSource({
                defines : ['SKY_FROM_ATMOSPHERE'],
                sources : [SkyAtmosphereVS]
            });
            this._spSkyFromAtmosphere = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : SkyAtmosphereFS
            });
        }

        // Compile the color correcting versions of the shader on demand
        var useColorCorrect = colorCorrect(this);
        if (useColorCorrect && (!defined(this._spSkyFromSpaceColorCorrect) || !defined(this._spSkyFromAtmosphereColorCorrect))) {
            var contextColorCorrect = frameState.context;

            var vsColorCorrect = new ShaderSource({
                defines : ['SKY_FROM_SPACE'],
                sources : [SkyAtmosphereVS]
            });
            var fsColorCorrect = new ShaderSource({
                defines : ['COLOR_CORRECT'],
                sources : [SkyAtmosphereFS]
            });

            this._spSkyFromSpaceColorCorrect = ShaderProgram.fromCache({
                context : contextColorCorrect,
                vertexShaderSource : vsColorCorrect,
                fragmentShaderSource : fsColorCorrect
            });
            vsColorCorrect = new ShaderSource({
                defines : ['SKY_FROM_ATMOSPHERE'],
                sources : [SkyAtmosphereVS]
            });
            this._spSkyFromAtmosphereColorCorrect = ShaderProgram.fromCache({
                context : contextColorCorrect,
                vertexShaderSource : vsColorCorrect,
                fragmentShaderSource : fsColorCorrect
            });
        }

        var cameraPosition = frameState.camera.positionWC;

        var cameraHeight = Cartesian3.magnitude(cameraPosition);
        this._cameraAndRadiiAndDynamicAtmosphereColor.x = cameraHeight;

        if (cameraHeight > this._cameraAndRadiiAndDynamicAtmosphereColor.y) {
            // Camera in space
            command.shaderProgram = useColorCorrect ? this._spSkyFromSpaceColorCorrect : this._spSkyFromSpace;
        } else {
            // Camera in atmosphere
            command.shaderProgram = useColorCorrect ? this._spSkyFromAtmosphereColorCorrect : this._spSkyFromAtmosphere;
        }

        return command;
    };

    function colorCorrect(skyAtmosphere) {
        return !(CesiumMath.equalsEpsilon(skyAtmosphere.hueShift, 0.0, CesiumMath.EPSILON7) &&
                 CesiumMath.equalsEpsilon(skyAtmosphere.saturationShift, 0.0, CesiumMath.EPSILON7) &&
                 CesiumMath.equalsEpsilon(skyAtmosphere.brightnessShift, 0.0, CesiumMath.EPSILON7));
    }

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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * skyAtmosphere = skyAtmosphere && skyAtmosphere.destroy();
     *
     * @see SkyAtmosphere#isDestroyed
     */
    SkyAtmosphere.prototype.destroy = function() {
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        this._spSkyFromSpace = this._spSkyFromSpace && this._spSkyFromSpace.destroy();
        this._spSkyFromAtmosphere = this._spSkyFromAtmosphere && this._spSkyFromAtmosphere.destroy();
        this._spSkyFromSpaceColorCorrect = this._spSkyFromSpaceColorCorrect && this._spSkyFromSpaceColorCorrect.destroy();
        this._spSkyFromAtmosphereColorCorrect = this._spSkyFromAtmosphereColorCorrect && this._spSkyFromAtmosphereColorCorrect.destroy();
        return destroyObject(this);
    };

    return SkyAtmosphere;
});
