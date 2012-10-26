/*global define*/
define([
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/ComponentDatatype',
        '../Core/CubeMapEllipsoidTessellator',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/GeographicProjection',
        '../Core/Intersect',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/Occluder',
        '../Core/PrimitiveType',
        '../Core/RuntimeError',
        '../Core/Transforms',
        '../Renderer/BufferUsage',
        '../Renderer/ClearCommand',
        '../Renderer/CommandLists',
        '../Renderer/CullFace',
        '../Renderer/DepthFunction',
        '../Renderer/DrawCommand',
        '../Renderer/PixelFormat',
        './CentralBodySurface',
        './CentralBodySurfaceShaderSet',
        './EllipsoidTerrainProvider',
        './ImageryLayerCollection',
        './SceneMode',
        './ViewportQuad',
        '../Shaders/GroundAtmosphere',
        '../Shaders/CentralBodyFS',
        '../Shaders/CentralBodyFSCommon',
        '../Shaders/CentralBodyFSDepth',
        '../Shaders/CentralBodyFSPole',
        '../Shaders/CentralBodyVS',
        '../Shaders/CentralBodyVSDepth',
        '../Shaders/CentralBodyVSPole',
        '../Shaders/SkyAtmosphereFS',
        '../Shaders/SkyAtmosphereVS'
    ], function(
        combine,
        defaultValue,
        destroyObject,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        ComponentDatatype,
        CubeMapEllipsoidTessellator,
        Ellipsoid,
        Extent,
        GeographicProjection,
        Intersect,
        CesiumMath,
        Matrix4,
        MeshFilters,
        Occluder,
        PrimitiveType,
        RuntimeError,
        Transforms,
        BufferUsage,
        ClearCommand,
        CommandLists,
        CullFace,
        DepthFunction,
        DrawCommand,
        PixelFormat,
        CentralBodySurface,
        CentralBodySurfaceShaderSet,
        EllipsoidTerrainProvider,
        ImageryLayerCollection,
        SceneMode,
        ViewportQuad,
        GroundAtmosphere,
        CentralBodyFS,
        CentralBodyFSCommon,
        CentralBodyFSDepth,
        CentralBodyFSPole,
        CentralBodyVS,
        CentralBodyVSDepth,
        CentralBodyVSPole,
        SkyAtmosphereFS,
        SkyAtmosphereVS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CentralBody
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] Determines the size and shape of the
     * central body.
     */
    var CentralBody = function(ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var terrainProvider = new EllipsoidTerrainProvider({ellipsoid : ellipsoid});
        var imageryLayerCollection = new ImageryLayerCollection();

        this._ellipsoid = ellipsoid;
        this._imageryLayerCollection = imageryLayerCollection;
        this._surface = new CentralBodySurface({
            terrainProvider : terrainProvider,
            imageryLayerCollection : imageryLayerCollection
        });

        this._occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMinimumRadius()), Cartesian3.ZERO);

        this._activeSurfaceShaderSet = undefined;

        this._surfaceShaderSetWithoutAtmosphere = new CentralBodySurfaceShaderSet(attributeIndices);
        this._surfaceShaderSetGroundFromSpace = new CentralBodySurfaceShaderSet(attributeIndices);
        this._surfaceShaderSetGroundFromAtmosphere = new CentralBodySurfaceShaderSet(attributeIndices);

        this._rsColor = undefined;
        this._rsColorWithoutDepthTest = undefined;

        this._spSkyFromSpace = undefined;
        this._spSkyFromAtmosphere = undefined;

        this._skyCommand = new DrawCommand();
        this._skyCommand.primitiveType = PrimitiveType.TRIANGLES;
        // this._skyCommand.shaderProgram references sky-from-space or sky-from-atmosphere

        this._clearDepthCommand = new ClearCommand();

        this._depthCommand = new DrawCommand();
        this._depthCommand.primitiveType = PrimitiveType.TRIANGLES;
        this._depthCommand.boundingVolume = new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMaximumRadius());

        this._northPoleCommand = new DrawCommand();
        this._northPoleCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._southPoleCommand = new DrawCommand();
        this._southPoleCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;

        // this._northPoleCommand.shaderProgram and this.southPoleCommand.shaderProgram reference
        // without-atmosphere, ground-from-space, or ground-from-atmosphere
        this._spPolesWithoutAtmosphere = undefined;
        this._spPolesGroundFromSpace = undefined;
        this._spPolesGroundFromAtmosphere = undefined;

        this._drawNorthPole = false;
        this._drawSouthPole = false;

        this._commandLists = new CommandLists();

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
         * The offset, relative to the bottom left corner of the viewport,
         * where the logo for terrain and imagery providers will be drawn.
         *
         * @type {Cartesian2}
         */
        this.logoOffset = Cartesian2.ZERO;
        this._logoOffset = this.logoOffset;
        this._logos = [];
        this._logoQuad = undefined;

        /**
         * Determines if the central body will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        /**
         * Determines if the ground atmosphere will be shown.
         *
         * @type {Boolean}
         * @default false
         */
        this.showGroundAtmosphere = false;

        /**
         * Determines if the sky atmosphere will be shown.
         *
         * @type {Boolean}
         * @default false
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
         *
         * @default true
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
         * When <code>true</code>, textures from the imagery layer collection are shown on the central body.
         * <br /><br />
         * <div align='center'>
         * <img src='../images/CentralBody.showDay.jpg' width='400' height='300' />
         * </div>
         *
         * @type {Boolean}
         *
         * @see CentralBody#showNight
         *
         * @default true
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
         * @default true
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
         * @default true
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
         * @default true
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
         * @default true
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
         * @default true
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
         *
         * @default false
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
         * @default 0.5
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
         * @default 0.05
         *
         * @example
         * cb.showDay = true;
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
         *
         * @default 2.0
         */
        this.nightIntensity = 2.0;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         *
         * @default 1.0
         */
        this.morphTime = 1.0;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        this._fCameraHeight = undefined;
        this._fCameraHeight2 = undefined;
        this._outerRadius = ellipsoid.getRadii().multiplyByScalar(1.025).getMaximumComponent();

        // TODO: Do we want to expose any of these atmosphere constants?
        var Kr = 0.0025;
        var Kr4PI = Kr * 4.0 * Math.PI;
        var Km = 0.0015;
        var Km4PI = Km * 4.0 * Math.PI;
        var ESun = 15.0;
        var g = -0.95;
        var innerRadius = ellipsoid.getMaximumRadius();
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
            u_mode : function() {
                return that._mode;
            },
            u_morphTime : function() {
                return that.morphTime;
            }
        };

        // PERFORMANCE_IDEA:  Only combine these if showing the atmosphere.  Maybe this is too much of a micro-optimization.
        // http://jsperf.com/object-property-access-propcount
        this._drawUniforms = combine([uniforms, atmosphereUniforms], false, false);
        this._skyCommand.uniformMap = this._drawUniforms;
    };

    var attributeIndices = {
        position3D : 0,
        textureCoordinates : 1
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
    CentralBody.prototype.getImageryLayers = function() {
        return this._imageryLayerCollection;
    };

    CentralBody.prototype._computeDepthQuad = function(frameState) {
        var radii = this._ellipsoid.getRadii();
        var p = frameState.camera.getPositionWC();

        // Find the corresponding position in the scaled space of the ellipsoid.
        var q = this._ellipsoid.getOneOverRadii().multiplyComponents(p);

        var qMagnitude = q.magnitude();
        var qUnit = q.normalize();

        // Determine the east and north directions at q.
        var eUnit = Cartesian3.UNIT_Z.cross(q).normalize();
        var nUnit = qUnit.cross(eUnit).normalize();

        // Determine the radius of the 'limb' of the ellipsoid.
        var wMagnitude = Math.sqrt(q.magnitudeSquared() - 1.0);

        // Compute the center and offsets.
        var center = qUnit.multiplyByScalar(1.0 / qMagnitude);
        var scalar = wMagnitude / qMagnitude;
        var eastOffset = eUnit.multiplyByScalar(scalar);
        var northOffset = nUnit.multiplyByScalar(scalar);

        // A conservative measure for the longitudes would be to use the min/max longitudes of the bounding frustum.
        var upperLeft = radii.multiplyComponents(center.add(northOffset).subtract(eastOffset));
        var upperRight = radii.multiplyComponents(center.add(northOffset).add(eastOffset));
        var lowerLeft = radii.multiplyComponents(center.subtract(northOffset).subtract(eastOffset));
        var lowerRight = radii.multiplyComponents(center.subtract(northOffset).add(eastOffset));
        return [upperLeft.x, upperLeft.y, upperLeft.z, lowerLeft.x, lowerLeft.y, lowerLeft.z, upperRight.x, upperRight.y, upperRight.z, lowerRight.x, lowerRight.y, lowerRight.z];
    };

    CentralBody.prototype._computePoleQuad = function(frameState, maxLat, maxGivenLat, viewProjMatrix, viewportTransformation) {
        var pt1 = this._ellipsoid.cartographicToCartesian(new Cartographic(0.0, maxGivenLat));
        var pt2 = this._ellipsoid.cartographicToCartesian(new Cartographic(Math.PI, maxGivenLat));
        var radius = pt1.subtract(pt2).magnitude() * 0.5;

        var center = this._ellipsoid.cartographicToCartesian(new Cartographic(0.0, maxLat));

        var right;
        var dir = frameState.camera.direction;
        if (1.0 - Cartesian3.UNIT_Z.negate().dot(dir) < CesiumMath.EPSILON6) {
            right = Cartesian3.UNIT_X;
        } else {
            right = dir.cross(Cartesian3.UNIT_Z).normalize();
        }

        var screenRight = center.add(right.multiplyByScalar(radius));
        var screenUp = center.add(Cartesian3.UNIT_Z.cross(right).normalize().multiplyByScalar(radius));

        Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, center, center);
        Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, screenRight, screenRight);
        Transforms.pointToWindowCoordinates(viewProjMatrix, viewportTransformation, screenUp, screenUp);

        var halfWidth = Math.floor(Math.max(screenUp.subtract(center).magnitude(), screenRight.subtract(center).magnitude()));
        var halfHeight = halfWidth;

        return new BoundingRectangle(
                Math.floor(center.x) - halfWidth,
                Math.floor(center.y) - halfHeight,
                halfWidth * 2.0,
                halfHeight * 2.0);
    };

    var viewportScratch = new BoundingRectangle();
    var vpTransformScratch = new Matrix4();
    CentralBody.prototype._fillPoles = function(context, frameState) {
        var terrainProvider = this._surface._terrainProvider;
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        if (!terrainProvider.ready) {
            return;
        }
        var terrainMaxExtent = terrainProvider.tilingScheme.getExtent();

        var viewProjMatrix = context.getUniformState().getViewProjection();
        var viewport = viewportScratch;
        viewport.width = context.getCanvas().clientWidth;
        viewport.height = context.getCanvas().clientHeight;
        var viewportTransformation = Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, vpTransformScratch);
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
        if (terrainMaxExtent.north < CesiumMath.PI_OVER_TWO) {
            extent = new Extent(
                -Math.PI,
                terrainMaxExtent.north,
                Math.PI,
                CesiumMath.PI_OVER_TWO
            );
            boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
            frustumCull = frameState.cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE;
            occludeePoint = Occluder.computeOccludeePointFromExtent(extent, this._ellipsoid);
            occluded = (occludeePoint && !occluder.isPointVisible(occludeePoint, 0.0)) || !occluder.isBoundingSphereVisible(boundingVolume);

            this._drawNorthPole = !frustumCull && !occluded;
            if (this._drawNorthPole) {
                rect = this._computePoleQuad(frameState, extent.north, extent.south - latitudeExtension, viewProjMatrix, viewportTransformation);
                positions = [
                    rect.x, rect.y,
                    rect.x + rect.width, rect.y,
                    rect.x + rect.width, rect.y + rect.height,
                    rect.x, rect.y + rect.height
                ];

                if (typeof this._northPoleCommand.vertexArray === 'undefined') {
                    this._northPoleCommand.boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
                    mesh = {
                        attributes : {
                            position : {
                                componentDatatype : ComponentDatatype.FLOAT,
                                componentsPerAttribute : 2,
                                values : positions
                            }
                        }
                    };
                    this._northPoleCommand.vertexArray = context.createVertexArrayFromMesh({
                        mesh : mesh,
                        attributeIndices : {
                            position : 0
                        },
                        bufferUsage : BufferUsage.STREAM_DRAW
                    });
                } else {
                    datatype = ComponentDatatype.FLOAT;
                    this._northPoleCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(positions));
                }
            }
        }

        // handle south pole
        if (terrainMaxExtent.south > -CesiumMath.PI_OVER_TWO) {
            extent = new Extent(
                -Math.PI,
                -CesiumMath.PI_OVER_TWO,
                Math.PI,
                terrainMaxExtent.south
            );
            boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
            frustumCull = frameState.cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE;
            occludeePoint = Occluder.computeOccludeePointFromExtent(extent, this._ellipsoid);
            occluded = (occludeePoint && !occluder.isPointVisible(occludeePoint)) || !occluder.isBoundingSphereVisible(boundingVolume);

            this._drawSouthPole = !frustumCull && !occluded;
            if (this._drawSouthPole) {
                rect = this._computePoleQuad(frameState, extent.south, extent.north + latitudeExtension, viewProjMatrix, viewportTransformation);
                positions = [
                     rect.x, rect.y,
                     rect.x + rect.width, rect.y,
                     rect.x + rect.width, rect.y + rect.height,
                     rect.x, rect.y + rect.height
                 ];

                 if (typeof this._southPoleCommand.vertexArray === 'undefined') {
                     this._southPoleCommand.boundingVolume = BoundingSphere.fromExtent3D(extent, this._ellipsoid);
                     mesh = {
                         attributes : {
                             position : {
                                 componentDatatype : ComponentDatatype.FLOAT,
                                 componentsPerAttribute : 2,
                                 values : positions
                             }
                         }
                     };
                     this._southPoleCommand.vertexArray = context.createVertexArrayFromMesh({
                         mesh : mesh,
                         attributeIndices : {
                             position : 0
                         },
                         bufferUsage : BufferUsage.STREAM_DRAW
                     });
                 } else {
                     datatype = ComponentDatatype.FLOAT;
                     this._southPoleCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(positions));
                 }
            }
        }

        var poleIntensity = 0.0;
        var baseLayer = this._imageryLayerCollection.getLength() > 0 ? this._imageryLayerCollection.get(0) : undefined;
        if (typeof baseLayer !== 'undefined' && typeof baseLayer.getImageryProvider() !== 'undefined' && typeof baseLayer.getImageryProvider().getPoleIntensity !== 'undefined') {
            poleIntensity = baseLayer.getImageryProvider().getPoleIntensity();
        }

        var drawUniforms = {
            u_dayIntensity : function() {
                return poleIntensity;
            }
        };

        var that = this;
        if (typeof this._northPoleCommand.uniformMap === 'undefined') {
            var northPoleUniforms = combine([drawUniforms, {
                u_color : function() {
                    return that.northPoleColor;
                }
            }], false, false);
            this._northPoleCommand.uniformMap = combine([northPoleUniforms, this._drawUniforms], false, false);
        }

        if (typeof this._southPoleCommand.uniformMap === 'undefined') {
            var southPoleUniforms = combine([drawUniforms, {
                u_color : function() {
                    return that.southPoleColor;
                }
            }], false, false);
            this._southPoleCommand.uniformMap = combine([southPoleUniforms, this._drawUniforms], false, false);
        }
    };

    /**
     * @private
     */
    CentralBody.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        var width = context.getCanvas().clientWidth;
        var height = context.getCanvas().clientHeight;

        if (width === 0 || height === 0) {
            return;
        }

        var vs;
        var fs;
        var shaderCache = context.getShaderCache();

        if (this.showSkyAtmosphere && !this._skyCommand.vertexArray) {
            // PERFORMANCE_IDEA:  Is 60 the right amount to tessellate?  I think scaling the original
            // geometry in a vertex is a bad idea; at least, because it introduces a draw call per tile.
            var skyMesh = CubeMapEllipsoidTessellator.compute(Ellipsoid.fromCartesian3(this._ellipsoid.getRadii().multiplyByScalar(1.025)), 60);
            this._skyCommand.vertexArray = context.createVertexArrayFromMesh({
                mesh : skyMesh,
                attributeIndices : MeshFilters.createAttributeIndices(skyMesh),
                bufferUsage : BufferUsage.STATIC_DRAW
            });

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
            this._skyCommand.renderState = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                depthTest : {
                    enabled : true
                },
                depthMask : false
            });
            this._skyCommand.boundingVolume = new BoundingSphere(Cartesian3.ZERO, this._ellipsoid.getMaximumRadius() * 1.025);
        }

        var mode = frameState.mode;
        var projection = frameState.scene2D.projection;
        var modeChanged = false;

        if (this._mode !== mode || typeof this._rsColor === 'undefined') {
            modeChanged = true;
            if (mode === SceneMode.SCENE3D) {
                this._rsColor = context.createRenderState({ // Write color and depth
                    cull : {
                        enabled : true
                    },
                    depthTest : {
                        enabled : true
                    }
                });
                this._rsColorWithoutDepthTest = context.createRenderState({ // Write color, not depth
                    cull : {
                        enabled : true
                    }
                });
                this._depthCommand.renderState = context.createRenderState({ // Write depth, not color
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
                this._clearDepthCommand.clearState = context.createClearState({ // Clear depth only
                    depth : 1.0,
                    stencil : 0.0
                });
            } else {
                this._rsColor = context.createRenderState();
                this._rsColorWithoutDepthTest = context.createRenderState();
                this._depthCommand.renderState = context.createRenderState();
            }
        }

        var cull = (mode === SceneMode.SCENE3D) || (mode === SceneMode.MORPHING);
        this._rsColor.cull.enabled = cull;
        this._rsColorWithoutDepthTest.cull.enabled = cull;
        this._depthCommand.renderState.cull.enabled = cull;

        this._northPoleCommand.renderState = this._rsColorWithoutDepthTest;
        this._southPoleCommand.renderState = this._rsColorWithoutDepthTest;

        // update depth plane
        var depthQuad = this._computeDepthQuad(frameState);

        // depth plane
        if (!this._depthCommand.vertexArray) {
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
            this._depthCommand.vertexArray = context.createVertexArrayFromMesh({
                mesh : mesh,
                attributeIndices : {
                    position : 0
                },
                bufferUsage : BufferUsage.DYNAMIC_DRAW
            });
        } else {
            var datatype = ComponentDatatype.FLOAT;
            this._depthCommand.vertexArray.getAttribute(0).vertexBuffer.copyFromArrayView(datatype.toTypedArray(depthQuad));
        }

        if (!this._depthCommand.shaderProgram) {
            this._depthCommand.shaderProgram = shaderCache.getShaderProgram(
                    CentralBodyVSDepth,
                    '#line 0\n' +
                    CentralBodyFSDepth, {
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

        // Initial compile or re-compile if uber-shader parameters changed
        var dayChanged = ((this._showDay !== this.showDay) && (!this.showDay || this._imageryLayerCollection.getLength() > 0));
        var nightChanged = ((this._showNight !== this.showNight) && (!this.showNight || this._nightTexture));
        var cloudsChanged = ((this._showClouds !== this.showClouds) && (!this.showClouds || this._cloudsTexture));
        var cloudShadowsChanged = ((this._showCloudShadows !== this.showCloudShadows) && (!this.showCloudShadows || this._cloudsTexture));
        var specularChanged = ((this._showSpecular !== this.showSpecular) && (!this.showSpecular || this._specularTexture));
        var bumpsChanged = ((this._showBumps !== this.showBumps) && (!this.showBumps || this._bumpTexture));
        var projectionChanged = this._projection !== projection;

        if (typeof this._activeSurfaceShaderSet === 'undefined' ||
            typeof this._northPoleCommand.shaderProgram === 'undefined' ||
            typeof this._southPoleCommand.shaderProgram === 'undefined' ||
            modeChanged || projectionChanged || dayChanged || nightChanged || cloudsChanged || cloudShadowsChanged || specularChanged || bumpsChanged ||
            this._showTerminator !== this.showTerminator ||
            this._affectedByLighting !== this.affectedByLighting) {

            var fsPrepend = ((this.showDay && this._imageryLayerCollection.getLength() > 0) ? '#define SHOW_DAY 1\n' : '') +
                ((this.showNight && this._nightTexture) ? '#define SHOW_NIGHT 1\n' : '') +
                ((this.showClouds && this._cloudsTexture) ? '#define SHOW_CLOUDS 1\n' : '') +
                ((this.showCloudShadows && this._cloudsTexture) ? '#define SHOW_CLOUD_SHADOWS 1\n' : '') +
                ((this.showSpecular && this._specularTexture) ? '#define SHOW_SPECULAR 1\n' : '') +
                ((this.showBumps && this._bumpTexture) ? '#define SHOW_BUMPS 1\n' : '') +
                (this.showTerminator ? '#define SHOW_TERMINATOR 1\n' : '') +
                (this.affectedByLighting ? '#define AFFECTED_BY_LIGHTING 1\n' : '') +
                '#line 0\n' +
                CentralBodyFSCommon;

            var getPosition3DMode = 'vec4 getPosition(vec3 position3DWC) { return getPosition3DMode(position3DWC); }';
            var getPosition2DMode = 'vec4 getPosition(vec3 position3DWC) { return getPosition2DMode(position3DWC); }';
            var getPositionColumbusViewMode = 'vec4 getPosition(vec3 position3DWC) { return getPositionColumbusViewMode(position3DWC); }';
            var getPositionMorphingMode = 'vec4 getPosition(vec3 position3DWC) { return getPositionMorphingMode(position3DWC); }';

            var getPositionMode;

            switch (mode) {
            case SceneMode.SCENE3D:
                getPositionMode = getPosition3DMode;
                break;
            case SceneMode.SCENE2D:
                getPositionMode = getPosition2DMode;
                break;
            case SceneMode.COLUMBUS_VIEW:
                getPositionMode = getPositionColumbusViewMode;
                break;
            case SceneMode.MORPHING:
                getPositionMode = getPositionMorphingMode;
                break;
            }

            var get2DYPositionFractionGeographicProjection = 'float get2DYPositionFraction() { return get2DGeographicYPositionFraction(); }';
            var get2DYPositionFractionMercatorProjection = 'float get2DYPositionFraction() { return get2DMercatorYPositionFraction(); }';

            var get2DYPositionFraction;

            if (projection instanceof GeographicProjection) {
                get2DYPositionFraction = get2DYPositionFractionGeographicProjection;
            } else {
                get2DYPositionFraction = get2DYPositionFractionMercatorProjection;
            }

            this._surfaceShaderSetWithoutAtmosphere.baseVertexShaderString =
                '#line 0\n' +
                 GroundAtmosphere +
                '#line 0\n' +
                 CentralBodyVS + '\n' +
                 getPositionMode + '\n' +
                 get2DYPositionFraction;
            this._surfaceShaderSetWithoutAtmosphere.baseFragmentShaderString =
                fsPrepend +
                '#line 0\n' +
                CentralBodyFS;
            this._surfaceShaderSetWithoutAtmosphere.invalidateShaders();

            var groundFromSpacePrepend =
                '#define SHOW_GROUND_ATMOSPHERE 1\n' +
                '#define SHOW_GROUND_ATMOSPHERE_FROM_SPACE 1\n';
            this._surfaceShaderSetGroundFromSpace.baseVertexShaderString =
                groundFromSpacePrepend +
                this._surfaceShaderSetWithoutAtmosphere.baseVertexShaderString;
            this._surfaceShaderSetGroundFromSpace.baseFragmentShaderString =
                groundFromSpacePrepend +
                this._surfaceShaderSetWithoutAtmosphere.baseFragmentShaderString;
            this._surfaceShaderSetGroundFromSpace.invalidateShaders();

            var groundFromAtmospherePrepend =
                '#define SHOW_GROUND_ATMOSPHERE 1\n' +
                '#define SHOW_GROUND_ATMOSPHERE_FROM_ATMOSPHERE 1\n';
            this._surfaceShaderSetGroundFromAtmosphere.baseVertexShaderString =
                groundFromAtmospherePrepend +
                this._surfaceShaderSetWithoutAtmosphere.baseVertexShaderString;
            this._surfaceShaderSetGroundFromAtmosphere.baseFragmentShaderString =
                groundFromAtmospherePrepend +
                this._surfaceShaderSetWithoutAtmosphere.baseFragmentShaderString;
            this._surfaceShaderSetWithoutAtmosphere.invalidateShaders();

            vs = CentralBodyVSPole;
            fs = fsPrepend + GroundAtmosphere + CentralBodyFSPole;

            this._spPolesWithoutAtmosphere = this._spPolesWithoutAtmosphere && this._spPolesWithoutAtmosphere.release();
            this._spPolesGroundFromSpace = this._spPolesGroundFromSpace && this._spPolesGroundFromSpace.release();
            this._spPolesGroundFromAtmosphere = this._spPolesGroundFromAtmosphere && this._spPolesGroundFromAtmosphere.release();

            this._spPolesWithoutAtmosphere = shaderCache.getShaderProgram(vs, fs, attributeIndices);
            this._spPolesGroundFromSpace = shaderCache.getShaderProgram(
                    vs,
                    groundFromSpacePrepend + fs,
                    attributeIndices);
            this._spPolesGroundFromAtmosphere = shaderCache.getShaderProgram(
                    vs,
                    groundFromAtmospherePrepend + fs,
                    attributeIndices);

            // Sync to public state
            this._showDay = dayChanged ? this.showDay : this._showDay;
            this._showNight = nightChanged ? this.showNight : this._showNight;
            this._showClouds = cloudsChanged ? this.showClouds : this._showClouds;
            this._showCloudShadows = cloudShadowsChanged ? this.showCloudShadows : this._showCloudShadows;
            this._showSpecular = specularChanged ? this.showSpecular : this._showSpecular;
            this._showBumps = bumpsChanged ? this.showBumps : this._showBumps;
            this._showTerminator = this.showTerminator;
            this._affectedByLighting = this.affectedByLighting;
        }

        var cameraPosition = frameState.camera.getPositionWC();

        this._fCameraHeight2 = cameraPosition.magnitudeSquared();
        this._fCameraHeight = Math.sqrt(this._fCameraHeight2);

        if (this._fCameraHeight > this._outerRadius) {
            // Viewer in space
            this._skyCommand.shaderProgram = this._spSkyFromSpace;
            if (this.showGroundAtmosphere) {
                this._activeSurfaceShaderSet = this._surfaceShaderSetGroundFromSpace;

                this._northPoleCommand.shaderProgram = this._spPolesGroundFromSpace;
                this._southPoleCommand.shaderProgram = this._spPolesGroundFromSpace;
            } else {
                this._activeSurfaceShaderSet = this._surfaceShaderSetWithoutAtmosphere;

                this._northPoleCommand.shaderProgram = this._spPolesWithoutAtmosphere;
                this._southPoleCommand.shaderProgram = this._spPolesWithoutAtmosphere;
            }
        } else {
            // after the camera passes the minimum height, there is no ground atmosphere effect
            var showAtmosphere = this._ellipsoid.cartesianToCartographic(cameraPosition).height >= this._minGroundFromAtmosphereHeight;
            if (this.showGroundAtmosphere && showAtmosphere) {
                this._activeSurfaceShaderSet = this._surfaceShaderSetGroundFromAtmosphere;

                this._northPoleCommand.shaderProgram = this._spPolesGroundFromAtmosphere;
                this._southPoleCommand.shaderProgram = this._spPolesGroundFromAtmosphere;
            } else {
                this._activeSurfaceShaderSet = this._surfaceShaderSetWithoutAtmosphere;

                this._northPoleCommand.shaderProgram = this._spPolesWithoutAtmosphere;
                this._southPoleCommand.shaderProgram = this._spPolesWithoutAtmosphere;
            }
            this._skyCommand.shaderProgram = this._spSkyFromAtmosphere;
        }

        this._occluder.setCameraPosition(cameraPosition);

        this._fillPoles(context, frameState);

        this._mode = mode;
        this._projection = projection;

        var pass = frameState.passes;
        var commandLists = this._commandLists;
        commandLists.removeAll();

        if (pass.color) {
            var colorCommandList = commandLists.colorList;

            // render quads to fill the poles
            if (mode === SceneMode.SCENE3D) {
                if (this._drawNorthPole) {
                    colorCommandList.push(this._northPoleCommand);
                }

                if (this._drawSouthPole) {
                    colorCommandList.push(this._southPoleCommand);
                }
            }

            this._surface.update(context,
                    frameState,
                    colorCommandList,
                    this._drawUniforms,
                    this._activeSurfaceShaderSet,
                    this._rsColor,
                    this._mode,
                    this._projection);

            updateLogos(this, context, frameState, commandList);

            // render depth plane
            if (mode === SceneMode.SCENE3D) {
                colorCommandList.push(this._depthCommand);
            }

            if (this.showSkyAtmosphere) {
                colorCommandList.push(this._skyCommand);
            }
        }

        if (pass.pick) {
            // Not actually pickable, but render depth-only so primitives on the backface
            // of the globe are not picked.
            commandLists.pickList.push(this._depthCommand);
        }

        if (!commandLists.empty()) {
            commandList.push(commandLists);
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
        this._northPoleCommand.vertexArray = this._northPoleCommand.vertexArray && this._northPoleCommand.vertexArray.destroy();
        this._southPoleCommand.vertexArray = this._southPoleCommand.vertexArray && this._southPoleCommand.vertexArray.destroy();

        this._surfaceShaderSetWithoutAtmosphere = this._surfaceShaderSetWithoutAtmosphere && this._surfaceShaderSetWithoutAtmosphere.destroy();
        this._surfaceShaderSetGroundFromSpace = this._surfaceShaderSetGroundFromSpace && this._surfaceShaderSetGroundFromSpace.destroy();
        this._surfaceShaderSetGroundFromAtmosphere = this._surfaceShaderSetGroundFromAtmosphere && this._surfaceShaderSetGroundFromAtmosphere.destroy();

        this._spPolesWithoutAtmosphere = this._spPolesWithoutAtmosphere && this._spPolesWithoutAtmosphere.release();
        this._spPolesGroundFromSpace = this._spPolesGroundFromSpace && this._spPolesGroundFromSpace.release();
        this._spPolesGroundFromAtmosphere = this._spPolesGroundFromAtmosphere && this._spPolesGroundFromAtmosphere.release();

        this._spWithoutAtmosphere = this._spWithoutAtmosphere && this._spWithoutAtmosphere.release();
        this._spGroundFromSpace = this._spGroundFromSpace && this._spGroundFromSpace.release();
        this._spGroundFromAtmosphere = this._spGroundFromAtmosphere && this._spGroundFromAtmosphere.release();

        this._skyCommand.vertexArray = this._skyCommand.vertexArray && this._skyCommand.vertexArray.destroy();
        this._spSkyFromSpace = this._spSkyFromSpace && this._spSkyFromSpace.release();
        this._spSkyFromAtmosphere = this._spSkyFromAtmosphere && this._spSkyFromAtmosphere.release();

        this._depthCommand.shaderProgram = this._depthCommand.shaderProgram && this._depthCommand.shaderProgram.release();
        this._depthCommand.vertexArray = this._depthCommand.vertexArray && this._depthCommand.vertexArray.destroy();

        this._nightTexture = this._nightTexture && this._nightTexture.destroy();
        this._specularTexture = this._specularTexture && this._specularTexture.destroy();
        this._cloudsTexture = this._cloudsTexture && this._cloudsTexture.destroy();
        this._bumpTexture = this._bumpTexture && this._bumpTexture.destroy();

        this._surface = this._surface && this._surface.destroy();

        return destroyObject(this);
    };

    var logoData = {
        logos : undefined,
        logoIndex : 0,
        rebuildLogo : false,
        totalLogoWidth : 0,
        totalLogoHeight : 0
    };

    function updateLogos(centralBody, context, frameState, commandList) {
        logoData.logos = centralBody._logos;
        logoData.logoIndex = 0;
        logoData.rebuildLogo = false;
        logoData.totalLogoWidth = 0;
        logoData.totalLogoHeight = 0;

        checkLogo(logoData, centralBody._surface._terrainProvider);

        var imageryLayerCollection = centralBody._imageryLayerCollection;
        for ( var i = 0, len = imageryLayerCollection.getLength(); i < len; ++i) {
            var layer = imageryLayerCollection.get(i);
            if (layer.show) {
                checkLogo(logoData, layer.getImageryProvider());
            }
        }

        if (logoData.logos.length !== logoData.logoIndex) {
            logoData.rebuildLogo = true;
            logoData.logos.length = logoData.logoIndex;
        }

        if (logoData.rebuildLogo) {
            var width = logoData.totalLogoWidth;
            var height = logoData.totalLogoHeight;
            var logoRectangle = new BoundingRectangle(centralBody.logoOffset.x, centralBody.logoOffset.y, width, height);
            if (typeof centralBody._logoQuad === 'undefined') {
                centralBody._logoQuad = new ViewportQuad(logoRectangle);
                centralBody._logoQuad.enableBlending = true;
            } else {
                centralBody._logoQuad.setRectangle(logoRectangle);
            }

            var texture = centralBody._logoQuad.getTexture();
            if (typeof texture === 'undefined' || texture.getWidth() !== width || texture.getHeight() !== height) {
                if (width === 0 || height === 0) {
                    if (typeof texture !== 'undefined') {
                        centralBody._logoQuad.destroy();
                        centralBody._logoQuad = undefined;
                    }
                } else {
                    texture = context.createTexture2D({
                        width : width,
                        height : height
                    });
                    centralBody._logoQuad.setTexture(texture);
                }
            }

            var heightOffset = 0;
            for (i = 0, len = logoData.logos.length; i < len; i++) {
                var logo = logoData.logos[i];
                if (typeof logo !== 'undefined') {
                    texture.copyFrom(logo, 0, heightOffset);
                    heightOffset += logo.height + 2;
                }
            }
        }

        if (typeof centralBody._logoQuad !== 'undefined') {
            centralBody._logoQuad.update(context, frameState, commandList);
        }
    }

    function checkLogo(logoData, logoSource) {
        if (typeof logoSource.isReady === 'function' && !logoSource.isReady()) {
            return;
        }

        var logo;
        if (typeof logoSource.getLogo === 'function') {
            logo = logoSource.getLogo();
        } else {
            logo = undefined;
        }

        if (logoData.logos[logoData.logoIndex] !== logo) {
            logoData.rebuildLogo = true;
            logoData.logos[logoData.logoIndex] = logo;
        }
        logoData.logoIndex++;

        if (typeof logo !== 'undefined') {
            logoData.totalLogoWidth = Math.max(logoData.totalLogoWidth, logo.width);
            logoData.totalLogoHeight += logo.height + 2;
        }
    }

    return CentralBody;
});
