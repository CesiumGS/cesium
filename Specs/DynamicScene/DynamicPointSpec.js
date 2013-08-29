/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPoint',
         'DynamicScene/DynamicObject',
         'Core/Color',
         'Core/Iso8601',
         'Core/TimeInterval'
     ], function(
         DynamicPoint,
         DynamicObject,
         Color,
         Iso8601,
         TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured point', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.point = new DynamicPoint();
        objectToMerge.point.color = 1;
        objectToMerge.point.pixelSize = 2;
        objectToMerge.point.outlineColor = 3;
        objectToMerge.point.outlineWidth = 4;
        objectToMerge.point.show = 5;

        var targetObject = new DynamicObject('targetObject');
        targetObject.point = new DynamicPoint();
        targetObject.point.color = 6;
        targetObject.point.pixelSize = 7;
        targetObject.point.outlineColor = 8;
        targetObject.point.outlineWidth = 9;
        targetObject.point.show = 10;

        DynamicPoint.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.point.color).toEqual(6);
        expect(targetObject.point.pixelSize).toEqual(7);
        expect(targetObject.point.outlineColor).toEqual(8);
        expect(targetObject.point.outlineWidth).toEqual(9);
        expect(targetObject.point.show).toEqual(10);
    });

    it('mergeProperties creates and configures an undefined point', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.point = new DynamicPoint();
        objectToMerge.point.color = 1;
        objectToMerge.point.pixelSize = 2;
        objectToMerge.point.outlineColor = 3;
        objectToMerge.point.outlineWidth = 4;
        objectToMerge.point.show = 5;

        var targetObject = new DynamicObject('targetObject');

        DynamicPoint.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.point.color).toEqual(objectToMerge.point.color);
        expect(targetObject.point.pixelSize).toEqual(objectToMerge.point.pixelSize);
        expect(targetObject.point.outlineColor).toEqual(objectToMerge.point.outlineColor);
        expect(targetObject.point.outlineWidth).toEqual(objectToMerge.point.outlineWidth);
        expect(targetObject.point.show).toEqual(objectToMerge.point.show);
    });

    it('mergeProperties does not change when used with an undefined point', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.point = new DynamicPoint();
        targetObject.point.color = 6;
        targetObject.point.pixelSize = 7;
        targetObject.point.outlineColor = 8;
        targetObject.point.outlineWidth = 9;
        targetObject.point.show = 10;

        DynamicPoint.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.point.color).toEqual(6);
        expect(targetObject.point.pixelSize).toEqual(7);
        expect(targetObject.point.outlineColor).toEqual(8);
        expect(targetObject.point.outlineWidth).toEqual(9);
        expect(targetObject.point.show).toEqual(10);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.point = new DynamicPoint();
        DynamicPoint.undefineProperties(testObject);
        expect(testObject.point).toBeUndefined();
    });
});