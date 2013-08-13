/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlUnitQuaternion',
             'Core/Quaternion',
             'Core/Math'
            ], function(
              CzmlUnitQuaternion,
              Quaternion,
              CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var quaternion1 = new Quaternion(1, 2, 3, 4).normalize();
    var quaternion2 = new Quaternion(4, 5, 6, 7).normalize();

    var constantQuaternionInterval = {
        unitQuaternion : [quaternion1.x, quaternion1.y, quaternion1.z, quaternion1.w]
    };

    var sampledQuaternionInterval = {
        unitQuaternion : [0, quaternion1.x, quaternion1.y, quaternion1.z, quaternion1.w, 1, quaternion2.x, quaternion2.y, quaternion2.z, quaternion2.w]
    };

    it('unwrapInterval', function() {
        expect(CzmlUnitQuaternion.unwrapInterval(constantQuaternionInterval)).toEqual(constantQuaternionInterval.unitQuaternion);
        expect(CzmlUnitQuaternion.unwrapInterval(sampledQuaternionInterval)).toEqual(sampledQuaternionInterval.unitQuaternion);
    });

    it('isSampled', function() {
        expect(CzmlUnitQuaternion.isSampled(constantQuaternionInterval.unitQuaternion)).toEqual(false);
        expect(CzmlUnitQuaternion.isSampled(sampledQuaternionInterval.unitQuaternion)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlUnitQuaternion.getValue(constantQuaternionInterval.unitQuaternion)).toEqualEpsilon(quaternion1, CesiumMath.EPSILON15);
    });
});