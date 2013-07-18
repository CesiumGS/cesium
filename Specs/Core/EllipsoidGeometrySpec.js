/*global defineSuite*/
defineSuite([
         'Core/EllipsoidGeometry',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/VertexFormat'
     ], function(
         EllipsoidGeometry,
         Cartesian3,
         Ellipsoid,
         CesiumMath,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws with invalid numberOfPartitions', function() {
        expect(function() {
            return new EllipsoidGeometry({
                numberOfPartitions : -1
            });
        }).toThrow();
    });

    it('computes positions', function() {
        var m = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            numberOfPartitions : 1
        });

        expect(m.attributes.position.values.length).toEqual(3 * 8);
        expect(m.indices.length).toEqual(12 * 3);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute all vertex attributes', function() {
        var m = new EllipsoidGeometry({
            vertexFormat : VertexFormat.ALL,
            numberOfPartitions : 2
        });

        expect(m.attributes.position.values.length).toEqual(3 * (8 + 6 + 12));
        expect(m.attributes.st.values.length).toEqual(2 * (8 + 6 + 12));
        expect(m.attributes.normal.values.length).toEqual(3 * (8 + 6 + 12));
        expect(m.attributes.tangent.values.length).toEqual(3 * (8 + 6 + 12));
        expect(m.attributes.binormal.values.length).toEqual(3 * (8 + 6 + 12));
        expect(m.indices.length).toEqual(2 * 3 * 4 * 6);
    });

    it('computes attributes for a unit sphere', function() {
        var m = new EllipsoidGeometry({
            vertexFormat : VertexFormat.ALL,
            numberOfPartitions : 3
        });

        var positions = m.attributes.position.values;
        var normals = m.attributes.normal.values;
        var tangents = m.attributes.tangent.values;
        var binormals = m.attributes.binormal.values;

        for ( var i = 0; i < positions.length; i += 3) {
            var position = Cartesian3.fromArray(positions, i);
            var normal = Cartesian3.fromArray(normals, i);
            var tangent = Cartesian3.fromArray(tangents, i);
            var binormal = Cartesian3.fromArray(binormals, i);

            expect(position.magnitude()).toEqualEpsilon(1.0, CesiumMath.EPSILON10);
            expect(normal).toEqualEpsilon(position.normalize(), CesiumMath.EPSILON7);
            expect(Cartesian3.dot(Cartesian3.UNIT_Z, tangent)).not.toBeLessThan(0.0);
            expect(binormal).toEqualEpsilon(Cartesian3.cross(normal, tangent), CesiumMath.EPSILON7);
        }
    });
});