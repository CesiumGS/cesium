/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicCone',
         'DynamicScene/DynamicObject',
         'Core/Color',
         'Core/Iso8601',
         'Core/TimeInterval'
     ], function(
         DynamicCone,
         DynamicObject,
         Color,
         Iso8601,
         TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured cone', function() {
        var expectedCapMaterial = 13;
        var expectedInnerHalfAngle = 14;
        var expectedInnerMaterial = 15;
        var expectedIntersectionColor = 16;
        var expectedMaximumClockAngle = 17;
        var expectedMinimumClockAngle = 18;
        var expectedOuterHalfAngle = 19;
        var expectedOuterMaterial = 20;
        var expectedRadius = 21;
        var expectedShow = 22;
        var expectedShowIntersection = 23;
        var expectedSilhouetteMaterial = 24;
        var expectedIntersectionWidth = 25;

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.cone = new DynamicCone();
        objectToMerge.cone.capMaterial = 1;
        objectToMerge.cone.innerHalfAngle = 2;
        objectToMerge.cone.innerMaterial = 3;
        objectToMerge.cone.intersectionColor = 4;
        objectToMerge.cone.maximumClockAngle = 5;
        objectToMerge.cone.minimumClockAngle = 6;
        objectToMerge.cone.outerHalfAngle = 7;
        objectToMerge.cone.outerMaterial = 8;
        objectToMerge.cone.radius = 9;
        objectToMerge.cone.show = 10;
        objectToMerge.cone.showIntersection = 11;
        objectToMerge.cone.silhouetteMaterial = 12;
        objectToMerge.cone.intersectionWidth = 13;

        var targetObject = new DynamicObject('targetObject');
        targetObject.cone = new DynamicCone();
        targetObject.cone.capMaterial = expectedCapMaterial;
        targetObject.cone.innerHalfAngle = expectedInnerHalfAngle;
        targetObject.cone.innerMaterial = expectedInnerMaterial;
        targetObject.cone.intersectionColor = expectedIntersectionColor;
        targetObject.cone.intersectionWidth = expectedIntersectionWidth;
        targetObject.cone.maximumClockAngle = expectedMaximumClockAngle;
        targetObject.cone.minimumClockAngle = expectedMinimumClockAngle;
        targetObject.cone.outerHalfAngle = expectedOuterHalfAngle;
        targetObject.cone.outerMaterial = expectedOuterMaterial;
        targetObject.cone.radius = expectedRadius;
        targetObject.cone.show = expectedShow;
        targetObject.cone.showIntersection = expectedShowIntersection;
        targetObject.cone.silhouetteMaterial = expectedSilhouetteMaterial;

        DynamicCone.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.cone.capMaterial).toEqual(expectedCapMaterial);
        expect(targetObject.cone.innerHalfAngle).toEqual(expectedInnerHalfAngle);
        expect(targetObject.cone.innerMaterial).toEqual(expectedInnerMaterial);
        expect(targetObject.cone.intersectionColor).toEqual(expectedIntersectionColor);
        expect(targetObject.cone.intersectionWidth).toEqual(expectedIntersectionWidth);
        expect(targetObject.cone.maximumClockAngle).toEqual(expectedMaximumClockAngle);
        expect(targetObject.cone.minimumClockAngle).toEqual(expectedMinimumClockAngle);
        expect(targetObject.cone.outerHalfAngle).toEqual(expectedOuterHalfAngle);
        expect(targetObject.cone.outerMaterial).toEqual(expectedOuterMaterial);
        expect(targetObject.cone.radius).toEqual(expectedRadius);
        expect(targetObject.cone.show).toEqual(expectedShow);
        expect(targetObject.cone.showIntersection).toEqual(expectedShowIntersection);
        expect(targetObject.cone.silhouetteMaterial).toEqual(expectedSilhouetteMaterial);
    });

    it('mergeProperties creates and configures an undefined cone', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.cone = new DynamicCone();
        objectToMerge.capMaterial = 1;
        objectToMerge.innerHalfAngle = 2;
        objectToMerge.innerMaterial = 3;
        objectToMerge.intersectionColor = 4;
        objectToMerge.maximumClockAngle = 5;
        objectToMerge.minimumClockAngle = 6;
        objectToMerge.outerHalfAngle = 7;
        objectToMerge.outerMaterial = 8;
        objectToMerge.radius = 9;
        objectToMerge.show = 10;
        objectToMerge.showIntersection = 11;
        objectToMerge.silhouetteMaterial = 12;
        objectToMerge.intersectionWidth = 13;

        var targetObject = new DynamicObject('targetObject');

        DynamicCone.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.cone.capMaterial).toEqual(objectToMerge.cone.capMaterial);
        expect(targetObject.cone.innerHalfAngle).toEqual(objectToMerge.cone.innerHalfAngle);
        expect(targetObject.cone.innerMaterial).toEqual(objectToMerge.cone.innerMaterial);
        expect(targetObject.cone.intersectionColor).toEqual(objectToMerge.cone.intersectionColor);
        expect(targetObject.cone.intersectionWidth).toEqual(objectToMerge.cone.intersectionWidth);
        expect(targetObject.cone.maximumClockAngle).toEqual(objectToMerge.cone.maximumClockAngle);
        expect(targetObject.cone.minimumClockAngle).toEqual(objectToMerge.cone.minimumClockAngle);
        expect(targetObject.cone.outerHalfAngle).toEqual(objectToMerge.cone.outerHalfAngle);
        expect(targetObject.cone.outerMaterial).toEqual(objectToMerge.cone.outerMaterial);
        expect(targetObject.cone.radius).toEqual(objectToMerge.cone.radius);
        expect(targetObject.cone.show).toEqual(objectToMerge.cone.show);
        expect(targetObject.cone.showIntersection).toEqual(objectToMerge.cone.showIntersection);
        expect(targetObject.cone.silhouetteMaterial).toEqual(objectToMerge.cone.silhouetteMaterial);
    });

    it('mergeProperties does not change when used with an undefined cone', function() {
        var expectedCapMaterial = 13;
        var expectedInnerHalfAngle = 14;
        var expectedInnerMaterial = 15;
        var expectedIntersectionColor = 16;
        var expectedMaximumClockAngle = 17;
        var expectedMinimumClockAngle = 18;
        var expectedOuterHalfAngle = 19;
        var expectedOuterMaterial = 20;
        var expectedRadius = 21;
        var expectedShow = 22;
        var expectedShowIntersection = 23;
        var expectedSilhouetteMaterial = 24;
        var expectedIntersectionWidth = 25;

        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.cone = new DynamicCone();
        targetObject.cone.capMaterial = expectedCapMaterial;
        targetObject.cone.innerHalfAngle = expectedInnerHalfAngle;
        targetObject.cone.innerMaterial = expectedInnerMaterial;
        targetObject.cone.intersectionColor = expectedIntersectionColor;
        targetObject.cone.intersectionWidth = expectedIntersectionWidth;
        targetObject.cone.maximumClockAngle = expectedMaximumClockAngle;
        targetObject.cone.minimumClockAngle = expectedMinimumClockAngle;
        targetObject.cone.outerHalfAngle = expectedOuterHalfAngle;
        targetObject.cone.outerMaterial = expectedOuterMaterial;
        targetObject.cone.radius = expectedRadius;
        targetObject.cone.show = expectedShow;
        targetObject.cone.showIntersection = expectedShowIntersection;
        targetObject.cone.silhouetteMaterial = expectedSilhouetteMaterial;

        DynamicCone.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.cone.capMaterial).toEqual(expectedCapMaterial);
        expect(targetObject.cone.innerHalfAngle).toEqual(expectedInnerHalfAngle);
        expect(targetObject.cone.innerMaterial).toEqual(expectedInnerMaterial);
        expect(targetObject.cone.intersectionColor).toEqual(expectedIntersectionColor);
        expect(targetObject.cone.intersectionWidth).toEqual(expectedIntersectionWidth);
        expect(targetObject.cone.maximumClockAngle).toEqual(expectedMaximumClockAngle);
        expect(targetObject.cone.minimumClockAngle).toEqual(expectedMinimumClockAngle);
        expect(targetObject.cone.outerHalfAngle).toEqual(expectedOuterHalfAngle);
        expect(targetObject.cone.outerMaterial).toEqual(expectedOuterMaterial);
        expect(targetObject.cone.radius).toEqual(expectedRadius);
        expect(targetObject.cone.show).toEqual(expectedShow);
        expect(targetObject.cone.showIntersection).toEqual(expectedShowIntersection);
        expect(targetObject.cone.silhouetteMaterial).toEqual(expectedSilhouetteMaterial);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.cone = new DynamicCone();
        DynamicCone.undefineProperties(testObject);
        expect(testObject.cone).toBeUndefined();
    });
});