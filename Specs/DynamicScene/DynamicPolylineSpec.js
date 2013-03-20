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
                width : 1.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolyline.processCzmlPacket(dynamicObject, polylinePacket)).toEqual(true);

        expect(dynamicObject.polyline).toBeDefined();
        expect(dynamicObject.polyline.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(polylinePacket.polyline.width);
        expect(dynamicObject.polyline.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polyline.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained polyline.', function() {
        var polylinePacket = {
            polyline : {
                interval : '2000-01-01/2001-01-01',
                width : 1.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(polylinePacket.polyline.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolyline.processCzmlPacket(dynamicObject, polylinePacket)).toEqual(true);

        expect(dynamicObject.polyline).toBeDefined();
        expect(dynamicObject.polyline.width.getValue(validTime)).toEqual(polylinePacket.polyline.width);
        expect(dynamicObject.polyline.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polyline.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.polyline.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.material.getValue(invalidTime)).toBeUndefined();
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
        objectToMerge.polyline.width = 1;
        objectToMerge.polyline.material = 2;
        objectToMerge.polyline.show = 3;

        var targetObject = new DynamicObject('targetObject');
        targetObject.polyline = new DynamicPolyline();
        targetObject.polyline.width = 4;
        targetObject.polyline.material = 5;
        targetObject.polyline.show = 6;

        DynamicPolyline.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polyline.width).toEqual(4);
        expect(targetObject.polyline.material).toEqual(5);
        expect(targetObject.polyline.show).toEqual(6);
    });

    it('mergeProperties creates and configures an undefined polyline', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.polyline = new DynamicPolyline();
        objectToMerge.polyline.width = 1;
        objectToMerge.polyline.material = 2;
        objectToMerge.polyline.show = 3;

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
        targetObject.polyline.width = 4;
        targetObject.polyline.material = 5;
        targetObject.polyline.show = 6;

        DynamicPolyline.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polyline.width).toEqual(4);
        expect(targetObject.polyline.material).toEqual(5);
        expect(targetObject.polyline.show).toEqual(6);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.polyline = new DynamicPolyline();
        DynamicPolyline.undefineProperties(testObject);
        expect(testObject.polyline).toBeUndefined();
    });
});