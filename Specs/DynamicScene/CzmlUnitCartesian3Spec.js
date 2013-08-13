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
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var cartesian1 = new Cartesian3(1, 2, 3).normalize();
    var cartesian2 = new Cartesian3(4, 5, 6).normalize();

    var constantCartesianInterval = {
        unitCartesian : [cartesian1.x, cartesian1.y, cartesian1.z]
    };

    var sampledCartesianInterval = {
        unitCartesian : [0, cartesian1.x, cartesian1.y, cartesian1.z, 1, cartesian2.x, cartesian2.y, cartesian2.z]
    };

    it('unwrapInterval', function() {
        expect(CzmlUnitCartesian3.unwrapInterval(constantCartesianInterval)).toEqual(constantCartesianInterval.unitCartesian);
        expect(CzmlUnitCartesian3.unwrapInterval(sampledCartesianInterval)).toEqual(sampledCartesianInterval.unitCartesian);
    });

    it('isSampled', function() {
        expect(CzmlUnitCartesian3.isSampled(constantCartesianInterval.unitCartesian)).toEqual(false);
        expect(CzmlUnitCartesian3.isSampled(sampledCartesianInterval.unitCartesian)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlUnitCartesian3.getValue(constantCartesianInterval.unitCartesian)).toEqual(cartesian1);
    });
});