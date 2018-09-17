defineSuite([
        'Core/PolylineVolumeOutlineGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/CornerType',
        'Core/Ellipsoid',
        'Specs/createPackableSpecs'
    ], function(
        PolylineVolumeOutlineGeometry,
        Cartesian2,
        Cartesian3,
        CornerType,
        Ellipsoid,
        createPackableSpecs) {
    'use strict';

    var shape;

    beforeAll(function() {
        shape = [new Cartesian2(-100, -100), new Cartesian2(100, -100), new Cartesian2(100, 100), new Cartesian2(-100, 100)];
    });

    it('throws without polyline positions', function() {
        expect(function() {
            return new PolylineVolumeOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws without shape positions', function() {
        expect(function() {
            return new PolylineVolumeOutlineGeometry({
                polylinePositions: [new Cartesian3()]
            });
        }).toThrowDeveloperError();
    });

    it('throws with width < 1.0', function() {
        expect(function() {
            return new PolylineVolumeOutlineGeometry({
                polylinePositions: [new Cartesian3()],
                shapePositions : [new Cartesian2()],
                width : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('createGeometry returns undefined without 2 unique polyline positions', function() {
        var geometry = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions: [new Cartesian3()],
            shapePositions: shape
        }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returnes undefined without 3 unique shape positions', function() {
        var geometry = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions: [Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
            shapePositions: [Cartesian2.UNIT_X, Cartesian2.UNIT_X, Cartesian2.UNIT_X]
        }));
        expect(geometry).toBeUndefined();
    });

    it('computes positions', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            shapePositions: shape,
            cornerType: CornerType.MITERED
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes positions, clockwise shape', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            shapePositions: shape.reverse(),
            cornerType: CornerType.MITERED
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes right turn', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                91.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes left turn', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes with rounded corners', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0,
                89.0, -32.0
            ]),
            cornerType: CornerType.ROUNDED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes with beveled corners', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -31.0,
                 89.0, -31.0,
                 89.0, -32.0
            ]),
            cornerType: CornerType.BEVELED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
    var volumeShape = [new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)];
    var volume = new PolylineVolumeOutlineGeometry({
        polylinePositions : positions,
        cornerType: CornerType.BEVELED,
        shapePositions: volumeShape,
        ellipsoid : Ellipsoid.UNIT_SPHERE,
        granularity : 0.1,
        width : 5.0
    });
    var packedInstance = [3.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 3.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.1, 5.0];
    createPackableSpecs(PolylineVolumeOutlineGeometry, volume, packedInstance);
});
