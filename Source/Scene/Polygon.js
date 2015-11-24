/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/Math',
        '../Core/PolygonGeometry',
        './EllipsoidSurfaceAppearance',
        './Material',
        './Primitive'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        GeometryInstance,
        CesiumMath,
        PolygonGeometry,
        EllipsoidSurfaceAppearance,
        Material,
        Primitive) {
    "use strict";

    /**
     * A renderable polygon or hierarchy of polygons.
     *
     * @alias Polygon
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid that the polygon is drawn on.
     * @param {Cartesian3[]} [options.positions] The cartesian positions of the polygon.
     * @param {Object} [options.polygonHierarchy] An object defining the vertex positions of each nested polygon as defined in {@link Polygon#configureFromPolygonHierarchy}.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude in the underlying geometry.
     * @param {Number} [options.height=0.0] The height, in meters, that the rectangle is raised above the {@link Polygon#ellipsoid}.
     * @param {Number} [options.textureRotationAngle=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Material} [options.material] The surface appearance of the primitive.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if the primitive's commands' bounding spheres are shown.
     *
     * @exception {DeveloperError} Either options.positions or options.polygonHierarchy can be provided, but not both.
     * @exception {DeveloperError} When options.positions is provided, at least three positions are required.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polygons.html|Cesium Sandcastle Polygons Demo}
     *
     * @example
     * // Example 1
     * var polygon = new Cesium.Polygon({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     0.0, 0.0,
     *     10.0, 0.0,
     *     0.0, 10.0
     *   ])
     * });
     *
     * @example
     * // Example 2
     * var polygon = new Cesium.Polygon();
     * polygon.material.uniforms.color = {
     *   red   : 1.0,
     *   green : 0.0,
     *   blue  : 0.0,
     *   alpha : 1.0
     * };
     * polygon.positions = Cesium.Cartesian3.fromDegreesArray([
     *     0.0, 0.0,
     *     10.0, 0.0,
     *     0.0, 10.0
     * ]);
     *
     * @deprecated
     * @private
     */
    var Polygon = function(options) {
        deprecationWarning('Polygon', 'Polygon has been deprecated.  Use PolygonGeometry or Entity.polygon instead.');

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
         * @type {Material}
         * @default Material.fromType(Material.ColorType)
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * polygon.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * polygon.material = Cesium.Material.fromType(Cesium.Material.StripeType);
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
         * Draws the bounding sphere for each draw command in the primitive.
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

        //>>includeStart('debug', pragmas.debug);
        if (defined(options.positions) && defined(options.polygonHierarchy)) {
            throw new DeveloperError('Either options.positions or options.polygonHierarchy can be provided, but not both.');
        }
        //>>includeEnd('debug');

        if (defined(options.positions)) {
            this.positions = options.positions;
        } else if (defined(options.polygonHierarchy)) {
            this.configureFromPolygonHierarchy(options.polygonHierarchy);
        }
    };

    defineProperties(Polygon.prototype, {
        /**
         * Gets or sets positions that define the boundary of the polygon.
         * @memberof Polygon.prototype
         * @type {Cartesian3[]}
         * @example
         * polygon.positions = Cesium.Cartesian3.fromDegreesArray([
         *     0.0, 0.0,
         *     10.0, 0.0,
         *     0.0, 10.0
         * ]);
         */
        positions: {
            get : function() {
                return this._positions;
            },
            set : function(positions) {
                // positions can be undefined

                //>>includeStart('debug', pragmas.debug);
                if (defined(positions) && (positions.length < 3)) {
                    throw new DeveloperError('At least three positions are required.');
                }
                //>>includeEnd('debug');

                this._positions = positions;
                this._polygonHierarchy = undefined;
                this._createPrimitive = true;
            }
        }
    });

    /**
     * Create a set of polygons with holes from a nested hierarchy.
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
     *     new Cesium.Cartesian3(-634066.5629045101, -4608738.034138676, 4348640.761750969),
     *     new Cesium.Cartesian3(-1321523.0597310204, -5108871.981065817, 3570395.2500986718),
     *     new Cesium.Cartesian3(46839.74837473363, -5303481.972379478, 3530933.5841716)
     *   ],
     *   holes : [{
     *     positions :[
     *       new Cesium.Cartesian3(-646079.44483647, -4811233.11175887, 4123187.2266941597),
     *       new Cesium.Cartesian3(-1024015.4454943262, -5072141.413164587, 3716492.6173834214),
     *       new Cesium.Cartesian3(-234678.22583880965, -5189078.820849883, 3688809.059214336)
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
    Polygon.prototype.update = function(frameState) {
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
        primitive.update(frameState);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * polygon = polygon && polygon.destroy();
     *
     * @see Polygon#isDestroyed
     */
    Polygon.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Polygon;
});
