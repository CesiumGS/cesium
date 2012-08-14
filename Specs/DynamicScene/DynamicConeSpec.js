/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicCone',
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
              DynamicCone,
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
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicCone.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.cone).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured cone', function() {
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

        var targetObject = new DynamicObject('targetObject');
        targetObject.cone = new DynamicCone();
        targetObject.capMaterial = 13;
        targetObject.innerHalfAngle = 14;
        targetObject.innerMaterial = 15;
        targetObject.intersectionColor = 16;
        targetObject.maximumClockAngle = 17;
        targetObject.minimumClockAngle = 18;
        targetObject.outerHalfAngle = 19;
        targetObject.outerMaterial = 20;
        targetObject.radius = 21;
        targetObject.show = 22;
        targetObject.showIntersection = 23;
        targetObject.silhouetteMaterial = 24;

        DynamicCone.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.cone.capMaterial).toEqual(targetObject.cone.capMaterial);
        expect(targetObject.cone.innerHalfAngle).toEqual(targetObject.cone.innerHalfAngle);
        expect(targetObject.cone.innerMaterial).toEqual(targetObject.cone.innerMaterial);
        expect(targetObject.cone.intersectionColor).toEqual(targetObject.cone.intersectionColor);
        expect(targetObject.cone.maximumClockAngle).toEqual(targetObject.cone.maximumClockAngle);
        expect(targetObject.cone.minimumClockAngle).toEqual(targetObject.cone.minimumClockAngle);
        expect(targetObject.cone.outerHalfAngle).toEqual(targetObject.cone.outerHalfAngle);
        expect(targetObject.cone.outerMaterial).toEqual(targetObject.cone.outerMaterial);
        expect(targetObject.cone.radius).toEqual(targetObject.cone.radius);
        expect(targetObject.cone.show).toEqual(targetObject.cone.show);
        expect(targetObject.cone.showIntersection).toEqual(targetObject.cone.showIntersection);
        expect(targetObject.cone.silhouetteMaterial).toEqual(targetObject.cone.silhouetteMaterial);
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

        var targetObject = new DynamicObject('targetObject');

        DynamicCone.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.cone.capMaterial).toEqual(objectToMerge.cone.capMaterial);
        expect(targetObject.cone.innerHalfAngle).toEqual(objectToMerge.cone.innerHalfAngle);
        expect(targetObject.cone.innerMaterial).toEqual(objectToMerge.cone.innerMaterial);
        expect(targetObject.cone.intersectionColor).toEqual(objectToMerge.cone.intersectionColor);
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
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.cone = new DynamicCone();
        targetObject.cone.image = 'image';
        targetObject.cone.scale = 'scale';
        targetObject.cone.horizontalOrigin = 'horizontalOrigin';
        targetObject.cone.verticalOrigin = 'verticalOrigin';
        targetObject.cone.color = 'color';
        targetObject.cone.eyeOffset = 'eyeOffset';
        targetObject.cone.pixelOffset = 'pixelOffset';
        targetObject.cone.show = 'show';

        DynamicCone.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.cone.capMaterial).toEqual(targetObject.cone.capMaterial);
        expect(targetObject.cone.innerHalfAngle).toEqual(targetObject.cone.innerHalfAngle);
        expect(targetObject.cone.innerMaterial).toEqual(targetObject.cone.innerMaterial);
        expect(targetObject.cone.intersectionColor).toEqual(targetObject.cone.intersectionColor);
        expect(targetObject.cone.maximumClockAngle).toEqual(targetObject.cone.maximumClockAngle);
        expect(targetObject.cone.minimumClockAngle).toEqual(targetObject.cone.minimumClockAngle);
        expect(targetObject.cone.outerHalfAngle).toEqual(targetObject.cone.outerHalfAngle);
        expect(targetObject.cone.outerMaterial).toEqual(targetObject.cone.outerMaterial);
        expect(targetObject.cone.radius).toEqual(targetObject.cone.radius);
        expect(targetObject.cone.show).toEqual(targetObject.cone.show);
        expect(targetObject.cone.showIntersection).toEqual(targetObject.cone.showIntersection);
        expect(targetObject.cone.silhouetteMaterial).toEqual(targetObject.cone.silhouetteMaterial);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.cone = new DynamicCone();
        DynamicCone.undefineProperties(testObject);
        expect(testObject.cone).toBeUndefined();
    });
});