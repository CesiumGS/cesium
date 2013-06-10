/*global defineSuite*/
defineSuite(['DynamicScene/CzmlDirection',
             'Core/Cartesian3',
             'Core/Spherical',
             'Core/Math',
             'Core/Ellipsoid'
             ], function(
                     CzmlDirection,
                     Cartesian3,
                     Spherical,
                     CesiumMath,
                     Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var spherical1 = new Spherical(0, 1.0);
    var spherical2 = new Spherical(1.0, 0.0);
    var cartesian1 = Cartesian3.fromSpherical(spherical1);
    var cartesian2 = Cartesian3.fromSpherical(spherical2);

    var constantCartesianInterval = {
        unitCartesian : [cartesian1.x, cartesian1.y, cartesian1.z]
    };

    var sampledCartesianInterval = {
        unitCartesian : [0, cartesian1.x, cartesian1.y, cartesian1.z, 1, cartesian2.x, cartesian2.y, cartesian2.z]
    };

    var constantSphericalInterval = {
        unitSpherical : [spherical1.clock, spherical1.cone]
    };

    var sampledSphericalInterval = {
        unitSpherical : [0, spherical1.clock, spherical1.cone, 1, spherical2.clock, spherical2.cone]
    };

    it('unwrapInterval', function() {
        expect(CzmlDirection.unwrapInterval(constantCartesianInterval)).toEqual(constantCartesianInterval.unitCartesian);
        expect(CzmlDirection.unwrapInterval(sampledCartesianInterval)).toEqual(sampledCartesianInterval.unitCartesian);
    });

    it('isSampled', function() {
        expect(CzmlDirection.isSampled(constantCartesianInterval.unitCartesian)).toEqual(false);
        expect(CzmlDirection.isSampled(sampledCartesianInterval.unitCartesian)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlDirection.getValue(constantCartesianInterval.unitCartesian)).toEqual(cartesian1);
    });

    it('getValueFromArray', function() {
        expect(CzmlDirection.getValueFromArray(sampledCartesianInterval.unitCartesian, 5)).toEqual(cartesian2);
    });

    it('Spherical unwrapInterval', function() {
        expect(CzmlDirection.unwrapInterval(constantSphericalInterval)).toEqual(constantCartesianInterval.unitCartesian);
        expect(CzmlDirection.unwrapInterval(sampledSphericalInterval)).toEqual(sampledCartesianInterval.unitCartesian);
    });

    it('Spherical isSampled', function() {
        expect(CzmlDirection.isSampled(constantSphericalInterval.unitSpherical)).toEqual(false);
        expect(CzmlDirection.isSampled(sampledSphericalInterval.unitSpherical)).toEqual(true);
    });
});