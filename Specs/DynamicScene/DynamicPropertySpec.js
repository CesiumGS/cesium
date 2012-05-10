/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicProperty',
         'Core/JulianDate',
         'DynamicScene/BooleanDataHandler',
         'DynamicScene/NumberDataHandler',
         'DynamicScene/Cartesian3DataHandler',
         'DynamicScene/QuaternionDataHandler',
         'Core/Quaternion',
         'Core/Math',
         'DynamicScene/Cartesian2DataHandler'
     ], function(
         DynamicProperty,
         JulianDate,
         BooleanDataHandler,
         NumberDataHandler,
         Cartesian3DataHandler,
         QuaternionDataHandler,
         Quaternion,
         CesiumMath,
         Cartesian2DataHandler) {
    "use strict";
    /*global it,expect*/

    it("Works with uninterpolatable values.", function() {
        var dynamicProperty = new DynamicProperty(BooleanDataHandler);

        var booleanConstant = true;

        var booleanVerbose = {
            boolean : false
        };

        var booleanInterval = {
            interval : "2012-04-18T16:00:00Z/2012-04-19T16:00:00Z",
            boolean : true
        };

        var booleanIntervalArray = [{
            interval : "2012-04-18T17:00:00Z/2012-04-18T18:00:00Z",
            boolean : true
        }, {
            interval : "2012-04-18T16:00:00Z/2012-04-18T16:05:00Z",
            boolean : true
        }];

        dynamicProperty.addIntervals(booleanConstant);
        expect(dynamicProperty.getValue(new JulianDate())).toEqual(true);

        dynamicProperty.addIntervals(booleanVerbose);
        expect(dynamicProperty.getValue(new JulianDate())).toEqual(false);

        dynamicProperty.addIntervals(booleanInterval);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T15:59:00Z'))).toEqual(false);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T16:00:00Z'))).toEqual(true);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-19T16:00:00Z'))).toEqual(true);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-19T16:01:00Z'))).toEqual(false);

        dynamicProperty.addIntervals(booleanIntervalArray);
        dynamicProperty.addIntervals(booleanVerbose);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T16:00:00Z'))).toEqual(false);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T17:30:00Z'))).toEqual(false);
        expect(dynamicProperty.getValue(JulianDate.fromIso8601('2012-04-18T16:06:00Z'))).toEqual(false);
    });

    it("Works with interpolatable values (default linear interpolator).", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(NumberDataHandler);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0, 10, 10, 20, 20]
        };
        property.addIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(4))).toEqual(4);
    });

    it("Works with interpolatable values (specified linear interpolator).", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(NumberDataHandler);
        var czmlInterval = {
            epoch : iso8601Epoch,
            number : [0, 0, 10, 10, 20, 20],
            interpolationAlgorithm : "LINEAR",
            interpolationDegree : 1
        };
        property.addIntervals(czmlInterval);

        expect(property.getValue(epoch)).toEqual(0);
        expect(property.getValue(epoch.addSeconds(4))).toEqual(4);
    });

    it("Works with Cartesian3 interpolatable values (specified linear interpolator).", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(Cartesian3DataHandler);
        var czmlInterval = {
            epoch : iso8601Epoch,
            cartesian : [0, 0, 1, 2, 10, 10, 11, 12, 20, 21, 22, 23],
            interpolationAlgorithm : "LINEAR",
            interpolationDegree : 1
        };
        property.addIntervals(czmlInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(0);
        expect(result.y).toEqual(1);
        expect(result.z).toEqual(2);

        result = property.getValue(epoch.addSeconds(4));
        expect(result.x).toEqual(4);
        expect(result.y).toEqual(5);
        expect(result.z).toEqual(6);
    });

    it("Works with static Cartesian3 values.", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(Cartesian3DataHandler);
        var czmlInterval = {
            cartesian : [0, 1, 2]
        };
        property.addIntervals(czmlInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(0);
        expect(result.y).toEqual(1);
        expect(result.z).toEqual(2);

        expect(result === property.getValue(epoch)).toEqual(true);
    });

    it("Works with static Quaternion values.", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(QuaternionDataHandler);
        var czmlInterval = {
            quaternion : [0, 1, 2, 3]
        };
        property.addIntervals(czmlInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(0);
        expect(result.y).toEqual(1);
        expect(result.z).toEqual(2);
        expect(result.w).toEqual(3);
    });

    it("Works with Cartesian2 interpolatable values (specified linear interpolator).", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(Cartesian2DataHandler);
        var czmlInterval = {
            epoch : iso8601Epoch,
            cartesian : [0, 0, 1, 10, 10, 11, 12, 21, 22],
            interpolationAlgorithm : "LINEAR",
            interpolationDegree : 1
        };
        property.addIntervals(czmlInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(0);
        expect(result.y).toEqual(1);

        result = property.getValue(epoch.addSeconds(4));
        expect(result.x).toEqual(4);
        expect(result.y).toEqual(5);
    });

    it("Works with static Cartesian2 values.", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(Cartesian2DataHandler);
        var czmlInterval = {
            cartesian : [0, 1]
        };
        property.addIntervals(czmlInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(0);
        expect(result.y).toEqual(1);
    });

    it("Works with Quaternion interpolatable values (specified linear interpolator).", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicProperty(QuaternionDataHandler);

        var czmlInterval = {
            epoch : iso8601Epoch,
            quaternion : [0, 1, 0, 0, 0, 10, 0, 1, 0, 0],
            interpolationAlgorithm : "LINEAR",
            interpolationDegree : 1
        };
        property.addIntervals(czmlInterval);

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

    it("_mergeNewSamples works for sorted non-inersecting data.", function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [0, 'a', 1, 'b', 2, 'c'];
        var newData2 = [3, 'd', 4, 'e', 5, 'f'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 1);
        DynamicProperty._mergeNewSamples(epoch, times, values, newData2, 1);

        expect(times).toEqualArray(expectedTimes, JulianDate.compare);
        expect(values).toEqualArray(expectedValues);
    });

    it("_mergeNewSamples works for elements of size 2.", function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [1, 'b', 'b', 4, 'e', 'e', 0, 'a', 'a'];
        var newData2 = [2, 'c', 'c', 3, 'd', 'd'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4)];
        var expectedValues = ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e'];

        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 2);
        DynamicProperty._mergeNewSamples(epoch, times, values, newData2, 2);

        expect(times).toEqualArray(expectedTimes, JulianDate.compare);
        expect(values).toEqualArray(expectedValues);
    });

    it("_mergeNewSamples works for unsorted inersecting data.", function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [1, 'b', 4, 'e', 0, 'a'];
        var newData2 = [5, 'f', 2, 'c', 3, 'd'];

        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(2), epoch.addSeconds(3), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 1);
        DynamicProperty._mergeNewSamples(epoch, times, values, newData2, 1);

        expect(times).toEqualArray(expectedTimes, JulianDate.compare);
        expect(values).toEqualArray(expectedValues);
    });

    it("_mergeNewSamples works for data with repeated values.", function() {
        var times = [];
        var values = [];
        var epoch = new JulianDate();

        var newData = [0, 'a', 1, 'b', 1, 'c', 0, 'd', 4, 'e', 5, 'f'];
        var expectedTimes = [epoch.addSeconds(0), epoch.addSeconds(1), epoch.addSeconds(4), epoch.addSeconds(5)];
        var expectedValues = ['d', 'c', 'e', 'f'];
        DynamicProperty._mergeNewSamples(epoch, times, values, newData, 1);

        expect(times).toEqualArray(expectedTimes, JulianDate.compare);
        expect(values).toEqualArray(expectedValues);
    });
});
