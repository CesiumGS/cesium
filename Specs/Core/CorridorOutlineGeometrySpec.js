defineSuite([
        'Core/CorridorOutlineGeometry',
        'Core/arrayFill',
        'Core/Cartesian3',
        'Core/CornerType',
        'Core/Ellipsoid',
        'Core/GeometryOffsetAttribute',
        'Specs/createPackableSpecs'
    ], function(
        CorridorOutlineGeometry,
        arrayFill,
        Cartesian3,
        CornerType,
        Ellipsoid,
        GeometryOffsetAttribute,
        createPackableSpecs) {
    'use strict';

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

    it('throws with outlineWidth < 1.0', function() {
        expect(function() {
            return new CorridorOutlineGeometry({
                positions : [new Cartesian3()],
                width : 10.0,
                outlineWidth : -1.0
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

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
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

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
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

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

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

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);

        var seenZero = false;
        var seenOne = false;
        var seenOther = false;
        for (var i = 0; i < offset.length; ++i) {
            seenZero = seenZero || offset[i] === 0.0;
            seenOne = seenOne || offset[i] === 1.0;
            seenOther = seenOther || (offset[i] !== 0.0 && offset[i] !== 1.0);
        }
        expect(seenZero).toEqual(true);
        expect(seenOne).toEqual(true);
        expect(seenOther).toEqual(false);
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

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

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

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
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

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
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

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
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

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('undefined is returned if there are less than two positions or the width is equal to or less than zero', function() {
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
        granularity : 0.1,
        outlineWidth : 5.0
    });
    var packedInstance = [2, positions[0].x, positions[0].y, positions[0].z, positions[1].x, positions[1].y, positions[1].z];
    packedInstance.push(Ellipsoid.WGS84.radii.x, Ellipsoid.WGS84.radii.y, Ellipsoid.WGS84.radii.z);
    packedInstance.push(30000.0, 0.0, 0.0, 2.0, 0.1, -1, 5.0);
    createPackableSpecs(CorridorOutlineGeometry, corridor, packedInstance);
});
