/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicVertexPositionsProperty',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/processCzml',
         'Core/JulianDate',
         'Core/Math',
         'Core/Ellipsoid'
     ], function(
          DynamicVertexPositionsProperty,
          DynamicObjectCollection,
          processCzml,
          JulianDate,
          CesiumMath,
          Ellipsoid) {
    "use strict";
    /*global it,expect*/

    var cartographicRadiansInterval = {
        cartographicRadians : [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9]
    };

    var cartographicDegreesInterval = {
        cartographicDegrees : [10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9]
    };

    var cartesianInterval = {
        cartesian : [10000, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009]
    };

    var testObjects = [{
        id : 'test1',
        position : {
            cartesian : [100000, 100001, 100003]
        }
    }, {
        id : 'test2',
        position : {
            cartesian : [100004, 100005, 100006]
        }
    }, {
        id : 'test3',
        position : {
            interval : '2012-04-18T15:59:00Z/2012-04-18T15:59:00Z',
            cartesian : [100007, 100008, 100009]
        }
    }];

    var referenceInterval = {
        references : ['test1.position', 'test2.position', 'test3.position']
    };

    it('getValueCartesian returns undefined if no data exists', function() {
        var property = new DynamicVertexPositionsProperty();
        expect(property.getValueCartesian(new JulianDate())).toBeUndefined();
    });

    it('getValueCartesian throw if no time supplied', function() {
        var property = new DynamicVertexPositionsProperty();
        expect(function() {
            property.getValueCartesian();
        }).toThrow();
    });

    it('getValueCartesian works for cartesian data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartesianInterval);
        var result = property.getValueCartesian(new JulianDate());
        expect(result.length).toEqual(3);
        expect(result[0].x).toEqual(cartesianInterval.cartesian[0]);
        expect(result[0].y).toEqual(cartesianInterval.cartesian[1]);
        expect(result[0].z).toEqual(cartesianInterval.cartesian[2]);

        expect(result[1].x).toEqual(cartesianInterval.cartesian[3]);
        expect(result[1].y).toEqual(cartesianInterval.cartesian[4]);
        expect(result[1].z).toEqual(cartesianInterval.cartesian[5]);

        expect(result[2].x).toEqual(cartesianInterval.cartesian[6]);
        expect(result[2].y).toEqual(cartesianInterval.cartesian[7]);
        expect(result[2].z).toEqual(cartesianInterval.cartesian[8]);
    });

    it('getValueCartesian works for cartographic degrees data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartographicDegreesInterval);
        var result = property.getValueCartesian(new JulianDate());

        var expected = Ellipsoid.WGS84.cartographicArrayToCartesianArray(property.getValueCartographic(new JulianDate()));

        expect(result.length).toEqual(3);
        expect(result[0].x).toEqual(expected[0].x);
        expect(result[0].y).toEqual(expected[0].y);
        expect(result[0].z).toEqual(expected[0].z);

        expect(result[1].x).toEqual(expected[1].x);
        expect(result[1].y).toEqual(expected[1].y);
        expect(result[1].z).toEqual(expected[1].z);

        expect(result[2].x).toEqual(expected[2].x);
        expect(result[2].y).toEqual(expected[2].y);
        expect(result[2].z).toEqual(expected[2].z);
    });

    it('getValueCartesian works for cartographic radians data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartographicRadiansInterval);
        var result = property.getValueCartesian(new JulianDate());

        var expected = Ellipsoid.WGS84.cartographicArrayToCartesianArray(property.getValueCartographic(new JulianDate()));

        expect(result.length).toEqual(3);
        expect(result[0].x).toEqual(expected[0].x);
        expect(result[0].y).toEqual(expected[0].y);
        expect(result[0].z).toEqual(expected[0].z);

        expect(result[1].x).toEqual(expected[1].x);
        expect(result[1].y).toEqual(expected[1].y);
        expect(result[1].z).toEqual(expected[1].z);

        expect(result[2].x).toEqual(expected[2].x);
        expect(result[2].y).toEqual(expected[2].y);
        expect(result[2].z).toEqual(expected[2].z);
    });

    it('getValueCartographic works for cartesian data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartesianInterval);
        var result = property.getValueCartographic(new JulianDate());

        var expected = Ellipsoid.WGS84.cartesianArrayToCartographicArray(property.getValueCartesian(new JulianDate()));

        expect(result.length).toEqual(3);
        expect(result[0].longitude).toEqual(expected[0].longitude);
        expect(result[0].latitude).toEqual(expected[0].latitude);
        expect(result[0].height).toEqual(expected[0].height);

        expect(result[1].longitude).toEqual(expected[1].longitude);
        expect(result[1].latitude).toEqual(expected[1].latitude);
        expect(result[1].height).toEqual(expected[1].height);

        expect(result[2].longitude).toEqual(expected[2].longitude);
        expect(result[2].latitude).toEqual(expected[2].latitude);
        expect(result[2].height).toEqual(expected[2].height);
    });

    it('getValueCartographic works for cartographic degrees data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartographicDegreesInterval);
        var result = property.getValueCartographic(new JulianDate());

        expect(result.length).toEqual(3);
        expect(result[0].longitude).toEqual(CesiumMath.toRadians(cartographicDegreesInterval.cartographicDegrees[0]));
        expect(result[0].latitude).toEqual(CesiumMath.toRadians(cartographicDegreesInterval.cartographicDegrees[1]));
        expect(result[0].height).toEqual(cartographicDegreesInterval.cartographicDegrees[2]);

        expect(result[1].longitude).toEqual(CesiumMath.toRadians(cartographicDegreesInterval.cartographicDegrees[3]));
        expect(result[1].latitude).toEqual(CesiumMath.toRadians(cartographicDegreesInterval.cartographicDegrees[4]));
        expect(result[1].height).toEqual(cartographicDegreesInterval.cartographicDegrees[5]);

        expect(result[2].longitude).toEqual(CesiumMath.toRadians(cartographicDegreesInterval.cartographicDegrees[6]));
        expect(result[2].latitude).toEqual(CesiumMath.toRadians(cartographicDegreesInterval.cartographicDegrees[7]));
        expect(result[2].height).toEqual(cartographicDegreesInterval.cartographicDegrees[8]);
    });

    it('getValueCartographic works for cartographic radians data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartographicRadiansInterval);
        var result = property.getValueCartographic(new JulianDate());

        expect(result.length).toEqual(3);
        expect(result[0].longitude).toEqual(cartographicRadiansInterval.cartographicRadians[0]);
        expect(result[0].latitude).toEqual(cartographicRadiansInterval.cartographicRadians[1]);
        expect(result[0].height).toEqual(cartographicRadiansInterval.cartographicRadians[2]);

        expect(result[1].longitude).toEqual(cartographicRadiansInterval.cartographicRadians[3]);
        expect(result[1].latitude).toEqual(cartographicRadiansInterval.cartographicRadians[4]);
        expect(result[1].height).toEqual(cartographicRadiansInterval.cartographicRadians[5]);

        expect(result[2].longitude).toEqual(cartographicRadiansInterval.cartographicRadians[6]);
        expect(result[2].latitude).toEqual(cartographicRadiansInterval.cartographicRadians[7]);
        expect(result[2].height).toEqual(cartographicRadiansInterval.cartographicRadians[8]);
    });

    it('getValueCartographic returns undefined if no data exists', function() {
        var property = new DynamicVertexPositionsProperty();
        expect(property.getValueCartographic(new JulianDate())).toBeUndefined();
    });

    it('getValueCartographic throws if no time supplied', function() {
        var property = new DynamicVertexPositionsProperty();
        expect(function() {
            property.getValueCartographic();
        }).toThrow();
    });

    it('getValueCartographic works for reference data', function() {
        var objects = new DynamicObjectCollection();
        processCzml(testObjects, objects);
        var test1 = objects.getObject('test1');
        var test2 = objects.getObject('test2');
        var test3 = objects.getObject('test3');

        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(referenceInterval, undefined, objects);

        var time = JulianDate.fromIso8601('2011-04-18T15:59:00Z');
        var result = property.getValueCartographic(time);
        expect(result.length).toEqual(2);
        expect(result[0]).toEqual(test1.position.getValueCartographic(time));
        expect(result[1]).toEqual(test2.position.getValueCartographic(time));

        time = JulianDate.fromIso8601('2012-04-18T15:59:00Z');
        result = property.getValueCartographic(time);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(test1.position.getValueCartographic(time));
        expect(result[1]).toEqual(test2.position.getValueCartographic(time));
        expect(result[2]).toEqual(test3.position.getValueCartographic(time));
    });

    it('getValueCartesian works for reference data', function() {
        var objects = new DynamicObjectCollection();
        processCzml(testObjects, objects);
        var test1 = objects.getObject('test1');
        var test2 = objects.getObject('test2');
        var test3 = objects.getObject('test3');

        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(referenceInterval, undefined, objects);

        var time = JulianDate.fromIso8601('2011-04-18T15:59:00Z');
        var result = property.getValueCartesian(time);
        expect(result.length).toEqual(2);
        expect(result[0]).toEqual(test1.position.getValueCartesian(time));
        expect(result[1]).toEqual(test2.position.getValueCartesian(time));

        time = JulianDate.fromIso8601('2012-04-18T15:59:00Z');
        result = property.getValueCartesian(time);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(test1.position.getValueCartesian(time));
        expect(result[1]).toEqual(test2.position.getValueCartesian(time));
        expect(result[2]).toEqual(test3.position.getValueCartesian(time));
    });
});
