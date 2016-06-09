/*global defineSuite*/
defineSuite([
        'Core/EllipsoidGeometry',
        'Core/Cartesian3',
        'Core/Math',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        EllipsoidGeometry,
        Cartesian3,
        CesiumMath,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('constructor throws with invalid slicePartitions', function() {
        expect(function() {
            return new EllipsoidGeometry({
                slicePartitions : -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with invalid stackPartitions', function() {
        expect(function() {
            return new EllipsoidGeometry({
                stackPartitions : -1
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            slicePartitions: 3,
            stackPartitions: 3
        }));

        var numVertices = 16; // 4 rows * 4 positions
        var numTriangles = 12; //3 top + 3 bottom + 6 around the sides
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var m = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
            vertexFormat : VertexFormat.ALL,
            slicePartitions: 3,
            stackPartitions: 3
        }));

        var numVertices = 16;
        var numTriangles = 12;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.attributes.st.values.length).toEqual(numVertices * 2);
        expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(m.attributes.binormal.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('computes attributes for a unit sphere', function() {
        var m = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
            vertexFormat : VertexFormat.ALL,
            slicePartitions: 3,
            stackPartitions: 3
        }));

        var positions = m.attributes.position.values;
        var normals = m.attributes.normal.values;
        var tangents = m.attributes.tangent.values;
        var binormals = m.attributes.binormal.values;

        for ( var i = 0; i < positions.length; i += 3) {
            var position = Cartesian3.fromArray(positions, i);
            var normal = Cartesian3.fromArray(normals, i);
            var tangent = Cartesian3.fromArray(tangents, i);
            var binormal = Cartesian3.fromArray(binormals, i);

            expect(Cartesian3.magnitude(position)).toEqualEpsilon(1.0, CesiumMath.EPSILON10);
            expect(normal).toEqualEpsilon(Cartesian3.normalize(position, new Cartesian3()), CesiumMath.EPSILON7);
            expect(Cartesian3.dot(Cartesian3.UNIT_Z, tangent)).not.toBeLessThan(0.0);
            expect(binormal).toEqualEpsilon(Cartesian3.cross(normal, tangent, new Cartesian3()), CesiumMath.EPSILON7);
        }
    });

    it('undefined is returned if the x, y, or z radii are equal or less than zero', function() {
        var ellipsoid0 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radii : new Cartesian3(0.0, 500000.0, 500000.0)
        });
        var ellipsoid1 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radii : new Cartesian3(1000000.0, 0.0, 500000.0)
        });
        var ellipsoid2 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radii : new Cartesian3(1000000.0, 500000.0, 0.0)
        });
        var ellipsoid3 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radii : new Cartesian3(-10.0, 500000.0, 500000.0)
        });
        var ellipsoid4 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radii : new Cartesian3(1000000.0, -10.0, 500000.0)
        });
        var ellipsoid5 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radii : new Cartesian3(1000000.0, 500000.0, -10.0)
        });

        var geometry0 = EllipsoidGeometry.createGeometry(ellipsoid0);
        var geometry1 = EllipsoidGeometry.createGeometry(ellipsoid1);
        var geometry2 = EllipsoidGeometry.createGeometry(ellipsoid2);
        var geometry3 = EllipsoidGeometry.createGeometry(ellipsoid3);
        var geometry4 = EllipsoidGeometry.createGeometry(ellipsoid4);
        var geometry5 = EllipsoidGeometry.createGeometry(ellipsoid5);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
        expect(geometry3).toBeUndefined();
        expect(geometry4).toBeUndefined();
        expect(geometry5).toBeUndefined();
    });

    var ellipsoidgeometry = new EllipsoidGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        radii : new Cartesian3(1.0, 2.0, 3.0),
        slicePartitions: 3,
        stackPartitions: 3
    });
    var packedInstance = [1.0, 2.0, 3.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 3.0, 3.0];
    createPackableSpecs(EllipsoidGeometry, ellipsoidgeometry, packedInstance);
});