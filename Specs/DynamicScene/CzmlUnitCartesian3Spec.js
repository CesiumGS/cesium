/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlUnitCartesian3',
             'Core/Cartesian3',
             'Core/Math'
            ], function(
              CzmlUnitCartesian3,
              Cartesian3,
              CesiumMath) {
    "use strict";
    /*global it,expect*/

    var cartesian1 = new Cartesian3(1, 2, 3, true);
    var cartesian2 = new Cartesian3(4, 5, 6, true);

    var constantCartesianInterval = {
        unitCartesian : [cartesian1.x, cartesian1.y, cartesian1.z]
    };

    var sampledCartesianInterval = {
        unitCartesian : [0, cartesian1.x, cartesian1.y, cartesian1.z, 1, cartesian2.x, cartesian2.y, cartesian2.z]
    };

    it('unwrapInterval', function() {
        expect(CzmlUnitCartesian3.unwrapInterval(constantCartesianInterval)).toEqualArray(constantCartesianInterval.unitCartesian);
        expect(CzmlUnitCartesian3.unwrapInterval(sampledCartesianInterval)).toEqualArray(sampledCartesianInterval.unitCartesian);
    });

    it('isSampled', function() {
        expect(CzmlUnitCartesian3.isSampled(constantCartesianInterval.unitCartesian)).toEqual(false);
        expect(CzmlUnitCartesian3.isSampled(sampledCartesianInterval.unitCartesian)).toEqual(true);
    });

    it('createValue', function() {
        expect(CzmlUnitCartesian3.createValue(constantCartesianInterval.unitCartesian)).toEqual(cartesian1);
    });

    it('createValueFromArray', function() {
        expect(CzmlUnitCartesian3.createValueFromArray(sampledCartesianInterval.unitCartesian, 5)).toEqualEpsilon(cartesian2, CesiumMath.EPSILON15);
    });

    it('createValueFromInterpolationResult', function() {
        expect(CzmlUnitCartesian3.createValueFromInterpolationResult(constantCartesianInterval.unitCartesian)).toEqual(cartesian1);
    });
});