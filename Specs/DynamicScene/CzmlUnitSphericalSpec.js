/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlUnitSpherical',
             'Core/Spherical',
             'Core/Math'
            ], function(
              CzmlUnitSpherical,
              Spherical,
              CesiumMath) {
    "use strict";
    /*global it,expect*/

    var spherical1 = new Spherical(2, 3, 1.0);
    var spherical2 = new Spherical(4, 5, 1.0);

    var constantSphericalInterval = {
        unitSpherical : [spherical1.clock, spherical1.cone]
    };

    var sampledSphericalInterval = {
        unitSpherical : [0, spherical1.clock, spherical1.cone, 1, spherical2.clock, spherical2.cone]
    };

    it('unwrapInterval', function() {
        expect(CzmlUnitSpherical.unwrapInterval(constantSphericalInterval)).toEqualArray(constantSphericalInterval.unitSpherical);
        expect(CzmlUnitSpherical.unwrapInterval(sampledSphericalInterval)).toEqualArray(sampledSphericalInterval.unitSpherical);
    });

    it('isSampled', function() {
        expect(CzmlUnitSpherical.isSampled(constantSphericalInterval.unitSpherical)).toEqual(false);
        expect(CzmlUnitSpherical.isSampled(sampledSphericalInterval.unitSpherical)).toEqual(true);
    });

    it('createValue', function() {
        expect(CzmlUnitSpherical.createValue(constantSphericalInterval.unitSpherical)).toEqual(spherical1);
    });

    it('createValueFromArray', function() {
        expect(CzmlUnitSpherical.createValueFromArray(sampledSphericalInterval.unitSpherical, 4)).toEqual(spherical2);
    });

    it('createValueFromInterpolationResult', function() {
        expect(CzmlUnitSpherical.createValueFromInterpolationResult(constantSphericalInterval.unitSpherical)).toEqual(spherical1);
    });
});