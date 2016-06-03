/*global defineSuite*/
defineSuite([
        'Core/CircleOutlineGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Specs/createPackableSpecs'
    ], function(
        CircleOutlineGeometry,
        Cartesian3,
        Ellipsoid,
        createPackableSpecs) {
    'use strict';

    it('throws without a center', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                radius : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a radius', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0)
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new CircleOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                radius : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            radius : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('computes positions extruded', function() {
        var m = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            radius : 1.0,
            extrudedHeight : 5
        }));

        expect(m.attributes.position.values.length).toEqual(16 * 3); //8 top circle + 8 bottom circle
        expect(m.indices.length).toEqual(24 * 2); //8 top + 8 bottom + 8 vertical
    });

    it('computes positions extruded, no lines between top and bottom', function() {
        var m = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            radius : 1.0,
            extrudedHeight : 10000,
            numberOfVerticalLines : 0
        }));

        expect(m.attributes.position.values.length).toEqual(16 * 3);
        expect(m.indices.length).toEqual(16 * 2);
    });

    it('undefined is returned if radius is equal to or less than zero', function () {
        var circleOutline0 = new CircleOutlineGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            radius : 0.0
        });
        var circleOutline1 = new CircleOutlineGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            radius : -10.0
        });

        var geometry0 = CircleOutlineGeometry.createGeometry(circleOutline0);
        var geometry1 = CircleOutlineGeometry.createGeometry(circleOutline1);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
    });

    var center = new Cartesian3(8, 9, 10);
    var ellipsoid = new Ellipsoid(11, 12, 13);
    var packableInstance = new CircleOutlineGeometry({
        ellipsoid : ellipsoid,
        center : center,
        granularity : 1,
        radius : 2,
        numberOfVerticalLines : 4,
        height : 5,
        extrudedHeight : 7
    });
    var packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 2, 2, 0, 5, 1, 1, 7, 1, 4];
    createPackableSpecs(CircleOutlineGeometry, packableInstance, packedInstance, 'extruded');

    //Because extrudedHeight is optional and has to be taken into account when packing, we have a second test without it.
    packableInstance = new CircleOutlineGeometry({
        ellipsoid : ellipsoid,
        center : center,
        granularity : 1,
        radius : 2,
        numberOfVerticalLines : 4,
        height : 5
    });
    packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 2, 2, 0, 5, 1, 0, 0, 0, 4];
    createPackableSpecs(CircleOutlineGeometry, packableInstance, packedInstance, 'at height');
});