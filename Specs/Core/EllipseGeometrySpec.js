/*global defineSuite*/
defineSuite([
         'Core/EllipseGeometry',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/VertexFormat'
     ], function(
             EllipseGeometry,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without a center', function() {
        expect(function() {
            return new EllipseGeometry({
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0
            });
        }).toThrow();
    });

    it('throws without a semiMajorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMinorAxis : 1.0
            });
        }).toThrow();
    });

    it('throws without a semiMinorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0
            });
        }).toThrow();
    });

    it('throws with a negative axis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : -1.0
            });
        }).toThrow();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0,
                granularity : -1.0
            });
        }).toThrow();
    });

    it('throws when semiMajorAxis is less than the semiMajorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : 2.0
            });
        }).toThrow();
    });

    it('computes positions', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        });

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(3 * 34);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = new EllipseGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        });

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.attributes.st.values.length).toEqual(2 * 24);
        expect(m.attributes.normal.values.length).toEqual(3 * 24);
        expect(m.attributes.tangent.values.length).toEqual(3 * 24);
        expect(m.attributes.binormal.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(3 * 34);
    });
});
