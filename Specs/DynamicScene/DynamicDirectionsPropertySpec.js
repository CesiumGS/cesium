/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicDirectionsProperty',
         'Core/JulianDate',
         'Core/Cartesian3',
         'Core/Spherical'
     ], function(
          DynamicDirectionsProperty,
          JulianDate,
          Cartesian3,
          Spherical) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var sphericals;
    var cartesians;
    var sphericalInterval;
    var cartesianInterval;

    beforeAll(function() {
        cartesians = [new Cartesian3(1, 0, 0), new Cartesian3(0, 1, 0), new Cartesian3(0, 0, 1)];
        sphericals = [Spherical.fromCartesian3(cartesians[0]), Spherical.fromCartesian3(cartesians[1]), Spherical.fromCartesian3(cartesians[2])];

        sphericalInterval = {
            unitSpherical : [sphericals[0].clock, sphericals[0].cone, sphericals[1].clock, sphericals[1].cone, sphericals[2].clock, sphericals[2].cone]
        };

        cartesianInterval = {
            unitCartesian : [cartesians[0].x, cartesians[0].y, cartesians[0].z, cartesians[1].x, cartesians[1].y, cartesians[1].z, cartesians[2].x, cartesians[2].y, cartesians[2].z]
        };
    });

    it('getValue returns undefined if no data exists', function() {
        var property = new DynamicDirectionsProperty();
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('getValue throw if no time supplied', function() {
        var property = new DynamicDirectionsProperty();
        expect(function() {
            property.getValue();
        }).toThrow();
    });

    it('getValue works for cartesian data', function() {
        var property = new DynamicDirectionsProperty();
        property.processCzmlIntervals(cartesianInterval);
        var result = property.getValue(new JulianDate());
        expect(result.length).toEqual(cartesians.length);
        expect(result[0]).toEqual(sphericals[0]);
        expect(result[1]).toEqual(sphericals[1]);
        expect(result[2]).toEqual(sphericals[2]);
    });

    it('getValue works for spherical data', function() {
        var property = new DynamicDirectionsProperty();
        property.processCzmlIntervals(sphericalInterval);
        var result = property.getValue(new JulianDate());
        expect(result.length).toEqual(sphericals.length);
        expect(result[0]).toEqual(sphericals[0]);
        expect(result[1]).toEqual(sphericals[1]);
        expect(result[2]).toEqual(sphericals[2]);
    });

    it('getValue returns undefined if no data exists', function() {
        var property = new DynamicDirectionsProperty();
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('getValue throws if no time supplied', function() {
        var property = new DynamicDirectionsProperty();
        expect(function() {
            property.getValue();
        }).toThrow();
    });
});
