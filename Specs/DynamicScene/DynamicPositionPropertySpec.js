/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPositionProperty',
         'Core/JulianDate',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Math'
     ], function(
          DynamicPositionProperty,
          JulianDate,
          Ellipsoid,
          Cartesian3,
          Cartographic,
          CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('getValue returns undefined if no data exists', function() {
        var property = new DynamicPositionProperty();
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('getValue throw if no time supplied', function() {
        var property = new DynamicPositionProperty();
        expect(function() {
            property.getValue();
        }).toThrow();
    });

    it('getValue works for cartesian data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianInterval);

        var result = property.getValue(epoch);
        expect(result.x).toEqual(100000);
        expect(result.y).toEqual(100001);
        expect(result.z).toEqual(100002);
    });

    it('getValue works for cartographic data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartographicInterval);

        var cartesian = Ellipsoid.WGS84.cartographicToCartesian(new Cartographic(0.1, 0.2, 1000));
        var result = property.getValue(epoch);
        expect(result.x).toEqualEpsilon(cartesian.x, CesiumMath.EPSILON9);
        expect(result.y).toEqualEpsilon(cartesian.y, CesiumMath.EPSILON9);
        expect(result.z).toEqualEpsilon(cartesian.z, CesiumMath.EPSILON9);
    });

    var cartesian0 = new Cartesian3(0.0, 0.0, 0.0);
    var cartesian1 = new Cartesian3(1.0, 1.0, 1.0);
    var cartesian2 = new Cartesian3(2.0, 2.0, 2.0);
    var cartographic3 = new Cartographic(0.3, 0.3, 0.3);
    var cartographic4 = new Cartographic(0.4, 0.4, 0.4);
    var cartographic5 = new Cartographic(0.5, 0.5, 0.5);
    var cartesian6 = new Cartesian3(6.0, 6.0, 6.0);
    var cartographic7 = new Cartographic(0.7, 0.7, 0.7);

    var cartesianFor_getValueRangeInReferenceFrame = {
        interval : '2012-08-01T00:00:00Z/2012-08-01T00:00:02Z',
        epoch : '2012-08-01T00:00:00Z',
        cartesian : [0, cartesian0.x, cartesian0.y, cartesian0.z, 1, cartesian1.x, cartesian1.y, cartesian1.z, 2, cartesian2.x, cartesian2.y, cartesian2.z],
        interpolationAlgorithm : 'LINEAR',
        interpolationDegree : 1
    };

    var cartographicFor_getValueRangeInReferenceFrame = {
        interval : '2012-08-01T00:00:02Z/2012-08-01T00:00:04Z',
        epoch : '2012-08-01T00:00:02Z',
        cartographicRadians : [0, cartographic3.longitude, cartographic3.latitude, cartographic3.height, 1, cartographic4.longitude, cartographic4.latitude, cartographic4.height, 2, cartographic5.longitude, cartographic5.latitude, cartographic5.height],
        interpolationAlgorithm : 'LINEAR',
        interpolationDegree : 1
    };

    var staticIntervalCartesian = {
            interval : '2012-08-01T00:00:05Z/2012-08-01T00:00:06Z',
            cartesian : [cartesian6.x, cartesian6.y, cartesian6.z]
        };

    var staticIntervalCartographic = {
            interval : '2012-08-01T00:00:05Z/2012-08-01T00:00:06Z',
            cartographicRadians : [cartographic7.longitude, cartographic7.latitude, cartographic7.height]
        };

    it('_getValueRangeInReferenceFrame works with single cartesian interval', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(0);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(2);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(cartesian0);
        expect(result[1]).toEqual(cartesian1);
        expect(result[2]).toEqual(cartesian2);
    });

    it('_getValueRangeInReferenceFrame works with single cartesian interval and currentTime', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(0);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(2);
        var currentTime = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(1.5);
        var result = property._getValueRangeInReferenceFrame(start, stop, currentTime);
        expect(result.length).toEqual(4);
        expect(result[0]).toEqual(cartesian0);
        expect(result[1]).toEqual(cartesian1);
        expect(result[2]).toEqual(Cartesian3.lerp(cartesian1, cartesian2, 0.5));
        expect(result[3]).toEqual(cartesian2);
    });

    it('_getValueRangeInReferenceFrame works with a result parameter', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);

        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(0);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(2);
        var existingCartesian0 = new Cartesian3();
        var existingCartesian1 = new Cartesian3();
        var existingCartesian2 = new Cartesian3();
        var result = [existingCartesian0, existingCartesian1, existingCartesian2, new Cartesian3(), new Cartesian3()];

        var returnedResult = property._getValueRangeInReferenceFrame(start, stop, undefined, undefined, undefined, result);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(cartesian0);
        expect(result[1]).toEqual(cartesian1);
        expect(result[2]).toEqual(cartesian2);
        expect(returnedResult).toBe(result);
        expect(result[0]).toBe(existingCartesian0);
        expect(result[1]).toBe(existingCartesian1);
        expect(result[2]).toBe(existingCartesian2);
    });

    it('_getValueRangeInReferenceFrame does not sample currentTime outside of start/stop time', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(0);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(2);
        var currentTime = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(30);
        var result = property._getValueRangeInReferenceFrame(start, stop, currentTime);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(cartesian0);
        expect(result[1]).toEqual(cartesian1);
        expect(result[2]).toEqual(cartesian2);
    });

    it('_getValueRangeInReferenceFrame does not sample start/stop if outside of data', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(-100);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(+200);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(cartesian0);
        expect(result[1]).toEqual(cartesian1);
        expect(result[2]).toEqual(cartesian2);
    });

    it('_getValueRangeInReferenceFrame works with single cartographic interval', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartographicFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartographicFor_getValueRangeInReferenceFrame.epoch).addSeconds(0);
        var stop = JulianDate.fromIso8601(cartographicFor_getValueRangeInReferenceFrame.epoch).addSeconds(2);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic3));
        expect(result[1]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic4));
        expect(result[2]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic5));
    });

    it('_getValueRangeInReferenceFrame works across intervals', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals([cartesianFor_getValueRangeInReferenceFrame, cartographicFor_getValueRangeInReferenceFrame]);

        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(1);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(3);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(cartesian1);
        expect(result[1]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic3));
        expect(result[2]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic4));
    });

    it('_getValueRangeInReferenceFrame works across non-sampled intervals', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals([cartesianFor_getValueRangeInReferenceFrame, cartographicFor_getValueRangeInReferenceFrame, staticIntervalCartesian]);

        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(1);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(6);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(6);
        expect(result[0]).toEqual(cartesian1);
        expect(result[1]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic3));
        expect(result[2]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic4));
        expect(result[3]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic5));
        expect(result[4]).toEqual(cartesian6);
        expect(result[5]).toEqual(cartesian6);
    });

    it('_getValueRangeInReferenceFrame works across non-sampled cartographic intervals', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals([cartesianFor_getValueRangeInReferenceFrame, cartographicFor_getValueRangeInReferenceFrame, staticIntervalCartographic]);

        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(1);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(5);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(5);
        expect(result[0]).toEqual(cartesian1);
        expect(result[1]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic3));
        expect(result[2]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic4));
        expect(result[3]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic5));
        expect(result[4]).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic7));
    });

    it('_getValueRangeInReferenceFrame works with no data', function() {
        var property = new DynamicPositionProperty();
        var result = property._getValueRangeInReferenceFrame(new JulianDate(), new JulianDate());
        expect(result.length).toEqual(0);
    });

    it('_getValueRangeInReferenceFrame works if requested interval is before any data.', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(-10);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(-5);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(0);
    });

    it('_getValueRangeInReferenceFrame works if requested interval is after all data.', function() {
        var property = new DynamicPositionProperty();
        property.processCzmlIntervals(cartesianFor_getValueRangeInReferenceFrame);
        var start = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(10);
        var stop = JulianDate.fromIso8601(cartesianFor_getValueRangeInReferenceFrame.epoch).addSeconds(5);
        var result = property._getValueRangeInReferenceFrame(start, stop);
        expect(result.length).toEqual(0);
    });

    it('_getValueRangeInReferenceFrame throws with no start time', function() {
        var property = new DynamicPositionProperty();
        expect(function() {
            property._getValueRangeInReferenceFrame(undefined, new JulianDate());
        }).toThrow();
    });

    it('_getValueRangeInReferenceFrame throws with no stop time', function() {
        var property = new DynamicPositionProperty();
        expect(function() {
            property._getValueRangeInReferenceFrame(new JulianDate(), undefined);
        }).toThrow();
    });
});
