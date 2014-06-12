/*global defineSuite*/
defineSuite([
        'Core/EllipseGeometry',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat'
    ], function(
        EllipseGeometry,
        Cartographic,
        Ellipsoid,
        CesiumMath,
        VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without a center', function() {
        expect(function() {
            return new EllipseGeometry({
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMajorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMinorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative axis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws when semiMajorAxis is less than the semiMajorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Ellipsoid.WGS84.cartographicToCartesian(new Cartographic()),
                semiMajorAxis : 1.0,
                semiMinorAxis : 2.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(3 * 34);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.attributes.st.values.length).toEqual(2 * 24);
        expect(m.attributes.normal.values.length).toEqual(3 * 24);
        expect(m.attributes.tangent.values.length).toEqual(3 * 24);
        expect(m.attributes.binormal.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(3 * 34);
    });

    it('compute texture coordinates with rotation', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            stRotation : CesiumMath.PI_OVER_TWO
        }));

        var positions = m.attributes.position.values;
        var st = m.attributes.st.values;
        var length = st.length;

        expect(positions.length).toEqual(3 * 24);
        expect(length).toEqual(2 * 24);
        expect(m.indices.length).toEqual(3 * 34);

        expect(st[length - 2]).toEqualEpsilon(0.5, CesiumMath.EPSILON2);
        expect(st[length - 1]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
    });

    it('computes positions extruded', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.indices.length).toEqual(3 * (34 + 10) * 2);
    });

    it('compute all vertex attributes extruded', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(new Cartographic()),
            granularity : 0.75,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.attributes.st.values.length).toEqual(2 * (24 + 10) * 2);
        expect(m.attributes.normal.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.attributes.tangent.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.attributes.binormal.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.indices.length).toEqual(3 * (34 + 10) * 2);
    });
});
