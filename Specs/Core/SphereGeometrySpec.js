/*global defineSuite*/
defineSuite([
        'Core/SphereGeometry',
        'Core/Cartesian3',
        'Core/Math',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        SphereGeometry,
        Cartesian3,
        CesiumMath,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('constructor throws with invalid stackPartitions', function() {
        expect(function() {
            return new SphereGeometry({
                stackPartitions : -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with invalid slicePartitions', function() {
        expect(function() {
            return new SphereGeometry({
                slicePartitions : -1
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = SphereGeometry.createGeometry(new SphereGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            radius : 1,
            stackPartitions : 3,
            slicePartitions: 3
        }));

        expect(m.attributes.position.values.length).toEqual(16 * 3); // 4 positions * 4 rows
        expect(m.indices.length).toEqual(12 * 3); //3 top + 3 bottom + 2 triangles * 3 sides
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var m = SphereGeometry.createGeometry(new SphereGeometry({
            vertexFormat : VertexFormat.ALL,
            radius : 1,
            stackPartitions : 3,
            slicePartitions: 3
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
        var m = SphereGeometry.createGeometry(new SphereGeometry({
            vertexFormat : VertexFormat.ALL,
            radius : 1,
            stackPartitions : 3,
            slicePartitions: 3
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
            expect(normal).toEqualEpsilon(Cartesian3.normalize(position, position), CesiumMath.EPSILON7);
            expect(Cartesian3.dot(Cartesian3.UNIT_Z, tangent)).not.toBeLessThan(0.0);
            expect(binormal).toEqualEpsilon(Cartesian3.cross(normal, tangent, normal), CesiumMath.EPSILON7);
        }
    });

    it('undefined is returned if radius is equals to zero', function() {
         var sphere = new SphereGeometry({
             radius : 0.0,
             vertexFormat : VertexFormat.POSITION_ONLY
         });

        var geometry = SphereGeometry.createGeometry(sphere);

        expect(geometry).toBeUndefined();
    });

    var sphere = new SphereGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        radius : 1,
        stackPartitions : 3,
        slicePartitions: 3
    });
    var packedInstance = [1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 3.0, 3.0];
    createPackableSpecs(SphereGeometry, sphere, packedInstance);
});