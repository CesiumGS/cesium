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
             'Scene/LabelStyle'
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
              LabelStyle) {
    "use strict";
    /*global it,expect*/

    it('processCzmlPacket adds data for infinite label.', function() {
        var labelPacket = {
            label : {
                text : 'TestFacility',
                font : '10pt Lucida Console',
                style : 'FILL',
                fillColor : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                horizontalOrigin : 'LEFT',
                verticalOrigin : 'CENTER',
                eyeOffset : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                pixelOffset : {
                    cartesian2 : [4.0, 5.0]
                },
                scale : 1.0,
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicLabel.processCzmlPacket(dynamicObject, labelPacket)).toEqual(true);
        expect(dynamicObject.label).toBeDefined();
        expect(dynamicObject.label.text.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.text);
        expect(dynamicObject.label.font.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.font);
        expect(dynamicObject.label.style.getValue(Iso8601.MINIMUM_VALUE)).toEqual(LabelStyle.FILL);
        expect(dynamicObject.label.fillColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.label.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.label.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.LEFT);
        expect(dynamicObject.label.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.label.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(dynamicObject.label.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(4.0, 5.0));
        expect(dynamicObject.label.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.scale);
        expect(dynamicObject.label.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.show);
    });

    it('processCzmlPacket adds data for constrained label.', function() {
        var labelPacket = {
            label : {
                interval : "2000-01-01/2001-01-01",
                text : 'TestFacility',
                font : '10pt Lucida Console',
                style : 'FILL',
                fillColor : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                horizontalOrigin : 'LEFT',
                verticalOrigin : 'CENTER',
                eyeOffset : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                pixelOffset : {
                    cartesian2 : [4.0, 5.0]
                },
                scale : 1.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(labelPacket.label.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicLabel.processCzmlPacket(dynamicObject, labelPacket)).toEqual(true);
        expect(dynamicObject.label).toBeDefined();
        expect(dynamicObject.label.text.getValue(validTime)).toEqual(labelPacket.label.text);
        expect(dynamicObject.label.font.getValue(validTime)).toEqual(labelPacket.label.font);
        expect(dynamicObject.label.style.getValue(validTime)).toEqual(LabelStyle.FILL);
        expect(dynamicObject.label.fillColor.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.label.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.label.horizontalOrigin.getValue(validTime)).toEqual(HorizontalOrigin.LEFT);
        expect(dynamicObject.label.verticalOrigin.getValue(validTime)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.label.eyeOffset.getValue(validTime)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(dynamicObject.label.pixelOffset.getValue(validTime)).toEqual(new Cartesian2(4.0, 5.0));
        expect(dynamicObject.label.scale.getValue(validTime)).toEqual(labelPacket.label.scale);
        expect(dynamicObject.label.show.getValue(validTime)).toEqual(labelPacket.label.show);

        expect(dynamicObject.label.text.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.font.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.style.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.fillColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.horizontalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.verticalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.eyeOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.pixelOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.scale.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicLabel.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.label).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured label', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.label = new DynamicLabel();
        objectToMerge.text = 1;
        objectToMerge.font = 2;
        objectToMerge.style = 3;
        objectToMerge.fillColor = 4;
        objectToMerge.outlineColor = 5;
        objectToMerge.horizontalOrigin = 6;
        objectToMerge.verticalOrigin = 7;
        objectToMerge.eyeOffset = 8;
        objectToMerge.pixelOffset = 9;
        objectToMerge.scale = 10;
        objectToMerge.show = 11;

        var targetObject = new DynamicObject('targetObject');
        targetObject.label = new DynamicLabel();
        targetObject.text = 12;
        targetObject.font = 13;
        targetObject.style = 14;
        targetObject.fillColor = 15;
        targetObject.outlineColor = 16;
        targetObject.horizontalOrigin = 17;
        targetObject.verticalOrigin = 18;
        targetObject.eyeOffset = 19;
        targetObject.pixelOffset = 20;
        targetObject.scale = 21;
        targetObject.show = 22;

        DynamicLabel.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.label.text).toEqual(targetObject.label.text);
        expect(targetObject.label.font).toEqual(targetObject.label.font);
        expect(targetObject.label.style).toEqual(targetObject.label.style);
        expect(targetObject.label.fillColor).toEqual(targetObject.label.fillColor);
        expect(targetObject.label.outlineColor).toEqual(targetObject.label.outlineColor);
        expect(targetObject.label.horizontalOrigin).toEqual(targetObject.label.horizontalOrigin);
        expect(targetObject.label.verticalOrigin).toEqual(targetObject.label.verticalOrigin);
        expect(targetObject.label.eyeOffset).toEqual(targetObject.label.eyeOffset);
        expect(targetObject.label.pixelOffset).toEqual(targetObject.label.pixelOffset);
        expect(targetObject.label.scale).toEqual(targetObject.label.scale);
        expect(targetObject.label.show).toEqual(targetObject.label.show);
    });

    it('mergeProperties creates and configures an undefined label', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.label = new DynamicLabel();
        objectToMerge.text = 1;
        objectToMerge.font = 2;
        objectToMerge.style = 3;
        objectToMerge.fillColor = 4;
        objectToMerge.outlineColor = 5;
        objectToMerge.horizontalOrigin = 6;
        objectToMerge.verticalOrigin = 7;
        objectToMerge.eyeOffset = 8;
        objectToMerge.pixelOffset = 9;
        objectToMerge.scale = 10;
        objectToMerge.show = 11;

        var targetObject = new DynamicObject('targetObject');

        DynamicLabel.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.label.text).toEqual(objectToMerge.label.text);
        expect(targetObject.label.font).toEqual(objectToMerge.label.font);
        expect(targetObject.label.style).toEqual(objectToMerge.label.style);
        expect(targetObject.label.fillColor).toEqual(objectToMerge.label.fillColor);
        expect(targetObject.label.outlineColor).toEqual(objectToMerge.label.outlineColor);
        expect(targetObject.label.horizontalOrigin).toEqual(objectToMerge.label.horizontalOrigin);
        expect(targetObject.label.verticalOrigin).toEqual(objectToMerge.label.verticalOrigin);
        expect(targetObject.label.eyeOffset).toEqual(objectToMerge.label.eyeOffset);
        expect(targetObject.label.pixelOffset).toEqual(objectToMerge.label.pixelOffset);
        expect(targetObject.label.scale).toEqual(objectToMerge.label.scale);
        expect(targetObject.label.show).toEqual(objectToMerge.label.show);
    });

    it('mergeProperties does not change when used with an undefined label', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.label = new DynamicLabel();
        targetObject.text = 1;
        targetObject.font = 2;
        targetObject.style = 3;
        targetObject.fillColor = 4;
        targetObject.outlineColor = 5;
        targetObject.horizontalOrigin = 6;
        targetObject.verticalOrigin = 7;
        targetObject.eyeOffset = 8;
        targetObject.pixelOffset = 9;
        targetObject.scale = 10;
        targetObject.show = 11;

        DynamicLabel.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.label.text).toEqual(targetObject.label.text);
        expect(targetObject.label.font).toEqual(targetObject.label.font);
        expect(targetObject.label.style).toEqual(targetObject.label.style);
        expect(targetObject.label.fillColor).toEqual(targetObject.label.fillColor);
        expect(targetObject.label.outlineColor).toEqual(targetObject.label.outlineColor);
        expect(targetObject.label.horizontalOrigin).toEqual(targetObject.label.horizontalOrigin);
        expect(targetObject.label.verticalOrigin).toEqual(targetObject.label.verticalOrigin);
        expect(targetObject.label.eyeOffset).toEqual(targetObject.label.eyeOffset);
        expect(targetObject.label.pixelOffset).toEqual(targetObject.label.pixelOffset);
        expect(targetObject.label.scale).toEqual(targetObject.label.scale);
        expect(targetObject.label.show).toEqual(targetObject.label.show);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.label = new DynamicLabel();
        DynamicLabel.undefineProperties(testObject);
        expect(testObject.label).toBeUndefined();
    });
});