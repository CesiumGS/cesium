/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicLabel',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval',
             'Scene/HorizontalOrigin',
             'Scene/VerticalOrigin',
             'Scene/LabelStyle',
             'Specs/MockProperty'
            ], function(
              DynamicLabel,
              DynamicObject,
              JulianDate,
              Cartesian2,
              Cartesian3,
              Color,
              Iso8601,
              TimeInterval,
              HorizontalOrigin,
              VerticalOrigin,
              LabelStyle,
              MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured label', function() {
        var expectedText = new MockProperty();
        var expectedFont = new MockProperty();
        var expectedStyle = new MockProperty();
        var expectedFillColor = new MockProperty();
        var expectedOutlineColor = new MockProperty();
        var expectedOutlineWidth = new MockProperty();
        var expectedHorizontalOrigin = new MockProperty();
        var expectedVerticalOrigin = new MockProperty();
        var expectedEyeOffset = new MockProperty();
        var expectedPixelOffset = new MockProperty();
        var expectedScale = new MockProperty();
        var expectedShow = new MockProperty();

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.label = new DynamicLabel();
        objectToMerge.label.text = new MockProperty();
        objectToMerge.label.font = new MockProperty();
        objectToMerge.label.style = new MockProperty();
        objectToMerge.label.fillColor = new MockProperty();
        objectToMerge.label.outlineColor = new MockProperty();
        objectToMerge.label.outlineWidth = new MockProperty();
        objectToMerge.label.horizontalOrigin = new MockProperty();
        objectToMerge.label.verticalOrigin = new MockProperty();
        objectToMerge.label.eyeOffset = new MockProperty();
        objectToMerge.label.pixelOffset = new MockProperty();
        objectToMerge.label.scale = new MockProperty();
        objectToMerge.label.show = new MockProperty();

        var targetObject = new DynamicObject('targetObject');
        targetObject.label = new DynamicLabel();
        targetObject.label.text = expectedText;
        targetObject.label.font = expectedFont;
        targetObject.label.style = expectedStyle;
        targetObject.label.fillColor = expectedFillColor;
        targetObject.label.outlineColor = expectedOutlineColor;
        targetObject.label.outlineWidth = expectedOutlineWidth;
        targetObject.label.horizontalOrigin = expectedHorizontalOrigin;
        targetObject.label.verticalOrigin = expectedVerticalOrigin;
        targetObject.label.eyeOffset = expectedEyeOffset;
        targetObject.label.pixelOffset = expectedPixelOffset;
        targetObject.label.scale = expectedScale;
        targetObject.label.show = expectedShow;

        DynamicLabel.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.label.text).toEqual(expectedText);
        expect(targetObject.label.font).toEqual(expectedFont);
        expect(targetObject.label.style).toEqual(expectedStyle);
        expect(targetObject.label.fillColor).toEqual(expectedFillColor);
        expect(targetObject.label.outlineColor).toEqual(expectedOutlineColor);
        expect(targetObject.label.outlineWidth).toEqual(expectedOutlineWidth);
        expect(targetObject.label.horizontalOrigin).toEqual(expectedHorizontalOrigin);
        expect(targetObject.label.verticalOrigin).toEqual(expectedVerticalOrigin);
        expect(targetObject.label.eyeOffset).toEqual(expectedEyeOffset);
        expect(targetObject.label.pixelOffset).toEqual(expectedPixelOffset);
        expect(targetObject.label.scale).toEqual(expectedScale);
        expect(targetObject.label.show).toEqual(expectedShow);
    });

    it('mergeProperties creates and configures an undefined label', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.label = new DynamicLabel();
        objectToMerge.label.text = new MockProperty();
        objectToMerge.label.font = new MockProperty();
        objectToMerge.label.style = new MockProperty();
        objectToMerge.label.fillColor = new MockProperty();
        objectToMerge.label.outlineColor = new MockProperty();
        objectToMerge.label.outlineWidth = new MockProperty();
        objectToMerge.label.horizontalOrigin = new MockProperty();
        objectToMerge.label.verticalOrigin = new MockProperty();
        objectToMerge.label.eyeOffset = new MockProperty();
        objectToMerge.label.pixelOffset = new MockProperty();
        objectToMerge.label.scale = new MockProperty();
        objectToMerge.label.show = new MockProperty();

        var targetObject = new DynamicObject('targetObject');

        DynamicLabel.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.label.text).toEqual(objectToMerge.label.text);
        expect(targetObject.label.font).toEqual(objectToMerge.label.font);
        expect(targetObject.label.style).toEqual(objectToMerge.label.style);
        expect(targetObject.label.fillColor).toEqual(objectToMerge.label.fillColor);
        expect(targetObject.label.outlineColor).toEqual(objectToMerge.label.outlineColor);
        expect(targetObject.label.outlineWidth).toEqual(objectToMerge.label.outlineWidth);
        expect(targetObject.label.horizontalOrigin).toEqual(objectToMerge.label.horizontalOrigin);
        expect(targetObject.label.verticalOrigin).toEqual(objectToMerge.label.verticalOrigin);
        expect(targetObject.label.eyeOffset).toEqual(objectToMerge.label.eyeOffset);
        expect(targetObject.label.pixelOffset).toEqual(objectToMerge.label.pixelOffset);
        expect(targetObject.label.scale).toEqual(objectToMerge.label.scale);
        expect(targetObject.label.show).toEqual(objectToMerge.label.show);
    });

    it('mergeProperties does not change when used with an undefined label', function() {
        var expectedText = new MockProperty();
        var expectedFont = new MockProperty();
        var expectedStyle = new MockProperty();
        var expectedFillColor = new MockProperty();
        var expectedOutlineColor = new MockProperty();
        var expectedOutlineWidth = new MockProperty();
        var expectedHorizontalOrigin = new MockProperty();
        var expectedVerticalOrigin = new MockProperty();
        var expectedEyeOffset = new MockProperty();
        var expectedPixelOffset = new MockProperty();
        var expectedScale = new MockProperty();
        var expectedShow = new MockProperty();

        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.label = new DynamicLabel();
        targetObject.label.text = expectedText;
        targetObject.label.font = expectedFont;
        targetObject.label.style = expectedStyle;
        targetObject.label.fillColor = expectedFillColor;
        targetObject.label.outlineColor = expectedOutlineColor;
        targetObject.label.outlineWidth = expectedOutlineWidth;
        targetObject.label.horizontalOrigin = expectedHorizontalOrigin;
        targetObject.label.verticalOrigin = expectedVerticalOrigin;
        targetObject.label.eyeOffset = expectedEyeOffset;
        targetObject.label.pixelOffset = expectedPixelOffset;
        targetObject.label.scale = expectedScale;
        targetObject.label.show = expectedShow;

        DynamicLabel.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.label.text).toEqual(expectedText);
        expect(targetObject.label.font).toEqual(expectedFont);
        expect(targetObject.label.style).toEqual(expectedStyle);
        expect(targetObject.label.fillColor).toEqual(expectedFillColor);
        expect(targetObject.label.outlineColor).toEqual(expectedOutlineColor);
        expect(targetObject.label.outlineWidth).toEqual(expectedOutlineWidth);
        expect(targetObject.label.horizontalOrigin).toEqual(expectedHorizontalOrigin);
        expect(targetObject.label.verticalOrigin).toEqual(expectedVerticalOrigin);
        expect(targetObject.label.eyeOffset).toEqual(expectedEyeOffset);
        expect(targetObject.label.pixelOffset).toEqual(expectedPixelOffset);
        expect(targetObject.label.scale).toEqual(expectedScale);
        expect(targetObject.label.show).toEqual(expectedShow);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.label = new DynamicLabel();
        DynamicLabel.undefineProperties(testObject);
        expect(testObject.label).toBeUndefined();
    });
});