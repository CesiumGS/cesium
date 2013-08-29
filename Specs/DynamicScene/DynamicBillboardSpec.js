/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicBillboard',
         'DynamicScene/DynamicObject',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Color',
         'Core/Iso8601',
         'Core/TimeInterval',
         'Scene/HorizontalOrigin',
         'Scene/VerticalOrigin'
     ], function(
         DynamicBillboard,
         DynamicObject,
         Cartesian2,
         Cartesian3,
         Color,
         Iso8601,
         TimeInterval,
         HorizontalOrigin,
         VerticalOrigin) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured billboard', function() {
        var expectedImage = 'image';
        var expectedScale = 'scale';
        var expectedRotation = 'rotation';
        var expectedAlignedAxis = 'alignedAxis';
        var expectedHorizontalOrigin = 'horizontalOrigin';
        var expectedVerticalOrigin = 'verticalOrigin';
        var expectedColor = 'color';
        var expectedEyeOffset = 'eyeOffset';
        var expectedPixelOffset = 'pixelOffset';
        var expectedShow = 'show';

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.billboard = new DynamicBillboard();
        objectToMerge.billboard.image = 1;
        objectToMerge.billboard.scale = 2;
        objectToMerge.billboard.rotation = 3;
        objectToMerge.billboard.alignedAxis = 4;
        objectToMerge.billboard.horizontalOrigin = 5;
        objectToMerge.billboard.verticalOrigin = 6;
        objectToMerge.billboard.color = 7;
        objectToMerge.billboard.eyeOffset = 8;
        objectToMerge.billboard.pixelOffset = 9;
        objectToMerge.billboard.show = 10;

        var targetObject = new DynamicObject('targetObject');
        targetObject.billboard = new DynamicBillboard();
        targetObject.billboard.image = expectedImage;
        targetObject.billboard.scale = expectedScale;
        targetObject.billboard.rotation = expectedRotation;
        targetObject.billboard.alignedAxis = expectedAlignedAxis;
        targetObject.billboard.horizontalOrigin = expectedHorizontalOrigin;
        targetObject.billboard.verticalOrigin = expectedVerticalOrigin;
        targetObject.billboard.color = expectedColor;
        targetObject.billboard.eyeOffset = expectedEyeOffset;
        targetObject.billboard.pixelOffset = expectedPixelOffset;
        targetObject.billboard.show = expectedShow;

        DynamicBillboard.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.billboard.image).toEqual(expectedImage);
        expect(targetObject.billboard.scale).toEqual(expectedScale);
        expect(targetObject.billboard.rotation).toEqual(expectedRotation);
        expect(targetObject.billboard.alignedAxis).toEqual(expectedAlignedAxis);
        expect(targetObject.billboard.horizontalOrigin).toEqual(expectedHorizontalOrigin);
        expect(targetObject.billboard.verticalOrigin).toEqual(expectedVerticalOrigin);
        expect(targetObject.billboard.color).toEqual(expectedColor);
        expect(targetObject.billboard.eyeOffset).toEqual(expectedEyeOffset);
        expect(targetObject.billboard.pixelOffset).toEqual(expectedPixelOffset);
        expect(targetObject.billboard.show).toEqual(expectedShow);
    });

    it('mergeProperties creates and configures an undefined billboard', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.billboard = new DynamicBillboard();
        objectToMerge.billboard.image = 1;
        objectToMerge.billboard.scale = 2;
        objectToMerge.billboard.rotation = 3;
        objectToMerge.billboard.alignedAxis = 4;
        objectToMerge.billboard.horizontalOrigin = 5;
        objectToMerge.billboard.verticalOrigin = 6;
        objectToMerge.billboard.color = 7;
        objectToMerge.billboard.eyeOffset = 8;
        objectToMerge.billboard.pixelOffset = 9;
        objectToMerge.billboard.show = 10;

        var targetObject = new DynamicObject('targetObject');

        DynamicBillboard.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.billboard.image).toEqual(objectToMerge.billboard.image);
        expect(targetObject.billboard.scale).toEqual(objectToMerge.billboard.scale);
        expect(targetObject.billboard.rotation).toEqual(objectToMerge.billboard.rotation);
        expect(targetObject.billboard.alignedAxis).toEqual(objectToMerge.billboard.alignedAxis);
        expect(targetObject.billboard.horizontalOrigin).toEqual(objectToMerge.billboard.horizontalOrigin);
        expect(targetObject.billboard.verticalOrigin).toEqual(objectToMerge.billboard.verticalOrigin);
        expect(targetObject.billboard.color).toEqual(objectToMerge.billboard.color);
        expect(targetObject.billboard.eyeOffset).toEqual(objectToMerge.billboard.eyeOffset);
        expect(targetObject.billboard.pixelOffset).toEqual(objectToMerge.billboard.pixelOffset);
        expect(targetObject.billboard.show).toEqual(objectToMerge.billboard.show);
    });

    it('mergeProperties does not change when used with an undefined billboard', function() {
        var expectedImage = 'image';
        var expectedScale = 'scale';
        var expectedRotation = 'rotation';
        var expectedAlignedAxis = 'alignedAxis';
        var expectedHorizontalOrigin = 'horizontalOrigin';
        var expectedVerticalOrigin = 'verticalOrigin';
        var expectedColor = 'color';
        var expectedEyeOffset = 'eyeOffset';
        var expectedPixelOffset = 'pixelOffset';
        var expectedShow = 'show';

        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.billboard = new DynamicBillboard();
        targetObject.billboard.image = expectedImage;
        targetObject.billboard.scale = expectedScale;
        targetObject.billboard.rotation = expectedRotation;
        targetObject.billboard.alignedAxis = expectedAlignedAxis;
        targetObject.billboard.horizontalOrigin = expectedHorizontalOrigin;
        targetObject.billboard.verticalOrigin = expectedVerticalOrigin;
        targetObject.billboard.color = expectedColor;
        targetObject.billboard.eyeOffset = expectedEyeOffset;
        targetObject.billboard.pixelOffset = expectedPixelOffset;
        targetObject.billboard.show = expectedShow;

        DynamicBillboard.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.billboard.image).toEqual(expectedImage);
        expect(targetObject.billboard.scale).toEqual(expectedScale);
        expect(targetObject.billboard.rotation).toEqual(expectedRotation);
        expect(targetObject.billboard.alignedAxis).toEqual(expectedAlignedAxis);
        expect(targetObject.billboard.horizontalOrigin).toEqual(expectedHorizontalOrigin);
        expect(targetObject.billboard.verticalOrigin).toEqual(expectedVerticalOrigin);
        expect(targetObject.billboard.color).toEqual(expectedColor);
        expect(targetObject.billboard.eyeOffset).toEqual(expectedEyeOffset);
        expect(targetObject.billboard.pixelOffset).toEqual(expectedPixelOffset);
        expect(targetObject.billboard.show).toEqual(expectedShow);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.billboard = new DynamicBillboard();
        DynamicBillboard.undefineProperties(testObject);
        expect(testObject.billboard).toBeUndefined();
    });
});
