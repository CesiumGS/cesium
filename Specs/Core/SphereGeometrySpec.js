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
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

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

        expect(m.attributes.position.values.length).toEqual(3 * 16);
        expect(m.indices.length).toEqual(6 * 9);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var m = SphereGeometry.createGeometry(new SphereGeometry({
            vertexFormat : VertexFormat.ALL,
            radius : 1,
            stackPartitions : 3,
            slicePartitions: 3
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 16);
        expect(m.attributes.st.values.length).toEqual(2 * 16);
        expect(m.attributes.normal.values.length).toEqual(3 * 16);
        expect(m.attributes.tangent.values.length).toEqual(3 * 16);
        expect(m.attributes.binormal.values.length).toEqual(3 * 16);
        expect(m.indices.length).toEqual(6 * 9);
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

    var sphere = new SphereGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        radius : 1,
        stackPartitions : 3,
        slicePartitions: 3
    });
    var packedInstance = [1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 3.0, 3.0];
    createPackableSpecs(SphereGeometry, sphere, packedInstance);
});
