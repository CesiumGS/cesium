defineSuite([
        'Core/PolylineVolumeGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/CornerType',
        'Core/Ellipsoid',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        PolylineVolumeGeometry,
        Cartesian2,
        Cartesian3,
        CornerType,
        Ellipsoid,
        VertexFormat,
        createPackableSpecs) {
    'use strict';
    var shape;

    beforeAll(function() {
        shape = [new Cartesian2(-100, -100), new Cartesian2(100, -100), new Cartesian2(100, 100), new Cartesian2(-100, 100)];
    });

    it('throws without polyline positions', function() {
        expect(function() {
            return new PolylineVolumeGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws without shape positions', function() {
        expect(function() {
            return new PolylineVolumeGeometry({
                polylinePositions: [new Cartesian3()]
            });
        }).toThrowDeveloperError();
    });

    it('createGeometry returnes undefined without 2 unique polyline positions', function() {
        var geometry = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            polylinePositions: [new Cartesian3()],
            shapePositions: shape
        }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returnes undefined without 3 unique shape positions', function() {
        var geometry = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            polylinePositions: [Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
            shapePositions: [Cartesian2.UNIT_X, Cartesian2.UNIT_X, Cartesian2.UNIT_X]
        }));
        expect(geometry).toBeUndefined();
    });

    it('computes positions', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        // 6 positions * 4 box positions * 2 to duplicate for normals + 4 positions * 2 ends
        expect(m.attributes.position.values.length).toEqual(56 * 3);
        // 5 segments + 8 triangles per segment + 2 triangles * 2 ends
        expect(m.indices.length).toEqual(44 * 3);
    });

    it('computes positions, clockwise shape', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape.reverse()
        }));

        expect(m.attributes.position.values.length).toEqual(56 * 3);
        expect(m.indices.length).toEqual(44 * 3);
    });

    it('computes most vertex attributes', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_NORMAL_AND_ST,
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        var numVertices = 56;
        var numTriangles = 44;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.attributes.st.values.length).toEqual(numVertices * 2);
        expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    //https://github.com/AnalyticalGraphicsInc/cesium/issues/3609
    xit('compute all vertex attributes', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.ALL,
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        var numVertices = 56;
        var numTriangles = 44;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.attributes.st.values.length).toEqual(numVertices * 2);
        expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('computes right turn', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                91.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        // (3 duplicates * 2 ends + 2 duplicates * 2 middle points + 4 duplicates * 1 corner) * 4 box positions
        expect(m.attributes.position.values.length).toEqual(56 * 3);
        // 8 triangles * 5 segments + 2 triangles * 2 ends
        expect(m.indices.length).toEqual(44 * 3);
    });

    it('computes left turn', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toEqual(56 * 3);
        expect(m.indices.length).toEqual(44 * 3);
    });

    it('computes with rounded corners', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0,
                89.0, -32.0
            ]),
            cornerType: CornerType.ROUNDED,
            shapePositions: shape
        }));

        var corners = 36 * 4 * 4; // positions * 4 for shape * 4 for normal duplication
        var numVertices = corners + 72; // corners + 9 positions * 2 for normal duplication * 4 for shape
        var numTriangles = corners + 60; // corners + 8 triangles * 7 segments + 2 on each end
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('computes with beveled corners', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -31.0,
                 89.0, -31.0,
                 89.0, -32.0
            ]),
            cornerType: CornerType.BEVELED,
            shapePositions: shape
        }));

        var corners = 4 * 4; // 4 for shape * 4 for normal duplication
        var numVertices = corners + 72; // corners + 9 positions * 2 for normal duplication * 4 for shape
        var numTriangles = corners + 60; // corners + 8 triangles * 7 segments + 2 on each end
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(3 * numTriangles);
    });

    it('computes sharp turns', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArrayHeights([
                 2.00571672577652, 52.7781459942399, 500,
                 1.99188457974115, 52.7764958852886, 500,
                 2.01325961458495, 52.7674170680511, 500,
                 1.98708058340534, 52.7733979856253, 500,
                 2.00634853946644, 52.7650460748473, 500
            ]),
            cornerType: CornerType.BEVELED,
            shapePositions: shape
        }));

        // (8 positions * 3 duplications + 1 duplication * 6 corners) * 4 for shape
        expect(m.attributes.position.values.length).toEqual(120 * 3);
        // 13 segments * 8 triangles per segment + 2 * 2 for ends
        expect(m.indices.length).toEqual(108 * 3);
    });

    it('computes straight volume', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polylinePositions : Cartesian3.fromDegreesArray([
                -67.655, 0.0,
                -67.655, 15.0,
                -67.655, 20.0
            ]),
            cornerType: CornerType.BEVELED,
            shapePositions: shape,
            granularity : Math.PI / 6.0
        }));

        expect(m.attributes.position.values.length).toEqual(32 * 3); // 4 positions * 2 for duplication * 4 for shape
        expect(m.indices.length).toEqual(20 * 3); // 2 segments * 8 triangles per segment + 2 * 2 ends
    });

    var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
    var volumeShape = [new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)];
    var volume = new PolylineVolumeGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        polylinePositions : positions,
        cornerType: CornerType.BEVELED,
        shapePositions: volumeShape,
        ellipsoid : Ellipsoid.UNIT_SPHERE,
        granularity : 0.1
    });
    var packedInstance = [3.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 3.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.1];
    createPackableSpecs(PolylineVolumeGeometry, volume, packedInstance);
});
