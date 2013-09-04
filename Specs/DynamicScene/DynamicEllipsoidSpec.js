/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipsoid',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicEllipsoid,
              DynamicObject,
              JulianDate,
              Cartesian3,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured ellipsoid', function() {
        var expectedMaterial = 4;
        var expectedRadii = 5;
        var expectedShow = 6;

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipsoid = new DynamicEllipsoid();
        objectToMerge.material = 1;
        objectToMerge.radii = 2;
        objectToMerge.show = 3;

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipsoid = new DynamicEllipsoid();
        mergedObject.ellipsoid.material = expectedMaterial;
        mergedObject.ellipsoid.radii = expectedRadii;
        mergedObject.ellipsoid.show = expectedShow;

        DynamicEllipsoid.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipsoid.material).toEqual(expectedMaterial);
        expect(mergedObject.ellipsoid.radii).toEqual(expectedRadii);
        expect(mergedObject.ellipsoid.show).toEqual(expectedShow);
    });

    it('mergeProperties creates and configures an undefined ellipsoid', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipsoid = new DynamicEllipsoid();
        objectToMerge.material = 1;
        objectToMerge.radii = 2;
        objectToMerge.show = 3;

        var mergedObject = new DynamicObject('mergedObject');

        DynamicEllipsoid.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipsoid.material).toEqual(objectToMerge.ellipsoid.material);
        expect(mergedObject.ellipsoid.radii).toEqual(objectToMerge.ellipsoid.radii);
        expect(mergedObject.ellipsoid.show).toEqual(objectToMerge.ellipsoid.show);
    });

    it('mergeProperties does not change when used with an undefined ellipsoid', function() {
        var expectedMaterial = 4;
        var expectedRadii = 5;
        var expectedShow = 6;

        var objectToMerge = new DynamicObject('objectToMerge');

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipsoid = new DynamicEllipsoid();
        mergedObject.ellipsoid.material = expectedMaterial;
        mergedObject.ellipsoid.radii = expectedRadii;
        mergedObject.ellipsoid.show = expectedShow;

        DynamicEllipsoid.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipsoid.material).toEqual(expectedMaterial);
        expect(mergedObject.ellipsoid.radii).toEqual(expectedRadii);
        expect(mergedObject.ellipsoid.show).toEqual(expectedShow);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.ellipsoid = new DynamicEllipsoid();
        DynamicEllipsoid.undefineProperties(testObject);
        expect(testObject.ellipsoid).toBeUndefined();
    });
});