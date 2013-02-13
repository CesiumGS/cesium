/*global defineSuite*/
defineSuite([
         'Core/Transforms',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid',
         'Core/JulianDate',
         'Core/Matrix3',
         'Core/Matrix4',
         'Core/Math',
         'Core/Quaternion',
         'Core/TimeConstants'
     ], function(
         Transforms,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Ellipsoid,
         JulianDate,
         Matrix3,
         Matrix4,
         CesiumMath,
         Quaternion,
         TimeConstants) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('eastNorthUpToFixedFrame works without a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);

        var returnedResult = Transforms.eastNorthUpToFixedFrame(origin, Ellipsoid.UNIT_SPHERE);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_Z); // north
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_X); // up
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('eastNorthUpToFixedFrame works with a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);
        var result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

        var returnedResult = Transforms.eastNorthUpToFixedFrame(origin, Ellipsoid.UNIT_SPHERE, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_Z); // north
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_X); // up
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('eastNorthUpToFixedFrame works at the north pole', function() {
        var northPole = new Cartesian3(0.0, 0.0, 1.0);
        var expectedTranslation = new Cartesian4(northPole.x, northPole.y, northPole.z, 1.0);

        var result = new Matrix4();
        var returnedResult = Transforms.eastNorthUpToFixedFrame(northPole, Ellipsoid.UNIT_SPHERE, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_X.negate()); // north
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_Z); // up
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('eastNorthUpToFixedFrame works at the south pole', function() {
        var southPole = new Cartesian3(0.0, 0.0, -1.0);
        var expectedTranslation = new Cartesian4(southPole.x, southPole.y, southPole.z, 1.0);

        var returnedResult = Transforms.eastNorthUpToFixedFrame(southPole, Ellipsoid.UNIT_SPHERE);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_X); // north
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_Z.negate()); // up
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works without a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);

        var returnedResult = Transforms.northEastDownToFixedFrame(origin, Ellipsoid.UNIT_SPHERE);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_Z); // north
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_X.negate()); // down
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works with a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);
        var result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

        var returnedResult = Transforms.northEastDownToFixedFrame(origin, Ellipsoid.UNIT_SPHERE, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_Z); // north
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_X.negate()); // down
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works at the north pole', function() {
        var northPole = new Cartesian3(0.0, 0.0, 1.0);
        var expectedTranslation = new Cartesian4(northPole.x, northPole.y, northPole.z, 1.0);

        var result = new Matrix4();
        var returnedResult = Transforms.northEastDownToFixedFrame(northPole, Ellipsoid.UNIT_SPHERE, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_X.negate()); // north
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_Z.negate()); // down
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works at the south pole', function() {
        var southPole = new Cartesian3(0.0, 0.0, -1.0);
        var expectedTranslation = new Cartesian4(southPole.x, southPole.y, southPole.z, 1.0);

        var returnedResult = Transforms.northEastDownToFixedFrame(southPole, Ellipsoid.UNIT_SPHERE);
        expect(returnedResult.getColumn(0)).toEqual(Cartesian4.UNIT_X); // north
        expect(returnedResult.getColumn(1)).toEqual(Cartesian4.UNIT_Y); // east
        expect(returnedResult.getColumn(2)).toEqual(Cartesian4.UNIT_Z); // down
        expect(returnedResult.getColumn(3)).toEqual(expectedTranslation); // translation
    });

    it('computeTemeToPseudoFixedMatrix works before noon', function() {
        var time = new JulianDate();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.getSecondsOfDay();
        time = time.addSeconds(secondsDiff);

        var t = Transforms.computeTemeToPseudoFixedMatrix(time);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(t4.inverse()).toEqualEpsilon(t4.inverseTransformation(), CesiumMath.EPSILON14);

        time = time.addHours(23.93447); // add one sidereal day
        var u = Transforms.computeTemeToPseudoFixedMatrix(time);
        var tAngle = Quaternion.fromRotationMatrix(t).getAngle();
        var uAngle = Quaternion.fromRotationMatrix(u).getAngle();
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    it('computeTemeToPseudoFixedMatrix works after noon', function() {
        var time = new JulianDate();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.getSecondsOfDay();
        time = time.addSeconds(secondsDiff + TimeConstants.SECONDS_PER_DAY * 0.5);

        var t = Transforms.computeTemeToPseudoFixedMatrix(time);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(t4.inverse()).toEqualEpsilon(t4.inverseTransformation(), CesiumMath.EPSILON14);

        time = time.addHours(23.93447); // add one sidereal day
        var u = Transforms.computeTemeToPseudoFixedMatrix(time);
        var tAngle = Quaternion.fromRotationMatrix(t).getAngle();
        var uAngle = Quaternion.fromRotationMatrix(u).getAngle();
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    it('computeTemeToPseudoFixedMatrix works with a result parameter', function() {
        var time = new JulianDate();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.getSecondsOfDay();
        time = time.addSeconds(secondsDiff);

        var resultT = new Matrix3();
        var t = Transforms.computeTemeToPseudoFixedMatrix(time, resultT);
        expect(t).toBe(resultT);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(t4.inverse()).toEqualEpsilon(t4.inverseTransformation(), CesiumMath.EPSILON14);

        time = time.addHours(23.93447); // add one sidereal day
        var resultU = new Matrix3();
        var u = Transforms.computeTemeToPseudoFixedMatrix(time, resultU);
        expect(u).toBe(resultU);
        var tAngle = Quaternion.fromRotationMatrix(t).getAngle();
        var uAngle = Quaternion.fromRotationMatrix(u).getAngle();
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    var width = 1024.0;
    var height = 768.0;
    var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
    var vpTransform = Matrix4.computeViewportTransformation({
        width : width,
        height : height
    });

    it('pointToWindowCoordinates works at the center', function() {
        var view = Matrix4.fromCamera({
            eye : Cartesian3.UNIT_X.multiplyByScalar(2.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = perspective.multiply(view);

        var expected = new Cartesian2(width * 0.5, height * 0.5);
        var returnedResult = Transforms.pointToWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO);
        expect(returnedResult).toEqual(expected);
    });

    it('pointToWindowCoordinates works with a result parameter', function() {
        var view = Matrix4.fromCamera({
            eye : Cartesian3.UNIT_X.multiplyByScalar(2.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = perspective.multiply(view);

        var expected = new Cartesian2(width * 0.5, height * 0.5);
        var result = new Cartesian2();
        var returnedResult = Transforms.pointToWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(expected);
    });

    it('pointToWindowCoordinates works at the lower left', function() {
        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = z / perspective[Matrix4.COLUMN0ROW0];
        var y = z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);

        var expected = new Cartesian2(0.0, 0.0);
        var returnedResult = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('pointToWindowCoordinates works at the upper right', function() {
        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = -z / perspective[Matrix4.COLUMN0ROW0];
        var y = -z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(width, height);

        var returnedResult = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('eastNorthUpToFixedFrame throws without an origin', function() {
        expect(function() {
            Transforms.eastNorthUpToFixedFrame(undefined, Ellipsoid.WGS84);
        }).toThrow();
    });

    it('northEastDownToFixedFrame throws without an origin', function() {
        expect(function() {
            Transforms.northEastDownToFixedFrame(undefined, Ellipsoid.WGS84);
        }).toThrow();
    });

    it('computeTemeToPseudoFixedMatrix throws without a date', function() {
        expect(function() {
            Transforms.computeTemeToPseudoFixedMatrix(undefined);
        }).toThrow();
    });

    it('pointToWindowCoordinates throws without modelViewProjectionMatrix', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(undefined, Matrix4.IDENTITY, Cartesian3.ZERO);
        }).toThrow();
    });

    it('pointToWindowCoordinates throws without viewportTransformation', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY, undefined, Cartesian3.ZERO);
        }).toThrow();
    });

    it('pointToWindowCoordinates throws without a point', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY, Matrix4.IDENTITY, undefined);
        }).toThrow();
    });
});