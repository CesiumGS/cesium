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

    var sphericalInterval = {
        unitSpherical : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    };

    var cartesianInterval = {
        unitCartesian : [1, 0, 0, 0, 1, 0, 0, 0, 1]
    };

    it('getValueCartesian returns undefined if no data exists', function() {
        var property = new DynamicDirectionsProperty();
        expect(property.getValueCartesian(new JulianDate())).toBeUndefined();
    });

    it('getValueCartesian throw if no time supplied', function() {
        var property = new DynamicDirectionsProperty();
        expect(function() {
            property.getValueCartesian();
        }).toThrow();
    });

    it('getValueCartesian works for cartesian data', function() {
        var property = new DynamicDirectionsProperty();
        property.processCzmlIntervals(cartesianInterval);
        var result = property.getValueCartesian(new JulianDate());
        expect(result.length).toEqual(3);
        expect(result[0].x).toEqual(cartesianInterval.unitCartesian[0]);
        expect(result[0].y).toEqual(cartesianInterval.unitCartesian[1]);
        expect(result[0].z).toEqual(cartesianInterval.unitCartesian[2]);

        expect(result[1].x).toEqual(cartesianInterval.unitCartesian[3]);
        expect(result[1].y).toEqual(cartesianInterval.unitCartesian[4]);
        expect(result[1].z).toEqual(cartesianInterval.unitCartesian[5]);

        expect(result[2].x).toEqual(cartesianInterval.unitCartesian[6]);
        expect(result[2].y).toEqual(cartesianInterval.unitCartesian[7]);
        expect(result[2].z).toEqual(cartesianInterval.unitCartesian[8]);
    });

    it('getValueCartesian works for spherical data', function() {
        var property = new DynamicDirectionsProperty();
        property.processCzmlIntervals(sphericalInterval);
        var result = property.getValueCartesian(new JulianDate());

        var expected = property.getValueSpherical(new JulianDate());
        for ( var i = expected.length - 1; i > -1; i--) {
            expected[i] = Cartesian3.fromSpherical(expected[i]);
        }

        expect(result.length).toEqual(3);
        expect(result[0].x).toEqual(expected[0].x);
        expect(result[0].y).toEqual(expected[0].y);
        expect(result[0].z).toEqual(expected[0].z);

        expect(result[1].x).toEqual(expected[1].x);
        expect(result[1].y).toEqual(expected[1].y);
        expect(result[1].z).toEqual(expected[1].z);

        expect(result[2].x).toEqual(expected[2].x);
        expect(result[2].y).toEqual(expected[2].y);
        expect(result[2].z).toEqual(expected[2].z);
    });

    it('getValueSpherical works for cartesian data', function() {
        var property = new DynamicDirectionsProperty();
        property.processCzmlIntervals(cartesianInterval);
        var result = property.getValueSpherical(new JulianDate());

        var expected = property.getValueCartesian(new JulianDate());
        for ( var i = expected.length - 1; i > -1; i--) {
            expected[i] = Spherical.fromCartesian3(expected[i]);
        }

        expect(result.length).toEqual(3);
        expect(result[0].clock).toEqual(expected[0].clock);
        expect(result[0].cone).toEqual(expected[0].cone);
        expect(result[0].magnitude).toEqual(expected[0].magnitude);

        expect(result[1].clock).toEqual(expected[1].clock);
        expect(result[1].cone).toEqual(expected[1].cone);
        expect(result[1].magnitude).toEqual(expected[1].magnitude);

        expect(result[2].clock).toEqual(expected[2].clock);
        expect(result[2].cone).toEqual(expected[2].cone);
        expect(result[2].magnitude).toEqual(expected[2].magnitude);
    });

    it('getValueSpherical works for spherical data', function() {
        var property = new DynamicDirectionsProperty();
        property.processCzmlIntervals(sphericalInterval);
        var result = property.getValueSpherical(new JulianDate());

        expect(result.length).toEqual(3);
        expect(result[0].clock).toEqual(sphericalInterval.unitSpherical[0]);
        expect(result[0].cone).toEqual(sphericalInterval.unitSpherical[1]);
        expect(result[0].magnitude).toEqual(1.0);

        expect(result[1].clock).toEqual(sphericalInterval.unitSpherical[2]);
        expect(result[1].cone).toEqual(sphericalInterval.unitSpherical[3]);
        expect(result[1].magnitude).toEqual(1.0);

        expect(result[2].clock).toEqual(sphericalInterval.unitSpherical[4]);
        expect(result[2].cone).toEqual(sphericalInterval.unitSpherical[5]);
        expect(result[2].magnitude).toEqual(1.0);
    });

    it('getValueSpherical returns undefined if no data exists', function() {
        var property = new DynamicDirectionsProperty();
        expect(property.getValueSpherical(new JulianDate())).toBeUndefined();
    });

    it('getValueSpherical throws if no time supplied', function() {
        var property = new DynamicDirectionsProperty();
        expect(function() {
            property.getValueSpherical();
        }).toThrow();
    });
});
