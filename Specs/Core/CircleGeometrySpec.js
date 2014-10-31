/*global defineSuite*/
defineSuite([
        'Core/CircleGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat'
    ], function(
        CircleGeometry,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without a center', function() {
        expect(function() {
            return new CircleGeometry({
                radius : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a radius', function() {
        expect(function() {
            return new CircleGeometry({
                center : Cartesian3.fromDegrees(0,0)
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative radius', function() {
        expect(function() {
            return new CircleGeometry({
                center : Cartesian3.fromDegrees(0,0),
                radius : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new CircleGeometry({
                center : Cartesian3.fromDegrees(0,0),
                radius : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = CircleGeometry.createGeometry(new CircleGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.75,
            radius : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(3 * 34);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var m = CircleGeometry.createGeometry(new CircleGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.75,
            radius : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.attributes.st.values.length).toEqual(2 * 24);
        expect(m.attributes.normal.values.length).toEqual(3 * 24);
        expect(m.attributes.tangent.values.length).toEqual(3 * 24);
        expect(m.attributes.binormal.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(3 * 34);
    });

    it('computes positions extruded', function() {
        var m = CircleGeometry.createGeometry(new CircleGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.75,
            radius : 1.0,
            extrudedHeight: 10000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.indices.length).toEqual(3 * (34 + 10) * 2);
    });

    it('compute all vertex attributes extruded', function() {
        var m = CircleGeometry.createGeometry(new CircleGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.75,
            radius : 1.0,
            extrudedHeight: 10000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.attributes.st.values.length).toEqual(2 * (24 + 10) * 2);
        expect(m.attributes.normal.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.attributes.tangent.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.attributes.binormal.values.length).toEqual(3 * (24 + 10) * 2);
        expect(m.indices.length).toEqual(3 * (34 + 10) * 2);
    });

    it('compute texture coordinates with rotation', function() {
        var m = CircleGeometry.createGeometry(new CircleGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.75,
            radius : 1.0,
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
});
