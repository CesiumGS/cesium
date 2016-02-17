/*global defineSuite*/
defineSuite([
        'Core/EllipseGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        EllipseGeometry,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

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
                center : Cartesian3.fromDegrees(0,0),
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMinorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws when semiMajorAxis is less than the semiMajorAxis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : 2.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 16);
        expect(m.indices.length).toEqual(3 * 22);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 16);
        expect(m.attributes.st.values.length).toEqual(2 * 16);
        expect(m.attributes.normal.values.length).toEqual(3 * 16);
        expect(m.attributes.tangent.values.length).toEqual(3 * 16);
        expect(m.attributes.binormal.values.length).toEqual(3 * 16);
        expect(m.indices.length).toEqual(3 * 22);
    });

    it('compute texture coordinates with rotation', function() {
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            stRotation : CesiumMath.PI_OVER_TWO
        }));

        var positions = m.attributes.position.values;
        var st = m.attributes.st.values;
        var length = st.length;

        expect(positions.length).toEqual(3 * 16);
        expect(length).toEqual(2 * 16);
        expect(m.indices.length).toEqual(3 * 22);

        expect(st[length - 2]).toEqualEpsilon(0.5, CesiumMath.EPSILON2);
        expect(st[length - 1]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
    });

    it('computes positions extruded', function() {
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (16 + 8) * 2);
        expect(m.indices.length).toEqual(3 * (22 + 8) * 2);
    });

    it('compute all vertex attributes extruded', function() {
        var m = EllipseGeometry.createGeometry(new EllipseGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (16 + 8) * 2);
        expect(m.attributes.st.values.length).toEqual(2 * (16 + 8) * 2);
        expect(m.attributes.normal.values.length).toEqual(3 * (16 + 8) * 2);
        expect(m.attributes.tangent.values.length).toEqual(3 * (16 + 8) * 2);
        expect(m.attributes.binormal.values.length).toEqual(3 * (16 + 8) * 2);
        expect(m.indices.length).toEqual(3 * (22 + 8) * 2);
    });

    it('undefined is returned if the minor axis is equal to or less than zero', function() {
        var ellipse0 = new EllipseGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : 300000.0,
            semiMinorAxis : 0.0
        });
        var ellipse1 = new EllipseGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : 0.0,
            semiMinorAxis : -1.0
        });
        var ellipse2 = new EllipseGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : 300000.0,
            semiMinorAxis : -10.0
        });
        var ellipse3 = new EllipseGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : -1.0,
            semiMinorAxis : -2.0
        });

        var geometry0 = EllipseGeometry.createGeometry(ellipse0);
        var geometry1 = EllipseGeometry.createGeometry(ellipse1);
        var geometry2 = EllipseGeometry.createGeometry(ellipse2);
        var geometry3 = EllipseGeometry.createGeometry(ellipse3);

        expect(geometry0).toBe(undefined);
        expect(geometry1).toBe(undefined);
        expect(geometry2).toBe(undefined);
        expect(geometry3).toBe(undefined);
    });

    var center = Cartesian3.fromDegrees(0,0);
    var ellipsoid = Ellipsoid.WGS84;
    var packableInstance = new EllipseGeometry({
        vertexFormat : VertexFormat.POSITION_AND_ST,
        ellipsoid : ellipsoid,
        center : center,
        granularity : 0.1,
        semiMajorAxis : 1.0,
        semiMinorAxis : 1.0,
        stRotation : CesiumMath.PI_OVER_TWO
    });
    var packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, CesiumMath.PI_OVER_TWO, 0.0, 0.1, 0.0, 0.0];
    createPackableSpecs(EllipseGeometry, packableInstance, packedInstance);

});
