/*global defineSuite*/
defineSuite([
        'Core/EllipsoidTangentPlane',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Matrix3',
        'Core/OrientedBoundingBox'
    ], function(
        EllipsoidTangentPlane,
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        Matrix3,
        OrientedBoundingBox) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructor defaults to WGS84', function() {
        var origin = new Cartesian3(Ellipsoid.WGS84.radii.x, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin);
        expect(tangentPlane.ellipsoid).toBe(Ellipsoid.WGS84);
        expect(tangentPlane.origin).toEqual(origin);
    });

    it('constructor sets expected values', function() {
        var tangentPlane = new EllipsoidTangentPlane(Cartesian3.UNIT_X, Ellipsoid.UNIT_SPHERE);
        expect(tangentPlane.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
        expect(tangentPlane.origin).toEqual(Cartesian3.UNIT_X);
    });

    it('fromPoints sets expected values', function() {
        var points = [new Cartesian3(2, 0, 0), new Cartesian3(0, 0, 0)];
        var tangentPlane = EllipsoidTangentPlane.fromPoints(points, Ellipsoid.UNIT_SPHERE);
        expect(tangentPlane.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
        expect(tangentPlane.origin).toEqual(Cartesian3.UNIT_X);
    });

    it('projectPointOntoPlane returns undefined for points not on the plane', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);
        var positions = new Cartesian3(0, 0, 1);
        var returnedResult = tangentPlane.projectPointOntoPlane(positions);
        expect(returnedResult).toBeUndefined();
    });

    it('projectPointOntoPlane works without a result parameter', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = new Cartesian3(1, 0, 1);
        var expectedResult = new Cartesian2(0, 1);
        var returnedResult = tangentPlane.projectPointOntoPlane(positions);
        expect(returnedResult).toEqual(expectedResult);
    });

    it('projectPointOntoPlane works with a result parameter', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = new Cartesian3(1, 0, 1);
        var expectedResult = new Cartesian2(0, 1);
        var result = new Cartesian2();
        var returnedResult = tangentPlane.projectPointOntoPlane(positions, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(expectedResult);
    });

    it('projectPointsOntoPlane works without a result parameter', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = [new Cartesian3(1, 0, 1), new Cartesian3(1, 0, 0), new Cartesian3(1, 1, 0)];
        var expectedResults = [new Cartesian2(0, 1), new Cartesian2(0, 0), new Cartesian2(1, 0)];
        var returnedResults = tangentPlane.projectPointsOntoPlane(positions);
        expect(returnedResults).toEqual(expectedResults);
    });

    it('projectPointsOntoPlane works with a result parameter', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = [new Cartesian3(1, 0, 1), new Cartesian3(1, 0, 0), new Cartesian3(1, 1, 0)];
        var expectedResults = [new Cartesian2(0, 1), new Cartesian2(0, 0), new Cartesian2(1, 0)];

        var index0 = new Cartesian2();
        var result = [index0];
        var returnedResults = tangentPlane.projectPointsOntoPlane(positions, result);
        expect(result).toBe(returnedResults);
        expect(result[0]).toBe(index0);
        expect(returnedResults).toEqual(expectedResults);
    });

    it('projectPointsOntoPlane works when some points not on plane', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = [new Cartesian3(1, 0, 1), new Cartesian3(1, 0, 0), new Cartesian3(0, 0, 1), new Cartesian3(1, 1, 0), new Cartesian3(0, 1, 0)];
        var expectedResults = [new Cartesian2(0, 1), new Cartesian2(0, 0), new Cartesian2(1, 0)];
        var returnedResults = tangentPlane.projectPointsOntoPlane(positions);
        expect(returnedResults).toEqual(expectedResults);
    });

    it('projectPointsOntoEllipsoid works without a result parameter', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = [new Cartesian3(2, -2, 0), new Cartesian3(2, 2, 0)];
        var expectedResults = [new Cartesian3(1/3, 2/3, -2/3), new Cartesian3(1/3, 2/3,  2/3)];
        var returnedResults = tangentPlane.projectPointsOntoEllipsoid(positions);
        expect(returnedResults).toEqual(expectedResults);
    });

    it('projectPointsOntoEllipsoid works with a result parameter', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1, 0, 0);
        var tangentPlane = new EllipsoidTangentPlane(origin, ellipsoid);

        var positions = [new Cartesian3(2, -2, 0), new Cartesian3(2, 2, 0)];
        var expectedResults = [new Cartesian3(1/3, 2/3, -2/3), new Cartesian3(1/3, 2/3,  2/3)];
        var index0 = new Cartesian3();
        var result = [index0];
        var returnedResults = tangentPlane.projectPointsOntoEllipsoid(positions, result);
        expect(result).toBe(returnedResults);
        expect(result[0]).toBe(index0);
        expect(returnedResults).toEqual(expectedResults);
    });

    it('extentsToOrientedBoundingBox works with a result parameter', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = Cartesian3.UNIT_X;
        var pl = new EllipsoidTangentPlane(origin, ellipsoid);
        var result = new OrientedBoundingBox();
        result = pl.extentsToOrientedBoundingBox(-0.5, 0.5, -0.5, 0.5, -0.5, 0.5, result);
        var expected = new OrientedBoundingBox(origin,
            new Matrix3(0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 0.5, 0.0));
        expect(result).toEqual(expected);
    });

    it('extentsToOrientedBoundingBox works without a result parameter', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = Cartesian3.UNIT_X;
        var pl = new EllipsoidTangentPlane(origin, ellipsoid);
        var result = pl.extentsToOrientedBoundingBox(-0.5, 0.5, -0.5, 0.5, -0.5, 0.5);
        var expected = new OrientedBoundingBox(origin,
            new Matrix3(0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 0.5, 0.0));
        expect(result).toEqual(expected);
    });

    it('constructor throws without origin', function() {
        expect(function() {
            return new EllipsoidTangentPlane(undefined, Ellipsoid.WGS84);
        }).toThrowDeveloperError();
    });

    it('constructor throws if origin is at the center of the ellipsoid', function() {
        expect(function() {
            return new EllipsoidTangentPlane(Cartesian3.ZERO, Ellipsoid.WGS84);
        }).toThrowDeveloperError();
    });

    it('fromPoints throws without cartesians', function() {
        expect(function() {
            return EllipsoidTangentPlane.fromPoints(undefined, Ellipsoid.WGS84);
        }).toThrowDeveloperError();
    });

    it('projectPointOntoPlane throws without cartesian', function() {
        var tangentPlane = new EllipsoidTangentPlane(Cartesian3.UNIT_X, Ellipsoid.UNIT_SPHERE);
        expect(function() {
            return tangentPlane.projectPointOntoPlane(undefined);
        }).toThrowDeveloperError();
    });

    it('projectPointsOntoPlane throws without cartesians', function() {
        var tangentPlane = new EllipsoidTangentPlane(Cartesian3.UNIT_X, Ellipsoid.UNIT_SPHERE);
        expect(function() {
            return tangentPlane.projectPointsOntoPlane(undefined);
        }).toThrowDeveloperError();
    });

    it('projectPointToNearestOnPlane throws without cartesian', function() {
        var tangentPlane = new EllipsoidTangentPlane(Cartesian3.UNIT_X, Ellipsoid.UNIT_SPHERE);
        expect(function() {
            return tangentPlane.projectPointToNearestOnPlane(undefined);
        }).toThrowDeveloperError();
    });

    it('projectPointsToNearestOnPlane throws without cartesians', function() {
        var tangentPlane = new EllipsoidTangentPlane(Cartesian3.UNIT_X, Ellipsoid.UNIT_SPHERE);
        expect(function() {
            return tangentPlane.projectPointsToNearestOnPlane(undefined);
        }).toThrowDeveloperError();
    });

    it('projectPointsOntoEllipsoid throws without cartesians', function() {
        var tangentPlane = new EllipsoidTangentPlane(Cartesian3.UNIT_X, Ellipsoid.UNIT_SPHERE);
        expect(function() {
            return tangentPlane.projectPointsOntoEllipsoid(undefined);
        }).toThrowDeveloperError();
    });

    it('extentsToOrientedBoundingBox throws missing any of the dimensional parameters', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var pl = new EllipsoidTangentPlane(origin, ellipsoid);
        var result = new OrientedBoundingBox();
        expect(function() { pl.extentsToOrientedBoundingBox(undefined, 0.5, -0.5, 0.5, -0.5, 0.5, result);  }).toThrowDeveloperError();
        expect(function() { pl.extentsToOrientedBoundingBox(-0.5, undefined, -0.5, 0.5, -0.5, 0.5, result); }).toThrowDeveloperError();
        expect(function() { pl.extentsToOrientedBoundingBox(-0.5, 0.5, undefined, 0.5, -0.5, 0.5, result);  }).toThrowDeveloperError();
        expect(function() { pl.extentsToOrientedBoundingBox(-0.5, 0.5, -0.5, undefined, -0.5, 0.5, result); }).toThrowDeveloperError();
        expect(function() { pl.extentsToOrientedBoundingBox(-0.5, 0.5, -0.5, 0.5, undefined, 0.5, result);  }).toThrowDeveloperError();
        expect(function() { pl.extentsToOrientedBoundingBox(-0.5, 0.5, -0.5, 0.5, -0.5, undefined, result); }).toThrowDeveloperError();
    });

    it('projectPointsOntoEllipsoid works with an arbitrary ellipsoid using fromPoints', function () {
        var points = Cartesian3.fromDegreesArray([
            -72.0, 40.0,
            -68.0, 35.0,
            -75.0, 30.0,
            -70.0, 30.0,
            -68.0, 40.0
        ]);

        var tangentPlane = EllipsoidTangentPlane.fromPoints(points, Ellipsoid.WGS84);
        var points2D = tangentPlane.projectPointsOntoPlane(points);
        var positionsBack = tangentPlane.projectPointsOntoEllipsoid(points2D);

        expect(positionsBack[0].x).toBeCloseTo(points[0].x);
        expect(positionsBack[0].y).toBeCloseTo(points[0].y);
        expect(positionsBack[0].z).toBeCloseTo(points[0].z);
    });

    it('extentsToOrientedBoundingBox works with some edge-ish cases', function() {
        var res, exp;
        var result = new OrientedBoundingBox();
        var ellipsoid;

        ellipsoid = Ellipsoid.UNIT_SPHERE;
        res = new EllipsoidTangentPlane(Cartesian3.UNIT_X, ellipsoid).extentsToOrientedBoundingBox(-0.3, 0.3, -0.3, 0.3, -0.3, 0.3, res);
        exp = new OrientedBoundingBox(Cartesian3.UNIT_X,
            new Matrix3(0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.0, 0.3, 0.0));
        expect(res.center).toEqualEpsilon(exp.center, CesiumMath.EPSILON15);
        expect(res.halfAxes).toEqualEpsilon(exp.halfAxes, CesiumMath.EPSILON15);

        ellipsoid = Ellipsoid.UNIT_SPHERE;
        res = new EllipsoidTangentPlane(Cartesian3.UNIT_Z, ellipsoid).extentsToOrientedBoundingBox(-0.3, 0.3, -0.3, 0.3, -0.3, 0.3, res);
        expect(res.center).toEqualEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON15);

        ellipsoid = Ellipsoid.UNIT_SPHERE;
        res = new EllipsoidTangentPlane(Cartesian3.UNIT_Y, ellipsoid).extentsToOrientedBoundingBox(-0.3, 0.3, -0.3, 0.3, -0.3, 0.3, res);
        exp = new OrientedBoundingBox(Cartesian3.UNIT_Y,
            new Matrix3(-0.3, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.3, 0.0));
        expect(res.center).toEqualEpsilon(exp.center, CesiumMath.EPSILON15);
        expect(res.halfAxes).toEqualEpsilon(exp.halfAxes, CesiumMath.EPSILON15);

        ellipsoid = Ellipsoid.UNIT_SPHERE;
        res = new EllipsoidTangentPlane(Cartesian3.UNIT_X, ellipsoid).extentsToOrientedBoundingBox(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, res);
        exp = new OrientedBoundingBox(Cartesian3.UNIT_X,
                new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0));
        expect(res.center).toEqualEpsilon(exp.center, CesiumMath.EPSILON15);
        expect(res.halfAxes).toEqualEpsilon(exp.halfAxes, CesiumMath.EPSILON15);
    });
});
