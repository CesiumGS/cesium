/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeometryAttribute',
        './GeometryIndices',
        './Matrix4',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        GeometryAttribute,
        GeometryIndices,
        Matrix4,
        PrimitiveType,
        VertexFormat) {
    "use strict";

    var scratchCartographic = new Cartographic();
    var scratchCartesian3Position = new Cartesian3();

    /**
     * Creates a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     * The points in the wall can be offset by supplied terrain elevation data.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {String} altitudeMode 'absolute' means the height is treated from the WGS84 ellipsoid.
     *        'relativeToGround' means they are treated relative to the supplied terrain data.
     * @param {Array} [terrain] Required if <code>altitudeMode</code> is 'relativeToGround'.
     *        Has to denote the same points as in positions, with the ground elevation reflecting the terrain elevation.
     * @param {Number} [top] The top of the wall. If specified, the top of the wall is treated as this
     *        height, and the information in the positions array is disregarded.
     * @param {Number} [bottom] The bottom of the wall. If specified, the bottom of the wall is treated as
     *        this height. Otherwise, its treated as 'ground' (the WGS84 ellipsoid height 0).
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Matrix4} [options.modelMatrix] The model matrix for this geometry.
     * @param {Color} [options.color] The color of the geometry when a per-geometry color appearance is used.
     * @param {DOC_TBA} [options.pickData] DOC_TBA
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     * @exception {DeveloperError} positions is required
     * @exception {DeveloperError} No terrain supplied when required.
     * @exception {DeveloperError} Coordinates and terrain points don't match in number
     *
     * @example
     *
     *  var positions = [
     *      Cesium.Cartographic.fromDegrees(19.0, 47.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(19.0, 48.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(20.0, 48.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(20.0, 47.0, 10000.0),
     *      Cesium.Cartographic.fromDegrees(19.0, 47.0, 10000.0)
     *  ];
     *
     *  // create a wall that spans from ground level to 10000 meters
     *  var wall = new Cesium.WallGeometry({
     *      altitudeMode : 'absolute',
     *      positions    : ellipsoid.cartographicArrayToCartesianArray(positions)
     *  });
     *
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var altitudeMode = options.altitudeMode;
        var terrain = options.terrain;
        var top = options.top;
        var bottom = options.bottom;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        if (typeof wallPositions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (altitudeMode === 'relativeToGround' && typeof terrain === 'undefined') {
            throw new DeveloperError('No terrain supplied when required.');
        }

        if (typeof terrain !== 'undefined' && terrain.length !== wallPositions.length) {
            throw new DeveloperError('Coordinates and terrain points don\'t match in number');
        }

        var i;
        var j;

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        var positions = new Array(wallPositions.length * 6);
        for (i = 0, j = 0; i < wallPositions.length; ++i) {
            var c = ellipsoid.cartesianToCartographic(wallPositions[i], scratchCartographic);
            var origHeight = c.height;
            c.height = 0.0;

            var terrainHeight = 0.0;
            if (terrain !== undefined) {
                var h = terrain[i].height;
                if (!isNaN(h)) {
                    terrainHeight = h;
                }
            }

            if (bottom !== undefined) {
                c.height = bottom;
            } else {
                c.height += terrainHeight;
            }

            var v = ellipsoid.cartographicToCartesian(c, scratchCartesian3Position);

            // insert the lower point
            positions[j++] = v.x;
            positions[j++] = v.y;
            positions[j++] = v.z;

            // get the original height back, or set the top value
            c.height = (top === undefined) ? origHeight : top;
            c.height += terrainHeight;
            v = ellipsoid.cartographicToCartesian(c, scratchCartesian3Position);

            // insert the upper point
            positions[j++] = v.x;
            positions[j++] = v.y;
            positions[j++] = v.z;
        }

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : positions
            });
        }


        // prepare the side walls, two triangles for each wall
        //
        //    A (i+1)  B (i+3) E
        //    +--------+-------+
        //    |      / |      /|    triangles:  A C B
        //    |     /  |     / |                B C D
        //    |    /   |    /  |
        //    |   /    |   /   |
        //    |  /     |  /    |
        //    | /      | /     |
        //    +--------+-------+
        //    C (i)    D (i+2) F
        //

        var size = positions.length / 3 - 2;
        var indices = new Array(size * 3);

        j = 0;
        for (i = 0; i < size; i += 2) {
            // first do A C B
            indices[j++] = i + 1;
            indices[j++] = i;
            indices[j++] = i + 3;

            // now do B C D
            indices[j++] = i + 3;
            indices[j++] = i;
            indices[j++] = i + 2;
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = attributes;

        /**
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = [
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : indices
            })
        ];

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = new BoundingSphere.fromVertices(positions);

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * The color of the geometry when a per-geometry color appearance is used.
         *
         * @type Color
         */
        this.color = options.color;

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    return WallGeometry;
});

