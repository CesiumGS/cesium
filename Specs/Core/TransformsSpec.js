/*global defineSuite*/
defineSuite([
         'Core/Transforms',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid',
         'Core/JulianDate',
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
         Matrix4,
         CesiumMath,
         Quaternion,
         TimeConstants) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('creates an east-north-up-to-fixed-frame matrix', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn(2).equals(Cartesian4.UNIT_X)).toEqual(true); // up
        expect(m.getColumn(3).equals(new Cartesian4(1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix at altitude', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(2.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn(2).equals(Cartesian4.UNIT_X)).toEqual(true); // up
        expect(m.getColumn(3).equals(new Cartesian4(2.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix 2', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(-1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Y.negate())).toEqual(true); // east
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn(2).equals(Cartesian4.UNIT_X.negate())).toEqual(true); // up
        expect(m.getColumn(3).equals(new Cartesian4(-1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix at north pole', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(0.0, 0.0, 1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(1).equals(Cartesian4.UNIT_X.negate())).toEqual(true); // north
        expect(m.getColumn(2).equals(Cartesian4.UNIT_Z)).toEqual(true); // up
        expect(m.getColumn(3).equals(new Cartesian4(0.0, 0.0, 1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix at south pole', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(0.0, 0.0, -1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(1).equals(Cartesian4.UNIT_X)).toEqual(true); // north
        expect(m.getColumn(2).equals(Cartesian4.UNIT_Z.negate())).toEqual(true); // up
        expect(m.getColumn(3).equals(new Cartesian4(0.0, 0.0, -1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(2).equals(Cartesian4.UNIT_X.negate())).toEqual(true); // down
        expect(m.getColumn(3).equals(new Cartesian4(1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix at altitude', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(2.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(2).equals(Cartesian4.UNIT_X.negate())).toEqual(true); // down
        expect(m.getColumn(3).equals(new Cartesian4(2.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix 2', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(-1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Y.negate())).toEqual(true); // east
        expect(m.getColumn(2).equals(Cartesian4.UNIT_X)).toEqual(true); // down
        expect(m.getColumn(3).equals(new Cartesian4(-1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix at north pole', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(0.0, 0.0, 1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_X.negate())).toEqual(true); // north
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(2).equals(Cartesian4.UNIT_Z.negate())).toEqual(true); // down
        expect(m.getColumn(3).equals(new Cartesian4(0.0, 0.0, 1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix at south pole', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(0.0, 0.0, -1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn(0).equals(Cartesian4.UNIT_X)).toEqual(true); // north
        expect(m.getColumn(1).equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn(2).equals(Cartesian4.UNIT_Z)).toEqual(true); // down
        expect(m.getColumn(3).equals(new Cartesian4(0.0, 0.0, -1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix without a position throws', function() {
        expect(function() {
            Transforms.eastNorthUpToFixedFrame();
        }).toThrow();
    });

    it('creates an north-east-down-to-fixed-fram matrix without a position throws', function() {
        expect(function() {
            Transforms.northEastDownToFixedFrame();
        }).toThrow();
    });

    it('compute TEME to pseudo-fixed matrix without a date throws', function() {
        expect(function() {
            Transforms.computeTemeToPseudoFixedMatrix();
        }).toThrow();
    });

    it('compute TEME to pseudo-fixed matrix am', function() {
        var time = new JulianDate();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.getSecondsOfDay();
        time = time.addSeconds(secondsDiff);

        var t = Transforms.computeTemeToPseudoFixedMatrix(time);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(t4.inverse().equalsEpsilon(t4.inverseTransformation(), CesiumMath.EPSILON14)).toEqual(true);

        time = time.addHours(23.93447); // add one sidereal day
        var u = Transforms.computeTemeToPseudoFixedMatrix(time);
        var tAngle = Quaternion.fromRotationMatrix(t).getAngle();
        var uAngle = Quaternion.fromRotationMatrix(u).getAngle();
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    it('compute TEME to pseudo-fixed matrix pm', function() {
        var time = new JulianDate();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.getSecondsOfDay();
        time = time.addSeconds(secondsDiff + TimeConstants.SECONDS_PER_DAY * 0.5);

        var t = Transforms.computeTemeToPseudoFixedMatrix(time);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(t4.inverse().equalsEpsilon(t4.inverseTransformation(), CesiumMath.EPSILON14)).toEqual(true);

        time = time.addHours(23.93447); // add one sidereal day
        var u = Transforms.computeTemeToPseudoFixedMatrix(time);
        var tAngle = Quaternion.fromRotationMatrix(t).getAngle();
        var uAngle = Quaternion.fromRotationMatrix(u).getAngle();
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    it('transform point to window coordinates without a model-view-projection matrix throws', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates();
        }).toThrow();
    });

    it('transform point to window coordinates without a viewport transformation throws', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY);
        }).toThrow();
    });

    it('transform point to window coordinates without a point throws', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY, Matrix4.IDENTITY);
        }).toThrow();
    });

    it('transform point to window coordinates center', function() {
        var width = 1024.0;
        var height = 768.0;
        var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
        var view = Matrix4.fromCamera({
            eye : Cartesian3.UNIT_X.multiplyByScalar(2.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = perspective.multiply(view);
        var vpTransform = Matrix4.computeViewportTransformation(
            {
                width : width,
                height : height
            });
        var expected = new Cartesian2(width * 0.5, height * 0.5);
        expect(Transforms.pointToWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO)).toEqual(expected);
    });

    it('transform point to window coordinates lower left', function() {
        var width = 1024.0;
        var height = 768.0;
        var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
        var vpTransform = Matrix4.computeViewportTransformation(
            {
                width : width,
                height : height
            });

        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = z / perspective[Matrix4.COLUMN0ROW0];
        var y = z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(0.0, 0.0);
        var actual = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);

        expect(actual.equalsEpsilon(expected, CesiumMath.EPSILON12)).toEqual(true);
    });

    it('transform point to window coordinates upper right', function() {
        var width = 1024.0;
        var height = 768.0;
        var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
        var vpTransform = Matrix4.computeViewportTransformation(
            {
                width : width,
                height : height
            });

        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = -z / perspective[Matrix4.COLUMN0ROW0];
        var y = -z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(width, height);
        var actual = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);

        expect(actual.equalsEpsilon(expected, CesiumMath.EPSILON12)).toEqual(true);
    });

});