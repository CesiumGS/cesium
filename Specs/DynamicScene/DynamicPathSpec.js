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
        objectToMerge.path.resolution = 8;

        var targetObject = new DynamicObject('targetObject');
        targetObject.path = new DynamicPath();
        targetObject.path.color = 9;
        targetObject.path.width = 10;
        targetObject.path.outlineColor = 11;
        targetObject.path.outlineWidth = 12;
        targetObject.path.show = 13;
        targetObject.path.leadTime = 14;
        targetObject.path.trailTime = 15;
        targetObject.path.resolution = 16;

        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.color).toEqual(9);
        expect(targetObject.path.width).toEqual(10);
        expect(targetObject.path.outlineColor).toEqual(11);
        expect(targetObject.path.outlineWidth).toEqual(12);
        expect(targetObject.path.show).toEqual(13);
        expect(targetObject.path.leadTime).toEqual(14);
        expect(targetObject.path.trailTime).toEqual(15);
        expect(targetObject.path.resolution).toEqual(16);
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
        objectToMerge.path.resolution = 8;
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
        targetObject.path.resolution = 8;
        DynamicPath.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.path.color).toEqual(1);
        expect(targetObject.path.width).toEqual(2);
        expect(targetObject.path.outlineColor).toEqual(3);
        expect(targetObject.path.outlineWidth).toEqual(4);
        expect(targetObject.path.show).toEqual(5);
        expect(targetObject.path.leadTime).toEqual(6);
        expect(targetObject.path.trailTime).toEqual(7);
        expect(targetObject.path.resolution).toEqual(8);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.path = new DynamicPath();
        DynamicPath.undefineProperties(testObject);
        expect(testObject.path).toBeUndefined();
    });
});