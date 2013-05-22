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
     * Creates a wall, which is similar to a line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally they can extrude downwards to a specified height.
     * The points in the wall can be offset by supplied terrain elevation data.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {array of Cartesian} positions an array of Cartesian objects, which are the points of the wall
     * @param {string} altitudeMode either 'absolute' or 'relativeToGround'. 'absolute' means the height
     *        is treated from the WGS84 ellipsoid. 'relativeToGround' means they are treated
     *        relative to the supplied terrain data
     * @param {array of Cartesian} [terrain] requred if altitudeMode is 'relativeToGround'. has to denote the same points
     *        as in positions, with the ground elevation reflecting the terrain elevation
     * @param {number} [top] optional, the top of the wall. if specified, the top of the wall is treated as this
     *        height, and the information in the positions array is disregarded
     * @param {number} [bottom] optional, the bottom of the wall. if specified, the bottom of the wall is treated as
     *        this height. otherwise its treated as 'ground' (the WGS84 ellipsoid height 0)
     * @param {object} [pickData] the geometry pick data
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] ellispoid for coordinate manipulation
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var positions;

        if (typeof options.positions !== 'undefined') {
            positions = options.positions;
        } else {
            throw new DeveloperError('positions must be supplied.');
        }

        var attributes = {};
        var indexLists = [];

        if (options.altitudeMode === 'relativeToGround' && typeof options.terrain === 'undefined') {
            throw new DeveloperError('No terrain supplied when required.');
        }
        if (typeof options.terrain !== 'undefined' && options.terrain.length !== options.positions.length) {
            throw new DeveloperError('Coordinates and terrain points don\'t match in number');
        }

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : []
        });

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        var origHeight;
        var c;
        for (var i = 0; i < options.positions.length; ++i) {
            c = ellipsoid.cartesianToCartographic(options.positions[i]);
            origHeight = c.height;
            c.height = 0;
            if (options.bottom !== undefined) {
                c.height = options.bottom;
            }
            if (options.terrain !== undefined && options.bottom !== undefined &&
                !isNaN(options.terrain[i].height)) {

                c.height += options.terrain[i].height;
            }
            var v = ellipsoid.cartographicToCartesian(c);

            // insert the lower point
            attributes.position.values.push(v.x);
            attributes.position.values.push(v.y);
            attributes.position.values.push(v.z);

            // get the original height back, or set the top value
            c.height    = options.top === undefined ? origHeight : options.top;
            if (options.terrain !== undefined && !isNaN(options.terrain[i].height)) {
                c.height += options.terrain[i].height;
            }
            v = ellipsoid.cartographicToCartesian(c);

            // insert the upper point
            attributes.position.values.push(v.x);
            attributes.position.values.push(v.y);
            attributes.position.values.push(v.z);
        }

        indexLists.push(
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : []
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

        var noPoints1 = attributes.position.values.length / 3 - 2;
        var indexes = indexLists[0].values;
        for (i = 0; i < noPoints1; i += 2) {

            // first do A C B
            indexes.push(i + 1);
            indexes.push(i);
            indexes.push(i + 3);

            // now do B C D
            indexes.push(i + 3);
            indexes.push(i);
            indexes.push(i + 2);
        }

        /**
         * The ellipsoid used to convert from cartographic to cartesian
         */
        this.ellipsoid = ellipsoid;

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

    // default KML namespace resolver, see
    // https://developer.mozilla.org/en-US/docs/Introduction_to_using_XPath_in_JavaScript#Implementing_a_User_Defined_Namespace_Resolver
    function kmlNsResolver(prefix) {
        return 'http://www.opengis.net/kml/2.2';
    }

    /**
     * Create a set of Walls from a KML document that includes LineString elements.
     *
     * @param {DOM node} kmlNode the KML documents document node
     * @param {CesiumTerrainProvider} terrainProvider an optional terrain provider for LineStrings that need
     *        a ground reference.
     * @param {function(wall)} callback a function that will receive each WallGeometry created, one at a time.
     */
    WallGeometry.fromKML = function kmlReqListener(kmlNode, terrainProvider, callback) {
        var name = kmlNode.evaluate('//kml:name', kmlNode, kmlNsResolver,
                                    XPathResult.STRING_TYPE, null);

        var it = kmlNode.evaluate('//kml:LineString', kmlNode, kmlNsResolver,
                                  XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

        var addNameToWall = function(wall) {
            wall.pickData = name;
            callback(wall);
        };

        for (var node = it.iterateNext(); node; node = it.iterateNext()) {
            WallGeometry.fromKMLLineString(node, terrainProvider, addNameToWall);
        }
    };

    /**
     *  Create a Wall from a KML LineString DOM element.
     *
     *  @param {DOM node} lineString the KML LineString DOM node to build this Wall from.
     *  @param {CesiumTerrainProvider} [terrainProvider] an optional terrain provider, used when relative-to-ground elevation
     *         data is needed to render the wall
     *  @param {function(wall)} callback the callback that will be called with the created WallGeometry
     */
    WallGeometry.fromKMLLineString = function(lineString, terrainProvider, callback) {
        var altitudeMode;
        var coordinates = [];

        var doc = lineString.ownerDocument;

        // get the coordinates
        var xpResult = doc.evaluate('kml:coordinates/text()', lineString, kmlNsResolver,
                                     XPathResult.STRING_TYPE, null);
        var coordString = xpResult.stringValue;
        var coordSplitWs = coordString.split(/[\s]/);
        for (var i = 0; i < coordSplitWs.length; ++i) {
            var coordLine = coordSplitWs[i];

            if (!coordLine.trim()) {
                continue;
            }
            var coordSplit = coordLine.split(',');

            var c = new Cartographic(Math.toRadians(parseFloat(coordSplit[0])),
                                     Math.toRadians(parseFloat(coordSplit[1])),
                                     coordSplit.length < 3 ? 0 : parseFloat(coordSplit[2]));
            coordinates.push(c);
        }

        // get the altitudeMode flag
        xpResult = doc.evaluate('kml:altitudeMode/text()', lineString, kmlNsResolver,
                                XPathResult.STRING_TYPE, null);
        altitudeMode = xpResult.stringValue;

        var options = {
            altitudeMode : altitudeMode,
            positions    : Ellipsoid.WGS84.cartographicArrayToCartesianArray(coordinates)
        };

        if (altitudeMode === 'relativeToGround') {
            // request the terrain data for each point of the line string
            var coords = [];

            for (i = 0; i < options.positions.length; ++i) {
                coords.push(Ellipsoid.WGS84.cartesianToCartographic(options.positions[i]));
            }

            // request the elevation ground data
            when(sampleTerrain(terrainProvider, 11, coords), function(positions) {
                options.terrain = Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);

                var wall = new WallGeometry(options);
                callback(wall);
            });
        } else {
            // just create a Wall and return it
            var wall = new WallGeometry(options);
            callback(wall);
        }
    };

    return WallGeometry;
});

