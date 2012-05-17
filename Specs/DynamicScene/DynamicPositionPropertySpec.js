/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPositionProperty',
         'Core/JulianDate',
         'Core/Math',
         'Core/Ellipsoid'
     ], function(
         DynamicPositionProperty,
         JulianDate,
         CesiumMath,
         Ellipsoid) {
    "use strict";
    /*global it,expect*/

    it("Works with Cartesian3 interpolatable values (specified linear interpolator).", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicPositionProperty();
        var czmlInterval = {
            epoch : iso8601Epoch,
            cartesian : [0, 100000, 100001, 100002, 10, 100010, 100011, 100012, 20, 100020, 100021, 100022],
            interpolationAlgorithm : "LINEAR",
            interpolationDegree : 1
        };
        property.addIntervals(czmlInterval);

        var result = property.getValueCartesian(epoch);
        expect(result.x).toEqual(100000);
        expect(result.y).toEqual(100001);
        expect(result.z).toEqual(100002);

        var resultCartographic = Ellipsoid.WGS84.toCartographic3(result);
        result = property.getValueCartographic(epoch);
        expect(result.longitude).toEqual(resultCartographic.longitude);
        expect(result.latitude).toEqual(resultCartographic.latitude);
        expect(result.height).toEqual(resultCartographic.height);

        result = property.getValueCartesian(epoch.addSeconds(4));
        expect(result.x).toEqual(100004);
        expect(result.y).toEqual(100005);
        expect(result.z).toEqual(100006);

        resultCartographic = Ellipsoid.WGS84.toCartographic3(result);
        result = property.getValueCartographic(epoch.addSeconds(4));
        expect(result.longitude).toEqual(resultCartographic.longitude);
        expect(result.latitude).toEqual(resultCartographic.latitude);
        expect(result.height).toEqual(resultCartographic.height);
    });

    it("Works with static Cartesian3 values.", function() {
        var iso8601Epoch = '2012-04-18T15:59:00Z';
        var epoch = JulianDate.fromIso8601(iso8601Epoch);

        var property = new DynamicPositionProperty();
        var czmlInterval = {
            cartesian : [1234, 5678, 9101112]
        };
        property.addIntervals(czmlInterval);

        var result = property.getValueCartesian(epoch);
        expect(result.x).toEqual(1234);
        expect(result.y).toEqual(5678);
        expect(result.z).toEqual(9101112);
        expect(result === property.getValueCartesian(epoch)).toEqual(true);

        var resultCartographic = Ellipsoid.WGS84.toCartographic3(result);
        result = property.getValueCartographic(epoch);
        expect(result.longitude).toEqual(resultCartographic.longitude);
        expect(result.latitude).toEqual(resultCartographic.latitude);
        expect(result.height).toEqual(resultCartographic.height);
    });
});
