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
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

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

    it('throws with a negative axis', function() {
        expect(function() {
            return new EllipseGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : -1.0
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

        expect(m.attributes.position.values.length).toEqual(3 * 12);
        expect(m.indices.length).toEqual(3 * 14);
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

        expect(m.attributes.position.values.length).toEqual(3 * 12);
        expect(m.attributes.st.values.length).toEqual(2 * 12);
        expect(m.attributes.normal.values.length).toEqual(3 * 12);
        expect(m.attributes.tangent.values.length).toEqual(3 * 12);
        expect(m.attributes.binormal.values.length).toEqual(3 * 12);
        expect(m.indices.length).toEqual(3 * 14);
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

        expect(positions.length).toEqual(3 * 12);
        expect(length).toEqual(2 * 12);
        expect(m.indices.length).toEqual(3 * 14);

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

        expect(m.attributes.position.values.length).toEqual(3 * (12 + 6) * 2);
        expect(m.indices.length).toEqual(3 * (14 + 6) * 2);
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

        expect(m.attributes.position.values.length).toEqual(3 * (12 + 6) * 2);
        expect(m.attributes.st.values.length).toEqual(2 * (12 + 6) * 2);
        expect(m.attributes.normal.values.length).toEqual(3 * (12 + 6) * 2);
        expect(m.attributes.tangent.values.length).toEqual(3 * (12 + 6) * 2);
        expect(m.attributes.binormal.values.length).toEqual(3 * (12 + 6) * 2);
        expect(m.indices.length).toEqual(3 * (14 + 6) * 2);
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
