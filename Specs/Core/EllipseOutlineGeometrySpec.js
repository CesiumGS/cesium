/*global defineSuite*/
defineSuite([
        'Core/EllipseOutlineGeometry',
        'Core/Cartographic',
        'Core/Ellipsoid'
    ], function(
        EllipseOutlineGeometry,
        Cartographic,
        Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without a center', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMajorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMinorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative axis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws when semiMajorAxis is less than the semiMajorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : 2.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 10);
        expect(m.indices.length).toEqual(2 * 10);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('computes positions extruded', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 10 * 2);
        expect(m.indices.length).toEqual(2 * 10 * 2 + (16 *2));
    });

    it('computes positions extruded, no lines drawn between top and bottom', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000,
            numberOfVerticalLines : 0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 10 * 2);
        expect(m.indices.length).toEqual(2 * 10 * 2);
    });
});
