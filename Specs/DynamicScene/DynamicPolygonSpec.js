/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPolygon',
         'DynamicScene/DynamicObject',
         'Core/Color',
         'Core/Iso8601',
         'Core/TimeInterval'
     ], function(
         DynamicPolygon,
         DynamicObject,
         Color,
         Iso8601,
         TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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