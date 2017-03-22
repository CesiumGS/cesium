/*global defineSuite*/
defineSuite([
        'Core/CorridorGeometry',
        'Core/Cartesian3',
        'Core/CornerType',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Rectangle',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        CorridorGeometry,
        Cartesian3,
        CornerType,
        Ellipsoid,
        CesiumMath,
        Rectangle,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('throws without positions', function() {
        expect(function() {
            return new CorridorGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws without width', function() {
        expect(function() {
            return new CorridorGeometry({
                positions: [new Cartesian3()]
            });
        }).toThrowDeveloperError();
    });

    it('createGeometry returns undefined without 2 unique positions', function() {
        var geometry = CorridorGeometry.createGeometry(new CorridorGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -30.0
            ]),
            width: 10000
        }));
        expect(geometry).toBeUndefined();
    });

    it('computes positions', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        var numVertices = 12; //6 left + 6 right
        var numTriangles = 10; //5 segments x 2 triangles per segment
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('compute all vertex attributes', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        var numVertices = 12;
        var numTriangles = 10;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.attributes.st.values.length).toEqual(numVertices * 2);
        expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('computes positions extruded', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            extrudedHeight: 30000
        }));

        var numVertices = 72; // 6 positions x 4 for a box at each position x 3 to duplicate for normals
        var numTriangles = 44; // 5 segments * 8 triangles per segment + 2 triangles x 2 ends
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('compute all vertex attributes extruded', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            extrudedHeight: 30000
        }));

        var numVertices = 72;
        var numTriangles = 44;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.attributes.st.values.length).toEqual(numVertices * 2);
        expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('computes right turn', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                91.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3); // 4 left + 4 right
        expect(m.indices.length).toEqual(6 * 3); // 3 segments * 2 triangles per segment
    });

    it('computes left turn', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(6 * 3);
    });

    it('computes with rounded corners', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0,
                89.0, -32.0
            ]),
            cornerType: CornerType.ROUNDED,
            width : 30000
        }));

        var endCaps = 72; // 36 points * 2 end caps
        var corners = 37; // 18 for one corner + 19 for the other
        var numVertices = 10 + endCaps + corners;
        var numTriangles = 8 + endCaps + corners;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.attributes.st.values.length).toEqual(numVertices * 2);
        expect(m.indices.length).toEqual(numTriangles * 3);
    });

    it('computes with beveled corners', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -31.0,
                 89.0, -31.0,
                 89.0, -32.0
            ]),
            cornerType: CornerType.BEVELED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(10 * 3);
        expect(m.indices.length).toEqual(8 * 3);
    });

    it('computes sharp turns', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                 2.00571672577652,52.7781459942399,
                 1.99188457974115,52.7764958852886,
                 2.01325961458495,52.7674170680511,
                 1.98708058340534,52.7733979856253,
                 2.00634853946644,52.7650460748473
            ]),
            cornerType: CornerType.BEVELED,
            width : 100
        }));

        expect(m.attributes.position.values.length).toEqual(13 * 3); // 3 points * 3 corners + 2 points * 2 ends
        expect(m.indices.length).toEqual(11 * 3); // 4 segments * 2 triangles + 3 corners * 1 triangle
    });

    it('computes straight corridors', function() {
        var m = CorridorGeometry.createGeometry(new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -67.655, 0.0,
                -67.655, 15.0,
                -67.655, 20.0
            ]),
            cornerType: CornerType.BEVELED,
            width : 400000,
            granularity : Math.PI / 6.0
        }));

        expect(m.attributes.position.values.length).toEqual(4 * 3);
        expect(m.indices.length).toEqual(2 * 3);
    });

    it('undefined is returned if there are less than two positions or the width is equal to ' +
       'or less than zero', function() {
         var corridor0 = new CorridorGeometry({
             vertexFormat : VertexFormat.POSITION_ONLY,
             positions : Cartesian3.fromDegreesArray([-72.0, 35.0]),
             width : 100000
         });
        var corridor1 = new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([-67.655, 0.0, -67.655, 15.0, -67.655, 20.0]),
            width : 0
        });
        var corridor2 = new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([-67.655, 0.0, -67.655, 15.0, -67.655, 20.0]),
            width : -100
        });

        var geometry0 = CorridorGeometry.createGeometry(corridor0);
        var geometry1 = CorridorGeometry.createGeometry(corridor1);
        var geometry2 = CorridorGeometry.createGeometry(corridor2);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
    });

    it('computing rectangle property', function() {
        var c = new CorridorGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -67.655, 0.0,
                -67.655, 15.0,
                -67.655, 20.0
            ]),
            cornerType: CornerType.MITERED,
            width : 1,
            granularity : Math.PI / 6.0
        });

        var r = c.rectangle;
        expect(CesiumMath.toDegrees(r.north)).toEqualEpsilon(20.0, CesiumMath.EPSILON13);
        expect(CesiumMath.toDegrees(r.south)).toEqualEpsilon(0.0, CesiumMath.EPSILON20);
        expect(CesiumMath.toDegrees(r.east)).toEqual(-67.65499522658291);
        expect(CesiumMath.toDegrees(r.west)).toEqual(-67.6550047734171);
    });

    var positions = Cartesian3.fromDegreesArray([
         90.0, -30.0,
         90.0, -31.0
    ]);
    var corridor = new CorridorGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        positions : positions,
        cornerType: CornerType.BEVELED,
        width : 30000.0,
        granularity : 0.1
    });
    var rectangle = new Rectangle(1.568055205533759, -0.5410504013439219, 1.573537448056034, -0.5235971737132246);
    var packedInstance = [2, positions[0].x, positions[0].y, positions[0].z, positions[1].x, positions[1].y, positions[1].z];
    packedInstance.push(Ellipsoid.WGS84.radii.x, Ellipsoid.WGS84.radii.y, Ellipsoid.WGS84.radii.z);
    packedInstance.push(1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    packedInstance.push(rectangle.west, rectangle.south, rectangle.east, rectangle.north);
    packedInstance.push(30000.0, 0.0, 0.0, 2.0, 0.1, 0.0);
    createPackableSpecs(CorridorGeometry, corridor, packedInstance);
});
