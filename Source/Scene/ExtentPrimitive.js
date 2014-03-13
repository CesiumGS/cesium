/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Extent',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/ExtentGeometry',
        './EllipsoidSurfaceAppearance',
        './Primitive',
        './Material'
    ], function(
        DeveloperError,
        defaultValue,
        defined,
        Color,
        destroyObject,
        CesiumMath,
        Extent,
        Ellipsoid,
        GeometryInstance,
        ExtentGeometry,
        EllipsoidSurfaceAppearance,
        Primitive,
        Material) {
    "use strict";

    /**
     * A renderable rectangular extent.
     *
     * @alias ExtentPrimitive
     * @constructor
     *
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that the extent is drawn on.
     * @param {Extent} [options.extent=undefined] The extent, which defines the rectangular region to draw.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude in the underlying geometry.
     * @param {Number} [options.height=0.0] The height, in meters, that the extent is raised above the {@link ExtentPrimitive#ellipsoid}.
     * @param {Number} [options.rotation=0.0] The angle, in radians, relative to north that the extent is rotated.  Positive angles rotate counter-clockwise.
     * @param {Number} [options.textureRotationAngle=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Material} [options.material=undefined] The surface appearance of the primitive.
     * @param {Object} [options.id=undefined] A user-defined object to return when the instance is picked with {@link Scene#pick}
     * @param {Boolean} [options.asynchronous=true] Determines if the extent will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if the primitive's commands' bounding spheres are shown.
     *
     * @example
     * var extentPrimitive = new Cesium.ExtentPrimitive({
     *   extent : Cesium.Extent.fromDegrees(0.0, 20.0, 10.0, 30.0)
     * });
     * primitives.add(extentPrimitive);
     */
    var ExtentPrimitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The ellipsoid that the extent is drawn on.
         *
         * @type Ellipsoid
         *
         * @default Ellipsoid.WGS84
         */
        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._ellipsoid = undefined;

        /**
         * The extent, which defines the rectangular region to draw.
         *
         * @type Extent
         *
         * @default undefined
         */
        this.extent = Extent.clone(options.extent);
        this._extent = undefined;

        /**
         * The distance, in radians, between each latitude and longitude in the underlying geometry.
         * A lower granularity fits the curvature of the {@link ExtentPrimitive#ellipsoid} better,
         * but uses more triangles.
         *
         * @type Number
         *
         * @default CesiumMath.RADIANS_PER_DEGREE
         */
        this.granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._granularity = undefined;

        /**
         * The height, in meters, that the extent is raised above the {@link ExtentPrimitive#ellipsoid}.
         *
         * @type Number
         *
         * @default 0.0
         */
        this.height = defaultValue(options.height, 0.0);
        this._height = undefined;

        /**
         * The angle, in radians, relative to north that the extent is rotated.
         * Positive angles rotate counter-clockwise.
         *
         * @type Number
         *
         * @default 0.0
         */
        this.rotation = defaultValue(options.rotation, 0.0);
        this._rotation = undefined;

        /**
         * The angle, in radians, relative to north that the primitive's texture is rotated.
         * Positive angles rotate counter-clockwise.
         *
         * @type Number
         *
         * @default 0.0
         */
        this.textureRotationAngle = defaultValue(options.textureRotationAngle, 0.0);
        this._textureRotationAngle = undefined;

        /**
         * Determines if this primitive will be shown.
         *
         * @type Boolean
         *
         * @default true
         */
        this.show = defaultValue(options.show, true);

        var material = Material.fromType(Material.ColorType, {
            color : new Color(1.0, 1.0, 0.0, 0.5)
        });

        /**
         * The surface appearance of the primitive.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type Material
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * extent.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * extent.material = Cesium.Material.fromType(Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = defaultValue(options.material, material);

        /**
         * User-defined object returned when the extent is picked.
         *
         * @type Object
         *
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;
        this._id = undefined;

        /**
         * Determines if the geometry instances will be created and batched on
         * a web worker.
         *
         * @type Boolean
         *
         * @default true
         */
        this.asynchronous = defaultValue(options.asynchronous, true);

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the bounding sphere for each {@link DrawCommand} in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        this._primitive = undefined;
    };

    /**
     * @private
     */
    ExtentPrimitive.prototype.update = function(context, frameState, commandList) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(this.ellipsoid)) {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }
        if (!defined(this.material)) {
            throw new DeveloperError('this.material must be defined.');
        }
        if (this.granularity < 0.0) {
            throw new DeveloperError('this.granularity and scene2D/scene3D overrides must be greater than zero.');
        }
        //>>includeEnd('debug');

        if (!this.show || (!defined(this.extent))) {
            return;
        }

        if (!Extent.equals(this._extent, this.extent) ||
            (this._ellipsoid !== this.ellipsoid) ||
            (this._granularity !== this.granularity) ||
            (this._height !== this.height) ||
            (this._rotation !== this.rotation) ||
            (this._textureRotationAngle !== this.textureRotationAngle) ||
            (this._id !== this.id)) {

            this._extent = Extent.clone(this.extent, this._extent);
            this._ellipsoid = this.ellipsoid;
            this._granularity = this.granularity;
            this._height = this.height;
            this._rotation = this.rotation;
            this._textureRotationAngle = this.textureRotationAngle;
            this._id = this.id;

            var instance = new GeometryInstance({
                geometry : new ExtentGeometry({
                    extent : this.extent,
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    ellipsoid : this.ellipsoid,
                    granularity : this.granularity,
                    height : this.height,
                    rotation : this.rotation,
                    stRotation : this.textureRotationAngle
                }),
                id : this.id,
                pickPrimitive : this
            });

            if (defined(this._primitive)) {
                this._primitive.destroy();
            }

            this._primitive = new Primitive({
                geometryInstances : instance,
                appearance : new EllipsoidSurfaceAppearance({
                    aboveGround : (this.height > 0.0)
                }),
                asynchronous : this.asynchronous
            });
        }

        var primitive = this._primitive;
        primitive.appearance.material = this.material;
        primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        primitive.update(context, frameState, commandList);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Extent
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Extent#destroy
     */
    ExtentPrimitive.prototype.isDestroyed = function() {
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
     * @memberof Extent
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Extent#isDestroyed
     *
     * @example
     * extent = extent && extent.destroy();
     */
    ExtentPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return ExtentPrimitive;
});
