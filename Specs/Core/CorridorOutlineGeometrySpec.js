import { arrayFill } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { CornerType } from '../../Source/Cesium.js';
import { CorridorOutlineGeometry } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { GeometryOffsetAttribute } from '../../Source/Cesium.js';
import createPackableSpecs from '../createPackableSpecs.js';

describe('Core/CorridorOutlineGeometry', function() {

    it('throws without positions', function() {
        expect(function() {
            return new CorridorOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws without width', function() {
        expect(function() {
            return new CorridorOutlineGeometry({
                positions: [new Cartesian3()]
            });
        }).toThrowDeveloperError();
    });

    it('createGeometry returns undefined without 2 unique positions', function() {
        var geometry = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -30.0
            ]),
            width: 10000
        }));
        expect(geometry).toBeUndefined();

        geometry = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions :  [new Cartesian3(-1349511.388149118, -5063973.22857992, 3623141.6372688496), //same lon/lat, different height
                          new Cartesian3(-1349046.4811926484, -5062228.688739784, 3621885.0521561056)],
            width: 10000
        }));
        expect(geometry).toBeUndefined();
    });

    it('computes positions', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(12 * 3); // 6 left + 6 right
        expect(m.indices.length).toEqual(12 * 2);
    });

    it('computes positions extruded', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            extrudedHeight: 30000
        }));

        expect(m.attributes.position.values.length).toEqual(24 * 3); // 6 positions * 4 for a box at each position
        expect(m.indices.length).toEqual(28 * 2); // 5 segments * 4 lines per segment + 4 lines * 2 ends
    });

    it('computes offset attribute for top vertices', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 12;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3); // 6 left + 6 right

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for top vertices', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            extrudedHeight: 30000,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 24;
        expect(m.attributes.position.values.length).toEqual(24 * 3);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 0, 12);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for all vertices', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            extrudedHeight: 30000,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = 24;
        expect(m.attributes.position.values.length).toEqual(24 * 3);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes right turn', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                91.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
    });

    it('computes left turn', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
    });

    it('computes with rounded corners', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
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
        var numLines = 10 + endCaps + corners;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);
        expect(m.indices.length).toEqual(numLines * 2);
    });

    it('computes with beveled corners', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
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
        expect(m.indices.length).toEqual(10 * 2);
    });

    it('undefined is returned if there are less than two positions or the width is equal to ' +
       'or less than zero', function() {
        var corridorOutline0 = new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([-72.0, 35.0]),
            width : 100000
        });
        var corridorOutline1 = new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([-67.655, 0.0, -67.655, 15.0, -67.655, 20.0]),
            width : 0
        });
        var corridorOutline2 = new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([-67.655, 0.0, -67.655, 15.0, -67.655, 20.0]),
            width : -100
        });

        var geometry0 = CorridorOutlineGeometry.createGeometry(corridorOutline0);
        var geometry1 = CorridorOutlineGeometry.createGeometry(corridorOutline1);
        var geometry2 = CorridorOutlineGeometry.createGeometry(corridorOutline2);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
    });

    var positions = Cartesian3.fromDegreesArray([
         90.0, -30.0,
         90.0, -31.0
    ]);
    var corridor = new CorridorOutlineGeometry({
        positions : positions,
        cornerType: CornerType.BEVELED,
        width : 30000.0,
        granularity : 0.1
    });
    var packedInstance = [2, positions[0].x, positions[0].y, positions[0].z, positions[1].x, positions[1].y, positions[1].z];
    packedInstance.push(Ellipsoid.WGS84.radii.x, Ellipsoid.WGS84.radii.y, Ellipsoid.WGS84.radii.z);
    packedInstance.push(30000.0, 0.0, 0.0, 2.0, 0.1, -1);
    createPackableSpecs(CorridorOutlineGeometry, corridor, packedInstance);
});
