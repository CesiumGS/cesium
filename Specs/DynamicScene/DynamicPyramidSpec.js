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

    it('processCzmlPacket adds data for infinite pyramid.', function() {
        var pyramidPacket = {
            pyramid : {
                directions : {
                    unitSpherical : [1.0, 2.0, 3.0, 4.0]
                },
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 7.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPyramid.processCzmlPacket(dynamicObject, pyramidPacket)).toEqual(true);

        expect(dynamicObject.pyramid).toBeDefined();
        expect(dynamicObject.pyramid.directions.getValueSpherical(Iso8601.MINIMUM_VALUE)).toEqual(
                [new Spherical(pyramidPacket.pyramid.directions.unitSpherical[0], pyramidPacket.pyramid.directions.unitSpherical[1]),
                        new Spherical(pyramidPacket.pyramid.directions.unitSpherical[2], pyramidPacket.pyramid.directions.unitSpherical[3])]);
        expect(dynamicObject.pyramid.radius.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pyramidPacket.pyramid.radius);
        expect(dynamicObject.pyramid.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pyramidPacket.pyramid.show);
        expect(dynamicObject.pyramid.showIntersection.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pyramidPacket.pyramid.showIntersection);
        expect(dynamicObject.pyramid.material.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.pyramid.intersectionColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.pyramid.intersectionWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(7.0);
    });

    it('processCzmlPacket adds data for constrained pyramid.', function() {
        var pyramidPacket = {
            pyramid : {
                interval : '2000-01-01/2001-01-01',
                directions : {
                    unitSpherical : [1.0, 2.0, 3.0, 4.0]
                },
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 8.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var validTime = TimeInterval.fromIso8601(pyramidPacket.pyramid.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPyramid.processCzmlPacket(dynamicObject, pyramidPacket)).toEqual(true);

        expect(dynamicObject.pyramid).toBeDefined();
        expect(dynamicObject.pyramid.directions.getValueSpherical(validTime)).toEqual(
                [new Spherical(pyramidPacket.pyramid.directions.unitSpherical[0], pyramidPacket.pyramid.directions.unitSpherical[1]),
                        new Spherical(pyramidPacket.pyramid.directions.unitSpherical[2], pyramidPacket.pyramid.directions.unitSpherical[3])]);
        expect(dynamicObject.pyramid.radius.getValue(validTime)).toEqual(pyramidPacket.pyramid.radius);
        expect(dynamicObject.pyramid.show.getValue(validTime)).toEqual(pyramidPacket.pyramid.show);
        expect(dynamicObject.pyramid.showIntersection.getValue(validTime)).toEqual(pyramidPacket.pyramid.showIntersection);
        expect(dynamicObject.pyramid.material.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.pyramid.intersectionColor.getValue(validTime)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.pyramid.intersectionWidth.getValue(validTime)).toEqual(8.0);

        expect(dynamicObject.pyramid.directions.getValueSpherical(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.radius.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.showIntersection.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.material.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.intersectionColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.intersectionWidth.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicPyramid.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.pyramid).toBeUndefined();
    });

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