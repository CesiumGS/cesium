/*global defineSuite*/
defineSuite([
        'Core/EllipseOutlineGeometry',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Specs/createPackableSpecs'
    ], function(
        EllipseOutlineGeometry,
        Cartesian3,
        Ellipsoid,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('throws without a center', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMajorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMinorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative axis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws when semiMajorAxis is less than the semiMajorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : 2.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 6);
        expect(m.indices.length).toEqual(2 * 6);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('computes positions extruded', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 6 * 2);
        expect(m.indices.length).toEqual(2 * 6 * 2 + 16 * 2);
    });

    it('computes positions extruded, no lines drawn between top and bottom', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 50000,
            numberOfVerticalLines : 0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 6 * 2);
        expect(m.indices.length).toEqual(2 * 6 * 2);
    });

    var center = new Cartesian3(8, 9, 10);
    var ellipsoid = new Ellipsoid(11, 12, 13);
    var packableInstance = new EllipseOutlineGeometry({
        ellipsoid : ellipsoid,
        center : center,
        granularity : 1,
        semiMinorAxis : 2,
        semiMajorAxis : 3,
        numberOfVerticalLines : 4,
        height : 5,
        rotation : 6,
        extrudedHeight : 7
    });
    var packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 3, 2, 6, 5, 1, 1, 7, 1, 4];
    createPackableSpecs(EllipseOutlineGeometry, packableInstance, packedInstance, 'extruded');

    //Because extrudedHeight is optional and has to be taken into account when packing, we have a second test without it.
    packableInstance = new EllipseOutlineGeometry({
        ellipsoid : ellipsoid,
        center : center,
        granularity : 1,
        semiMinorAxis : 2,
        semiMajorAxis : 3,
        numberOfVerticalLines : 4,
        height : 5,
        rotation : 6
    });
    packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 3, 2, 6, 5, 1, 0, 0, 0, 4];
    createPackableSpecs(EllipseOutlineGeometry, packableInstance, packedInstance, 'at height');
});
