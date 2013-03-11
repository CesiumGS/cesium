/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicEllipse,
              DynamicObject,
              JulianDate,
              Cartesian3,
              Color,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var ellipsePacket = {
        ellipse : {
            semiMajorAxis : 10,
            semiMinorAxis : 20,
            bearing:1.0,
            color: {
                rgbaf : [0.1, 0.1, 0.1, 0.1]
            },
            show : true,
            material : {
                solidColor : {
                    color : {
                        rgbaf : [0.1, 0.1, 0.1, 0.1]
                    }
                }
            }
        }
    };

    var ellipsePacketInterval = {
        ellipse : {
            interval : '2000-01-01/2001-01-01',
            semiMajorAxis : 10,
            semiMinorAxis : 20,
            bearing:1.0,
            color: {
                rgbaf : [0.1, 0.1, 0.1, 0.1]
            },
            show : true,
            material : {
                solidColor : {
                    color : {
                        rgbaf : [0.1, 0.1, 0.1, 0.1]
                    }
                }
            }
        }
    };

    it('processCzmlPacket adds data for infinite ellipse.', function() {
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacket)).toEqual(true);

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMajorAxis);
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMinorAxis);
        expect(dynamicObject.ellipse.bearing.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.bearing);
        expect(dynamicObject.ellipse.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.ellipse.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.show);
        expect(dynamicObject.ellipse.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
    });

    it('processCzmlPacket adds data for constrained ellipse.', function() {
        var validTime = TimeInterval.fromIso8601(ellipsePacketInterval.ellipse.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacketInterval)).toEqual(true);

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMajorAxis);
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMinorAxis);
        expect(dynamicObject.ellipse.bearing.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.bearing);
        expect(dynamicObject.ellipse.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.ellipse.show.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.show);
        expect(dynamicObject.ellipse.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));

        expect(dynamicObject.ellipse.semiMajorAxis.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.bearing.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.material.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipse.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.ellipse).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured ellipse', function() {
        var expectedSemiMajorAxis = 7;
        var expectedSemiMinorAxis = 8;
        var expectedBearing = 9;
        var expectedColor = 10;
        var expectedShow = 11;
        var expectedMaterial = 12;

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = 1;
        objectToMerge.semiMinorAxis = 2;
        objectToMerge.bearing = 3;
        objectToMerge.color = 4;
        objectToMerge.show = 5;
        objectToMerge.material = 6;

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipse = new DynamicEllipse();
        mergedObject.ellipse.semiMajorAxis = expectedSemiMajorAxis;
        mergedObject.ellipse.semiMinorAxis = expectedSemiMinorAxis;
        mergedObject.ellipse.bearing = expectedBearing;
        mergedObject.ellipse.color = expectedColor;
        mergedObject.ellipse.show = expectedShow;
        mergedObject.ellipse.material = expectedMaterial;

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(expectedSemiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(expectedSemiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(expectedBearing);
        expect(mergedObject.ellipse.color).toEqual(expectedColor);
        expect(mergedObject.ellipse.show).toEqual(expectedShow);
        expect(mergedObject.ellipse.material).toEqual(expectedMaterial);
    });

    it('mergeProperties creates and configures an undefined ellipse', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = 1;
        objectToMerge.semiMinorAxis = 2;
        objectToMerge.bearing = 3;
        objectToMerge.color = 4;
        objectToMerge.show = 5;
        objectToMerge.material = 6;

        var mergedObject = new DynamicObject('mergedObject');

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(objectToMerge.ellipse.semiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(objectToMerge.ellipse.semiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(objectToMerge.ellipse.bearing);
        expect(mergedObject.ellipse.color).toEqual(objectToMerge.ellipse.color);
        expect(mergedObject.ellipse.show).toEqual(objectToMerge.ellipse.show);
        expect(mergedObject.ellipse.material).toEqual(objectToMerge.ellipse.material);
    });

    it('mergeProperties does not change when used with an undefined ellipse', function() {
        var expectedSemiMajorAxis = 7;
        var expectedSemiMinorAxis = 8;
        var expectedBearing = 9;
        var expectedColor = 10;
        var expectedShow = 11;
        var expectedMaterial = 12;

        var objectToMerge = new DynamicObject('objectToMerge');

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipse = new DynamicEllipse();
        mergedObject.ellipse.semiMajorAxis = expectedSemiMajorAxis;
        mergedObject.ellipse.semiMinorAxis = expectedSemiMinorAxis;
        mergedObject.ellipse.bearing = expectedBearing;
        mergedObject.ellipse.color = expectedColor;
        mergedObject.ellipse.show = expectedShow;
        mergedObject.ellipse.material = expectedMaterial;

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(expectedSemiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(expectedSemiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(expectedBearing);
        expect(mergedObject.ellipse.color).toEqual(expectedColor);
        expect(mergedObject.ellipse.show).toEqual(expectedShow);
        expect(mergedObject.ellipse.material).toEqual(expectedMaterial);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.ellipse = new DynamicEllipse();
        DynamicEllipse.undefineProperties(testObject);
        expect(testObject.ellipse).toBeUndefined();
    });
});