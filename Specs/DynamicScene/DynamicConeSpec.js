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

    it('processCzmlPacket adds data for infinite cone.', function() {
        var conePacket = {
            cone : {
                innerHalfAngle : 1.0,
                outerHalfAngle : 1.1,
                minimumClockAngle : 1.2,
                maximumClockAngle : 1.3,
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 6.0,
                capMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                innerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        }
                    }
                },
                outerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.3, 0.3, 0.3, 0.3]
                        }
                    }
                },
                silhouetteMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.4, 0.4, 0.4, 0.4]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicCone.processCzmlPacket(dynamicObject, conePacket)).toEqual(true);

        expect(dynamicObject.cone).toBeDefined();
        expect(dynamicObject.cone.innerHalfAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.innerHalfAngle);
        expect(dynamicObject.cone.outerHalfAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.outerHalfAngle);
        expect(dynamicObject.cone.minimumClockAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.minimumClockAngle);
        expect(dynamicObject.cone.maximumClockAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.maximumClockAngle);
        expect(dynamicObject.cone.radius.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.radius);
        expect(dynamicObject.cone.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.show);
        expect(dynamicObject.cone.showIntersection.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.showIntersection);
        expect(dynamicObject.cone.capMaterial.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.cone.innerMaterial.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.cone.outerMaterial.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.3, 0.3, 0.3, 0.3));
        expect(dynamicObject.cone.silhouetteMaterial.getValue(Iso8601.MINIMUM_VALUE).uniforms.color).toEqual(new Color(0.4, 0.4, 0.4, 0.4));
        expect(dynamicObject.cone.intersectionColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.cone.intersectionWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.intersectionWidth);
    });

    it('processCzmlPacket adds data for constrained cone.', function() {
        var conePacket = {
            cone : {
                interval : '2000-01-01/2001-01-01',
                innerHalfAngle : 1.0,
                outerHalfAngle : 1.1,
                minimumClockAngle : 1.2,
                maximumClockAngle : 1.3,
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 4.0,
                capMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                innerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        }
                    }
                },
                outerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.3, 0.3, 0.3, 0.3]
                        }
                    }
                },
                silhouetteMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.4, 0.4, 0.4, 0.4]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var validTime = TimeInterval.fromIso8601(conePacket.cone.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicCone.processCzmlPacket(dynamicObject, conePacket)).toEqual(true);

        expect(dynamicObject.cone).toBeDefined();
        expect(dynamicObject.cone.innerHalfAngle.getValue(validTime)).toEqual(conePacket.cone.innerHalfAngle);
        expect(dynamicObject.cone.outerHalfAngle.getValue(validTime)).toEqual(conePacket.cone.outerHalfAngle);
        expect(dynamicObject.cone.minimumClockAngle.getValue(validTime)).toEqual(conePacket.cone.minimumClockAngle);
        expect(dynamicObject.cone.maximumClockAngle.getValue(validTime)).toEqual(conePacket.cone.maximumClockAngle);
        expect(dynamicObject.cone.radius.getValue(validTime)).toEqual(conePacket.cone.radius);
        expect(dynamicObject.cone.show.getValue(validTime)).toEqual(conePacket.cone.show);
        expect(dynamicObject.cone.showIntersection.getValue(validTime)).toEqual(conePacket.cone.showIntersection);
        expect(dynamicObject.cone.capMaterial.getValue(validTime).uniforms.color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.cone.innerMaterial.getValue(validTime).uniforms.color).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.cone.outerMaterial.getValue(validTime).uniforms.color).toEqual(new Color(0.3, 0.3, 0.3, 0.3));
        expect(dynamicObject.cone.silhouetteMaterial.getValue(validTime).uniforms.color).toEqual(new Color(0.4, 0.4, 0.4, 0.4));
        expect(dynamicObject.cone.intersectionColor.getValue(validTime)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.cone.intersectionWidth.getValue(validTime)).toEqual(conePacket.cone.intersectionWidth);

        expect(dynamicObject.cone.innerHalfAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.outerHalfAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.minimumClockAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.maximumClockAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.radius.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.showIntersection.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.capMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.innerMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.outerMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.silhouetteMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.intersectionColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.intersectionWidth.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicCone.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.cone).toBeUndefined();
    });

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