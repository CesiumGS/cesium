/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPyramid',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Spherical',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicPyramid,
              DynamicObject,
              JulianDate,
              Spherical,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured pyramid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.pyramid = new DynamicPyramid();
        objectToMerge.pyramid.material = 1;
        objectToMerge.pyramid.directions = 2;
        objectToMerge.pyramid.intersectionColor = 3;
        objectToMerge.pyramid.radius = 4;
        objectToMerge.pyramid.show = 5;
        objectToMerge.pyramid.showIntersection = 6;
        objectToMerge.pyramid.intersectionWidth = 13;

        var targetObject = new DynamicObject('targetObject');
        targetObject.pyramid = new DynamicPyramid();
        targetObject.pyramid.material = 7;
        targetObject.pyramid.directions = 8;
        targetObject.pyramid.intersectionColor = 9;
        targetObject.pyramid.radius = 10;
        targetObject.pyramid.show = 11;
        targetObject.pyramid.showIntersection = 12;
        targetObject.pyramid.intersectionWidth = 14;

        DynamicPyramid.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.pyramid.material).toEqual(7);
        expect(targetObject.pyramid.directions).toEqual(8);
        expect(targetObject.pyramid.intersectionColor).toEqual(9);
        expect(targetObject.pyramid.radius).toEqual(10);
        expect(targetObject.pyramid.show).toEqual(11);
        expect(targetObject.pyramid.showIntersection).toEqual(12);
        expect(targetObject.pyramid.intersectionWidth).toEqual(14);
    });

    it('mergeProperties creates and configures an undefined pyramid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.pyramid = new DynamicPyramid();
        objectToMerge.material = 1;
        objectToMerge.directions = 2;
        objectToMerge.intersectionColor = 3;
        objectToMerge.radius = 4;
        objectToMerge.show = 5;
        objectToMerge.showIntersection = 6;
        objectToMerge.intersectionWidth = 13;

        var targetObject = new DynamicObject('targetObject');

        DynamicPyramid.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.pyramid.material).toEqual(objectToMerge.pyramid.material);
        expect(targetObject.pyramid.directions).toEqual(objectToMerge.pyramid.directions);
        expect(targetObject.pyramid.intersectionColor).toEqual(objectToMerge.pyramid.intersectionColor);
        expect(targetObject.pyramid.intersectionWidth).toEqual(objectToMerge.pyramid.intersectionWidth);
        expect(targetObject.pyramid.radius).toEqual(objectToMerge.pyramid.radius);
        expect(targetObject.pyramid.show).toEqual(objectToMerge.pyramid.show);
        expect(targetObject.pyramid.showIntersection).toEqual(objectToMerge.pyramid.showIntersection);
    });

    it('mergeProperties does not change when used with an undefined pyramid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.pyramid = new DynamicPyramid();
        targetObject.pyramid.material = 7;
        targetObject.pyramid.directions = 8;
        targetObject.pyramid.intersectionColor = 9;
        targetObject.pyramid.radius = 10;
        targetObject.pyramid.show = 11;
        targetObject.pyramid.showIntersection = 12;
        targetObject.pyramid.intersectionWidth = 14;

        DynamicPyramid.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.pyramid.material).toEqual(7);
        expect(targetObject.pyramid.directions).toEqual(8);
        expect(targetObject.pyramid.intersectionColor).toEqual(9);
        expect(targetObject.pyramid.radius).toEqual(10);
        expect(targetObject.pyramid.show).toEqual(11);
        expect(targetObject.pyramid.showIntersection).toEqual(12);
        expect(targetObject.pyramid.intersectionWidth).toEqual(14);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.pyramid = new DynamicPyramid();
        DynamicPyramid.undefineProperties(testObject);
        expect(testObject.pyramid).toBeUndefined();
    });
});