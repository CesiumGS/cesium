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
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPath.processCzmlPacket(dynamicObject, pathPacket)).toEqual(true);

        expect(dynamicObject.path).toBeDefined();
        expect(dynamicObject.path.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.path.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.width);
        expect(dynamicObject.path.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.path.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.outlineWidth);
        expect(dynamicObject.path.leadTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.leadTime);
        expect(dynamicObject.path.trailTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.trailTime);
        expect(dynamicObject.path.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained path.', function() {
        var pathPacket = {
            path : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
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
        expect(dynamicObject.path.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.path.width.getValue(validTime)).toEqual(pathPacket.path.width);
        expect(dynamicObject.path.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.path.outlineWidth.getValue(validTime)).toEqual(pathPacket.path.outlineWidth);
        expect(dynamicObject.path.leadTime.getValue(validTime)).toEqual(pathPacket.path.leadTime);
        expect(dynamicObject.path.trailTime.getValue(validTime)).toEqual(pathPacket.path.trailTime);
        expect(dynamicObject.path.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.path.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.outlineWidth.getValue(invalidTime)).toBeUndefined();
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
        objectToMerge.path.color = 1;
        objectToMerge.path.width = 2;
        objectToMerge.path.outlineColor = 3;
        objectToMerge.path.outlineWidth = 4;
        objectToMerge.path.show = 5;
        objectToMerge.path.leadTime = 6;
        objectToMerge.path.trailTime = 7;

        var targetObject = new DynamicObject('targetObject');
        targetObject.path = new DynamicPath();
        targetObject.path.color = 8;
        targetObject.path.width = 9;
        targetObject.path.outlineColor = 10;
        targetObject.path.outlineWidth = 11;
        targetObject.path.show = 12;
        targetObject.path.leadTime = 13;
        targetObject.path.trailTime = 14;

        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.color).toEqual(8);
        expect(targetObject.path.width).toEqual(9);
        expect(targetObject.path.outlineColor).toEqual(10);
        expect(targetObject.path.outlineWidth).toEqual(11);
        expect(targetObject.path.show).toEqual(12);
        expect(targetObject.path.leadTime).toEqual(13);
        expect(targetObject.path.trailTime).toEqual(14);
    });

    it('mergeProperties creates and configures an undefined path', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.path = new DynamicPath();
        objectToMerge.path.color = 1;
        objectToMerge.path.width = 2;
        objectToMerge.path.outlineColor = 3;
        objectToMerge.path.outlineWidth = 4;
        objectToMerge.path.show = 5;
        objectToMerge.path.leadTime = 6;
        objectToMerge.path.trailTime = 7;
        var targetObject = new DynamicObject('targetObject');

        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.color).toEqual(objectToMerge.path.color);
        expect(targetObject.path.width).toEqual(objectToMerge.path.width);
        expect(targetObject.path.outlineColor).toEqual(objectToMerge.path.outlineColor);
        expect(targetObject.path.outlineWidth).toEqual(objectToMerge.path.outlineWidth);
        expect(targetObject.path.show).toEqual(objectToMerge.path.show);
        expect(targetObject.path.leadTime).toEqual(objectToMerge.path.leadTime);
        expect(targetObject.path.trailTime).toEqual(objectToMerge.path.trailTime);
    });

    it('mergeProperties does not change when used with an undefined path', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.path = new DynamicPath();
        targetObject.path = new DynamicPath();
        targetObject.path.color = 1;
        targetObject.path.width = 2;
        targetObject.path.outlineColor = 3;
        targetObject.path.outlineWidth = 4;
        targetObject.path.show = 5;
        targetObject.path.leadTime = 6;
        targetObject.path.trailTime = 7;
        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.color).toEqual(1);
        expect(targetObject.path.width).toEqual(2);
        expect(targetObject.path.outlineColor).toEqual(3);
        expect(targetObject.path.outlineWidth).toEqual(4);
        expect(targetObject.path.show).toEqual(5);
        expect(targetObject.path.leadTime).toEqual(6);
        expect(targetObject.path.trailTime).toEqual(7);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.path = new DynamicPath();
        DynamicPath.undefineProperties(testObject);
        expect(testObject.path).toBeUndefined();
    });
});