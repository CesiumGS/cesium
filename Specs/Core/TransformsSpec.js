/*global defineSuite*/
defineSuite([
        'Core/Transforms',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/defined',
        'Core/DeveloperError',
        'Core/EarthOrientationParameters',
        'Core/Ellipsoid',
        'Core/Iau2006XysData',
        'Core/JulianDate',
        'Core/loadJson',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'Core/TimeConstants',
        'Core/TimeInterval',
        'ThirdParty/when'
    ], function(
        Transforms,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defined,
        DeveloperError,
        EarthOrientationParameters,
        Ellipsoid,
        Iau2006XysData,
        JulianDate,
        loadJson,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        TimeConstants,
        TimeInterval,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var negativeX = new Cartesian4(-1, 0, 0, 0);
    var negativeZ = new Cartesian4(0, 0, -1, 0);
    it('eastNorthUpToFixedFrame works without a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);

        var returnedResult = Transforms.eastNorthUpToFixedFrame(origin, Ellipsoid.UNIT_SPHERE);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // north
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // up
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('eastNorthUpToFixedFrame works with a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);
        var result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

        var returnedResult = Transforms.eastNorthUpToFixedFrame(origin, Ellipsoid.UNIT_SPHERE, result);
        expect(result).toBe(returnedResult);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // north
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // up
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('eastNorthUpToFixedFrame works at the north pole', function() {
        var northPole = new Cartesian3(0.0, 0.0, 1.0);
        var expectedTranslation = new Cartesian4(northPole.x, northPole.y, northPole.z, 1.0);

        var result = new Matrix4();
        var returnedResult = Transforms.eastNorthUpToFixedFrame(northPole, Ellipsoid.UNIT_SPHERE, result);
        expect(returnedResult).toBe(result);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(negativeX); // north
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // up
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('eastNorthUpToFixedFrame works at the south pole', function() {
        var southPole = new Cartesian3(0.0, 0.0, -1.0);
        var expectedTranslation = new Cartesian4(southPole.x, southPole.y, southPole.z, 1.0);

        var returnedResult = Transforms.eastNorthUpToFixedFrame(southPole, Ellipsoid.UNIT_SPHERE);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // north
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(negativeZ); // up
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works without a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);

        var returnedResult = Transforms.northEastDownToFixedFrame(origin, Ellipsoid.UNIT_SPHERE);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(negativeX); // down
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works with a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);
        var result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

        var returnedResult = Transforms.northEastDownToFixedFrame(origin, Ellipsoid.UNIT_SPHERE, result);
        expect(result).toBe(returnedResult);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(negativeX); // down
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works at the north pole', function() {
        var northPole = new Cartesian3(0.0, 0.0, 1.0);
        var expectedTranslation = new Cartesian4(northPole.x, northPole.y, northPole.z, 1.0);

        var result = new Matrix4();
        var returnedResult = Transforms.northEastDownToFixedFrame(northPole, Ellipsoid.UNIT_SPHERE, result);
        expect(returnedResult).toBe(result);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(negativeX); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(negativeZ); // down
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northEastDownToFixedFrame works at the south pole', function() {
        var southPole = new Cartesian3(0.0, 0.0, -1.0);
        var expectedTranslation = new Cartesian4(southPole.x, southPole.y, southPole.z, 1.0);

        var returnedResult = Transforms.northEastDownToFixedFrame(southPole, Ellipsoid.UNIT_SPHERE);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // down
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northUpEastToFixedFrame works without a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);

        var returnedResult = Transforms.northUpEastToFixedFrame(origin, Ellipsoid.UNIT_SPHERE);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // up
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northUpEastToFixedFrame works with a result parameter', function() {
        var origin = new Cartesian3(1.0, 0.0, 0.0);
        var expectedTranslation = new Cartesian4(origin.x, origin.y, origin.z, 1.0);
        var result = new Matrix4(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);

        var returnedResult = Transforms.northUpEastToFixedFrame(origin, Ellipsoid.UNIT_SPHERE, result);
        expect(result).toBe(returnedResult);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // up
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northUpEastToFixedFrame works at the north pole', function() {
        var northPole = new Cartesian3(0.0, 0.0, 1.0);
        var expectedTranslation = new Cartesian4(northPole.x, northPole.y, northPole.z, 1.0);

        var result = new Matrix4();
        var returnedResult = Transforms.northUpEastToFixedFrame(northPole, Ellipsoid.UNIT_SPHERE, result);
        expect(returnedResult).toBe(result);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(negativeX); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(Cartesian4.UNIT_Z); // up
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('northUpEastToFixedFrame works at the south pole', function() {
        var southPole = new Cartesian3(0.0, 0.0, -1.0);
        var expectedTranslation = new Cartesian4(southPole.x, southPole.y, southPole.z, 1.0);

        var returnedResult = Transforms.northUpEastToFixedFrame(southPole, Ellipsoid.UNIT_SPHERE);
        expect(Matrix4.getColumn(returnedResult, 0, new Cartesian4())).toEqual(Cartesian4.UNIT_X); // north
        expect(Matrix4.getColumn(returnedResult, 1, new Cartesian4())).toEqual(negativeZ); // up
        expect(Matrix4.getColumn(returnedResult, 2, new Cartesian4())).toEqual(Cartesian4.UNIT_Y); // east
        expect(Matrix4.getColumn(returnedResult, 3, new Cartesian4())).toEqual(expectedTranslation); // translation
    });

    it('computeTemeToPseudoFixedMatrix works before noon', function() {
        var time = JulianDate.now();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.secondsOfDay;
        time = JulianDate.addSeconds(time, secondsDiff, new JulianDate());

        var t = Transforms.computeTemeToPseudoFixedMatrix(time);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO, new Matrix4());
        expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(Matrix4.inverseTransformation(t4, new Matrix4()), CesiumMath.EPSILON14);

        time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
        var u = Transforms.computeTemeToPseudoFixedMatrix(time);
        var tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
        var uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    it('computeTemeToPseudoFixedMatrix works after noon', function() {
        var time = JulianDate.now();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.secondsOfDay;
        time = JulianDate.addSeconds(time, secondsDiff + TimeConstants.SECONDS_PER_DAY * 0.5, new JulianDate());

        var t = Transforms.computeTemeToPseudoFixedMatrix(time);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(Matrix4.inverseTransformation(t4, new Matrix4()), CesiumMath.EPSILON14);

        time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
        var u = Transforms.computeTemeToPseudoFixedMatrix(time);
        var tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
        var uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    it('computeTemeToPseudoFixedMatrix works with a result parameter', function() {
        var time = JulianDate.now();
        var secondsDiff = TimeConstants.SECONDS_PER_DAY - time.secondsOfDay;
        time = JulianDate.addSeconds(time, secondsDiff, new JulianDate());

        var resultT = new Matrix3();
        var t = Transforms.computeTemeToPseudoFixedMatrix(time, resultT);
        expect(t).toBe(resultT);

        // rotation matrix determinants are 1.0
        var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
        expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(Matrix4.inverseTransformation(t4, new Matrix4()), CesiumMath.EPSILON14);

        time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
        var resultU = new Matrix3();
        var u = Transforms.computeTemeToPseudoFixedMatrix(time, resultU);
        expect(u).toBe(resultU);
        var tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
        var uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
        expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);
    });

    describe('computeIcrfToFixedMatrix', function() {
        function preloadTransformationData(start, stop, eopDescription) {
            var ready = false;
            var failed = false;

            runs(function() {
                Transforms.earthOrientationParameters = new EarthOrientationParameters(eopDescription);
                var preloadInterval = new TimeInterval({
                    start : start,
                    stop : stop
                });
                when(Transforms.preloadIcrfFixed(preloadInterval), function() {
                    ready = true;
                }, function() {
                    failed = true;
                });
            });

            waitsFor(function() {
                if (failed) {
                    throw new DeveloperError('Preload of ICRF data failed.');
                }
                return ready;
            });
        }

        it('throws if the date parameter is not specified', function() {
            expect(function() {
                Transforms.computeIcrfToFixedMatrix(undefined);
            }).toThrowDeveloperError();

            expect(function() {
                Transforms.computeFixedToIcrfMatrix(undefined);
            }).toThrowDeveloperError();
        });

        it('works with data from STK Components', function() {
            // This data set represents a set of data encompassing the corresponding EOP data below.
            // The rotation data from Components span before and after the EOP data so as to test
            // what happens when we try evaluating at times when we don't have EOP as well as at
            // times where we do.  The samples are not at exact EOP times, in order to test interpolation.
            var componentsData;
            when(loadJson('Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json'), function(dataResult) {
                componentsData = dataResult;
            });

            waitsFor(function() {
                return defined(componentsData);
            });

            runs(function() {
                var start = JulianDate.fromIso8601(componentsData[0].date);
                var stop = JulianDate.fromIso8601(componentsData[componentsData.length - 1].date);

                preloadTransformationData(start, stop, {
                    url : 'Data/EarthOrientationParameters/EOP-2011-July.json'
                });
            });

            runs(function() {

                for ( var i = 0; i < componentsData.length; ++i) {

                    var time = JulianDate.fromIso8601(componentsData[i].date);
                    var resultT = new Matrix3();
                    var t = Transforms.computeIcrfToFixedMatrix(time, resultT);
                    expect(t).toBe(resultT);

                    // rotation matrix determinants are 1.0
                    var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
                    expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

                    // rotation matrix inverses are equal to its transpose
                    var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
                    expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(Matrix4.inverseTransformation(t4, new Matrix4()), CesiumMath.EPSILON14);

                    var expectedMtx = Matrix3.fromQuaternion(Quaternion.conjugate(componentsData[i].icrfToFixedQuaternion, new Quaternion()));
                    var testInverse = Matrix3.multiply(Matrix3.transpose(t, new Matrix3()), expectedMtx, new Matrix3());
                    var testDiff = new Matrix3();
                    for ( var k = 0; k < 9; k++) {
                        testDiff[k] = t[k] - expectedMtx[k];
                    }
                    expect(testInverse).toEqualEpsilon(Matrix3.IDENTITY, CesiumMath.EPSILON14);
                    expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
                }
            });
        });

        it('works with hard-coded data', function() {
            // 2011-07-03 00:00:00 UTC
            var time = new JulianDate(2455745, 43200);

            preloadTransformationData(time, time, {
                url : 'Data/EarthOrientationParameters/EOP-2011-July.json'
            });

            runs(function() {
                var resultT = new Matrix3();
                var t = Transforms.computeIcrfToFixedMatrix(time, resultT);
                expect(t).toBe(resultT);

                // rotation matrix determinants are 1.0
                var det = t[0] * t[4] * t[8] + t[3] * t[7] * t[2] + t[6] * t[1] * t[5] - t[6] * t[4] * t[2] - t[3] * t[1] * t[8] - t[0] * t[7] * t[5];
                expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

                // rotation matrix inverses are equal to its transpose
                var t4 = Matrix4.fromRotationTranslation(t, Cartesian3.ZERO);
                expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(Matrix4.inverseTransformation(t4, new Matrix4()), CesiumMath.EPSILON14);

                time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
                var resultU = new Matrix3();
                var u = Transforms.computeIcrfToFixedMatrix(time, resultU);
                expect(u).toBe(resultU);
                var tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
                var uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
                expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);

                // The rotation matrix from STK Components corresponding to the time and data inputs above
                var expectedMtx = new Matrix3(0.18264414843630006, -0.98317906144315947, -0.00021950336420248503, 0.98317840915224974, 0.18264428011734501, -0.0011325710874539787, 0.0011536112127187594, -0.0000089534866085598909, 0.99999933455028112);

                var testInverse = Matrix3.multiply(Matrix3.transpose(t, new Matrix3()), expectedMtx, new Matrix3());
                var testDiff = new Matrix3();
                for ( var i = 0; i < 9; i++) {
                    testDiff[i] = t[i] - expectedMtx[i];
                }
                expect(testInverse).toEqualEpsilon(Matrix3.IDENTITY, CesiumMath.EPSILON14);
                expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
            });
        });

        it('works over day boundary', function() {

            var time = new JulianDate(2455745, 86395);

            preloadTransformationData(time, time, {
                url : 'Data/EarthOrientationParameters/EOP-2011-July.json'
            });

            runs(function() {
                var resultT = new Matrix3();
                var t = Transforms.computeIcrfToFixedMatrix(time, resultT);

                // The rotation matrix from STK Components corresponding to the time and data inputs above
                var expectedMtx = new Matrix3(-0.19073578935932833, 0.98164138366748721, 0.00022919174269963536, -0.98164073712836186, -0.19073592679333939, 0.0011266944449015753, 0.0011497249933208494, -0.000010082996932331842, 0.99999933901516791);

                var testInverse = Matrix3.multiply(Matrix3.transpose(t, new Matrix3()), expectedMtx, new Matrix3());
                var testDiff = new Matrix3();
                for ( var i = 0; i < 9; i++) {
                    testDiff[i] = t[i] - expectedMtx[i];
                }
                expect(testInverse).toEqualEpsilon(Matrix3.IDENTITY, CesiumMath.EPSILON14);
                expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
            });
        });

        it('works over day boundary backwards', function() {
            var time = new JulianDate(2455745, 10);

            preloadTransformationData(time, time, {
                url : 'Data/EarthOrientationParameters/EOP-2011-July.json'
            });

            runs(function() {
                var resultT = new Matrix3();
                var t = Transforms.computeIcrfToFixedMatrix(time, resultT);

                //The rotation matrix from STK Components corresponding to the time and data inputs above
                var expectedMtx = new Matrix3(-0.17489910479510423, 0.984586338811966, 0.00021110831245616662, -0.98458569065286827, -0.17489923190143036, 0.0011297972845023996, 0.0011493056536445096, -0.00001025368996280683, 0.99999933949547);

                var testInverse = Matrix3.multiply(Matrix3.transpose(t, new Matrix3()), expectedMtx, new Matrix3());
                var testDiff = new Matrix3();
                for ( var i = 0; i < 9; i++) {
                    testDiff[i] = t[i] - expectedMtx[i];
                }
                expect(testInverse).toEqualEpsilon(Matrix3.IDENTITY, CesiumMath.EPSILON14);
                expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
            });
        });

        it('works with position rotation', function() {
            // GEO Satellite position
            var inertialPos = new Cartesian3(-7322101.15395708, -41525699.1558387, 0);
            // The following is the value computed by STK Components for the date specified below
            var expectedFixedPos = new Cartesian3(39489858.9917795, -14783363.192887, -8075.05820056297);

            // 2011-07-03 00:00:00 UTC
            var time = new JulianDate(2455745, 43200);

            preloadTransformationData(time, time, {
                url : 'Data/EarthOrientationParameters/EOP-2011-July.json'
            });

            runs(function() {
                var resultT = new Matrix3();
                var t = Transforms.computeIcrfToFixedMatrix(time, resultT);

                var result = Matrix3.multiplyByVector(t, inertialPos, new Cartesian3());
                var error = Cartesian3.subtract(result, expectedFixedPos, new Cartesian3());

                // Given the magnitude of the positions involved (1e8)
                // this tolerance represents machine precision
                expect(error).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON7);
            });
        });

        it('undefined prior to 1974', function() {
            // 1970 jan 1 0h UTC
            var time = new JulianDate(2440587, 43200);
            // Purposefully do not load EOP!  EOP doesn't make a lot of sense before 1972.
            // Even though we are trying to load the data for 1970,
            // we don't have the data in Cesium to load.
            preloadTransformationData(time, JulianDate.addDays(time, 1, new JulianDate()));
            var resultT = new Matrix3();
            var t = Transforms.computeIcrfToFixedMatrix(time, resultT);
            // Check that we get undefined, since we don't have ICRF data
            expect(t).toEqual(undefined);
        });

        it('works after 2028', function() {
            // 2030 jan 1 0h UTC
            var time = new JulianDate(2462502, 43200);
            // Purposefully do not load EOP!  EOP doesn't exist yet that far into the future
            // Even though we are trying to load the data for 2030,
            // we don't have the data in Cesium to load.
            preloadTransformationData(time, JulianDate.addDays(time, 1, new JulianDate()));
            var resultT = new Matrix3();
            var t = Transforms.computeIcrfToFixedMatrix(time, resultT);
            // Check that we get undefined, since we don't have ICRF data
            expect(t).toEqual(undefined);
        });

        it('works without EOP data loaded', function() {
            // GEO Satellite position
            var inertialPos = new Cartesian3(-7322101.15395708, -41525699.1558387, 0);
            // The following is the value computed by STK Components for the date specified below
            var expectedFixedPos = new Cartesian3(39489545.7583001, -14784199.9085371, -8034.77037239318);

            // 2011-07-03 00:00:00 UTC
            var time = new JulianDate(2455745, 43200);

            preloadTransformationData(time, time, undefined);

            runs(function() {
                var resultT = new Matrix3();
                var t = Transforms.computeIcrfToFixedMatrix(time, resultT);

                var result = Matrix3.multiplyByVector(t, inertialPos, new Cartesian3());
                var error = Cartesian3.subtract(result, expectedFixedPos, new Cartesian3());

                // Given the magnitude of the positions involved (1e8)
                // this tolerance represents machine precision
                expect(error).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON7);
            });
        });

        it('throws a RuntimeError when asked to compute with invalid EOP data', function() {
            // 2011-07-03 00:00:00 UTC
            var time = new JulianDate(2455745, 43200);

            preloadTransformationData(time, time, {
                url : 'Data/EarthOrientationParameters/EOP-Invalid.json'
            });

            runs(function() {
                expect(function() {
                    return Transforms.computeIcrfToFixedMatrix(time);
                }).toThrowRuntimeError();
            });
        });

        it('throws a RuntimeError when asked to compute with a missing EOP data file', function() {
            // 2011-07-03 00:00:00 UTC
            var time = new JulianDate(2455745, 43200);

            preloadTransformationData(time, time, {
                url : 'Data/EarthOrientationParameters/EOP-DoesNotExist.json'
            });

            runs(function() {
                expect(function() {
                    return Transforms.computeIcrfToFixedMatrix(time);
                }).toThrowRuntimeError();
            });
        });

        it('returns undefined before XYS data is loaded.', function() {
            Transforms.earthOrientationParameters = new EarthOrientationParameters();
            Transforms.iau2006XysData = new Iau2006XysData();

            var time = new JulianDate(2455745, 43200);
            expect(Transforms.computeIcrfToFixedMatrix(time)).toBeUndefined();
        });

        it('returns undefined before EOP data is loaded.', function() {
            var time = new JulianDate(2455745, 43200);
            preloadTransformationData(time, time);

            runs(function() {
                expect(Transforms.computeIcrfToFixedMatrix(time)).toBeDefined();
                Transforms.earthOrientationParameters = new EarthOrientationParameters({
                    url : 'Data/EarthOrientationParameters/EOP-2011-July.json'
                });
                expect(Transforms.computeIcrfToFixedMatrix(time)).toBeUndefined();
            });
        });
    });

    var width = 1024.0;
    var height = 768.0;
    var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0, new Matrix4());
    var vpTransform = Matrix4.computeViewportTransformation({
        width : width,
        height : height
    }, 0, 1, new Matrix4());

    it('pointToGLWindowCoordinates works at the center', function() {
        var view = Matrix4.fromCamera({
            eye : Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0, new Cartesian3()),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

        var expected = new Cartesian2(width * 0.5, height * 0.5);
        var returnedResult = Transforms.pointToGLWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO);
        expect(returnedResult).toEqual(expected);
    });

    it('pointToGLWindowCoordinates works with a result parameter', function() {
        var view = Matrix4.fromCamera({
            eye : Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0, new Cartesian3()),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

        var expected = new Cartesian2(width * 0.5, height * 0.5);
        var result = new Cartesian2();
        var returnedResult = Transforms.pointToGLWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(expected);
    });

    it('pointToGLWindowCoordinates works at the lower left', function() {
        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = z / perspective[Matrix4.COLUMN0ROW0];
        var y = z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);

        var expected = new Cartesian2(0.0, 0.0);
        var returnedResult = Transforms.pointToGLWindowCoordinates(perspective, vpTransform, point);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('pointToGLWindowCoordinates works at the upper right', function() {
        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = -z / perspective[Matrix4.COLUMN0ROW0];
        var y = -z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(width, height);

        var returnedResult = Transforms.pointToGLWindowCoordinates(perspective, vpTransform, point);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('pointToWindowCoordinates works at the center', function() {
        var view = Matrix4.fromCamera({
            eye : Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0, new Cartesian3()),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

        var expected = new Cartesian2(width * 0.5, height * 0.5);
        var returnedResult = Transforms.pointToWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO);
        expect(returnedResult).toEqual(expected);
    });

    it('pointToWindowCoordinates works with a result parameter', function() {
        var view = Matrix4.fromCamera({
            eye : Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0, new Cartesian3()),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        });
        var mvpMatrix = Matrix4.multiply(perspective, view, new Matrix4());

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

        var expected = new Cartesian2(0.0, height);
        var returnedResult = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('pointToWindowCoordinates works at the upper right', function() {
        var z = -perspective[Matrix4.COLUMN3ROW2] / perspective[Matrix4.COLUMN2ROW2];
        var x = -z / perspective[Matrix4.COLUMN0ROW0];
        var y = -z / perspective[Matrix4.COLUMN1ROW1];
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(width, 0.0);

        var returnedResult = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON12);
    });

    it('eastNorthUpToFixedFrame throws without an origin', function() {
        expect(function() {
            Transforms.eastNorthUpToFixedFrame(undefined, Ellipsoid.WGS84);
        }).toThrowDeveloperError();
    });

    it('northEastDownToFixedFrame throws without an origin', function() {
        expect(function() {
            Transforms.northEastDownToFixedFrame(undefined, Ellipsoid.WGS84);
        }).toThrowDeveloperError();
    });

    it('computeTemeToPseudoFixedMatrix throws without a date', function() {
        expect(function() {
            Transforms.computeTemeToPseudoFixedMatrix(undefined);
        }).toThrowDeveloperError();
    });

    it('pointToWindowCoordinates throws without modelViewProjectionMatrix', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(undefined, Matrix4.IDENTITY, Cartesian3.ZERO);
        }).toThrowDeveloperError();
    });

    it('pointToWindowCoordinates throws without viewportTransformation', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY, undefined, Cartesian3.ZERO);
        }).toThrowDeveloperError();
    });

    it('pointToWindowCoordinates throws without a point', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY, Matrix4.IDENTITY, undefined);
        }).toThrowDeveloperError();
    });
});
