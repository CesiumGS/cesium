/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicVertexPositionsProperty',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/CzmlDataSource',
         'Core/Cartographic',
         'Core/JulianDate',
         'Core/Math',
         'Core/Ellipsoid'
     ], function(
          DynamicVertexPositionsProperty,
          DynamicObjectCollection,
          CzmlDataSource,
          Cartographic,
          JulianDate,
          CesiumMath,
          Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('getValue returns undefined if no data exists', function() {
        var property = new DynamicVertexPositionsProperty();
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('getValue throw if no time supplied', function() {
        var property = new DynamicVertexPositionsProperty();
        expect(function() {
            property.getValue();
        }).toThrow();
    });

    it('getValue works for cartesian data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartesianInterval);
        var result = property.getValue(new JulianDate());
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

    it('getValue works for cartographic degrees data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartographicDegreesInterval);
        var result = property.getValue(new JulianDate());

        var expected = Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(CesiumMath.toRadians(10.1), CesiumMath.toRadians(10.2), 10.3), new Cartographic(CesiumMath.toRadians(10.4), CesiumMath.toRadians(10.5), 10.6), new Cartographic(CesiumMath.toRadians(10.7), CesiumMath.toRadians(10.8), 10.9)]);

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

    it('getValue works for cartographic radians data', function() {
        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(cartographicRadiansInterval);
        var result = property.getValue(new JulianDate());

        var expected = Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(1.1, 1.2, 1.3), new Cartographic(1.4, 1.5, 1.6), new Cartographic(1.7, 1.8, 1.9)]);

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

    it('getValue works for reference data', function() {
        var source = new CzmlDataSource();
        var objects = source.getDynamicObjectCollection();
        source.load(testObjects);
        var test1 = objects.getById('test1');
        var test2 = objects.getById('test2');
        var test3 = objects.getById('test3');

        var property = new DynamicVertexPositionsProperty();
        property.processCzmlIntervals(referenceInterval, undefined, objects);

        var time = JulianDate.fromIso8601('2011-04-18T15:59:00Z');
        var result = property.getValue(time);
        expect(result.length).toEqual(2);
        expect(result[0]).toEqual(test1.position.getValue(time));
        expect(result[1]).toEqual(test2.position.getValue(time));

        time = JulianDate.fromIso8601('2012-04-18T15:59:00Z');
        result = property.getValue(time);
        expect(result.length).toEqual(3);
        expect(result[0]).toEqual(test1.position.getValue(time));
        expect(result[1]).toEqual(test2.position.getValue(time));
        expect(result[2]).toEqual(test3.position.getValue(time));
    });
});
