/*global defineSuite*/
defineSuite([
             'DynamicScene/SampledProperty',
             'Core/JulianDate'
     ], function(
             SampledProperty,
             JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('addSamplesFlatArray works', function() {
        var data = [0, 7, 1, 8, 2, 9];
        var epoch = new JulianDate(0, 0);

        var property = new SampledProperty();
        property.addSamplesFlatArray(data, epoch);
        expect(property.getIsTimeVarying()).toEqual(true);
        expect(property.getValue(epoch)).toEqual(7);
        expect(property.getValue(new JulianDate(0, 0.5))).toEqual(7.5);
    });

    it('addSample works', function() {
        var values = [7, 8, 9];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty();
        property.addSample(times[0], values[0]);
        property.addSample(times[1], values[1]);
        property.addSample(times[2], values[2]);

        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(7.5);
    });

    it('addSamples works', function() {
        var values = [7, 8, 9];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty();
        property.addSamples(times, values);
        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(7.5);
    });

    it('Returns undefined if trying to interpolate with less than enough samples.', function() {
        var value = 7;
        var time = new JulianDate(0, 0);

        var property = new SampledProperty();
        property.addSample(time, value);

        expect(property.getValue(time)).toEqual(value);
        expect(property.getValue(time.addSeconds(4))).toBeUndefined();
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

        SampledProperty._mergeNewSamples(epoch, times, values, data, 1);

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

        SampledProperty._mergeNewSamples(epoch, times, values, newData, 1);
        SampledProperty._mergeNewSamples(epoch, times, values, newData2, 1);

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

        SampledProperty._mergeNewSamples(undefined, times, values, newData, 1);
        SampledProperty._mergeNewSamples(undefined, times, values, newData2, 1);

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

        SampledProperty._mergeNewSamples(epoch, times, values, newData, 2);
        SampledProperty._mergeNewSamples(epoch, times, values, newData2, 2);

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

        SampledProperty._mergeNewSamples(epoch, times, values, newData, 1);
        SampledProperty._mergeNewSamples(epoch, times, values, newData2, 1);

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
        SampledProperty._mergeNewSamples(epoch, times, values, newData, 1);

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
        SampledProperty._mergeNewSamples(interwovenData[0].epoch, times, values, interwovenData[0].values, 1);
        SampledProperty._mergeNewSamples(interwovenData[1].epoch, times, values, interwovenData[1].values, 1);
        for ( var i = 0; i < values.length; i++) {
            expect(values[i]).toBe(i + 1);
        }
    });
});