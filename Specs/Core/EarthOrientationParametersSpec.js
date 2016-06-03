/*global defineSuite*/
defineSuite([
        'Core/EarthOrientationParameters',
        'Core/defined',
        'Core/JulianDate',
        'Core/TimeStandard'
    ], function(
        EarthOrientationParameters,
        defined,
        JulianDate,
        TimeStandard) {
    'use strict';

    var officialLeapSeconds;

    beforeAll(function() {
        officialLeapSeconds = JulianDate.leapSeconds.slice(0);
    });

    afterEach(function() {
        JulianDate.leapSeconds = officialLeapSeconds.slice(0);
    });

    it('adds leap seconds found in the data by default', function() {
        var eop = new EarthOrientationParameters({
            data : {
                'columnNames' : ['dateIso8601',
                                 'modifiedJulianDateUtc',
                                 'xPoleWanderRadians',
                                 'yPoleWanderRadians',
                                 'xCelestialPoleOffsetRadians',
                                 'yCelestialPoleOffsetRadians',
                                 'ut1MinusUtcSeconds',
                                 'taiMinusUtcSeconds',
                                 'lengthOfDayCorrectionSeconds'],
                'samples' : ['2011-08-25T00:00:00Z', 55798.0, 2.117957047295119e-7, 2.111518721609984e-6, 3.393695767766752e-11, 3.3452143996557983e-10, -0.2908948, 34.0, -2.956e-4,
                             '2011-08-26T00:00:00Z', 55799.0, 2.193297093339541e-7, 2.115460256837405e-6, -8.241832578862112e-11, 5.623838700870617e-10, -0.29065, 34.5, -1.824e-4,
                             '2011-08-27T00:00:00Z', 55800.0, 2.262286080161428e-7, 2.1191157519929706e-6, -3.490658503988659e-10, 6.981317007977318e-10, -0.2905572, 34.5, 1.9e-6,
                             '2011-08-28T00:00:00Z', 55801.0, 2.3411652660779493e-7, 2.122751854601292e-6, -6.205615118202061e-10, 7.853981633974483e-10, -0.2907007, 34.5, 2.695e-4]
            }
        });
        expect(eop).not.toBeNull();

        var leapSeconds = JulianDate.leapSeconds;
        expect(leapSeconds.length).toBe(officialLeapSeconds.length + 1);

        var newDate = new JulianDate(2455799.5, 34.5, TimeStandard.TAI);
        var foundNew = false;
        var previousDate;

        for (var i = 0, len = leapSeconds.length; i < len; ++i) {
            var leapSecond = leapSeconds[i];
            if (leapSecond.julianDate.equals(newDate)) {
                foundNew = true;
            }

            if (defined(previousDate)) {
                expect(JulianDate.compare(previousDate, leapSecond.julianDate)).toBeLessThan(0);
            }

            previousDate = leapSecond.julianDate;
        }

        expect(foundNew).toBe(true);
    });

    it('does not add leap seconds if told not to do so', function() {
        var eop = new EarthOrientationParameters({
            addNewLeapSeconds : false,
            data : {
                'columnNames' : ['dateIso8601',
                                 'modifiedJulianDateUtc',
                                 'xPoleWanderRadians',
                                 'yPoleWanderRadians',
                                 'xCelestialPoleOffsetRadians',
                                 'yCelestialPoleOffsetRadians',
                                 'ut1MinusUtcSeconds',
                                 'taiMinusUtcSeconds',
                                 'lengthOfDayCorrectionSeconds'],
                'samples' : ['2011-08-25T00:00:00Z', 55798.0, 2.117957047295119e-7, 2.111518721609984e-6, 3.393695767766752e-11, 3.3452143996557983e-10, -0.2908948, 35.0, -2.956e-4,
                             '2011-08-26T00:00:00Z', 55799.0, 2.193297093339541e-7, 2.115460256837405e-6, -8.241832578862112e-11, 5.623838700870617e-10, -0.29065, 36.0, -1.824e-4,
                             '2011-08-27T00:00:00Z', 55800.0, 2.262286080161428e-7, 2.1191157519929706e-6, -3.490658503988659e-10, 6.981317007977318e-10, -0.2905572, 36.0, 1.9e-6,
                             '2011-08-28T00:00:00Z', 55801.0, 2.3411652660779493e-7, 2.122751854601292e-6, -6.205615118202061e-10, 7.853981633974483e-10, -0.2907007, 36.0, 2.695e-4]
            }
        });
        expect(eop).not.toBeNull();

        var leapSeconds = JulianDate.leapSeconds;
        expect(leapSeconds.length).toBe(officialLeapSeconds.length);
    });

    describe('loading eop', function() {

        function linearInterp(dx, y1, y2) {
            return y1 + dx * (y2 - y1);
        }

        it('interpolates data correctly under normal circumstances', function() {
            var eopDescription = {
                url : undefined,
                data : {
                    'columnNames' : ['dateIso8601',
                                     'modifiedJulianDateUtc',
                                     'xPoleWanderRadians',
                                     'yPoleWanderRadians',
                                     'xCelestialPoleOffsetRadians',
                                     'yCelestialPoleOffsetRadians',
                                     'ut1MinusUtcSeconds',
                                     'taiMinusUtcSeconds',
                                     'lengthOfDayCorrectionSeconds'],
                    'samples' : ['2011-07-01T00:00:00Z', 55743.0, 2.117957047295119e-7, 2.111518721609984e-6, 3.393695767766752e-11, 3.3452143996557983e-10, -0.2908948, 34.0, -2.956e-4,
                                 '2011-07-02T00:00:00Z', 55744.0, 2.193297093339541e-7, 2.115460256837405e-6, -8.241832578862112e-11, 5.623838700870617e-10, -0.29065, 34.0, -1.824e-4,
                                 '2011-07-03T00:00:00Z', 55745.0, 2.262286080161428e-7, 2.1191157519929706e-6, -3.490658503988659e-10, 6.981317007977318e-10, -0.2905572, 34.0, 1.9e-6,
                                 '2011-07-04T00:00:00Z', 55746.0, 2.3411652660779493e-7, 2.122751854601292e-6, -6.205615118202061e-10, 7.853981633974483e-10, -0.2907007, 34.0, 2.695e-4]
                }
            };

            var eop = new EarthOrientationParameters(eopDescription);

            var date = JulianDate.fromIso8601('2011-07-02T12:34:56Z');
            var result = eop.compute(date);
            var nColumns = eopDescription.data.columnNames.length;
            var x0 = eopDescription.data.samples[1 * nColumns + 2];
            var x1 = eopDescription.data.samples[2 * nColumns + 2];
            var dt = JulianDate.secondsDifference(date, JulianDate.fromIso8601(eopDescription.data.samples[nColumns])) / 86400.0;
            var expected = linearInterp(dt, x0, x1);
            expect(result.xPoleWander).toEqualEpsilon(expected, 1e-22);
            x0 = eopDescription.data.samples[1 * nColumns + 3];
            x1 = eopDescription.data.samples[2 * nColumns + 3];
            expected = linearInterp(dt, x0, x1);
            expect(result.yPoleWander).toEqualEpsilon(expected, 1e-22);
            x0 = eopDescription.data.samples[1 * nColumns + 4];
            x1 = eopDescription.data.samples[2 * nColumns + 4];
            expected = linearInterp(dt, x0, x1);
            expect(result.xPoleOffset).toEqualEpsilon(expected, 1e-22);
            x0 = eopDescription.data.samples[1 * nColumns + 5];
            x1 = eopDescription.data.samples[2 * nColumns + 5];
            expected = linearInterp(dt, x0, x1);
            expect(result.yPoleOffset).toEqualEpsilon(expected, 1.0e-22);
            x0 = eopDescription.data.samples[1*nColumns + 6];
            x1 = eopDescription.data.samples[2*nColumns + 6];
            expected = linearInterp(dt, x0, x1);
            expect(result.ut1MinusUtc).toEqualEpsilon(expected, 1.0e-15);
        });

        it('interpolates UT1 correctly over a leap second', function() {
            var eopDescription = {
                    url : undefined,
                    data : {
                        "columnNames":['dateIso8601',
                                       'modifiedJulianDateUtc',
                                       'xPoleWanderRadians',
                                       'yPoleWanderRadians',
                                       'xCelestialPoleOffsetRadians',
                                       'yCelestialPoleOffsetRadians',
                                       'ut1MinusUtcSeconds',
                                       'taiMinusUtcSeconds',
                                       'lengthOfDayCorrectionSeconds'],
                        "samples":[
                                    "2008-12-30T00:00:00Z",54830.0,-4.6702101901281595e-8,6.989752766028624e-7,-7.80550026586353e-10,-1.052045688007693e-9,-0.5911461,33.0,5.7e-4,
                                    "2008-12-31T00:00:00Z",54831.0,-6.507169227852191e-8,7.02873178598983e-7,-7.80550026586353e-10,-1.8907733563271904e-9,-0.59187,33.0,8.303e-4,
                                    "2009-01-01T00:00:00Z",54832.0,-8.25443773457096e-8,7.089575902969077e-7,-8.047907106418297e-10,-2.0604581447155277e-9,0.4071533,34.0,0.0010604,
                                    "2009-01-02T00:00:00Z",54833.0,-9.884381330461219e-8,7.147559619229779e-7,-8.435758051305926e-10,-1.8228994409718553e-9,0.4059739,34.0,0.0012279,
                                    "2009-01-03T00:00:00Z",54834.0,-1.1269009203710055e-7,7.226826656091187e-7,-9.066015836748322e-10,-1.5029224114395617e-9,0.404674,34.0,0.0013014
                                    ]
                    }
            };

            var eop = new EarthOrientationParameters(eopDescription);
            var dateAtLeapSecond = JulianDate.fromIso8601("2009-01-01T00:00:00Z");
            var dateSlightlyBefore = JulianDate.addSeconds(dateAtLeapSecond, -1.0, new JulianDate());
            var dateSlightlyAfter = JulianDate.addSeconds(dateAtLeapSecond, 1.0, new JulianDate());
            var nColumns = eopDescription.data.columnNames.length;
            var x0 = eopDescription.data.samples[1*nColumns + 6];
            var x1 = eopDescription.data.samples[2*nColumns + 6];
            var x2 = eopDescription.data.samples[3*nColumns + 6];
            var t0 = JulianDate.fromIso8601(eopDescription.data.samples[nColumns]);
            var t1 = JulianDate.fromIso8601(eopDescription.data.samples[2*nColumns]);
            var dt = JulianDate.secondsDifference(dateSlightlyBefore, t0) / (86400.0 + 1);
            // Adjust for leap second when interpolating
            var expectedBefore = linearInterp(dt, x0, (x1 - 1));
            var resultBefore = eop.compute(dateSlightlyBefore);
            expect(resultBefore.ut1MinusUtc).toEqualEpsilon(expectedBefore, 1.0e-15);
            var expectedAt = eopDescription.data.samples[2*nColumns + 6];
            var resultAt = eop.compute(dateAtLeapSecond);
            expect(resultAt.ut1MinusUtc).toEqualEpsilon(expectedAt, 1.0e-15);
            dt = JulianDate.secondsDifference(dateSlightlyAfter, t1) / (86400.0);
            var expectedAfter = linearInterp(dt, x1, x2);
            var resultAfter = eop.compute(dateSlightlyAfter);
            expect(resultAfter.ut1MinusUtc).toEqualEpsilon(expectedAfter, 1.0e-15);
            // Check to make sure the values are (correctly) discontinuous
            expect(Math.abs(resultBefore.ut1MinusUtc - resultAfter.ut1MinusUtc) > 0.5).toEqual(true);
        });
    });
});
