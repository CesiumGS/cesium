/*global define*/
define([
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Math',
        '../Core/Intersect',
        '../Core/Occluder',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/ExtentTessellator',
        '../Core/BoundingSphere',
        '../Core/Rectangle',
        '../Core/Cache',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic2',
        '../Core/Matrix3',
        '../Core/Queue',
        '../Core/ComponentDatatype',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Core/CubeMapEllipsoidTessellator',
        '../Core/JulianDate',
        '../Core/Transforms',
        '../Renderer/BufferUsage',
        '../Renderer/CullFace',
        '../Renderer/DepthFunction',
        '../Renderer/PixelFormat',
        './ImageryLayerCollection',
        './WebMercatorTilingScheme',
        './Projections',
        './Tile',
        './TileState',
        './SceneMode',
        './TexturePool',
        './ViewportQuad',
        '../Shaders/CentralBodyVS',
        '../Shaders/CentralBodyFS',
        '../Shaders/CentralBodyFSCommon',
        '../Shaders/CentralBodyVSDepth',
        '../Shaders/CentralBodyFSDepth',
        '../Shaders/CentralBodyVSFilter',
        '../Shaders/CentralBodyFSFilter',
        '../Shaders/CentralBodyVSPole',
        '../Shaders/CentralBodyFSPole',
        '../Shaders/GroundAtmosphere',
        '../Shaders/SkyAtmosphereFS',
        '../Shaders/SkyAtmosphereVS'
    ], function(
        combine,
        defaultValue,
        destroyObject,
        DeveloperError,
        RuntimeError,
        CesiumMath,
        Intersect,
        Occluder,
        Ellipsoid,
        Extent,
        ExtentTessellator,
        BoundingSphere,
        Rectangle,
        Cache,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic2,
        Matrix3,
        Queue,
        ComponentDatatype,
        MeshFilters,
        PrimitiveType,
        CubeMapEllipsoidTessellator,
        JulianDate,
        Transforms,
        BufferUsage,
        CullFace,
        DepthFunction,
        PixelFormat,
        ImageryLayerCollection,
        WebMercatorTilingScheme,
        Projections,
        Tile,
        TileState,
        SceneMode,
        TexturePool,
        ViewportQuad,
        CentralBodyVS,
        CentralBodyFS,
        CentralBodyFSCommon,
        CentralBodyVSDepth,
        CentralBodyFSDepth,
        CentralBodyVSFilter,
        CentralBodyFSFilter,
        CentralBodyVSPole,
        CentralBodyFSPole,
        GroundAtmosphere,
        SkyAtmosphereFS,
        SkyAtmosphereVS) {
    "use strict";

    function TileCache(maxTextureSize) {
        this._maxTextureSize = maxTextureSize;
        this._tiles = [];
    }

    /**
     * DOC_TBA
     *
     * @param {Ellipsoid} [ellipsoid=WGS84 Ellipsoid] Determines the size and shape of the central body.
     *
     * @name CentralBody
     * @constructor
     */
    function CentralBody(ellipsoid, tilingScheme) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        this._ellipsoid = ellipsoid;

        this._occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMinimumRadius()), Cartesian3.ZERO);

        tilingScheme = defaultValue(tilingScheme, new WebMercatorTilingScheme({
            ellipsoid : ellipsoid,
            numberOfLevelZeroTilesX : 2,
            numberOfLevelZeroTilesY : 2
        }));
        this._tilingScheme = tilingScheme;

        this._levelZeroTiles = tilingScheme.createLevelZeroTiles();
        this._imageLayers = new ImageryLayerCollection();
        this._tileCache = new TileCache(128 * 1024 * 1024);
        this._texturePool = new TexturePool();

        this._spWithoutAtmosphere = undefined;
        this._spGroundFromSpace = undefined;
        this._spGroundFromAtmosphere = undefined;
        this._sp = undefined; // Reference to without-atmosphere, ground-from-space, or ground-from-atmosphere
        this._rsColor = undefined;

        this._spSkyFromSpace = undefined;
        this._spSkyFromAtmosphere = undefined;
        this._vaSky = undefined; // Reference to sky-from-space or sky-from-atmosphere
        this._spSky = undefined;
        this._rsSky = undefined;

        this._spDepth = undefined;
        this._vaDepth = undefined;
        this._rsDepth = undefined;

        this._quadH = undefined;
        this._quadV = undefined;

        this._fb = undefined;

        this._vaNorthPole = undefined;
        this._vaSouthPole = undefined;
        this._spPolesWithoutAtmosphere = undefined;
        this._spPolesGroundFromSpace = undefined;
        this._spPolesGroundFromAtmosphere = undefined;
        this._spPoles = undefined; // Reference to without-atmosphere, ground-from-space, or ground-from-atmosphere
        this._northPoleUniforms = undefined;
        this._southPoleUniforms = undefined;
        this._drawNorthPole = false;
        this._drawSouthPole = false;

        /**
         * Determines the color of the north pole. If the day tile provider imagery does not
         * extend over the north pole, it will be filled with this color before applying lighting.
         *
         * @type {Cartesian3}
         */
        this.northPoleColor = new Cartesian3(2.0 / 255.0, 6.0 / 255.0, 18.0 / 255.0);

        /**
         * Determines the color of the south pole. If the day tile provider imagery does not
         * extend over the south pole, it will be filled with this color before applying lighting.
         *
         * @type {Cartesian3}
         */
        this.southPoleColor = new Cartesian3(1.0, 1.0, 1.0);

        /**
         * Determines if the central body will be shown.
         *
         * @type {Boolean}
         */
        this.show = true;

        /**
         * Determines if the ground atmosphere will be shown.
         *
         * @type {Boolean}
         */
        this.showGroundAtmosphere = false;

        /**
         * Determines if the sky atmosphere will be shown.
         *
         * @type {Boolean}
         */
        this.showSkyAtmosphere = false;

        /**
         * <p>
         * Determines if the central body is affected by lighting, i.e., if sun light brightens the
         * day side of the globe, and and the night side appears dark.  When <code>true</code>, the
         * central body is affected by lighting; when <code>false</code>, the central body is uniformly
         * shaded with the day tile provider, i.e., no night lights, atmosphere, etc. are used.
         * </p>
         * <p>
         * The default is <code>true</code>.
         * </p>
         */
        this.affectedByLighting = true;
        this._affectedByLighting = true;

        /**
         * The URL of the image to use as a night texture.  An asynchronous
         * request is made for the image at the next call to {@link CentralBody#update}.
         * The night texture is shown once the image is loaded and {@link CentralBody#showNight}
         * is <code>true</code>.
         * <br /><br />
         * Example day image:
         * <div align='center'>
         * <img src='../images/CentralBody.nightImageSource.jpg' width='512' height='256' />
         * <a href='http://visibleearth.nasa.gov/view_rec.php?id=1438'>NASA Visible Earth</a>.
         * Data courtesy Marc Imhoff of NASA GSFC and Christopher Elvidge of
         * NOAA NGDC. Image by Craig Mayhew and Robert Simmon, NASA GSFC.
         * </div>
         *
         * @type {String}
         *
         * @see CentralBody#showNight
         */
        this.nightImageSource = undefined;
        this._nightImageSource = undefined;
        this._nightTexture = undefined;

        /**
         * The URL of the image to use as a specular map; a single-channel image where zero indicates
         * land cover, and 255 indicates water.  An asynchronous request is made for the image
         * at the next call to {@link CentralBody#update}. The specular map is used once the
         * image is loaded and {@link CentralBody#showSpecular} is <code>true</code>.
         * <br /><br />
         * Example specular map:
         * <div align='center'>
         * <img src='../images/CentralBody.specularMapSource.jpg' width='512' height='256' />
         * <a href='http://planetpixelemporium.com/earth.html'>Planet Texture Maps</a>
         * </div>
         *
         * @type {String}
         *
         * @see CentralBody#showSpecular
         */
        this.specularMapSource = undefined;
        this._specularMapSource = undefined;
        this._specularTexture = undefined;

        /**
         * The URL of the image to use as a cloud map; a single-channel image where 255 indicates
         * cloud cover, and zero indicates no clouds.  An asynchronous request is made for the image
         * at the next call to {@link CentralBody#update}. The cloud map is shown once the
         * image is loaded and {@link CentralBody#showClouds} is <code>true</code>.
         * <br /><br />
         * Example cloud map:
         * <div align='center'>
         * <img src='../images/CentralBody.cloudsMapSource.jpg' width='512' height='256' />
         * <a href='http://planetpixelemporium.com/earth.html'>Planet Texture Maps</a>
         * </div>
         *
         * @type {String}
         *
         * @see CentralBody#showClouds
         */
        this.cloudsMapSource = undefined;
        this._cloudsMapSource = undefined;
        this._cloudsTexture = undefined;

        /**
         * The URL of the image to use as a bump map; a single-channel image where zero indicates
         * sea level, and 255 indicates maximum height.  An asynchronous request is made for the image
         * at the next call to {@link CentralBody#update}. The bump map is used once the
         * image is loaded and {@link CentralBody#showBumps} is <code>true</code>.
         * <br /><br />
         * Example bump map:
         * <div align='center'>
         * <img src='../images/CentralBody.bumpMapSource.jpg' width='512' height='256' />
         * <a href='http://planetpixelemporium.com/earth.html'>Planet Texture Maps</a>
         * </div>
         *
         * @type {String}
         *
         * @see CentralBody#showBumps
         */
        this.bumpMapSource = undefined;
        this._bumpMapSource = undefined;
        this._bumpTexture = undefined;

        /**
         * When <code>true</code>, textures from the <code>dayTileProvider</code> are shown on the central body.
         * <br /><br />
         * <div align='center'>
         * <img src='../images/CentralBody.showDay.jpg' width='400' height='300' />
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#dayTileProvider
         * @see CentralBody#showNight
         */
        this.showDay = true;
        this._defineShowDay = undefined;

        /**
         * When <code>true</code>, the night texture is shown on the side of the central body not illuminated by the sun.
         * The day and night textures are blended across the terminator using {@link CentralBody#dayNightBlendDelta}.
         * When <code>false</code>, the day textures are shown on the entire globe (if enabled).
         * <div align='center'>
         * <img src='../images/CentralBody.showNight.jpg' width='400' height='300' />
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#nightImageSource
         * @see CentralBody#showDay
         * @see CentralBody#dayNightBlendDelta
         *
         * @example
         * cb.showNight = true;
         * cb.nightImageSource = 'night.jpg';
         */
        this.showNight = true;
        this._defineShowNight = undefined;

        /**
         * When <code>true</code>, diffuse-lit clouds are shown on the central body.  When {@link CentralBody#showNight}
         * is also true, clouds on the dark side of the globe will fully or partially occlude the night texture.
         * <div align='center'>
         * <img src='../images/CentralBody.showClouds.jpg' width='400' height='300' />
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#cloudsMapSource
         * @see CentralBody#showCloudShadows
         * @see CentralBody#showNight
         *
         * @example
         * cb.showClouds = true;
         * cb.cloudsMapSource = 'clouds.jpg';
         */
        this.showClouds = true;
        this._defineShowClouds = undefined;

        /**
         * When <code>true</code>, clouds on the daytime side of the globe cast approximate shadows.  The
         * shadows can be shown with or without the clouds themselves, which are controlled with
         * {@link CentralBody#showClouds}.
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>true</code><br/><img src='../images/CentralBody.showCloudShadows.true.jpg' width='250' height='188' /></td>
         * <td align='center'><code>false</code><br/><img src='../images/CentralBody.showCloudShadows.false.jpg' width='250' height='188' /></td>
         * </tr></table>
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#cloudsMapSource
         * @see CentralBody#showClouds
         *
         * @example
         * cb.showClouds = true;
         * cb.showCloudShadows = true;
         * cb.cloudsMapSource = 'clouds.jpg';
         */
        this.showCloudShadows = true;
        this._defineShowCloudShadows = undefined;

        /**
         * When <code>true</code>, a specular map (also called a gloss map) is used so only the ocean receives specular light.
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>true</code><br/><img src='../images/CentralBody.showSpecular.true.jpg' width='250' height='188' /></td>
         * <td align='center'><code>false</code><br/><img src='../images/CentralBody.showSpecular.false.jpg' width='250' height='188' /></td>
         * </tr></table>
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#specularMapSource
         *
         * @example
         * cb.showSpecular = true;
         * cb.specularMapSource = 'specular.jpg';
         */
        this.showSpecular = true;
        this._defineShowSpecular = undefined;

        /**
         * When <code>true</code>, a bump map is used to add lighting detail to the mountainous areas of the central body.
         * This gives the appearance of extra geometric complexity even though the central body is still a smooth ellipsoid.
         * The apparent steepness of the mountains is controlled by {@link CentralBody#bumpMapNormalZ}.
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>true</code><br/><img src='../images/CentralBody.showBumps.true.jpg' width='250' height='188' /></td>
         * <td align='center'><code>false</code><br/><img src='../images/CentralBody.showBumps.false.jpg' width='250' height='188' /></td>
         * </tr></table>
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#bumpMapSource
         * @see CentralBody#bumpMapNormalZ
         *
         * @example
         * cb.showBumps = true;
         * cb.bumpMapSource = 'bump.jpg';
         */
        this.showBumps = true;
        this._defineShowBumps = undefined;

        /**
         * When <code>true</code>, shows a line on the central body where day meets night.
         * <div align='center'>
         * <img src='../images/CentralBody.showTerminator.jpg' width='400' height='300' />
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#showNight
         * @see CentralBody#dayNightBlendDelta
         */
        this.showTerminator = false;
        this._defineShowTerminator = undefined;

        /**
         * When {@link CentralBody#showBumps} is <code>true</code>, <code>bumpMapNormalZ</code> controls the
         * apparent steepness of the mountains.  A value less than one over-exaggerates the steepness; a value greater
         * than one under-exaggerates, making mountains less noticeable.
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>0.25</code><br/><img src='../images/Centralbody.bumpMapNormalZ.025.jpg' width='250' height='188' /></td>
         * <td align='center'><code>1.25</code><br/><img src='../images/Centralbody.bumpMapNormalZ.125.jpg' width='250' height='188' /></td>
         * </tr></table>
         * </div>
         *
         * @type {Number}
         *
         * @see CentralBody#showBumps
         *
         * @example
         * cb.showBumps = true;
         * cb.bumpMapSource = 'bump.jpg';
         * cb.bumpMapNormalZ = 1.0;
         */
        this.bumpMapNormalZ = 0.5;

        /**
         * When {@link CentralBody#showDay} and {@link CentralBody#showNight} are both <code>true</code>,
         * <code>dayNightBlendDelta</code> determines the size of the blend region surrounding the terminator (where day
         * meets night).  A value of zero indicates a sharp transition without blending; a larger value creates a linearly
         * blended region based on the diffuse lighting component:  <code>-dayNightBlendDelta &lt; diffuse &lt; dayNightBlendDelta</code>.
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>0.0</code><br/><img src='../images/Centralbody.dayNightBlendDelta.0.jpg' width='250' height='188' /></td>
         * <td align='center'><code>0.05</code><br/><img src='../images/Centralbody.dayNightBlendDelta.05.jpg' width='250' height='188' /></td>
         * </tr></table>
         * </div>
         *
         * @type {Number}
         *
         * @see CentralBody#showDay
         * @see CentralBody#showNight
         * @see CentralBody#showTerminator
         *
         * @example
         * cb.showDay = true;
         * cb.dayTileProvider = new Cesium.SingleTileProvider('day.jpg');
         * cb.showNight = true;
         * cb.nightImageSource = 'night.jpg';
         * cb.dayNightBlendDelta = 0.0;  // Sharp transition
         */
        this.dayNightBlendDelta = 0.05;

        /**
         * Changes the intensity of the night texture. A value of 1.0 is the same intensity as night texture.
         * A value less than 1.0 makes the night texture darker. A value greater than 1.0 makes the night texture
         * brighter. The default value is 2.0.
         *
         * @type {Number}
         */
        this.nightIntensity = 2.0;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        this._fCameraHeight = undefined;
        this._fCameraHeight2 = undefined;
        this._outerRadius = ellipsoid.getRadii().multiplyWithScalar(1.025).getMaximumComponent();

        // TODO: Do we want to expose any of these atmosphere constants?
        var Kr = 0.0025;
        var Kr4PI = Kr * 4.0 * Math.PI;
        var Km = 0.0015;
        var Km4PI = Km * 4.0 * Math.PI;
        var ESun = 15.0;
        var g = -0.95;
        var innerRadius = ellipsoid.getRadii().getMaximumComponent();
        var rayleighScaleDepth = 0.25;
        var inverseWaveLength = {
            x : 1.0 / Math.pow(0.650, 4.0), // Red
            y : 1.0 / Math.pow(0.570, 4.0), // Green
            z : 1.0 / Math.pow(0.475, 4.0) // Blue
        };

        this._minGroundFromAtmosphereHeight = 6378500.0; // from experimentation / where shader fails due to precision errors
        this._startFadeGroundFromAtmosphere = this._minGroundFromAtmosphereHeight + 1000;

        var that = this;

        var atmosphereUniforms = {
            v3InvWavelength : function() {
                return inverseWaveLength;
            },
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
            fInnerRadius2 : function() {
                return innerRadius * innerRadius;
            },
            fKrESun : function() {
                return Kr * ESun;
            },
            fKmESun : function() {
                return Km * ESun;
            },
            fKr4PI : function() {
                return Kr4PI;
            },
            fKm4PI : function() {
                return Km4PI;
            },
            fScale : function() {
                return 1.0 / (that._outerRadius - innerRadius);
            },
            fScaleDepth : function() {
                return rayleighScaleDepth;
            },
            fScaleOverScaleDepth : function() {
                return (1.0 / (that._outerRadius - innerRadius)) / rayleighScaleDepth;
            },
            g : function() {
                return g;
            },
            g2 : function() {
                return g * g;
            },
            fMinGroundFromAtmosphereHeight : function() {
                return that._minGroundFromAtmosphereHeight;
            },
            fstartFadeGroundFromAtmosphere : function() {
                return that._startFadeGroundFromAtmosphere;
            }
        };

        var uniforms = {
            u_nightTexture : function() {
                return that._nightTexture;
            },
            u_cloudMap : function() {
                return that._cloudsTexture;
            },
            u_specularMap : function() {
                return that._specularTexture;
            },
            u_bumpMap : function() {
                return that._bumpTexture;
            },
            u_bumpMapResoltuion : function() {
                return {
                    x : 1.0 / that._bumpTexture.getWidth(),
                    y : 1.0 / that._bumpTexture.getHeight()
                };
            },
            u_bumpMapNormalZ : function() {
                return that.bumpMapNormalZ;
            },
            u_dayNightBlendDelta : function() {
                return that.dayNightBlendDelta;
            },
            u_nightIntensity : function() {
                return that.nightIntensity;
            },
            u_morphTime : function() {
                return that.morphTime;
            }
        };

        // PERFORMANCE_IDEA:  Only combine these if showing the atmosphere.  Maybe this is too much of a micro-optimization.
        // http://jsperf.com/object-property-access-propcount
        this._drawUniforms = combine(uniforms, atmosphereUniforms);
    }

    CentralBody.prototype._attributeIndices = {
        position3D : 0,
        textureCoordinates : 1,
        position2D : 2
    };

    /**
     * Gets an ellipsoid describing the shape of this central body.
     *
     * @memberof CentralBody
     *
     * @return {Ellipsoid}
     */
    CentralBody.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Gets the collection of image layers that will be rendered on this central body.
     *
     * @returns {ImageryLayerCollection}
     */
    CentralBody.prototype.getImageLayers = function() {
        return this._imageLayers;
    };

    CentralBody.prototype._isModeTransition = function(oldMode, newMode) {
        // SCENE2D, COLUMBUS_VIEW, and MORPHING use the same rendering path, so a
        // transition only occurs when switching from/to SCENE3D
        return oldMode !== newMode && (oldMode === SceneMode.SCENE3D || newMode === SceneMode.SCENE3D);
    };

    CentralBody.prototype._createScissorRectangle = function(description) {
        var quad = description.quad;
        var upperLeft = new Cartesian3(quad[0], quad[1], quad[2]);
        var lowerRight = new Cartesian3(quad[9], quad[10], quad[11]);
        var mvp = description.modelViewProjection;
        var clip = description.viewportTransformation;

        var center = upperLeft.add(lowerRight).multiplyWithScalar(0.5);
        var centerScreen = mvp.multiplyWithVector(new Cartesian4(center.x, center.y, center.z, 1.0));
        centerScreen = centerScreen.multiplyWithScalar(1.0 / centerScreen.w);
        var centerClip = clip.multiplyWithVector(centerScreen).getXYZ();

        var surfaceScreen = mvp.multiplyWithVector(new Cartesian4(upperLeft.x, upperLeft.y, upperLeft.z, 1.0));
        surfaceScreen = surfaceScreen.multiplyWithScalar(1.0 / surfaceScreen.w);
        var surfaceClip = clip.multiplyWithVector(surfaceScreen).getXYZ();

        var radius = Math.ceil(surfaceClip.subtract(centerClip).magnitude());
        var diameter = 2.0 * radius;

        return new Rectangle(Math.floor(centerClip.x) - radius,
                             Math.floor(centerClip.y) - radius,
                             diameter,
                             diameter);
    };

    CentralBody.prototype._computeDepthQuad = function(sceneState) {
        // PERFORMANCE_TODO: optimize diagonal matrix multiplies.
        var dInverse = Matrix3.createNonUniformScale(this._ellipsoid.getRadii());
        var d = Matrix3.createNonUniformScale(this._ellipsoid.getOneOverRadii());

        var p = sceneState.camera.getPositionWC();

        // Find the corresponding position in the scaled space of the ellipsoid.
        var q = d.multiplyWithVector(p);

        var qMagnitude = q.magnitude();
        var qUnit = q.normalize();

        // Determine the east and north directions at q.
        var eUnit = Cartesian3.UNIT_Z.cross(q).normalize();
        var nUnit = qUnit.cross(eUnit).normalize();

        // Determine the radius of the 'limb' of the ellipsoid.
        var wMagnitude = Math.sqrt(q.magnitudeSquared() - 1.0);

        // Compute the center and offsets.
        var center = qUnit.multiplyWithScalar(1.0 / qMagnitude);
        var scalar = wMagnitude / qMagnitude;
        var eastOffset = eUnit.multiplyWithScalar(scalar);
        var northOffset = nUnit.multiplyWithScalar(scalar);

        // A conservative measure for the longitudes would be to use the min/max longitudes of the bounding frustum.
        var upperLeft = dInverse.multiplyWithVector(center.add(northOffset).subtract(eastOffset));
        var upperRight = dInverse.multiplyWithVector(center.add(northOffset).add(eastOffset));
        var lowerLeft = dInverse.multiplyWithVector(center.subtract(northOffset).subtract(eastOffset));
        var lowerRight = dInverse.multiplyWithVector(center.subtract(northOffset).add(eastOffset));
        return [upperLeft.x, upperLeft.y, upperLeft.z, lowerLeft.x, lowerLeft.y, lowerLeft.z, upperRight.x, upperRight.y, upperRight.z, lowerRight.x, lowerRight.y, lowerRight.z];
    };

    CentralBody.prototype._computePoleQuad = function(sceneState, maxLat, maxGivenLat, viewProjMatrix, viewportTransformation) {
        var pt1 = this._ellipsoid.toCartesian(new Cartographic2(0.0, maxGivenLat));
        var pt2 = this._ellipsoid.toCartesian(new Cartographic2(Math.PI, maxGivenLat));
        var radius = pt1.subtract(pt2).magnitude() * 0.5;

        var center = this._ellipsoid.toCartesian(new Cartographic2(0.0, maxLat));

        var right;
        var dir = sceneState.camera.direction;
        if (1.0 - Cartesian3.UNIT_Z.negate().dot(dir) < CesiumMath.EPSILON6) {
            right = Cartesian3.UNIT_X;
        } else {
            right = dir.cross(Cartesian3.UNIT_Z).normalize();
        }

        var screenRight = center.add(right.multiplyWithScalar(radius));
        var screenUp = center.add(Cartesian3.UNIT_Z.cross(right).normalize().multiplyWithScalar(radius));

        center = Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, center);
        screenRight = Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, screenRight);
        screenUp = Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, screenUp);

        var halfWidth = Math.floor(Math.max(screenUp.subtract(center).magnitude(), screenRight.subtract(center).magnitude()));
        var halfHeight = halfWidth;

        return new Rectangle(Math.floor(center.x) - halfWidth,
                             Math.floor(center.y) - halfHeight,
                             halfWidth * 2.0,
                             halfHeight * 2.0);
    };

    CentralBody.prototype._getBaseLayer = function() {
        return this._imageLayers.get(0);
    };

    CentralBody.prototype._fillPoles = function(context, sceneState) {
        var baseLayer = this._getBaseLayer();
        if (typeof baseLayer === 'undefined' || sceneState.mode !== SceneMode.SCENE3D) {
            return;
        }

        var baseTileProvider = baseLayer.getTileProvider();
        if (!baseTileProvider.ready) {
            return;
        }
        var baseTileProviderMaxExtent = baseTileProvider.maxExtent;

        var viewProjMatrix = context.getUniformState().getViewProjection();
        var viewportTransformation = context.getUniformState().getViewportTransformation();
        var latitudeExtension = 0.05;

        var extent;
        var boundingVolume;
        var frustumCull;
        var occludeePoint;
        var occluded;
        var datatype;
        var mesh;
        var rect;
        var positions;
        var occluder = this._occluder;

        // handle north pole
        if (baseTileProviderMaxExtent.north < CesiumMath.PI_OVER_TWO) {
            extent = new Extent(-Math.PI,
                                baseTileProviderMaxExtent.north,
                                Math.PI,
                                CesiumMath.PI_OVER_TWO);
            boundingVolume = Extent.compute3DBoundingSphere(extent, this._ellipsoid);
            frustumCull = sceneState.camera.getVisibility(boundingVolume, BoundingSphere.planeSphereIntersect) === Intersect.OUTSIDE;
            occludeePoint = Extent.computeOccludeePoint(extent, this._ellipsoid).occludeePoint;
            occluded = (occludeePoint && !occluder.isVisible(new BoundingSphere(occludeePoint, 0.0))) || !occluder.isVisible(boundingVolume);

            this._drawNorthPole = !frustumCull && !occluded;
            if (this._drawNorthPole) {
                rect = this._computePoleQuad(sceneState, extent.north, extent.south - latitudeExtension, viewProjMatrix, viewportTransformation);
                positions = [
                    rect.x, rect.y,
                    rect.x + rect.width, rect.y,
                    rect.x + rect.width, rect.y + rect.height,
                    rect.x, rect.y + rect.height
                ];

                if (typeof this._vaNorthPole === 'undefined') {
                    mesh = {
                        attributes : {
                            position : {
                                componentDatatype : ComponentDatatype.FLOAT,
                                componentsPerAttribute : 2,
                                values : positions
                            }
                        }
                    };
                    this._vaNorthPole = context.createVertexArrayFromMesh({
                        mesh : mesh,
                        attributeIndices : {
                            position : 0
                        },
                        bufferUsage : BufferUsage.STREAM_DRAW
                    });
                } else {
                    datatype = ComponentDatatype.FLOAT;
                    this._vaNorthPole.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(positions));
                }
            }
        }

        // handle south pole
        if (baseTileProviderMaxExtent.south > -CesiumMath.PI_OVER_TWO) {
            extent = new Extent(-Math.PI,
                                -CesiumMath.PI_OVER_TWO,
                                Math.PI,
                                baseTileProviderMaxExtent.south);
            boundingVolume = Extent.compute3DBoundingSphere(extent, this._ellipsoid);
            frustumCull = sceneState.camera.getVisibility(boundingVolume, BoundingSphere.planeSphereIntersect) === Intersect.OUTSIDE;
            occludeePoint = Extent.computeOccludeePoint(extent, this._ellipsoid).occludeePoint;
            occluded = (occludeePoint && !occluder.isVisible(new BoundingSphere(occludeePoint, 0.0))) || !occluder.isVisible(boundingVolume);

            this._drawSouthPole = !frustumCull && !occluded;
            if (this._drawSouthPole) {
                rect = this._computePoleQuad(sceneState, extent.south, extent.north + latitudeExtension, viewProjMatrix, viewportTransformation);
                positions = [
                     rect.x, rect.y,
                     rect.x + rect.width, rect.y,
                     rect.x + rect.width, rect.y + rect.height,
                     rect.x, rect.y + rect.height
                 ];

                 if (typeof this._vaSouthPole === 'undefined') {
                     mesh = {
                         attributes : {
                             position : {
                                 componentDatatype : ComponentDatatype.FLOAT,
                                 componentsPerAttribute : 2,
                                 values : positions
                             }
                         }
                     };
                     this._vaSouthPole = context.createVertexArrayFromMesh({
                         mesh : mesh,
                         attributeIndices : {
                             position : 0
                         },
                         bufferUsage : BufferUsage.STREAM_DRAW
                     });
                 } else {
                     datatype = ComponentDatatype.FLOAT;
                     this._vaSouthPole.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(positions));
                 }
            }
        }

        var that = this;
        var drawUniforms = {
            u_fbTexture : function() {
                return that._fb.getColorTexture();
            },
            u_dayIntensity : function() {
                var baseLayer = that._getBaseLayer();
                if (typeof baseLayer !== 'undefined') {
                    var baseTileProvider = baseLayer.getTileProvider();
                    if (typeof baseTileProvider.getPoleIntensity === 'function') {
                        return baseTileProvider.getPoleIntensity();
                    }
                }
                return 0.0;
            }
        };

        if (typeof this._northPoleUniforms === 'undefined') {
            this._northPoleUniforms = combine(drawUniforms, this._drawUniforms, {
                u_color : function() {
                    return that.northPoleColor;
                }
            });
        }

        if (typeof this._southPoleUniforms === 'undefined') {
            this._southPoleUniforms = combine(drawUniforms, this._drawUniforms, {
                u_color : function() {
                    return that.southPoleColor;
                }
            });
        }
    };

    /**
     * @private
     */
    CentralBody.prototype.update = function(context, sceneState) {
        var width = context.getCanvas().clientWidth;
        var height = context.getCanvas().clientHeight;

        if (width === 0 || height === 0) {
            return;
        }

        var createFBO = !this._fb || this._fb.isDestroyed();
        var fboDimensionsChanged = this._fb && (this._fb.getColorTexture().getWidth() !== width || this._fb.getColorTexture().getHeight() !== height);

        if (createFBO || fboDimensionsChanged ||
            (!this._quadV || this._quadV.isDestroyed()) ||
            (!this._quadH || this._quadH.isDestroyed())) {

            this._fb = this._fb && this._fb.destroy();
            this._quadV = this._quadV && this._quadV.destroy();
            this._quadH = this._quadH && this._quadH.destroy();

            // create FBO and texture render targets
            this._fb = context.createFramebuffer({
                colorTexture : context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.RGBA
                })
            });

            // create viewport quad for vertical gaussian blur pass
            this._quadV = new ViewportQuad(new Rectangle(0.0, 0.0, width, height));
            this._quadV.vertexShader = '#define VERTICAL 1\n' + CentralBodyVSFilter;
            this._quadV.fragmentShader = CentralBodyFSFilter;
            this._quadV.uniforms.u_height = function() {
                return height;
            };
            this._quadV.setTexture(this._fb.getColorTexture());
            this._quadV.setDestroyTexture(false);
            this._quadV.setFramebuffer(context.createFramebuffer({
                colorTexture : context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.RGBA
                })
            }));
            this._quadV.setDestroyFramebuffer(true);

            // create viewport quad for horizontal gaussian blur pass
            this._quadH = new ViewportQuad(new Rectangle(0.0, 0.0, width, height));
            this._quadH.vertexShader = CentralBodyVSFilter;
            this._quadH.fragmentShader = CentralBodyFSFilter;
            this._quadH.uniforms.u_width = function() {
                return width;
            };
            this._quadH.setTexture(this._quadV.getFramebuffer().getColorTexture());
            this._quadH.setDestroyTexture(false);
        }

        this._quadV.update(context, sceneState);
        this._quadH.update(context, sceneState);

        var vs;
        var fs;
        var shaderCache = context.getShaderCache();

        if (this.showSkyAtmosphere && !this._vaSky) {
            // PERFORMANCE_IDEA:  Is 60 the right amount to tessellate?  I think scaling the original
            // geometry in a vertex is a bad idea; at least, because it introduces a draw call per tile.
            var skyMesh = CubeMapEllipsoidTessellator.compute(new Ellipsoid(this._ellipsoid.getRadii().multiplyWithScalar(1.025)), 60);
            this._vaSky = context.createVertexArrayFromMesh({
                mesh : skyMesh,
                attributeIndices : MeshFilters.createAttributeIndices(skyMesh),
                bufferUsage : BufferUsage.STATIC_DRAW
            });

            vs = '#define SKY_FROM_SPACE \n' +
                 '#line 0 \n' +
                 SkyAtmosphereVS;

            fs = '#line 0\n' +
                 SkyAtmosphereFS;

            this._spSkyFromSpace = shaderCache.getShaderProgram(vs, fs);

            vs = '#define SKY_FROM_ATMOSPHERE' +
                 '#line 0 \n' +
                 SkyAtmosphereVS;

            this._spSkyFromAtmosphere = shaderCache.getShaderProgram(vs, fs);
            this._rsSky = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                }
            // TODO: revisit when multi-frustum/depth test is ready
            /*depthTest : {
                enabled : true
            },
            depthMask : false*/
            });
        }

        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        if (this._isModeTransition(this._mode, mode) || this._projection !== projection) {
            if (mode === SceneMode.SCENE3D) {
                this._rsColor = context.createRenderState({ // Write color, not depth
                    cull : {
                        enabled : true
                    }
                });
                this._rsDepth = context.createRenderState({ // Write depth, not color
                    cull : {
                        enabled : true
                    },
                    depthTest : {
                        enabled : true,
                        func : DepthFunction.ALWAYS
                    },
                    colorMask : {
                        red : false,
                        green : false,
                        blue : false,
                        alpha : false
                    }
                });
            } else {
                this._rsColor = context.createRenderState();
                this._rsDepth = context.createRenderState();
            }
        }

        // TODO: Wait until multi-frustum
        //this._rsColor.depthTest.enabled = (mode === SceneMode.MORPHING);  // Depth test during morph
        var cull = (mode === SceneMode.SCENE3D) || (mode === SceneMode.MORPHING);
        this._rsColor.cull.enabled = cull;
        this._rsDepth.cull.enabled = cull;

        // update scisor/depth plane
        var depthQuad = this._computeDepthQuad(sceneState);

        // TODO: re-enable scissorTest
        /*if (mode === SceneMode.SCENE3D) {
            var uniformState = context.getUniformState();
            var mvp = uniformState.getModelViewProjection();
            var scissorTest = {
                enabled : true,
                rectangle : this._createScissorRectangle({
                    quad : depthQuad,
                    modelViewProjection : mvp,
                    viewportTransformation : uniformState.getViewportTransformation()
                })
            };

            this._rsColor.scissorTest = scissorTest;
            this._rsDepth.scissorTest = scissorTest;
            this._quadV.renderState.scissorTest = scissorTest;
            this._quadH.renderState.scissorTest = scissorTest;
        }*/

        // depth plane
        if (!this._vaDepth) {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : depthQuad
                    }
                },
                indexLists : [{
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : [0, 1, 2, 2, 1, 3]
                }]
            };
            this._vaDepth = context.createVertexArrayFromMesh({
                mesh : mesh,
                attributeIndices : {
                    position : 0
                },
                bufferUsage : BufferUsage.DYNAMIC_DRAW
            });
        } else {
            var datatype = ComponentDatatype.FLOAT;
            this._vaDepth.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(depthQuad));
        }

        if (!this._spDepth) {
            this._spDepth = shaderCache.getShaderProgram(CentralBodyVSDepth, CentralBodyFSDepth, {
                position : 0
            });
        }

        var that = this;

        // Throw exception if there was a problem asynchronously loading an image.
        if (this._exception) {
            var message = this._exception;
            this._exception = undefined;
            throw new RuntimeError(message);
        }

        // PERFORMANCE_IDEA:  Once a texture is created, it is not destroyed if
        // the corresponding show flag is turned off.  This will waste memory
        // if a user loads every texture, then sets all the flags to false.

        if (this._nightImageSource !== this.nightImageSource) {
            this._nightImageSource = this.nightImageSource;

            var nightImage = new Image();
            nightImage.onload = function() {
                that._nightTexture = that._nightTexture && that._nightTexture.destroy();
                that._nightTexture = context.createTexture2D({
                    source : nightImage,
                    pixelFormat : PixelFormat.RGB
                });
            };
            nightImage.onerror = function() {
                that._exception = 'Could not load image: ' + this.src + '.';
            };
            nightImage.src = this.nightImageSource;
        }

        if (this._specularMapSource !== this.specularMapSource) {
            this._specularMapSource = this.specularMapSource;

            var specularImage = new Image();
            specularImage.onload = function() {
                that._specularTexture = that._specularTexture && that._specularTexture.destroy();
                that._specularTexture = context.createTexture2D({
                    source : specularImage,
                    pixelFormat : PixelFormat.LUMINANCE
                });
            };
            specularImage.onerror = function() {
                that._exception = 'Could not load image: ' + this.src + '.';
            };
            specularImage.src = this.specularMapSource;
        }

        if (this._cloudsMapSource !== this.cloudsMapSource) {
            this._cloudsMapSource = this.cloudsMapSource;

            var cloudsImage = new Image();
            cloudsImage.onload = function() {
                that._cloudsTexture = that._cloudsTexture && that._cloudsTexture.destroy();
                that._cloudsTexture = context.createTexture2D({
                    source : cloudsImage,
                    pixelFormat : PixelFormat.LUMINANCE
                });
            };
            cloudsImage.onerror = function() {
                that._exception = 'Could not load image: ' + this.src + '.';
            };
            cloudsImage.src = this.cloudsMapSource;
        }

        if (this._bumpMapSource !== this.bumpMapSource) {
            this._bumpMapSource = this.bumpMapSource;

            var bumpImage = new Image();
            bumpImage.onload = function() {
                that._bumpTexture = that._bumpTexture && that._bumpTexture.destroy();
                that._bumpTexture = context.createTexture2D({
                    source : bumpImage,
                    pixelFormat : PixelFormat.LUMINANCE
                });
            };
            bumpImage.onerror = function() {
                that._exception = 'Could not load image: ' + this.src + '.';
            };
            bumpImage.src = this.bumpMapSource;
        }

        var recompileShader = typeof this._sp === 'undefined' || typeof this._spPoles === 'undefined';

        var defineShowDay = this.showDay && this._imageLayers.getLength() > 0;
        if (this._defineShowDay !== defineShowDay) {
            recompileShader = true;
            this._defineShowDay = defineShowDay;
        }

        var defineShowNight = this.showNight && typeof this._nightTexture !== 'undefined';
        if (this._defineShowNight !== defineShowNight) {
            recompileShader = true;
            this._defineShowNight = defineShowNight;
        }

        var defineShowClouds = this.showClouds && typeof this._cloudsTexture !== 'undefined';
        if (this._defineShowClouds !== defineShowClouds) {
            recompileShader = true;
            this._defineShowClouds = defineShowClouds;
        }

        var defineShowCloudShadows = this.showCloudShadows && typeof this._cloudsTexture !== 'undefined';
        if (this._defineShowCloudShadows !== defineShowCloudShadows) {
            recompileShader = true;
            this._defineShowCloudShadows = defineShowCloudShadows;
        }

        var defineShowSpecular = this._showSpecular && typeof this._specularTexture !== 'undefined';
        if (this._defineShowSpecular !== defineShowSpecular) {
            recompileShader = true;
            this._defineShowSpecular = defineShowSpecular;
        }

        var defineShowBumps = this._showBumps && typeof this._bumpTexture !== 'undefined';
        if (this._defineShowBumps !== defineShowBumps) {
            recompileShader = true;
            this._defineShowBumps = defineShowBumps;
        }

        var defineShowTerminator = this.showTerminator;
        if (this._defineShowTerminator !== defineShowTerminator) {
            recompileShader = true;
            this._defineShowTerminator = defineShowTerminator;
        }

        var defineAffectedByLighting = this.affectedByLighting;
        if (this._defineAffectedByLighting !== defineAffectedByLighting) {
            recompileShader = true;
            this._defineAffectedByLighting = defineAffectedByLighting;
        }

        if (recompileShader) {
            var fsPrepend = '';

            if (defineShowDay) {
                fsPrepend += '#define SHOW_DAY 1\n';
            }
            if (defineShowNight) {
                fsPrepend += '#define SHOW_NIGHT 1\n';
            }
            if (defineShowClouds) {
                fsPrepend += '#define SHOW_CLOUDS 1\n';
            }
            if (defineShowCloudShadows) {
                fsPrepend += '#define SHOW_CLOUD_SHADOWS 1\n';
            }
            if (defineShowSpecular) {
                fsPrepend += '#define SHOW_SPECULAR 1\n';
            }
            if (defineShowBumps) {
                fsPrepend += '#define SHOW_BUMPS 1\n';
            }
            if (defineShowTerminator) {
                fsPrepend += '#define SHOW_TERMINATOR 1\n';
            }
            if (defineAffectedByLighting) {
                fsPrepend += '#define AFFECTED_BY_LIGHTING 1\n';
            }

            fsPrepend +=
                '#line 0\n' +
                CentralBodyFSCommon;

            vs =
                '#line 0\n' +
                GroundAtmosphere +
                '#line 0\n' +
                CentralBodyVS;

            fs =
                fsPrepend +
                '#line 0\n' +
                CentralBodyFS;

            var attributeIndices = this._attributeIndices;

            this._spWithoutAtmosphere = this._spWithoutAtmosphere && this._spWithoutAtmosphere.release();
            this._spWithoutAtmosphere = shaderCache.getShaderProgram(vs, fs, attributeIndices);

            var groundFromSpacePrepend =
                '#define SHOW_GROUND_ATMOSPHERE 1\n' +
                '#define SHOW_GROUND_ATMOSPHERE_FROM_SPACE 1\n';
            var groundFromSpaceVS = groundFromSpacePrepend + vs;
            var groundFromSpaceFS = groundFromSpacePrepend + fs;

            this._spGroundFromSpace = this._spGroundFromSpace && this._spGroundFromSpace.release();
            this._spGroundFromSpace = shaderCache.getShaderProgram(groundFromSpaceVS, groundFromSpaceFS, attributeIndices);

            var groundFromAtmospherePrepend =
                '#define SHOW_GROUND_ATMOSPHERE 1\n' +
                '#define SHOW_GROUND_ATMOSPHERE_FROM_ATMOSPHERE 1\n';
            var groundFromAtmosphereVS = groundFromAtmospherePrepend + vs;
            var groundFromAtmosphereFS = groundFromAtmospherePrepend + fs;

            this._spGroundFromAtmosphere = this._spGroundFromAtmosphere && this._spGroundFromAtmosphere.release();
            this._spGroundFromAtmosphere = shaderCache.getShaderProgram(groundFromAtmosphereVS, groundFromAtmosphereFS, attributeIndices);

            vs = CentralBodyVSPole;
            fs = fsPrepend + GroundAtmosphere + CentralBodyFSPole;

            this._spPolesWithoutAtmosphere = this._spPolesWithoutAtmosphere && this._spPolesWithoutAtmosphere.release();
            this._spPolesWithoutAtmosphere = shaderCache.getShaderProgram(vs, fs, attributeIndices);

            groundFromSpaceVS = groundFromSpacePrepend + vs;
            groundFromSpaceFS = groundFromSpacePrepend + fs;

            this._spPolesGroundFromSpace = this._spPolesGroundFromSpace && this._spPolesGroundFromSpace.release();
            this._spPolesGroundFromSpace = shaderCache.getShaderProgram(groundFromSpaceVS, groundFromSpaceFS, attributeIndices);

            groundFromAtmosphereVS = groundFromAtmospherePrepend + vs;
            groundFromAtmosphereFS = groundFromAtmospherePrepend + fs;

            this._spPolesGroundFromAtmosphere = this._spPolesGroundFromAtmosphere && this._spPolesGroundFromAtmosphere.release();
            this._spPolesGroundFromAtmosphere = shaderCache.getShaderProgram(groundFromAtmosphereVS, groundFromAtmosphereFS, attributeIndices);
        }

        var cameraPosition = sceneState.camera.getPositionWC();

        this._fCameraHeight2 = cameraPosition.magnitudeSquared();
        this._fCameraHeight = Math.sqrt(this._fCameraHeight2);

        if (this._fCameraHeight > this._outerRadius) {
            // Viewer in space
            this._spSky = this._spSkyFromSpace;
            if (this.showGroundAtmosphere) {
                this._sp = this._spGroundFromSpace;
                this._spPoles = this._spPolesGroundFromSpace;
            } else {
                this._sp = this._spWithoutAtmosphere;
                this._spPoles = this._spPolesWithoutAtmosphere;
            }
        } else {
            // after the camera passes the minimum height, there is no ground atmosphere effect
            var showAtmosphere = this._ellipsoid.toCartographic3(cameraPosition).height >= this._minGroundFromAtmosphereHeight;
            if (this.showGroundAtmosphere && showAtmosphere) {
                this._sp = this._spGroundFromAtmosphere;
                this._spPoles = this._spPolesGroundFromAtmosphere;
            } else {
                this._sp = this._spWithoutAtmosphere;
                this._spPoles = this._spPolesWithoutAtmosphere;
            }
            this._spSky = this._spSkyFromAtmosphere;
        }

        this._occluder.setCameraPosition(cameraPosition);

        // TODO: refactor
        this._fillPoles(context, sceneState);

        this._imageLayers.update(context, sceneState);

        this._mode = mode;
        this._projection = projection;
    };

    /**
     * DOC_TBA
     * @memberof CentralBody
     */
    CentralBody.prototype.render = function(context) {
        if (this.show) {
            // clear FBO
            context.clear(context.createClearState({
                framebuffer : this._fb,
                color : {
                    red : 0.0,
                    green : 0.0,
                    blue : 0.0,
                    alpha : 0.0
                }
            }));

            if (this.showSkyAtmosphere) {
                context.draw({
                    framebuffer : this._fb,
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._spSky,
                    uniformMap : this._drawUniforms,
                    vertexArray : this._vaSky,
                    renderState : this._rsSky
                });
            }

            this._imageLayers.render(context);

            // render quad with vertical gaussian blur with second-pass texture attached to FBO
            this._quadV.render(context);

            // render quad with horizontal gaussian blur
            this._quadH.render(context);

            // render quads to fill the poles
            if (this._mode === SceneMode.SCENE3D) {
                if (this._drawNorthPole) {
                    context.draw({
                        primitiveType : PrimitiveType.TRIANGLE_FAN,
                        shaderProgram : this._spPoles,
                        uniformMap : this._northPoleUniforms,
                        vertexArray : this._vaNorthPole,
                        renderState : this._rsColor
                    });
                }
                if (this._drawSouthPole) {
                    context.draw({
                        primitiveType : PrimitiveType.TRIANGLE_FAN,
                        shaderProgram : this._spPoles,
                        uniformMap : this._southPoleUniforms,
                        vertexArray : this._vaSouthPole,
                        renderState : this._rsColor
                    });
                }
            }

            // render depth plane
            if (this._mode === SceneMode.SCENE3D) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._spDepth,
                    vertexArray : this._vaDepth,
                    renderState : this._rsDepth
                });
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof CentralBody
     */
    CentralBody.prototype.renderForPick = function(context, framebuffer) {
        if (this.show) {
            if (this._mode === SceneMode.SCENE3D) {
                // Not actually pickable, but render depth-only so primitives on the backface
                // of the globe are not picked.
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._spDepth,
                    vertexArray : this._vaDepth,
                    renderState : this._rsDepth,
                    framebuffer : framebuffer
                });
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CentralBody
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see CentralBody#destroy
     */
    CentralBody.prototype.isDestroyed = function() {
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
     * @memberof CentralBody
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CentralBody#isDestroyed
     *
     * @example
     * centralBody = centralBody && centralBody.destroy();
     */
    CentralBody.prototype.destroy = function() {
        this._texturePool = this._texturePool && this._texturePool.destroy();
        this._tileCache = this._tileCache && this._tileCache.destroy();

        this._fb = this._fb && this._fb.destroy();
        this._quadV = this._quadV && this._quadV.destroy();
        this._quadH = this._quadH && this._quadH.destroy();

        this._vaNorthPole = this._vaNorthPole && this._vaNorthPole.destroy();
        this._vaSouthPole = this._vaSouthPole && this._vaSouthPole.destroy();

        this._spPolesWithoutAtmosphere = this._spPolesWithoutAtmosphere && this._spPolesWithoutAtmosphere.release();
        this._spPolesGroundFromSpace = this._spPolesGroundFromSpace && this._spPolesGroundFromSpace.release();
        this._spPolesGroundFromAtmosphere = this._spPolesGroundFromAtmosphere && this._spPolesGroundFromAtmosphere.release();

        this._spWithoutAtmosphere = this._spWithoutAtmosphere && this._spWithoutAtmosphere.release();
        this._spGroundFromSpace = this._spGroundFromSpace && this._spGroundFromSpace.release();
        this._spGroundFromAtmosphere = this._spGroundFromAtmosphere && this._spGroundFromAtmosphere.release();

        this._vaSky = this._vaSky && this._vaSky.destroy();
        this._spSkyFromSpace = this._spSkyFromSpace && this._spSkyFromSpace.release();
        this._spSkyFromAtmosphere = this._spSkyFromAtmosphere && this._spSkyFromAtmosphere.release();

        this._spDepth = this._spDepth && this._spDepth.release();
        this._vaDepth = this._vaDepth && this._vaDepth.destroy();

        this._nightTexture = this._nightTexture && this._nightTexture.destroy();
        this._specularTexture = this._specularTexture && this._specularTexture.destroy();
        this._cloudsTexture = this._cloudsTexture && this._cloudsTexture.destroy();
        this._bumpTexture = this._bumpTexture && this._bumpTexture.destroy();

        return destroyObject(this);
    };

    return CentralBody;
});
