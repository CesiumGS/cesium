defineSuite([
    'Core/CoplanarPolygonOutlineGeometry',
    'Core/Cartesian3',
    'Core/Ellipsoid',
    'Core/Math',
    'Specs/createPackableSpecs'
], function(
    CoplanarPolygonOutlineGeometry,
    Cartesian3,
    Ellipsoid,
    CesiumMath,
    createPackableSpecs) {
    'use strict';

    it('throws with no positions', function() {
        expect(function() {
            return new CoplanarPolygonOutlineGeometry();
        }).toThrowDeveloperError();
    });

    it('returns undefined with less than 3 unique positions', function() {
        var geometry = CoplanarPolygonOutlineGeometry.createGeometry(new CoplanarPolygonOutlineGeometry({
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
        var geometry = CoplanarPolygonOutlineGeometry.createGeometry(new CoplanarPolygonOutlineGeometry({
            positions : Cartesian3.fromDegreesArrayHeights([
                0.0, 0.0, 1.0,
                0.0, 0.0, 2.0,
                0.0, 0.0, 3.0
            ])
        }));
        expect(geometry).toBeUndefined();
    });

    it('creates positions', function() {
        var geometry = CoplanarPolygonOutlineGeometry.createGeometry(new CoplanarPolygonOutlineGeometry({
            positions : Cartesian3.fromDegreesArrayHeights([
                -1.0, -1.0, 0.0,
                -1.0, 0.0, 1.0,
                -1.0, 1.0, 1.0,
                -1.0, 2.0, 0.0
            ])
        }));

        expect(geometry.attributes.position.values.length).toEqual(4 * 3);
        expect(geometry.indices.length).toEqual(4 * 2);
    });

    var positions = [new Cartesian3(-1.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, 1.0), new Cartesian3(-1.0, 0.0, 0.0)];
    var polygon = new CoplanarPolygonOutlineGeometry({
        positions : positions
    });
    var packedInstance = [3.0, -1.0, 0.0, 0.0, 0.0, 0.0, 1.0, -1.0, 0.0, 0.0];
    createPackableSpecs(CoplanarPolygonOutlineGeometry, polygon, packedInstance);
});
