/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './Cartographic',
        './Ellipsoid',
        './Math',
        './Matrix4',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryIndices',
        '../Scene/sampleTerrain',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        Math,
        Matrix4,
        ComponentDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        GeometryAttribute,
        GeometryIndices,
        sampleTerrain,
        when) {
    "use strict";

    /**
     * Creates a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally they can extrude downwards to a specified height.
     * The points in the wall can be offset by supplied terrain elevation data.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Array} positions an array of Cartesian objects, which are the points of the wall
     * @param {string} altitudeMode either 'absolute' or 'relativeToGround'. 'absolute' means the height
     *        is treated from the WGS84 ellipsoid. 'relativeToGround' means they are treated
     *        relative to the supplied terrain data
     * @param {Array} [terrain] requred if altitudeMode is 'relativeToGround'. has to denote the same points
     *        as in positions, with the ground elevation reflecting the terrain elevation
     * @param {Number} [top] optional, the top of the wall. if specified, the top of the wall is treated as this
     *        height, and the information in the positions array is disregarded
     * @param {Number} [bottom] optional, the bottom of the wall. if specified, the bottom of the wall is treated as
     *        this height. otherwise its treated as 'ground' (the WGS84 ellipsoid height 0)
     * @param {Object} [pickData] the geometry pick data
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] ellispoid for coordinate manipulation
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     * @exception {DeveloperError} positions is required
     * @exception {DeveloperError} No terrain supplied when required.
     * @exception {DeveloperError} Coordinates and terrain points don't match in number
     *
     * @example
     *
     *  var positions = [
     *      new Cesium.Cartographic(Cesium.Math.toRadians(19),
     *                              Cesium.Math.toRadians(47),
     *                              10000),
     *      new Cesium.Cartographic(Cesium.Math.toRadians(19),
     *                              Cesium.Math.toRadians(48),
     *                              10000),
     *      new Cesium.Cartographic(Cesium.Math.toRadians(20),
     *                              Cesium.Math.toRadians(48),
     *                              10000),
     *      new Cesium.Cartographic(Cesium.Math.toRadians(20),
     *                              Cesium.Math.toRadians(47),
     *                              10000),
     *      new Cesium.Cartographic(Cesium.Math.toRadians(19),
     *                              Cesium.Math.toRadians(47),
     *                              10000)
     *  ];
     *
     *  // create a wall that spans from ground level to 10000 meters
     *  var wall1 = new Cesium.WallGeometry({
     *      altitudeMode : 'absolute',
     *      positions    : ellipsoid.cartographicArrayToCartesianArray(positions),
     *      pickData     : 'wall1'
     *  });
     *
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var positions;

        if (typeof options.positions !== 'undefined') {
            positions = options.positions;
        } else {
            throw new DeveloperError('positions is required.');
        }

        var attributes = {};
        var indexLists = [];

        if (options.altitudeMode === 'relativeToGround' && typeof options.terrain === 'undefined') {
            throw new DeveloperError('No terrain supplied when required.');
        }
        if (typeof options.terrain !== 'undefined' && options.terrain.length !== positions.length) {
            throw new DeveloperError('Coordinates and terrain points don\'t match in number');
        }

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : new Array(positions.length * 6)
        });

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        var origHeight;
        var c;
        var values = attributes.position.values;
        for (var i = 0, j = 0; i < positions.length; ++i) {
            c = ellipsoid.cartesianToCartographic(positions[i]);
            origHeight = c.height;
            c.height = 0.0;
            if (options.bottom !== undefined) {
                c.height = options.bottom;
            }
            if (options.terrain !== undefined && options.bottom !== undefined &&
                !isNaN(options.terrain[i].height)) {

                c.height += options.terrain[i].height;
            }
            var v = ellipsoid.cartographicToCartesian(c);

            // insert the lower point
            values[j++] = v.x;
            values[j++] = v.y;
            values[j++] = v.z;

            // get the original height back, or set the top value
            c.height    = options.top === undefined ? origHeight : options.top;
            if (options.terrain !== undefined && !isNaN(options.terrain[i].height)) {
                c.height += options.terrain[i].height;
            }
            v = ellipsoid.cartographicToCartesian(c);

            // insert the upper point
            values[j++] = v.x;
            values[j++] = v.y;
            values[j++] = v.z;
        }

        var noPoints1 = attributes.position.values.length / 3 - 2;

        indexLists.push(
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : new Array(noPoints1 * 3)
        }));


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

        var indexes = indexLists[0].values;
        for (i = 0, j = 0; i < noPoints1; i += 2) {

            // first do A C B
            indexes[j++] = i + 1;
            indexes[j++] = i;
            indexes[j++] = i + 3;

            // now do B C D
            indexes[j++] = i + 3;
            indexes[j++] = i;
            indexes[j++] = i + 2;
        }

        /**
         * The attributes (vertices)
         */
        this.attributes = attributes;

        /**
         * The indexes used for GL rendering
         */
        this.indexLists = indexLists;

        /**
         * The bounding sphere for the whole geometry
         */
        this.boundingSphere = new BoundingSphere.fromVertices(attributes.position.values);

        /**
         * The model matrix, simply the identity
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * Pick data used for selection
         */
        this.pickData = options.pickData;
    };

    return WallGeometry;
});

