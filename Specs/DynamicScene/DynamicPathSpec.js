/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPath',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicPath,
              DynamicObject,
              JulianDate,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite path.', function() {
        var pathPacket = {
            path : {
                width : 1.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                resolution : 23.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPath.processCzmlPacket(dynamicObject, pathPacket)).toEqual(true);

        expect(dynamicObject.path).toBeDefined();
        expect(dynamicObject.path.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.width);
        expect(dynamicObject.path.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.path.resolution.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.resolution);
        expect(dynamicObject.path.leadTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.leadTime);
        expect(dynamicObject.path.trailTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.trailTime);
        expect(dynamicObject.path.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained path.', function() {
        var pathPacket = {
            path : {
                interval : '2000-01-01/2001-01-01',
                width : 1.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                resolution : 23.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(pathPacket.path.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPath.processCzmlPacket(dynamicObject, pathPacket)).toEqual(true);

        expect(dynamicObject.path).toBeDefined();
        expect(dynamicObject.path.width.getValue(validTime)).toEqual(pathPacket.path.width);
        expect(dynamicObject.path.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.path.resolution.getValue(validTime)).toEqual(pathPacket.path.resolution);
        expect(dynamicObject.path.leadTime.getValue(validTime)).toEqual(pathPacket.path.leadTime);
        expect(dynamicObject.path.trailTime.getValue(validTime)).toEqual(pathPacket.path.trailTime);
        expect(dynamicObject.path.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.path.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.material.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.leadTime.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.trailTime.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPath.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.path).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured path', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.path = new DynamicPath();
        objectToMerge.path.width = 1;
        objectToMerge.path.material = 2;
        objectToMerge.path.show = 3;
        objectToMerge.path.leadTime = 4;
        objectToMerge.path.trailTime = 5;
        objectToMerge.path.resolution = 6;

        var targetObject = new DynamicObject('targetObject');
        targetObject.path = new DynamicPath();
        targetObject.path.width = 7;
        targetObject.path.material = 8;
        targetObject.path.show = 9;
        targetObject.path.leadTime = 10;
        targetObject.path.trailTime = 11;
        targetObject.path.resolution = 12;

        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.width).toEqual(7);
        expect(targetObject.path.material).toEqual(8);
        expect(targetObject.path.show).toEqual(9);
        expect(targetObject.path.leadTime).toEqual(10);
        expect(targetObject.path.trailTime).toEqual(11);
        expect(targetObject.path.resolution).toEqual(12);
    });

    it('mergeProperties creates and configures an undefined path', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.path = new DynamicPath();
        objectToMerge.path.width = 1;
        objectToMerge.path.material = 2;
        objectToMerge.path.show = 3;
        objectToMerge.path.leadTime = 4;
        objectToMerge.path.trailTime = 5;
        objectToMerge.path.resolution = 6;
        var targetObject = new DynamicObject('targetObject');

        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.width).toEqual(objectToMerge.path.width);
        expect(targetObject.path.material).toEqual(objectToMerge.path.material);
        expect(targetObject.path.show).toEqual(objectToMerge.path.show);
        expect(targetObject.path.leadTime).toEqual(objectToMerge.path.leadTime);
        expect(targetObject.path.trailTime).toEqual(objectToMerge.path.trailTime);
        expect(targetObject.path.resolution).toEqual(objectToMerge.path.resolution);
    });

    it('mergeProperties does not change when used with an undefined path', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.path = new DynamicPath();
        targetObject.path.width = 1;
        targetObject.path.material = 2;
        targetObject.path.show = 3;
        targetObject.path.leadTime = 4;
        targetObject.path.trailTime = 5;
        targetObject.path.resolution = 6;
        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.width).toEqual(1);
        expect(targetObject.path.material).toEqual(2);
        expect(targetObject.path.show).toEqual(3);
        expect(targetObject.path.leadTime).toEqual(4);
        expect(targetObject.path.trailTime).toEqual(5);
        expect(targetObject.path.resolution).toEqual(6);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.path = new DynamicPath();
        DynamicPath.undefineProperties(testObject);
        expect(testObject.path).toBeUndefined();
    });
});