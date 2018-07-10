defineSuite([
    'Core/CoplanarPolygonGeometry',
    'Core/Cartesian3',
    'Core/Ellipsoid',
    'Core/Math',
    'Core/VertexFormat',
    'Specs/createPackableSpecs'
], function(
    CoplanarPolygonGeometry,
    Cartesian3,
    Ellipsoid,
    CesiumMath,
    VertexFormat,
    createPackableSpecs) {
    'use strict';

    it('throws with no positions', function() {
        expect(function() {
            return new CoplanarPolygonGeometry();
        }).toThrowDeveloperError();
    });

    it('returns undefined with less than 3 unique positions', function() {
        var geometry = CoplanarPolygonGeometry.createGeometry(new CoplanarPolygonGeometry({
            positions : Cartesian3.fromDegreesArrayHeights([
                49.0, 18.0, 1000.0,
                49.0, 18.0, 5000.0,
                49.0, 18.0, 5000.0,
                49.0, 18.0, 1000.0
            ])
        }));
        expect(geometry).toBeUndefined();
    });

    it('returns undefined when positions are linear', function() {
        var geometry = CoplanarPolygonGeometry.createGeometry(new CoplanarPolygonGeometry({
            positions : Cartesian3.fromDegreesArrayHeights([
                0.0, 0.0, 1.0,
                0.0, 0.0, 2.0,
                0.0, 0.0, 3.0
            ])
        }));
        expect(geometry).toBeUndefined();
    });

    it('computes positions', function() {
        var p = CoplanarPolygonGeometry.createGeometry(new CoplanarPolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArrayHeights([
                -1.0, -1.0, 0.0,
                -1.0, 0.0, 1.0,
                -1.0, 1.0, 1.0,
                -1.0, 2.0, 0.0
            ])
        }));

        expect(p.attributes.position.values.length).toEqual(4 * 3);
        expect(p.indices.length).toEqual(2 * 3);
    });

    it('computes all attributes', function() {
        var p = CoplanarPolygonGeometry.createGeometry(new CoplanarPolygonGeometry({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArrayHeights([
                -1.0, -1.0, 0.0,
                -1.0, 0.0, 1.0,
                -1.0, 1.0, 1.0,
                -1.0, 2.0, 0.0
            ])
        }));

        var numVertices = 4;
        var numTriangles = 2;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.attributes.st.values.length).toEqual(numVertices * 2);
        expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    var positions = [new Cartesian3(-1.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, 1.0), new Cartesian3(-1.0, 0.0, 0.0)];
    var polygon = new CoplanarPolygonGeometry({
        positions : positions,
        vertexFormat : VertexFormat.POSITION_ONLY
    });
    var packedInstance = [3.0, -1.0, 0.0, 0.0, 0.0, 0.0, 1.0, -1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    createPackableSpecs(CoplanarPolygonGeometry, polygon, packedInstance);
});

