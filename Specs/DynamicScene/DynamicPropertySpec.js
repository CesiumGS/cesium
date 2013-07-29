/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicProperty',
         'Core/JulianDate',
         'DynamicScene/CzmlBoolean',
         'DynamicScene/CzmlNumber',
         'DynamicScene/CzmlUnitQuaternion',
         'Core/Quaternion',
         'Core/Math',
         'Core/LinearApproximation',
         'Core/HermitePolynomialApproximation',
         'Core/LagrangePolynomialApproximation'
     ], function(
         DynamicProperty,
         JulianDate,
         CzmlBoolean,
         CzmlNumber,
         CzmlUnitQuaternion,
         Quaternion,
         CesiumMath,
         LinearApproximation,
         HermitePolynomialApproximation,
         LagrangePolynomialApproximation) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('Works with uninterpolatable value types.', function() {
        var dynamicProperty = new DynamicProperty(CzmlBoolean);

        var booleanConstant = true;

        var booleanVerbose = {
            boolean : false
        };

        var booleanInterval = {
            interval : '2012-04-18T16:00:00Z/2012-04-19T16:00:00Z',
            boolean : true
        };

        var booleanIntervalArray = [{
            interval : '2012-04-18T17:00:00Z/2012-04-18T18:00:00Z',
            boolean : true
        }, {
            interval : '2012-04-18T16:00:00Z/2012-04-18T16:05:00Z',
            boolean : true
        }];

        dynamicProperty.processCzmlIntervals(booleanConstant);
        expect(dynamicProperty.getValue(new JulianDate())).toEqual(true);

        dynamicProperty.processCzmlIntervals(booleanVerbose);
        expect(dynamicProperty.getValue(new JulianDate())).toEqual(false);

        dynamicProperty.processCzmlIntervals(booleanInterval);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T15:59:00Z'))).toEqual(false);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T16:00:00Z'))).toEqual(true);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-19T16:00:00Z'))).toEqual(true);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-19T16:01:00Z'))).toEqual(false);

        dynamicProperty.processCzmlIntervals(booleanIntervalArray);
        dynamicProperty.processCzmlIntervals(booleanVerbose);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T16:00:00Z'))).toEqual(false);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T17:30:00Z'))).toEqual(false);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T16:06:00Z'))).toEqual(false);
    });

    it('Works with interpolatable values (default linear interpolator).', function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(CzmlNumber);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0, 10, 10, 20, 20]
        };
        property.processCzmlIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(4))).toEqual(4);
        //Look inside to verify it's using LinearApproximation
        expect(property._intervals.get(0).data.interpolationAlgorithm).toEqual(LinearApproximation);
    });

    it('Works with interpolatable value types (specified linear interpolator).', function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(CzmlNumber);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0, 10, 10, 20, 20],
            interpolationAlgorithm : 'LINEAR',
            interpolationDegree : 1
        };
        property.processCzmlIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(4))).toEqual(4);
        //Look inside to verify it's using LinearApproximation
        expect(property._intervals.get(0).data.interpolationAlgorithm).toEqual(LinearApproximation);
    });

    it('Works with interpolatable value types (specified lagrange interpolator).', function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(CzmlNumber);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0, 10, 10, 20, 20, 30, 30, 40, 40, 50, 50],
            interpolationAlgorithm : 'LAGRANGE',
            interpolationDegree : 5
        };
        property.processCzmlIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(5))).toEqual(5);

        //Look inside to verify it's using LaGrange
        expect(property._intervals.get(0).data.interpolationAlgorithm).toEqual(LagrangePolynomialApproximation);
    });


    it('Works with interpolatable value types (specified hermite interpolator).', function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(CzmlNumber);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0, 10, 10, 20, 20, 30, 30, 40, 40, 50, 50],
            interpolationAlgorithm : 'HERMITE',
            interpolationDegree : 3
        };
        property.processCzmlIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(4))).toEqual(4);

        //Look inside to verify it's using Hermite
        expect(property._intervals.get(0).data.interpolationAlgorithm).toEqual(HermitePolynomialApproximation);
    });

    it('Works with custom packed value types.', function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(CzmlUnitQuaternion);

        var czmlInterval = {
            epoch : iso8601Epoch,
            unitQuaternion : [0, 1, 0, 0, 0, 10, 0, 1, 0, 0],
            interpolationAlgorithm : 'LINEAR',
            interpolationDegree : 1
        };
        property.processCzmlIntervals(czmlInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(1);
        expect(result.y).toEqual(0);
        expect(result.z).toEqual(0);
        expect(result.w).toEqual(0);

        result = property.getValue(epoch.addSeconds(5));
        var expected = new Quaternion(0.707106781186547, 0.707106781186548, 0, 0);
        expect(new Quaternion(result.x, result.y, result.z, result.w)).toEqualEpsilon(expected, CesiumMath.EPSILON15);

        result = property.getValue(epoch.addSeconds(10));
        expect(result.x).toEqual(0);
        expect(result.y).toEqual(1);
        expect(result.z).toEqual(0);
        expect(result.w).toEqual(0);
    });

    it('Returns undefined if trying to interpolate with less than two samples.', function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(CzmlNumber);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0]
        };
        property.processCzmlIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(4))).toBeUndefined();
    });

    it('_mergeNewSamples works with huge data sets.', function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var data = [];
        var expectedTimes = [];
        var expectedValues = [];

        for ( var i = 0; i < 200000; i++) {
            data.push(i);
            data.push(i);
            expectedTimes.push(epoch.addSeconds(i));
            expectedValues.push(i);
        }

        DynamicProperty._mergeNewSamples(epoch, times, values, data, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('_mergeNewSamples works for sorted non-intersecting data.', function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [0, 'a', 1, 'b', 2, 'c'];
        var newData2 = [3, 'd', 4, 'e', 5, 'f'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 1);
        DynamicProperty._mergeNewSamples(epoch, times, values, newData2, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('_mergeNewSamples works for ISO8601 dates', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.fromIso8601('2010-01-01T12:00:00');

        var newData = ['2010-01-01T12:00:00', 'a', '2010-01-01T12:00:01', 'b', '2010-01-01T12:00:02', 'c'];
        var newData2 = ['2010-01-01T12:00:03', 'd', '2010-01-01T12:00:04', 'e', '2010-01-01T12:00:05', 'f'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        DynamicProperty._mergeNewSamples(undefined, times, values, newData, 1);
        DynamicProperty._mergeNewSamples(undefined, times, values, newData2, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('_mergeNewSamples works for elements of size 2.', function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [1, 'b', 'b', 4, 'e', 'e', 0, 'a', 'a'];
        var newData2 = [2, 'c', 'c', 3, 'd', 'd'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4)];
        var expectedValues = ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e'];

        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 2);
        DynamicProperty._mergeNewSamples(epoch, times, values, newData2, 2);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('_mergeNewSamples works for unsorted intersecting data.', function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [1, 'b', 4, 'e', 0, 'a'];
        var newData2 = [5, 'f', 2, 'c', 3, 'd'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 1);
        DynamicProperty._mergeNewSamples(epoch, times, values, newData2, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('_mergeNewSamples works for data with repeated values.', function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [0, 'a', 1, 'b', 1, 'c', 0, 'd', 4, 'e', 5, 'f'];
        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['d', 'c', 'e', 'f'];
        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    var interwovenData = [{
        epoch : JulianDate.fromIso8601("20130205T150405.704999999999927Z"),
        values : [0.0, 1,
                   120.0, 2,
                   240.0, 3,
                   360.0, 4,
                   480.0, 6,
                   600.0, 8,
                   720.0, 10,
                   840.0, 12,
                   960.0, 14,
                   1080.0, 16]
    }, {
        epoch : JulianDate.fromIso8601("20130205T151151.60499999999956Z"),
         values : [0.0, 5,
                   120.0, 7,
                   240.0, 9,
                   360.0, 11,
                   480.0, 13,
                   600.0, 15,
                   720.0, 17,
                   840.0, 18,
                   960.0, 19,
                   1080.0, 20]
    }];

    it('_mergeNewSamples works with interwoven data', function() {
        var times = [];
        var values = [];
        DynamicProperty._mergeNewSamples(interwovenData[0].epoch, times, values, interwovenData[0].values, 1);
        DynamicProperty._mergeNewSamples(interwovenData[1].epoch, times, values, interwovenData[1].values, 1);
        for ( var i = 0; i < values.length; i++) {
            expect(values[i]).toBe(i + 1);
        }
    });
});
