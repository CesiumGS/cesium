/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/Math',
        '../Core/Rectangle',
        '../Core/RectangleGeometry',
        './EllipsoidSurfaceAppearance',
        './Material',
        './Primitive'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        GeometryInstance,
        CesiumMath,
        Rectangle,
        RectangleGeometry,
        EllipsoidSurfaceAppearance,
        Material,
        Primitive) {
    "use strict";

    /**
     * A renderable rectangle.
     *
     * @alias RectanglePrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that the rectangle is drawn on.
     * @param {Rectangle} [options.rectangle] The rectangle, which defines the rectangular region to draw.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude in the underlying geometry.
     * @param {Number} [options.height=0.0] The height, in meters, that the rectangle is raised above the {@link RectanglePrimitive#ellipsoid}.
     * @param {Number} [options.rotation=0.0] The angle, in radians, relative to north that the rectangle is rotated.  Positive angles rotate counter-clockwise.
     * @param {Number} [options.textureRotationAngle=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Material} [options.material] The surface appearance of the primitive.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}
     * @param {Boolean} [options.asynchronous=true] Determines if the rectangle will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if the primitive's commands' bounding spheres are shown.
     *
     * @example
     * var rectanglePrimitive = new Cesium.RectanglePrimitive({
     *   rectangle : Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0)
     * });
     * primitives.add(rectanglePrimitive);
     */
    var RectanglePrimitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The ellipsoid that the rectangle is drawn on.
         *
         * @type Ellipsoid
         *
         * @default Ellipsoid.WGS84
         */
        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._ellipsoid = undefined;

        /**
         * The rectangle, which defines the rectangular region to draw.
         *
         * @type Rectangle
         *
         * @default undefined
         */
        this.rectangle = Rectangle.clone(options.rectangle);
        this._rectangle = undefined;

        /**
         * The distance, in radians, between each latitude and longitude in the underlying geometry.
         * A lower granularity fits the curvature of the {@link RectanglePrimitive#ellipsoid} better,
         * but uses more triangles.
         *
         * @type Number
         *
         * @default CesiumMath.RADIANS_PER_DEGREE
         */
        this.granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._granularity = undefined;

        /**
         * The height, in meters, that the rectangle is raised above the {@link RectanglePrimitive#ellipsoid}.
         *
         * @type Number
         *
         * @default 0.0
         */
        this.height = defaultValue(options.height, 0.0);
        this._height = undefined;

        /**
         * The angle, in radians, relative to north that the rectangle is rotated.
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
         * {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type Material
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * rectangle.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * rectangle.material = Cesium.Material.fromType(Material.StripeType);
         */
        this.material = defaultValue(options.material, material);

        /**
         * User-defined object returned when the rectangle is picked.
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
         * Draws the bounding sphere for each draw command in the primitive.
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
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} this.ellipsoid must be defined.
     * @exception {DeveloperError} this.material must be defined.
     * @exception {DeveloperError} this.granularity must be defined.
     */
    RectanglePrimitive.prototype.update = function(context, frameState, commandList) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(this.ellipsoid)) {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }
        if (!defined(this.material)) {
            throw new DeveloperError('this.material must be defined.');
        }
        if (this.granularity < 0.0) {
            throw new DeveloperError('this.granularity must be greater than zero.');
        }
        //>>includeEnd('debug');

        if (!this.show || (!defined(this.rectangle))) {
            return;
        }

        if (!Rectangle.equals(this._rectangle, this.rectangle) ||
            (this._ellipsoid !== this.ellipsoid) ||
            (this._granularity !== this.granularity) ||
            (this._height !== this.height) ||
            (this._rotation !== this.rotation) ||
            (this._textureRotationAngle !== this.textureRotationAngle) ||
            (this._id !== this.id)) {

            this._rectangle = Rectangle.clone(this.rectangle, this._rectangle);
            this._ellipsoid = this.ellipsoid;
            this._granularity = this.granularity;
            this._height = this.height;
            this._rotation = this.rotation;
            this._textureRotationAngle = this.textureRotationAngle;
            this._id = this.id;

            var instance = new GeometryInstance({
                geometry : new RectangleGeometry({
                    rectangle : this.rectangle,
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
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Rectangle#destroy
     */
    RectanglePrimitive.prototype.isDestroyed = function() {
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
     * @example
     * rectangle = rectangle && rectangle.destroy();
     *
     * @see Rectangle#isDestroyed
     */
    RectanglePrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return RectanglePrimitive;
});
