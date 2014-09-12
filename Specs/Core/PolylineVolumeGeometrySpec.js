/*global defineSuite*/
defineSuite([
        'Core/PolylineVolumeGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/CornerType',
        'Core/VertexFormat'
    ], function(
        PolylineVolumeGeometry,
        Cartesian2,
        Cartesian3,
        CornerType,
        VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/
    var shape;

    beforeAll(function() {
        shape = [new Cartesian2(-10000, -10000), new Cartesian2(10000, -10000), new Cartesian2(10000, 10000), new Cartesian2(-10000, 10000)];
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

    it('throws without 2 unique polyline positions', function() {
        expect(function() {
            return PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
                polylinePositions: [new Cartesian3()],
                shapePositions: shape
            }));
        }).toThrowDeveloperError();
    });

    it('throws without 3 unique shape positions', function() {
        expect(function() {
            return PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
                polylinePositions: [Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
                shapePositions: [Cartesian2.UNIT_X, Cartesian2.UNIT_X, Cartesian2.UNIT_X]
            }));
        }).toThrowDeveloperError();
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

        expect(m.attributes.position.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.indices.length).toEqual(3 * 10 * 2 + 24 * 3);
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

        expect(m.attributes.position.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.indices.length).toEqual(3 * 10 * 2 + 24 * 3);
    });

    it('compute all vertex attributes', function() {
        var m = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            vertexFormat : VertexFormat.ALL,
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.attributes.st.values.length).toEqual(2 * (4 * 2 + 4 * 2 * 6));
        expect(m.attributes.normal.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.attributes.tangent.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.attributes.binormal.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.indices.length).toEqual(3 * 10 * 2 + 24 * 3);
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

        expect(m.attributes.position.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.indices.length).toEqual(3 * 10 * 2 + 24 * 3);
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

        expect(m.attributes.position.values.length).toEqual(3 * (4 * 2 + 4 * 2 * 6));
        expect(m.indices.length).toEqual(3 * 10 * 2 + 24 * 3);
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

        var corners = 90/5 * 2;
        expect(m.attributes.position.values.length).toEqual(3 * (corners * 4 * 2 * 2 + 4 * 2 * 9));
        expect(m.indices.length).toEqual(3 * (corners * 4 * 2 * 2 + 4 * 7 * 2 + 4));
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

        expect(m.attributes.position.values.length).toEqual(3 * (2 * 8 + 4 * 2 * 9));
        expect(m.indices.length).toEqual(3 * (8 * 2 + 4 * 7 * 2 + 4));
    });
});
