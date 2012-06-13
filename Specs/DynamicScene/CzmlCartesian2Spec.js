/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlCartesian2',
             'Core/Cartesian2',
            ], function(
              CzmlCartesian2,
              Cartesian2) {
    "use strict";
    /*global it,expect*/

    var cartesian1 = new Cartesian2(123.456, 789.101112);
    var cartesian2 = new Cartesian2(789.101112, 123.456);

    var constantCartesianInterval = {
        cartesian2 : [cartesian1.x, cartesian1.y]
    };

    var sampledCartesianInterval = {
        cartesian2 : [0, cartesian1.x, cartesian1.y, 1, cartesian2.x, cartesian2.y]
    };

    it('unwrapInterval', function() {
        expect(CzmlCartesian2.unwrapInterval(constantCartesianInterval)).toEqualArray(constantCartesianInterval.cartesian2);
        expect(CzmlCartesian2.unwrapInterval(sampledCartesianInterval)).toEqualArray(sampledCartesianInterval.cartesian2);
    });

    it('isSampled', function() {
        expect(CzmlCartesian2.isSampled(constantCartesianInterval.cartesian2)).toEqual(false);
        expect(CzmlCartesian2.isSampled(sampledCartesianInterval.cartesian2)).toEqual(true);
    });

    it('createValue', function() {
        expect(CzmlCartesian2.createValue(constantCartesianInterval.cartesian2)).toEqual(cartesian1);
    });

    it('createValueFromArray', function() {
        expect(CzmlCartesian2.createValueFromArray(sampledCartesianInterval.cartesian2, 4)).toEqual(cartesian2);
    });

    it('createValueFromInterpolationResult', function() {
        expect(CzmlCartesian2.createValueFromInterpolationResult(constantCartesianInterval.cartesian2)).toEqual(cartesian1);
    });
});