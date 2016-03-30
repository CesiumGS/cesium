/*global defineSuite*/
defineSuite([
        'Core/WallGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        WallGeometry,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    var ellipsoid = Ellipsoid.WGS84;

    it('throws with no positions', function() {
        expect(function() {
            return new WallGeometry();
        }).toThrowDeveloperError();
    });

    it('throws when positions and minimumHeights length do not match', function() {
        expect(function() {
            return new WallGeometry({
                positions : new Array(2),
                minimumHeights : new Array(3)
            });
        }).toThrowDeveloperError();
    });

    it('throws when positions and maximumHeights length do not match', function() {
        expect(function() {
            return new WallGeometry({
                positions : new Array(2),
                maximumHeights : new Array(3)
            });
        }).toThrowDeveloperError();
    });

    it('returns undefined with less than 2 unique positions', function() {
        var geometry = WallGeometry.createGeometry(new WallGeometry({
            positions : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                49.0, 18.0, 5000.0,
                49.0, 18.0, 1000.0
            ])
        }));
        expect(geometry).toBeUndefined();
    });

    it('returns undefined with no heights', function() {
        var geometry = WallGeometry.createGeometry(new WallGeometry({
            positions : Cartesian3.fromDegreesArray([
                49.0, 18.0,
                49.0, 18.0,
                49.0, 18.0
            ])
        }));
        expect(geometry).toBeUndefined();

        geometry = WallGeometry.createGeometry(new WallGeometry({
            positions : Cartesian3.fromDegreesArray([
                49.0, 18.0,
                49.0, 18.0,
                49.0, 18.0
            ]),
            maximumHeights: [0, 0, 0]
        }));
        expect(geometry).toBeUndefined();
    });

    it('does not throw when positions are unique but close', function() {
        WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : Cartesian3.fromDegreesArray([
                -47.93121266896352,-15.771192496304398,
                -47.93119792786269,-15.771148001875085
            ])
        }));
    });

    it('creates positions relative to ellipsoid', function() {
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0
            ])
        }));

        var positions = w.attributes.position.values;
        var numPositions = 4;
        var numTriangles = 2;
        expect(positions.length).toEqual(numPositions * 3);
        expect(w.indices.length).toEqual(numTriangles * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(1000.0, CesiumMath.EPSILON8);
    });

    it('creates positions with minimum and maximum heights', function() {
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0
            ]),
            minimumHeights : [1000.0, 2000.0],
            maximumHeights : [3000.0, 4000.0]
        }));

        var positions = w.attributes.position.values;
        var numPositions = 4;
        var numTriangles = 2;
        expect(positions.length).toEqual(numPositions * 3);
        expect(w.indices.length).toEqual(numTriangles * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(1000.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(3000.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 6));
        expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 9));
        expect(cartographic.height).toEqualEpsilon(4000.0, CesiumMath.EPSILON8);
    });

    it('cleans positions with duplicates', function() {
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                49.0, 18.0, 2000.0,
                50.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0,
                51.0, 18.0, 1000.0,
                51.0, 18.0, 1000.0
            ])
        }));

        var numPositions = 8;
        var numTriangles = 4;
        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(numPositions * 3);
        expect(w.indices.length).toEqual(numTriangles * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);
    });

    it('does not clean positions that add up past EPSILON14', function() {
        var eightyPercentOfEpsilon14 = 0.8 * CesiumMath.EPSILON14;
        var inputPositions = Cartesian3.fromRadiansArrayHeights([
            1.0, 1.0, 1000.0,
            1.0, 1.0 + eightyPercentOfEpsilon14, 1000.0,
            1.0, 1.0 + (2 * eightyPercentOfEpsilon14), 1000.0,
            1.0, 1.0 + (3 * eightyPercentOfEpsilon14), 1000.0
        ]);
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : inputPositions
        }));
        expect(w).toBeDefined();

        var expectedPositions = Cartesian3.fromRadiansArrayHeights([
            1.0, 1.0, 1000.0,
            1.0, 1.0 + (2 * eightyPercentOfEpsilon14), 1000.0
        ]);
        var expectedW = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : expectedPositions
        }));
        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(expectedW.attributes.position.values.length);
    });

    it('cleans selects maximum height from duplicates', function() {
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0,
                50.0, 18.0, 6000.0,
                50.0, 18.0, 10000.0,
                51.0, 18.0, 1000.0
            ])
        }));

        var numPositions = 8;
        var numTriangles = 4;
        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(numPositions * 3);
        expect(w.indices.length).toEqual(numTriangles * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 9));
        expect(cartographic.height).toEqualEpsilon(10000.0, CesiumMath.EPSILON8);
    });

    it('creates all attributes', function() {
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.ALL,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0,
                51.0, 18.0, 1000.0
            ])
        }));

        var numPositions = 8;
        var numTriangles = 4;
        expect(w.attributes.position.values.length).toEqual(numPositions * 3);
        expect(w.attributes.normal.values.length).toEqual(numPositions * 3);
        expect(w.attributes.tangent.values.length).toEqual(numPositions * 3);
        expect(w.attributes.binormal.values.length).toEqual(numPositions * 3);
        expect(w.attributes.st.values.length).toEqual(numPositions * 2);
        expect(w.indices.length).toEqual(numTriangles * 3);
    });

    it('creates correct texture coordinates', function() {
        var w = WallGeometry.createGeometry(new WallGeometry({
            vertexFormat : VertexFormat.ALL,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0,
                51.0, 18.0, 1000.0
            ])
        }));

        expect(w.attributes.st.values.length).toEqual(4 * 2 * 2);
        expect(w.attributes.st.values).toEqual([
            0.0, 0.0,
            0.0, 1.0,
            0.5, 0.0,
            0.5, 1.0,
            0.5, 0.0,
            0.5, 1.0,
            1.0, 0.0,
            1.0, 1.0
        ]);
    });

    it('fromConstantHeights throws without positions', function() {
        expect(function() {
            return WallGeometry.fromConstantHeights();
        }).toThrowDeveloperError();
    });

    it('creates positions with constant minimum and maximum heights', function() {
        var min = 1000.0;
        var max = 2000.0;

        var w = WallGeometry.createGeometry(WallGeometry.fromConstantHeights({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0
            ]),
            minimumHeight : min,
            maximumHeight : max
        }));

        var numPositions = 4;
        var numTriangles = 2;
        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(numPositions * 3);
        expect(w.indices.length).toEqual(numTriangles * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(min, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(max, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 6));
        expect(cartographic.height).toEqualEpsilon(min, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 9));
        expect(cartographic.height).toEqualEpsilon(max, CesiumMath.EPSILON8);
    });

    var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
    var wall = new WallGeometry({
        positions : positions,
        vertexFormat : VertexFormat.POSITION_ONLY,
        granularity : 0.01,
        ellipsoid: Ellipsoid.UNIT_SPHERE
    });
    var packedInstance = [3.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.01];
    createPackableSpecs(WallGeometry, wall, packedInstance);
});

