/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicScreenOverlay',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicScreenOverlay,
              DynamicObject,
              JulianDate,
              Cartesian2,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var expectedPosition = new Cartesian2(0.0, 1.0);
    var expectedWidth = 2;
    var expectedHeight = 3;

    var overlayPacket = {
        screenOverlay : {
            position : {
                cartesian2 : [0.0, 1.0]
            },
            show : true,
            width : 2,
            height : 3,
            material : {
                solidColor : {
                    color : {
                        rgbaf : [0.1, 0.1, 0.1, 0.1]
                    }
                }
            }
        }
    };

    var overlayPacketInterval = {
        screenOverlay : {
            interval : '2000-01-01/2001-01-01',
            position : {
                cartesian2 : [0.0, 1.0]
            },
            show : true,
            width : 2,
            height : 3,
            material : {
                solidColor : {
                    color : {
                        rgbaf : [0.1, 0.1, 0.1, 0.1]
                    }
                }
            }
        }
    };

    it('processCzmlPacket adds data for infinite screen overlay.', function() {
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicScreenOverlay.processCzmlPacket(dynamicObject, overlayPacket)).toEqual(true);

        expect(dynamicObject.screenOverlay).toBeDefined();
        expect(dynamicObject.screenOverlay.position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedPosition);
        expect(dynamicObject.screenOverlay.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedWidth);
        expect(dynamicObject.screenOverlay.height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedHeight);
        expect(dynamicObject.screenOverlay.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(overlayPacket.screenOverlay.show);
        expect(dynamicObject.screenOverlay.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
    });

    it('processCzmlPacket adds data for constrained screenOverlay.', function() {
        var validTime = TimeInterval.fromIso8601(overlayPacketInterval.screenOverlay.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicScreenOverlay.processCzmlPacket(dynamicObject, overlayPacketInterval)).toEqual(true);

        expect(dynamicObject.screenOverlay).toBeDefined();
        expect(dynamicObject.screenOverlay.position.getValue(validTime)).toEqual(expectedPosition);
        expect(dynamicObject.screenOverlay.width.getValue(validTime)).toEqual(expectedWidth);
        expect(dynamicObject.screenOverlay.height.getValue(validTime)).toEqual(expectedHeight);
        expect(dynamicObject.screenOverlay.show.getValue(validTime)).toEqual(overlayPacketInterval.screenOverlay.show);
        expect(dynamicObject.screenOverlay.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));

        expect(dynamicObject.screenOverlay.position.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.screenOverlay.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.screenOverlay.height.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.screenOverlay.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.screenOverlay.material.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicScreenOverlay.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.screenOverlay).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured screenOverlay', function() {
        var expectedMaterial = 6;
        var expectedPosition = 7;
        var expectedWidth = 8;
        var expectedHeight = 9;
        var expectedShow = 10;

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.screenOverlay = new DynamicScreenOverlay();
        objectToMerge.material = 1;
        objectToMerge.position = 2;
        objectToMerge.width = 3;
        objectToMerge.height = 4;
        objectToMerge.show = 5;

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.screenOverlay = new DynamicScreenOverlay();
        mergedObject.screenOverlay.material = expectedMaterial;
        mergedObject.screenOverlay.position = expectedPosition;
        mergedObject.screenOverlay.width = expectedWidth;
        mergedObject.screenOverlay.height = expectedHeight;
        mergedObject.screenOverlay.show = expectedShow;

        DynamicScreenOverlay.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.screenOverlay.material).toEqual(expectedMaterial);
        expect(mergedObject.screenOverlay.position).toEqual(expectedPosition);
        expect(mergedObject.screenOverlay.width).toEqual(expectedWidth);
        expect(mergedObject.screenOverlay.height).toEqual(expectedHeight);
        expect(mergedObject.screenOverlay.show).toEqual(expectedShow);
    });

    it('mergeProperties creates and configures an undefined screenOverlay', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.screenOverlay = new DynamicScreenOverlay();
        objectToMerge.material = 1;
        objectToMerge.position = 2;
        objectToMerge.width = 3;
        objectToMerge.height = 4;
        objectToMerge.show = 5;

        var mergedObject = new DynamicObject('mergedObject');

        DynamicScreenOverlay.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.screenOverlay.material).toEqual(objectToMerge.screenOverlay.material);
        expect(mergedObject.screenOverlay.position).toEqual(objectToMerge.screenOverlay.position);
        expect(mergedObject.screenOverlay.width).toEqual(objectToMerge.screenOverlay.width);
        expect(mergedObject.screenOverlay.height).toEqual(objectToMerge.screenOverlay.height);
        expect(mergedObject.screenOverlay.show).toEqual(objectToMerge.screenOverlay.show);
    });

    it('mergeProperties does not change when used with an undefined screenOverlay', function() {
        var expectedMaterial = 4;
        var expectedPosition = 5;
        var expectedWidth = 6;
        var expectedHeight = 7;
        var expectedShow = 8;

        var objectToMerge = new DynamicObject('objectToMerge');

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.screenOverlay = new DynamicScreenOverlay();
        mergedObject.screenOverlay.material = expectedMaterial;
        mergedObject.screenOverlay.position = expectedPosition;
        mergedObject.screenOverlay.width = expectedWidth;
        mergedObject.screenOverlay.height = expectedHeight;
        mergedObject.screenOverlay.show = expectedShow;

        DynamicScreenOverlay.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.screenOverlay.material).toEqual(expectedMaterial);
        expect(mergedObject.screenOverlay.position).toEqual(expectedPosition);
        expect(mergedObject.screenOverlay.width).toEqual(expectedWidth);
        expect(mergedObject.screenOverlay.height).toEqual(expectedHeight);
        expect(mergedObject.screenOverlay.show).toEqual(expectedShow);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.screenOverlay = new DynamicScreenOverlay();
        DynamicScreenOverlay.undefineProperties(testObject);
        expect(testObject.screenOverlay).toBeUndefined();
    });
});