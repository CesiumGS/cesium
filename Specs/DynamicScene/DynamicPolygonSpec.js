/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPolygon',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicPolygon,
              DynamicObject,
              JulianDate,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite polygon.', function() {
        var polygonPacket = {
            polygon : {
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
        expect(DynamicPolygon.processCzmlPacket(dynamicObject, polygonPacket)).toEqual(true);

        expect(dynamicObject.polygon).toBeDefined();
        expect(dynamicObject.polygon.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polygon.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained polygon.', function() {
        var polygonPacket = {
            polygon : {
                interval : '2000-01-01/2001-01-01',
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

        var validTime = TimeInterval.fromIso8601(polygonPacket.polygon.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolygon.processCzmlPacket(dynamicObject, polygonPacket)).toEqual(true);

        expect(dynamicObject.polygon).toBeDefined();
        expect(dynamicObject.polygon.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polygon.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.polygon.material.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polygon.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPolygon.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.polygon).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured polygon', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.polygon = new DynamicPolygon();
        objectToMerge.polygon.material = 1;
        objectToMerge.polygon.show = 2;

        var targetObject = new DynamicObject('targetObject');
        targetObject.polygon = new DynamicPolygon();
        targetObject.polygon.material = 3;
        targetObject.polygon.show = 4;

        DynamicPolygon.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polygon.material).toEqual(3);
        expect(targetObject.polygon.show).toEqual(4);
    });

    it('mergeProperties creates and configures an undefined polygon', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.polygon = new DynamicPolygon();
        objectToMerge.polygon.material = 1;
        objectToMerge.polygon.show = 2;

        var targetObject = new DynamicObject('targetObject');

        DynamicPolygon.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polygon.material).toEqual(objectToMerge.polygon.material);
        expect(targetObject.polygon.show).toEqual(objectToMerge.polygon.show);
    });

    it('mergeProperties does not change when used with an undefined polygon', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.polygon = new DynamicPolygon();
        targetObject.polygon.material = 3;
        targetObject.polygon.show = 4;

        DynamicPolygon.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.polygon.material).toEqual(3);
        expect(targetObject.polygon.show).toEqual(4);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.polygon = new DynamicPolygon();
        DynamicPolygon.undefineProperties(testObject);
        expect(testObject.polygon).toBeUndefined();
    });
});