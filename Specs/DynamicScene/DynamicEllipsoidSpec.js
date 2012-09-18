/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipsoid',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicEllipsoid,
              DynamicObject,
              JulianDate,
              Cartesian3,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite ellipsoid.', function() {
        var expectedRadii = new Cartesian3(1.0, 2.0, 3.0);
        var ellipsoidPacket = {
                ellipsoid : {
                radii : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                show : true,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                }
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipsoid.processCzmlPacket(dynamicObject, ellipsoidPacket)).toEqual(true);

        expect(dynamicObject.ellipsoid).toBeDefined();
        expect(dynamicObject.ellipsoid.radii.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedRadii);
        expect(dynamicObject.ellipsoid.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsoidPacket.ellipsoid.show);
        expect(dynamicObject.ellipsoid.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
    });

    it('processCzmlPacket adds data for constrained ellipsoid.', function() {
        var expectedRadii = new Cartesian3(1.0, 2.0, 3.0);
        var ellipsoidPacket = {
                ellipsoid : {
                interval : '2000-01-01/2001-01-01',
                radii : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                show : true,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                }
            }
        };

        var validTime = TimeInterval.fromIso8601(ellipsoidPacket.ellipsoid.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipsoid.processCzmlPacket(dynamicObject, ellipsoidPacket)).toEqual(true);

        expect(dynamicObject.ellipsoid).toBeDefined();
        expect(dynamicObject.ellipsoid.radii.getValue(validTime)).toEqual(expectedRadii);
        expect(dynamicObject.ellipsoid.show.getValue(validTime)).toEqual(ellipsoidPacket.ellipsoid.show);
        expect(dynamicObject.ellipsoid.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));

        expect(dynamicObject.ellipsoid.radii.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipsoid.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipsoid.material.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipsoid.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.ellipsoid).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured ellipsoid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipsoid = new DynamicEllipsoid();
        objectToMerge.material = 1;
        objectToMerge.radii = 2;
        objectToMerge.show = 3;

        var targetObject = new DynamicObject('targetObject');
        targetObject.ellipsoid = new DynamicEllipsoid();
        targetObject.ellipsoid.material = 4;
        targetObject.ellipsoid.radii = 5;
        targetObject.ellipsoid.show = 6;

        DynamicEllipsoid.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.ellipsoid.material).toEqual(4);
        expect(targetObject.ellipsoid.radii).toEqual(5);
        expect(targetObject.ellipsoid.show).toEqual(6);
    });

    it('mergeProperties creates and configures an undefined ellipsoid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipsoid = new DynamicEllipsoid();
        objectToMerge.material = 1;
        objectToMerge.radii = 2;
        objectToMerge.show = 3;

        var targetObject = new DynamicObject('targetObject');

        DynamicEllipsoid.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.ellipsoid.material).toEqual(objectToMerge.ellipsoid.material);
        expect(targetObject.ellipsoid.radii).toEqual(objectToMerge.ellipsoid.radii);
        expect(targetObject.ellipsoid.show).toEqual(objectToMerge.ellipsoid.show);
    });

    it('mergeProperties does not change when used with an undefined ellipsoid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.ellipsoid = new DynamicEllipsoid();
        targetObject.ellipsoid.material = 1;
        targetObject.ellipsoid.radii = 2;
        targetObject.ellipsoid.show = 3;

        DynamicEllipsoid.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.ellipsoid.material).toEqual(1);
        expect(targetObject.ellipsoid.radii).toEqual(2);
        expect(targetObject.ellipsoid.show).toEqual(3);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.ellipsoid = new DynamicEllipsoid();
        DynamicEllipsoid.undefineProperties(testObject);
        expect(testObject.ellipsoid).toBeUndefined();
    });
});