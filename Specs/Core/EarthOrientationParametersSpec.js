/*global defineSuite*/
defineSuite(['Core/EarthOrientationParameters',
             'Core/Transforms',
             'Core/DeveloperError',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Core/Cartesian4',
             'Core/Ellipsoid',
             'Core/JulianDate',
             'Core/Matrix3',
             'Core/Matrix4',
             'Core/Math',
             'Core/Quaternion',
             'Core/TimeConstants',
             'Core/TimeInterval',
             'ThirdParty/when',
             'Core/loadJson'
     ], function(
             EarthOrientationParameters,
             Transforms,
             DeveloperError,
             Cartesian2,
             Cartesian3,
             Cartesian4,
             Ellipsoid,
             JulianDate,
             Matrix3,
             Matrix4,
             CesiumMath,
             Quaternion,
             TimeConstants,
             TimeInterval,
             when,
             loadJson) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    describe('loading eop', function() {

        function linearInterp(dx, y1, y2) {
            return y1 + dx * (y2 - y1);
        }

        it('data interpolates correctly under normal circumstances', function() {
            var eopDescription = {
                url : undefined,
                data : {
                    'columnNames' : ['dateIso8601',
                                     'xPoleWanderRadians',
                                     'yPoleWanderRadians',
                                     'xCelestialPoleOffsetRadians',
                                     'yCelestialPoleOffsetRadians',
                                     'ut1MinusUtcSeconds',
                                     'taiMinusUtcSeconds',
                                     'lengthOfDayCorrectionSeconds'],
                    'samples' : ['2011-07-01T00:00:00Z', 2.117957047295119e-7, 2.111518721609984e-6, 3.393695767766752e-11, 3.3452143996557983e-10, -0.2908948, 34.0, -2.956e-4,
                                 '2011-07-02T00:00:00Z', 2.193297093339541e-7, 2.115460256837405e-6, -8.241832578862112e-11, 5.623838700870617e-10, -0.29065, 34.0, -1.824e-4,
                                 '2011-07-03T00:00:00Z', 2.262286080161428e-7, 2.1191157519929706e-6, -3.490658503988659e-10, 6.981317007977318e-10, -0.2905572, 34.0, 1.9e-6,
                                 '2011-07-04T00:00:00Z', 2.3411652660779493e-7, 2.122751854601292e-6, -6.205615118202061e-10, 7.853981633974483e-10, -0.2907007, 34.0, 2.695e-4]
                }
            };

            var eop = new EarthOrientationParameters(eopDescription);

            var date = JulianDate.fromIso8601('2011-07-02T12:34:56Z');
            var result = eop.compute(date);
            var nColumns = eopDescription.data.columnNames.length;
            var x0 = eopDescription.data.samples[1 * nColumns + 1];
            var x1 = eopDescription.data.samples[2 * nColumns + 1];
            var dt = JulianDate.fromIso8601(eopDescription.data.samples[nColumns]).getSecondsDifference(date) / 86400.0;
            var expected = linearInterp(dt, x0, x1);
            expect(result.xPoleWander).toEqualEpsilon(expected, 1e-22);
            x0 = eopDescription.data.samples[1 * nColumns + 2];
            x1 = eopDescription.data.samples[2 * nColumns + 2];
            expected = linearInterp(dt, x0, x1);
            expect(result.yPoleWander).toEqualEpsilon(expected, 1e-22);
            x0 = eopDescription.data.samples[1 * nColumns + 3];
            x1 = eopDescription.data.samples[2 * nColumns + 3];
            expected = linearInterp(dt, x0, x1);
            expect(result.xPoleOffset).toEqualEpsilon(expected, 1e-22);
            x0 = eopDescription.data.samples[1 * nColumns + 4];
            x1 = eopDescription.data.samples[2 * nColumns + 4];
            expected = linearInterp(dt, x0, x1);
            expect(result.yPoleOffset).toEqualEpsilon(expected, 1e-22);
        });
    });
});