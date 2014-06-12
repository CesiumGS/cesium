/*global defineSuite*/
defineSuite([
        'Core/CircleOutlineGeometry',
        'Core/Cartographic',
        'Core/Ellipsoid'
    ], function(
        CircleOutlineGeometry,
        Cartographic,
        Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without a center', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                radius : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a radius', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic())
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative radius', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                radius : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                radius : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            radius : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 10);
        expect(m.indices.length).toEqual(2 * 10);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('computes positions extruded', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            radius : 1.0,
            extrudedHeight : 10000
        }));

        expect(m.attributes.position.values.length).toEqual(2 * 10 * 3);
        expect(m.indices.length).toEqual(2 * 10 * 2 + (16*2));
    });


    it('computes positions extruded, no lines between top and bottom', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            radius : 1.0,
            extrudedHeight : 10000,
            numberOfVerticalLines : 0
        }));

        expect(m.attributes.position.values.length).toEqual(2 * 10 * 3);
        expect(m.indices.length).toEqual(2 * 10 * 2);
    });
});
