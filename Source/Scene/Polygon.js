/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/PolygonGeometry',
        '../Core/Queue',
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
        Ellipsoid,
        GeometryInstance,
        PolygonGeometry,
        Queue,
        EllipsoidSurfaceAppearance,
        Primitive,
        Material) {
    "use strict";

    /**
     * A renderable polygon or hierarchy of polygons.
     *
     * @alias Polygon
     * @constructor
     *
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that the polygon is drawn on.
     * @param {Array} [options.positions=undefined] The cartesian positions of the polygon.
     * @param {Object} [options.polygonHierarchy=undefined] An object defining the vertex positions of each nested polygon as defined in {@link Polygon#configureFromPolygonHierarchy}.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude in the underlying geometry.
     * @param {Number} [options.height=0.0] The height, in meters, that the extent is raised above the {@link ExtentPrimitive#ellipsoid}.
     * @param {Number} [options.textureRotationAngle=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Material} [options.material=undefined] The surface appearance of the primitive.
     * @param {Object} [options.id=undefined] A user-defined object to return when the instance is picked with {@link Scene#pick}
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if the primitive's commands' bounding spheres are shown.
     *
     * @exception {DeveloperError} Either options.positions or options.polygonHierarchy can be provided, but not both.
     * @exception {DeveloperError} When options.positions is provided, at least three positions are required.
     *
     * @example
     * // Example 1
     * var polygon = new Polygon({
     *   positions : [
     *     ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *     ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *     ellipsoid.cartographicToCartesian(new Cartographic(...))
     *   ]
     * });
     *
     * // Example 2
     * var polygon = new Polygon();
     * polygon.material.uniforms.color = {
     *   red   : 1.0,
     *   green : 0.0,
     *   blue  : 0.0,
     *   alpha : 1.0
     * };
     * polygon.setPositions([
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...))
     * ]);
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Polygons.html">Cesium Sandcastle Polygons Demo</a>
     */
    var Polygon = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The ellipsoid that the polygon is drawn on.
         *
         * @type Ellipsoid
         *
         * @default Ellipsoid.WGS84
         */
        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._ellipsoid = undefined;

        /**
         * The distance, in radians, between each latitude and longitude in the underlying geometry.
         * A lower granularity fits the curvature of the {@link Polygon#ellipsoid} better,
         * but uses more triangles.
         *
         * @type Number
         *
         * @default CesiumMath.RADIANS_PER_DEGREE
         */
        this.granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._granularity = undefined;

        /**
         * The height, in meters, that the polygon is raised above the {@link Polygon#ellipsoid}.
         *
         * @type Number
         *
         * @default 0.0
         */
        this.height = defaultValue(options.height, 0.0);
        this._height = undefined;

        /**
         * The angle, in radians, relative to north that the polygon's texture is rotated.
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
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        var material = Material.fromType(Material.ColorType);
        material.uniforms.color = new Color(1.0, 1.0, 0.0, 0.5);

        /**
         * The surface appearance of the primitive.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type {Material}
         * @default Material.fromType(Material.ColorType)
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * polygon.material.uniforms.color = new Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * polygon.material = Material.fromType( Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = defaultValue(options.material, material);

        /**
         * User-defined object returned when the polygon is picked.
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
         * Draws the bounding sphere for each {@see DrawCommand} in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        this._positions = undefined;
        this._polygonHierarchy = undefined;
        this._createPrimitive = false;
        this._primitive = undefined;

        if (defined(options.positions) && defined(options.polygonHierarchy)) {
            throw new DeveloperError('Either options.positions or options.polygonHierarchy can be provided, but not both.');
        } else if (defined(options.positions)) {
            this.setPositions(options.positions);
        } else if (defined(options.polygonHierarchy)) {
            this.configureFromPolygonHierarchy(options.polygonHierarchy);
        }
    };

    /**
     * Returns the positions that define the boundary of the polygon.  If {@link Polygon#configureFromPolygonHierarchy}
     * was used, this returns <code>undefined</code>.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#setPositions
     */
    Polygon.prototype.getPositions = function() {
        return this._positions;
    };

    /**
     * Sets positions that define the boundary of the polygon.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#getPositions
     *
     * @param {Array} positions The cartesian positions of the polygon.
     *
     * @example
     * polygon.setPositions([
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...))
     * ]);
     */
    Polygon.prototype.setPositions = function(positions) {
        // positions can be undefined
        if (defined(positions) && (positions.length < 3)) {
            throw new DeveloperError('At least three positions are required.');
        }
        this._positions = positions;
        this._polygonHierarchy = undefined;
        this._createPrimitive = true;
    };

    /**
     * Create a set of polygons with holes from a nested hierarchy.
     *
     * @memberof Polygon
     *
     * @param {Object} hierarchy An object defining the vertex positions of each nested polygon.
     * For example, the following polygon has two holes, and one hole has a hole. <code>holes</code> is optional.
     * Leaf nodes only have <code>positions</code>.
     * <pre>
     * <code>
     * {
     *  positions : [ ... ],    // The polygon's outer boundary
     *  holes : [               // The polygon's inner holes
     *    {
     *      positions : [ ... ]
     *    },
     *    {
     *      positions : [ ... ],
     *      holes : [           // A polygon within a hole
     *       {
     *         positions : [ ... ]
     *       }
     *      ]
     *    }
     *  ]
     * }
     * </code>
     * </pre>
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * // A triangle within a triangle
     * var hierarchy = {
     *   positions : [
     *     new Cartesian3(-634066.5629045101, -4608738.034138676, 4348640.761750969),
     *     new Cartesian3(-1321523.0597310204, -5108871.981065817, 3570395.2500986718),
     *     new Cartesian3(46839.74837473363, -5303481.972379478, 3530933.5841716)
     *   ],
     *   holes : [{
     *     positions :[
     *       new Cartesian3(-646079.44483647, -4811233.11175887, 4123187.2266941597),
     *       new Cartesian3(-1024015.4454943262, -5072141.413164587, 3716492.6173834214),
     *       new Cartesian3(-234678.22583880965, -5189078.820849883, 3688809.059214336)
     *     ]
     *   }]
     * };
     */
    Polygon.prototype.configureFromPolygonHierarchy  = function(hierarchy) {
        this._positions = undefined;
        this._polygonHierarchy = hierarchy;
        this._createPrimitive = true;
    };

    /**
     * @private
     */
    Polygon.prototype.update = function(context, frameState, commandList) {
        if (!defined(this.ellipsoid)) {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }

        if (!defined(this.material)) {
            throw new DeveloperError('this.material must be defined.');
        }

        if (this.granularity < 0.0) {
            throw new DeveloperError('this.granularity and scene2D/scene3D overrides must be greater than zero.');
        }

        if (!this.show) {
            return;
        }

        if (!this._createPrimitive && (!defined(this._primitive))) {
            // No positions/hierarchy to draw
            return;
        }

        if (this._createPrimitive ||
            (this._ellipsoid !== this.ellipsoid) ||
            (this._granularity !== this.granularity) ||
            (this._height !== this.height) ||
            (this._textureRotationAngle !== this.textureRotationAngle) ||
            (this._id !== this.id)) {

            this._createPrimitive = false;
            this._ellipsoid = this.ellipsoid;
            this._granularity = this.granularity;
            this._height = this.height;
            this._textureRotationAngle = this.textureRotationAngle;
            this._id = this.id;

            this._primitive = this._primitive && this._primitive.destroy();

            if (!defined(this._positions) && !defined(this._polygonHierarchy)) {
                return;
            }

            var instance;
            if (defined(this._positions)) {
                instance = new GeometryInstance({
                    geometry : PolygonGeometry.fromPositions({
                        positions : this._positions,
                        height : this.height,
                        vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                        stRotation : this.textureRotationAngle,
                        ellipsoid : this.ellipsoid,
                        granularity : this.granularity
                    }),
                    id : this.id,
                    pickPrimitive : this
                });
            } else {
                instance = new GeometryInstance({
                    geometry : new PolygonGeometry({
                        polygonHierarchy : this._polygonHierarchy,
                        height : this.height,
                        vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                        stRotation : this.textureRotationAngle,
                        ellipsoid : this.ellipsoid,
                        granularity : this.granularity
                    }),
                    id : this.id,
                    pickPrimitive : this
                });
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
        primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        primitive.appearance.material = this.material;
        primitive.update(context, frameState, commandList);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Polygon
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Polygon#destroy
     */
    Polygon.prototype.isDestroyed = function() {
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
     * @memberof Polygon
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#isDestroyed
     *
     * @example
     * polygon = polygon && polygon.destroy();
     */
    Polygon.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Polygon;
});
