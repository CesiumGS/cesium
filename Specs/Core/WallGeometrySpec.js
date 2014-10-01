/*global defineSuite*/
defineSuite([
        'Core/WallGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat'
    ], function(
        WallGeometry,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('throws with less than 2 positions', function() {
        expect(function() {
            return WallGeometry.createGeometry(new WallGeometry({
                vertexFormat : VertexFormat.POSITION_ONLY,
                positions    : ([Cartesian3.fromDegrees(49.0, 18.0, 1000.0)])
            }));
        }).toThrowDeveloperError();
    });

    it('throws with less than 2 unique positions', function() {
        expect(function() {
            return WallGeometry.createGeometry(new WallGeometry({
                vertexFormat : VertexFormat.POSITION_ONLY,
                positions    : Cartesian3.fromDegreesArrayHeights([
                    49.0, 18.0, 1000.0,
                    49.0, 18.0, 5000.0,
                    49.0, 18.0, 1000.0
                ])
            }));
        }).toThrowDeveloperError();
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
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(2 * 3);

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
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(2 * 3);

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

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(4 * 2 * 3);
        expect(w.indices.length).toEqual((4 * 2 - 2) * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);
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

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(4 * 2 * 3);
        expect(w.indices.length).toEqual((4 * 2 - 2) * 3);

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

        expect(w.attributes.position.values.length).toEqual(4 * 2 * 3);
        expect(w.attributes.normal.values.length).toEqual(4 * 2 * 3);
        expect(w.attributes.tangent.values.length).toEqual(4 * 2 * 3);
        expect(w.attributes.binormal.values.length).toEqual(4 * 2 * 3);
        expect(w.attributes.st.values.length).toEqual(4 * 2 * 2);
        expect(w.indices.length).toEqual((4 * 2 - 2) * 3);
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

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(2 * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(min, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(max, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 6));
        expect(cartographic.height).toEqualEpsilon(min, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 9));
        expect(cartographic.height).toEqualEpsilon(max, CesiumMath.EPSILON8);
    });
});

