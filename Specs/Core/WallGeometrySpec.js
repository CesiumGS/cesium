/*global defineSuite*/
defineSuite([
         'Core/WallGeometry',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/VertexFormat'
     ], function(
         WallGeometry,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var ellipsoid = Ellipsoid.WGS84;

    it('throws with no positions', function() {
        expect(function() {
            return new WallGeometry();
        }).toThrow();
    });

    it('throws when positions and minimumHeights length do not match', function() {
        expect(function() {
            return new WallGeometry({
                positions : new Array(2),
                minimumHeights : new Array(3)
            });
        }).toThrow();
    });

    it('throws when positions and maximumHeights length do not match', function() {
        expect(function() {
            return new WallGeometry({
                positions : new Array(2),
                maximumHeights : new Array(3)
            });
        }).toThrow();
    });

    it('creates positions relative to ellipsoid', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var w = new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords)
        });

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(2 * 3);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON9);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(1000.0, CesiumMath.EPSILON9);
    });

    it('creates positions with minimum and maximum heights', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var w = new WallGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords),
            minimumHeights : [1000.0, 2000.0],
            maximumHeights : [3000.0, 4000.0]
        });

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

    it('creates all attributes', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0),
            Cartographic.fromDegrees(51.0, 18.0, 1000.0)
        ];

        var w = new WallGeometry({
            vertexFormat : VertexFormat.ALL,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords)
        });

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
        }).toThrow();
    });

    it('creates positions with constant minimum and maximum heights', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var min = 1000.0;
        var max = 2000.0;

        var w = WallGeometry.fromConstantHeights({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords),
            minimumHeight : min,
            maximumHeight : max
        });

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

