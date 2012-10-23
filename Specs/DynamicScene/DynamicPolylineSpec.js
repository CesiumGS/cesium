/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPolyline',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicPolyline,
              DynamicObject,
              JulianDate,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite polyline.', function() {
        var polylinePacket = {
            polyline : {
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolyline.processCzmlPacket(dynamicObject, polylinePacket)).toEqual(true);

        expect(dynamicObject.polyline).toBeDefined();
        expect(dynamicObject.polyline.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polyline.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(polylinePacket.polyline.width);
        expect(dynamicObject.polyline.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.polyline.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(polylinePacket.polyline.outlineWidth);
        expect(dynamicObject.polyline.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained polyline.', function() {
        var polylinePacket = {
            polyline : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(polylinePacket.polyline.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolyline.processCzmlPacket(dynamicObject, polylinePacket)).toEqual(true);

        expect(dynamicObject.polyline).toBeDefined();
        expect(dynamicObject.polyline.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polyline.width.getValue(validTime)).toEqual(polylinePacket.polyline.width);
        expect(dynamicObject.polyline.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.polyline.outlineWidth.getValue(validTime)).toEqual(polylinePacket.polyline.outlineWidth);
        expect(dynamicObject.polyline.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.polyline.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.outlineWidth.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolyline.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.polyline).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured polyline', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.polyline = new DynamicPolyline();
        objectToMerge.polyline.color = 1;
        objectToMerge.polyline.width = 2;
        objectToMerge.polyline.outlineColor = 3;
        objectToMerge.polyline.outlineWidth = 4;
        objectToMerge.polyline.show = 5;

        var targetObject = new DynamicObject('targetObject');
        targetObject.polyline = new DynamicPolyline();
        targetObject.polyline.color = 6;
        targetObject.polyline.width = 7;
        targetObject.polyline.outlineColor = 8;
        targetObject.polyline.outlineWidth = 9;
        targetObject.polyline.show = 10;

        DynamicPolyline.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polyline.color).toEqual(6);
        expect(targetObject.polyline.width).toEqual(7);
        expect(targetObject.polyline.outlineColor).toEqual(8);
        expect(targetObject.polyline.outlineWidth).toEqual(9);
        expect(targetObject.polyline.show).toEqual(10);
    });

    it('mergeProperties creates and configures an undefined polyline', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.polyline = new DynamicPolyline();
        objectToMerge.polyline.color = 1;
        objectToMerge.polyline.width = 2;
        objectToMerge.polyline.outlineColor = 3;
        objectToMerge.polyline.outlineWidth = 4;
        objectToMerge.polyline.show = 5;

        var targetObject = new DynamicObject('targetObject');

        DynamicPolyline.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polyline.color).toEqual(objectToMerge.polyline.color);
        expect(targetObject.polyline.width).toEqual(objectToMerge.polyline.width);
        expect(targetObject.polyline.outlineColor).toEqual(objectToMerge.polyline.outlineColor);
        expect(targetObject.polyline.outlineWidth).toEqual(objectToMerge.polyline.outlineWidth);
        expect(targetObject.polyline.show).toEqual(objectToMerge.polyline.show);
    });

    it('mergeProperties does not change when used with an undefined polyline', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.polyline = new DynamicPolyline();
        targetObject.polyline.color = 6;
        targetObject.polyline.width = 7;
        targetObject.polyline.outlineColor = 8;
        targetObject.polyline.outlineWidth = 9;
        targetObject.polyline.show = 10;

        DynamicPolyline.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polyline.color).toEqual(6);
        expect(targetObject.polyline.width).toEqual(7);
        expect(targetObject.polyline.outlineColor).toEqual(8);
        expect(targetObject.polyline.outlineWidth).toEqual(9);
        expect(targetObject.polyline.show).toEqual(10);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.polyline = new DynamicPolyline();
        DynamicPolyline.undefineProperties(testObject);
        expect(testObject.polyline).toBeUndefined();
    });
});