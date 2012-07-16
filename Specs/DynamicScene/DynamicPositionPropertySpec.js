/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPositionProperty',
         'Core/JulianDate',
         'Core/Ellipsoid'
     ], function(
          DynamicPositionProperty,
          JulianDate,
          Ellipsoid) {
    "use strict";
    /*global it,expect*/

    var cartesianInterval = {
        epoch : '2012-04-18T15:59:00Z',
        cartesian : [0, 100000, 100001, 100002, 3600, 100010, 100011, 100012, 7200, 100020, 100021, 100022],
        interpolationAlgorithm : 'LINEAR',
        interpolationDegree : 1
    };

    var cartographicInterval = {
        cartographicRadians: ['2012-04-18T15:59:00Z', 0.1, 0.2, 1000, '2012-04-18T16:59:00Z', 0.3, 0.4, 500, '2012-04-18T17:59:00Z', 0.5, 0.6, 750],
        interpolationAlgorithm : 'LINEAR',
        interpolationDegree : 1
    };

    var epoch = JulianDate.fromIso8601(cartesianInterval.epoch);

    it('getValueCartesian returns undefined if no data exists', function() {
        var property = new DynamicPositionProperty();
        expect(property.getValueCartesian(new JulianDate())).toBeUndefined();
    });

    it('getValueCartesian throw if no time supplied', function() {
        var property = new DynamicPositionProperty();
        expect(function() {
            property.getValueCartesian();
        }).toThrow();
    });

    it('getValueCartesian works for cartesian data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianInterval);

        var result = property.getValueCartesian(epoch);
        expect(result.x).toEqual(100000);
        expect(result.y).toEqual(100001);
        expect(result.z).toEqual(100002);
    });

    it('getValueCartographic returns undefined if no data exists', function() {
        var property = new DynamicPositionProperty();
        expect(property.getValueCartographic(new JulianDate())).toBeUndefined();
    });

    it('getValueCartographic throw if no time supplied', function() {
        var property = new DynamicPositionProperty();
        expect(function() {
            property.getValueCartographic();
        }).toThrow();
    });

    it('getValueCartographic works for cartesian data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianInterval);

        var cartographic = Ellipsoid.WGS84.cartesianToCartographic(property.getValueCartesian(epoch));
        var result = property.getValueCartographic(epoch);
        expect(result.longitude).toEqual(cartographic.longitude);
        expect(result.latitude).toEqual(cartographic.latitude);
        expect(result.height).toEqual(cartographic.height);
    });

    it('getValueCartographic works for cartographic data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartographicInterval);

        var result = property.getValueCartographic(epoch);
        expect(result.longitude).toEqual(0.1);
        expect(result.latitude).toEqual(0.2);
        expect(result.height).toEqual(1000);
    });

    it('getValueCartesian works for cartographic data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartographicInterval);

        var cartesian = Ellipsoid.WGS84.cartographicToCartesian(property.getValueCartographic(epoch));
        var result = property.getValueCartesian(epoch);
        expect(result.x).toEqual(cartesian.x);
        expect(result.y).toEqual(cartesian.y);
        expect(result.z).toEqual(cartesian.z);
    });

    it('replacing an interval with data of a different type works', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianInterval);

        var result = property.getValueCartesian(epoch);
        expect(result.x).toEqual(100000);
        expect(result.y).toEqual(100001);
        expect(result.z).toEqual(100002);

        property.processCzmlIntervals(cartographicInterval);

        result = property.getValueCartographic(epoch);
        expect(result.longitude).toEqual(0.1);
        expect(result.latitude).toEqual(0.2);
        expect(result.height).toEqual(1000);
    });
});
