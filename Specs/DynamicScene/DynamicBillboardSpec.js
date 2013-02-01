/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicBillboard',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
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
              JulianDate,
              Cartesian2,
              Cartesian3,
              Color,
              Iso8601,
              TimeInterval,
              HorizontalOrigin,
              VerticalOrigin) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite billboard.', function() {
        var sourceUri = 'http://someImage.com/';
        var billboardPacket = {
            billboard : {
                image : 'image.png',
                scale : 1.0,
                horizontalOrigin : 'CENTER',
                verticalOrigin : 'CENTER',
                color : {
                    rgbaf : [1.0, 1.0, 1.0, 1.0]
                },
                eyeOffset : {
                    cartesian : [3.0, 4.0, 5.0]
                },
                pixelOffset : {
                    cartesian2 : [1.0, 2.0]
                },
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicBillboard.processCzmlPacket(dynamicObject, billboardPacket, undefined, sourceUri)).toEqual(true);

        expect(dynamicObject.billboard).toBeDefined();
        expect(dynamicObject.billboard.image.getValue(Iso8601.MINIMUM_VALUE)).toEqual('http://someImage.com/image.png');
        expect(dynamicObject.billboard.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(billboardPacket.billboard.scale);
        expect(dynamicObject.billboard.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.CENTER);
        expect(dynamicObject.billboard.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.billboard.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(dynamicObject.billboard.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(dynamicObject.billboard.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(1.0, 2.0));
        expect(dynamicObject.billboard.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained billboard.', function() {
        var billboardPacket = {
            billboard : {
                interval : '2000-01-01/2001-01-01',
                image : 'http://someImage.com/image',
                scale : 1.0,
                horizontalOrigin : 'CENTER',
                verticalOrigin : 'CENTER',
                color : {
                    rgbaf : [1.0, 1.0, 1.0, 1.0]
                },
                eyeOffset : {
                    cartesian : [3.0, 4.0, 5.0]
                },
                pixelOffset : {
                    cartesian2 : [1.0, 2.0]
                },
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(billboardPacket.billboard.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicBillboard.processCzmlPacket(dynamicObject, billboardPacket)).toEqual(true);

        expect(dynamicObject.billboard).toBeDefined();
        expect(dynamicObject.billboard.image.getValue(validTime)).toEqual(billboardPacket.billboard.image);
        expect(dynamicObject.billboard.scale.getValue(validTime)).toEqual(billboardPacket.billboard.scale);
        expect(dynamicObject.billboard.horizontalOrigin.getValue(validTime)).toEqual(HorizontalOrigin.CENTER);
        expect(dynamicObject.billboard.verticalOrigin.getValue(validTime)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.billboard.color.getValue(validTime)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(dynamicObject.billboard.eyeOffset.getValue(validTime)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(dynamicObject.billboard.pixelOffset.getValue(validTime)).toEqual(new Cartesian2(1.0, 2.0));
        expect(dynamicObject.billboard.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.billboard).toBeDefined();
        expect(dynamicObject.billboard.image.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.scale.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.horizontalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.verticalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.eyeOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.pixelOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicBillboard.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.billboard).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured billboard', function() {
        var expectedImage = 'image';
        var expectedScale = 'scale';
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
        objectToMerge.billboard.horizontalOrigin = 3;
        objectToMerge.billboard.verticalOrigin = 4;
        objectToMerge.billboard.color = 5;
        objectToMerge.billboard.eyeOffset = 6;
        objectToMerge.billboard.pixelOffset = 7;
        objectToMerge.billboard.show = 8;

        var targetObject = new DynamicObject('targetObject');
        targetObject.billboard = new DynamicBillboard();
        targetObject.billboard.image = expectedImage;
        targetObject.billboard.scale = expectedScale;
        targetObject.billboard.horizontalOrigin = expectedHorizontalOrigin;
        targetObject.billboard.verticalOrigin = expectedVerticalOrigin;
        targetObject.billboard.color = expectedColor;
        targetObject.billboard.eyeOffset = expectedEyeOffset;
        targetObject.billboard.pixelOffset = expectedPixelOffset;
        targetObject.billboard.show = expectedShow;

        DynamicBillboard.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.billboard.image).toEqual(expectedImage);
        expect(targetObject.billboard.scale).toEqual(expectedScale);
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
        objectToMerge.billboard.horizontalOrigin = 3;
        objectToMerge.billboard.verticalOrigin = 4;
        objectToMerge.billboard.color = 5;
        objectToMerge.billboard.eyeOffset = 6;
        objectToMerge.billboard.pixelOffset = 7;
        objectToMerge.billboard.show = 8;

        var targetObject = new DynamicObject('targetObject');

        DynamicBillboard.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.billboard.image).toEqual(objectToMerge.billboard.image);
        expect(targetObject.billboard.scale).toEqual(objectToMerge.billboard.scale);
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
        targetObject.billboard.horizontalOrigin = expectedHorizontalOrigin;
        targetObject.billboard.verticalOrigin = expectedVerticalOrigin;
        targetObject.billboard.color = expectedColor;
        targetObject.billboard.eyeOffset = expectedEyeOffset;
        targetObject.billboard.pixelOffset = expectedPixelOffset;
        targetObject.billboard.show = expectedShow;

        DynamicBillboard.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.billboard.image).toEqual(expectedImage);
        expect(targetObject.billboard.scale).toEqual(expectedScale);
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