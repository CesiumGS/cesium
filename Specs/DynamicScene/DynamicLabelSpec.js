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
             'DynamicScene/ConstantProperty'
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
              ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured label', function() {
        var expectedText = new ConstantProperty('my text');
        var expectedFont = new ConstantProperty('10px serif');
        var expectedStyle = new ConstantProperty(LabelStyle.OUTLINE);
        var expectedFillColor = new ConstantProperty(Color.RED);
        var expectedOutlineColor = new ConstantProperty(Color.WHITE);
        var expectedOutlineWidth = new ConstantProperty(4);
        var expectedHorizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
        var expectedVerticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
        var expectedEyeOffset = new ConstantProperty(Cartesian3.UNIT_Z);
        var expectedPixelOffset = new ConstantProperty(Cartesian2.UNIT_Y);
        var expectedScale = new ConstantProperty(2);
        var expectedShow = new ConstantProperty(true);

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.label = new DynamicLabel();
        objectToMerge.label.text = new ConstantProperty('not it');
        objectToMerge.label.font = new ConstantProperty('arial');
        objectToMerge.label.style = new ConstantProperty(LabelStyle.FILL);
        objectToMerge.label.fillColor = new ConstantProperty(Color.BLACK);
        objectToMerge.label.outlineColor = new ConstantProperty(Color.BLUE);
        objectToMerge.label.outlineWidth = new ConstantProperty(5);
        objectToMerge.label.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        objectToMerge.label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        objectToMerge.label.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        objectToMerge.label.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        objectToMerge.label.scale = new ConstantProperty(1);
        objectToMerge.label.show = new ConstantProperty(false);

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
        objectToMerge.label.text = new ConstantProperty('not it');
        objectToMerge.label.font = new ConstantProperty('arial');
        objectToMerge.label.style = new ConstantProperty(LabelStyle.FILL);
        objectToMerge.label.fillColor = new ConstantProperty(Color.BLACK);
        objectToMerge.label.outlineColor = new ConstantProperty(Color.BLUE);
        objectToMerge.label.outlineWidth = new ConstantProperty(5);
        objectToMerge.label.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        objectToMerge.label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        objectToMerge.label.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        objectToMerge.label.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        objectToMerge.label.scale = new ConstantProperty(1);
        objectToMerge.label.show = new ConstantProperty(false);

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
        var expectedText = new ConstantProperty('my text');
        var expectedFont = new ConstantProperty('10px serif');
        var expectedStyle = new ConstantProperty(LabelStyle.OUTLINE);
        var expectedFillColor = new ConstantProperty(Color.RED);
        var expectedOutlineColor = new ConstantProperty(Color.WHITE);
        var expectedOutlineWidth = new ConstantProperty(4);
        var expectedHorizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
        var expectedVerticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
        var expectedEyeOffset = new ConstantProperty(Cartesian3.UNIT_Z);
        var expectedPixelOffset = new ConstantProperty(Cartesian2.UNIT_Y);
        var expectedScale = new ConstantProperty(2);
        var expectedShow = new ConstantProperty(true);

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