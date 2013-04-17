/*global defineSuite*/
defineSuite(['DynamicScene/CzmlPosition',
             'Core/Cartesian3',
             'Core/Cartographic',
             'Core/Math',
             'Core/Ellipsoid'
             ], function(
              CzmlPosition,
              Cartesian3,
              Cartographic,
              CesiumMath,
              Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var cartographic1 = new Cartographic(0, 1.0, 100);
    var cartographic2 = new Cartographic(1.0, 0.0, 1500);
    var cartesian1 = Ellipsoid.WGS84.cartographicToCartesian(cartographic1);
    var cartesian2 = Ellipsoid.WGS84.cartographicToCartesian(cartographic2);

    var constantCartesianInterval = {
        cartesian : [cartesian1.x, cartesian1.y, cartesian1.z]
    };

    var sampledCartesianInterval = {
        cartesian : [0, cartesian1.x, cartesian1.y, cartesian1.z, 1, cartesian2.x, cartesian2.y, cartesian2.z]
    };

    var constantCartographicInterval = {
        cartographicRadians : [cartographic1.longitude, cartographic1.latitude, cartographic1.height]
    };

    var constantCartographicDegreesInterval = {
        cartographicDegrees : [CesiumMath.toDegrees(cartographic1.longitude), CesiumMath.toDegrees(cartographic1.latitude), cartographic1.height]
    };

    var sampledCartographicInterval = {
        cartographicRadians : [0, cartographic1.longitude, cartographic1.latitude, cartographic1.height, 1, cartographic2.longitude, cartographic2.latitude, cartographic2.height]
    };

    var sampledCartographicDegreesInterval = {
        cartographicDegrees : [0, CesiumMath.toDegrees(cartographic1.longitude), CesiumMath.toDegrees(cartographic1.latitude), cartographic1.height, 1, CesiumMath.toDegrees(cartographic2.longitude),
                CesiumMath.toDegrees(cartographic2.latitude), cartographic2.height]
    };

    it('unwrapInterval', function() {
        expect(CzmlPosition.unwrapInterval(constantCartesianInterval)).toEqual(constantCartesianInterval.cartesian);
        expect(CzmlPosition.unwrapInterval(sampledCartesianInterval)).toEqual(sampledCartesianInterval.cartesian);
    });

    it('isSampled', function() {
        expect(CzmlPosition.isSampled(constantCartesianInterval.cartesian)).toEqual(false);
        expect(CzmlPosition.isSampled(sampledCartesianInterval.cartesian)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlPosition.getValue(constantCartesianInterval.cartesian)).toEqual(cartesian1);
    });

    it('getValueFromArray', function() {
        expect(CzmlPosition.getValueFromArray(sampledCartesianInterval.cartesian, 5)).toEqual(cartesian2);
    });

    it('Cartographic unwrapInterval', function() {
        expect(CzmlPosition.unwrapInterval(constantCartographicInterval)).toEqual(constantCartesianInterval.cartesian);
        expect(CzmlPosition.unwrapInterval(constantCartographicDegreesInterval)).toEqual(constantCartesianInterval.cartesian);
        expect(CzmlPosition.unwrapInterval(sampledCartographicInterval)).toEqual(sampledCartesianInterval.cartesian);
        expect(CzmlPosition.unwrapInterval(sampledCartographicDegreesInterval)).toEqual(sampledCartesianInterval.cartesian);
    });

    it('Cartographic isSampled', function() {
        expect(CzmlPosition.isSampled(constantCartographicInterval.cartographicRadians)).toEqual(false);
        expect(CzmlPosition.isSampled(sampledCartographicInterval.cartographicRadians)).toEqual(true);
    });
});