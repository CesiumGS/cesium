/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlCartesian3',
             'Core/Cartesian3',
            ], function(
              CzmlCartesian3,
              Cartesian3) {
    "use strict";
    /*global it,expect*/

    var cartesian1 = new Cartesian3(123.456, 789.101112, 321.312);
    var cartesian2 = new Cartesian3(789.101112, 123.456, 521.312);

    var constantCartesianInterval = {
        cartesian : [cartesian1.x, cartesian1.y, cartesian1.z]
    };

    var sampledCartesianInterval = {
        cartesian : [0, cartesian1.x, cartesian1.y, cartesian1.z, 1, cartesian2.x, cartesian2.y, cartesian2.z]
    };

    it('unwrapInterval', function() {
        expect(CzmlCartesian3.unwrapInterval(constantCartesianInterval)).toEqualArray(constantCartesianInterval.cartesian);
        expect(CzmlCartesian3.unwrapInterval(sampledCartesianInterval)).toEqualArray(sampledCartesianInterval.cartesian);
    });

    it('isSampled', function() {
        expect(CzmlCartesian3.isSampled(constantCartesianInterval.cartesian)).toEqual(false);
        expect(CzmlCartesian3.isSampled(sampledCartesianInterval.cartesian)).toEqual(true);
    });

    it('createValue', function() {
        expect(CzmlCartesian3.createValue(constantCartesianInterval.cartesian)).toEqual(cartesian1);
    });

    it('createValueFromArray', function() {
        expect(CzmlCartesian3.createValueFromArray(sampledCartesianInterval.cartesian, 5)).toEqual(cartesian2);
    });

    it('createValueFromInterpolationResult', function() {
        expect(CzmlCartesian3.createValueFromInterpolationResult(constantCartesianInterval.cartesian)).toEqual(cartesian1);
    });

    it('packValuesForInterpolation', function() {
        var sourceArray = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
        var destinationArray = [];
        var firstIndex = 1;
        var lastIndex = 2;
        CzmlCartesian3.packValuesForInterpolation(sourceArray, destinationArray, firstIndex, lastIndex);
        expect(destinationArray).toEqualArray([0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
    });
});