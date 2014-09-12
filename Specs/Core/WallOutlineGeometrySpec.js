/*global defineSuite*/
defineSuite([
        'Core/WallOutlineGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        WallOutlineGeometry,
        Cartesian3,
        Ellipsoid,
        CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var ellipsoid = Ellipsoid.WGS84;

    it('throws with no positions', function() {
        expect(function() {
            return new WallOutlineGeometry();
        }).toThrowDeveloperError();
    });

    it('throws when positions and minimumHeights length do not match', function() {
        expect(function() {
            return new WallOutlineGeometry({
                positions : new Array(2),
                minimumHeights : new Array(3)
            });
        }).toThrowDeveloperError();
    });

    it('throws when positions and maximumHeights length do not match', function() {
        expect(function() {
            return new WallOutlineGeometry({
                positions : new Array(2),
                maximumHeights : new Array(3)
            });
        }).toThrowDeveloperError();
    });

    it('throws with less than 2 positions', function() {
        expect(function() {
            return WallOutlineGeometry.createGeometry(new WallOutlineGeometry({
                positions : [Cartesian3.fromDegrees(49.0, 18.0, 1000.0)]
            }));
        }).toThrowDeveloperError();
    });

    it('throws with less than 2 unique positions', function() {
        expect(function() {
            return WallOutlineGeometry.createGeometry(new WallOutlineGeometry({
                positions : Cartesian3.fromDegreesArrayHeights([
                    49.0, 18.0, 1000.0,
                    49.0, 18.0, 5000.0,
                    49.0, 18.0, 1000.0
                ])
            }));
        }).toThrowDeveloperError();
    });

    it('creates positions relative to ellipsoid', function() {
        var w = WallOutlineGeometry.createGeometry(new WallOutlineGeometry({
            positions : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0
            ]),
            granularity : Math.PI
        }));

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(4 * 2);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(1000.0, CesiumMath.EPSILON8);
    });

    it('creates positions with minimum and maximum heights', function() {
        var w = WallOutlineGeometry.createGeometry(new WallOutlineGeometry({
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0
            ]),
            minimumHeights : [1000.0, 2000.0],
            maximumHeights : [3000.0, 4000.0],
            granularity : Math.PI
        }));

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(4 * 2);

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
        var w = WallOutlineGeometry.createGeometry(new WallOutlineGeometry({
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
        expect(positions.length).toEqual(3 * 2 * 3);
        expect(w.indices.length).toEqual(7 * 2);

        var cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 0));
        expect(cartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON8);

        cartographic = ellipsoid.cartesianToCartographic(Cartesian3.fromArray(positions, 3));
        expect(cartographic.height).toEqualEpsilon(2000.0, CesiumMath.EPSILON8);
    });

    it('fromConstantHeights throws without positions', function() {
        expect(function() {
            return WallOutlineGeometry.fromConstantHeights();
        }).toThrowDeveloperError();
    });

    it('creates positions with constant minimum and maximum heights', function() {
        var min = 1000.0;
        var max = 2000.0;

        var w = WallOutlineGeometry.createGeometry(WallOutlineGeometry.fromConstantHeights({
            positions    : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                50.0, 18.0, 1000.0
            ]),
            minimumHeight : min,
            maximumHeight : max
        }));

        var positions = w.attributes.position.values;
        expect(positions.length).toEqual(2 * 2 * 3);
        expect(w.indices.length).toEqual(2 * 4);

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

