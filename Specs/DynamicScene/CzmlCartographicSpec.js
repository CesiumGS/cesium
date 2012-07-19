/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlCartographic',
             'Core/Cartographic',
             'Core/Math'
            ], function(
              CzmlCartographic,
              Cartographic,
              CesiumMath) {
    "use strict";
    /*global it,expect*/

    var cartographic1 = new Cartographic(123.456, 789.101112, 321.312);
    var cartographic2 = new Cartographic(789.101112, 123.456, 521.312);

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
        expect(CzmlCartographic.unwrapInterval(constantCartographicInterval)).toEqualArray(constantCartographicInterval.cartographicRadians);
        expect(CzmlCartographic.unwrapInterval(constantCartographicDegreesInterval)).toEqualArray(constantCartographicInterval.cartographicRadians);
        expect(CzmlCartographic.unwrapInterval(sampledCartographicInterval)).toEqualArray(sampledCartographicInterval.cartographicRadians);
        expect(CzmlCartographic.unwrapInterval(sampledCartographicDegreesInterval)).toEqualArray(sampledCartographicInterval.cartographicRadians);
    });

    it('isSampled', function() {
        expect(CzmlCartographic.isSampled(constantCartographicInterval.cartographicRadians)).toEqual(false);
        expect(CzmlCartographic.isSampled(sampledCartographicInterval.cartographicRadians)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlCartographic.getValue(constantCartographicInterval.cartographicRadians)).toEqual(cartographic1);
    });

    it('getValueFromArray', function() {
        expect(CzmlCartographic.getValueFromArray(sampledCartographicInterval.cartographicRadians, 5)).toEqual(cartographic2);
    });
});