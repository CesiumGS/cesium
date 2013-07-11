/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
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
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid that the extent is drawn on.
     * @param {Extent} [extent=undefined] The extent, which defines the rectangular region to draw.
     * @param {Number} [granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude in the underlying geometry.
     * @param {Number} [height=0.0] The height, in meters, that the extent is raised above the {@link ExtentPrimitive#ellipsoid}.
     * @param {Number} [rotation=0.0] The angle, in radians, relative to north that the extent is rotated.  Positive angles rotate counter-clockwise.
     * @param {Boolean} [show=true] Determines if this primitive will be shown.
     * @param {Material} [material=undefined] The surface appearance of the primitive.
     *
     * @example
     * var extentPrimitive = new ExtentPrimitive({
     *   extent : Extent.fromDegrees(0.0, 20.0, 10.0, 30.0)
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
         * Determines if this primitive will be shown.
         *
         * @type Boolean
         *
         * @default true
         */
        this.show = defaultValue(options.show, true);

        var material = Material.fromType(undefined, Material.ColorType);
        material.uniforms.color = new Color(1.0, 1.0, 0.0, 0.5);

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
         * extent.material.uniforms.color = new Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * extent.material = Material.fromType(scene.getContext(), Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = defaultValue(options.material, material);

        this._primitive = undefined;
    };

    /**
     * @private
     */
    ExtentPrimitive.prototype.update = function(context, frameState, commandList) {
        if (typeof this.ellipsoid === 'undefined') {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        if (this.granularity < 0.0) {
            throw new DeveloperError('this.granularity and scene2D/scene3D overrides must be greater than zero.');
        }

        if (!this.show || (typeof this.extent === 'undefined')) {
            return;
        }

        if (!Extent.equals(this._extent, this.extent) ||
            (this._ellipsoid !== this.ellipsoid) ||
            (this._granularity !== this.granularity) ||
            (this._height !== this.height) ||
            (this._rotation !== this.rotation)) {

            this._extent = Extent.clone(this.extent, this._extent);
            this._ellipsoid = this.ellipsoid;
            this._granularity = this.granularity;
            this._height = this.height;
            this._rotation = this.rotation;

            var instance = new GeometryInstance({
                geometry : new ExtentGeometry({
                    extent : this.extent,
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    ellipsoid : this.ellipsoid,
                    granularity : this.granularity,
                    height : this.height,
                    rotation : this.rotation
                }),
                id : this
            });

            if (typeof this._primitive !== 'undefined') {
                this._primitive.destroy();
            }

            this._primitive = new Primitive({
                geometryInstances : instance,
                appearance : new EllipsoidSurfaceAppearance({
                    aboveGround : (this.height > 0.0)
                })
            });
        }

        this._primitive.appearance.material = this.material;
        this._primitive.update(context, frameState, commandList);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Extent
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
     * @return {undefined}
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
