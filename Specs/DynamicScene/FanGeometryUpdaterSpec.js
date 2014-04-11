/*global defineSuite*/
defineSuite(['DynamicScene/FanGeometryUpdater',
             'DynamicScene/DynamicObject',
             'DynamicScene/DynamicFan',
             'Core/Cartesian3',
             'Core/Color',
             'Core/JulianDate',
             'Core/Math',
             'Core/Quaternion',
             'Core/Spherical',
             'Core/TimeInterval',
             'Core/TimeIntervalCollection',
             'Core/ColorGeometryInstanceAttribute',
             'Core/ShowGeometryInstanceAttribute',
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/ConstantPositionProperty',
             'DynamicScene/GridMaterialProperty',
             'DynamicScene/SampledProperty',
             'DynamicScene/SampledPositionProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Scene/CompositePrimitive',
             'Specs/createScene',
             'Specs/destroyScene'
         ], function(
             FanGeometryUpdater,
             DynamicObject,
             DynamicFan,
             Cartesian3,
             Color,
             JulianDate,
             CesiumMath,
             Quaternion,
             Spherical,
             TimeInterval,
             TimeIntervalCollection,
             ColorGeometryInstanceAttribute,
             ShowGeometryInstanceAttribute,
             ColorMaterialProperty,
             ConstantProperty,
             ConstantPositionProperty,
             GridMaterialProperty,
             SampledProperty,
             SampledPositionProperty,
             TimeIntervalCollectionProperty,
             CompositePrimitive,
             createScene,
             destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate();
    var scene;
    beforeEach(function() {
        scene = createScene();
    });

    afterEach(function() {
        destroyScene(scene);
    });

    var directions = [new Spherical(0, 0, 3), new Spherical(Math.PI, 0, 3), new Spherical(CesiumMath.TWO_PI, 0, 3)];

    function createBasicFan() {
        var fan = new DynamicFan();
        fan.directions = new ConstantProperty(directions);
        fan.radius = new ConstantProperty(10000);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(Cartesian3.ZERO);
        dynamicObject.orientation = new ConstantProperty(Quaternion.IDENTITY);
        dynamicObject.fan = fan;
        return dynamicObject;
    }

    it('Constructor sets expected defaults', function() {
        var dynamicObject = new DynamicObject();
        var updater = new FanGeometryUpdater(dynamicObject, scene);

        expect(updater.isDestroyed()).toBe(false);
        expect(updater.dynamicObject).toBe(dynamicObject);
        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(false);
        expect(updater.fillMaterialProperty).toBe(undefined);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when fan is undefined ', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when radius is undefined', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.radius = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.fill = new ConstantProperty(false);
        dynamicObject.fan.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);

        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(ColorMaterialProperty.fromColor(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Fan material is correctly exposed.', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(dynamicObject.fan.material);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.position = new SampledPositionProperty();
        dynamicObject.position.addSample(time, Cartesian3.ZERO);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying radius causes geometry to be dynamic', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.radius = new SampledProperty(Cartesian3);
        dynamicObject.fan.radius.addSample(time, new Cartesian3(1, 2, 3));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying directions causes geometry to be dynamic', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.directions = makeProperty([new Spherical(), new Spherical()], [new Spherical(), new Spherical()]);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying perDirectionRadius causes geometry to be dynamic', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.perDirectionRadius = new SampledProperty(Number);
        dynamicObject.fan.perDirectionRadius.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying numberOfRings causes geometry to be dynamic', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        dynamicObject.fan.numberOfRings = new SampledProperty(Number);
        dynamicObject.fan.numberOfRings.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(options.position);
        dynamicObject.orientation = new ConstantProperty(options.orientation);

        var fan = new DynamicFan();
        fan.show = new ConstantProperty(options.show);
        fan.fill = new ConstantProperty(options.fill);
        fan.material = options.material;
        fan.outline = new ConstantProperty(options.outline);
        fan.outlineColor = new ConstantProperty(options.outlineColor);
        fan.numberOfRings = new ConstantProperty(options.numberOfRings);
        fan.radius = new ConstantProperty(options.radius);
        fan.directions = new ConstantProperty(options.directions);
        dynamicObject.fan = fan;

        var updater = new FanGeometryUpdater(dynamicObject, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._center).toEqual(options.center);
            expect(geometry._radius).toEqual(options.radius);

            attributes = instance.attributes;
            if (options.material instanceof ColorMaterialProperty) {
                expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.material.color.getValue(time)));
            } else {
                expect(attributes.color).toBeUndefined();
            }
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }

        if (options.outline) {
            instance = updater.createOutlineGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._center).toEqual(options.center);
            expect(geometry._numberOfRings).toEqual(options.numberOfRings);
            expect(geometry._radius).toEqual(options.radius);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            position : new Cartesian3(4, 5, 6),
            orientation : Quaternion.IDENTITY,
            directions : directions,
            numberOfRings : 5,
            show : true,
            material : ColorMaterialProperty.fromColor(Color.RED),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            radius : 32
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            position : new Cartesian3(4, 5, 6),
            orientation : Quaternion.IDENTITY,
            directions : directions,
            numberOfRings : 12,
            radius : 7,
            show : true,
            material : new GridMaterialProperty(),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE
        });
    });

    it('Attributes have expected values at creation time', function() {
        var time1 = new JulianDate(0, 0);
        var time2 = new JulianDate(10, 0);
        var time3 = new JulianDate(20, 0);

        var fill = new TimeIntervalCollectionProperty();
        fill.intervals.addInterval(new TimeInterval(time1, time2, true, true, false));
        fill.intervals.addInterval(new TimeInterval(time2, time3, false, true, true));

        var colorMaterial = new ColorMaterialProperty();
        colorMaterial.color = new SampledProperty(Color);
        colorMaterial.color.addSample(time, Color.YELLOW);
        colorMaterial.color.addSample(time2, Color.BLUE);
        colorMaterial.color.addSample(time3, Color.RED);

        var outline = new TimeIntervalCollectionProperty();
        outline.intervals.addInterval(new TimeInterval(time1, time2, true, true, false));
        outline.intervals.addInterval(new TimeInterval(time2, time3, false, true, true));

        var outlineColor = new SampledProperty(Color);
        outlineColor.addSample(time, Color.BLUE);
        outlineColor.addSample(time2, Color.RED);
        outlineColor.addSample(time3, Color.YELLOW);

        var dynamicObject = createBasicFan();
        dynamicObject.fan.fill = fill;
        dynamicObject.fan.material = colorMaterial;
        dynamicObject.fan.outline = outline;
        dynamicObject.fan.outlineColor = outlineColor;

        var updater = new FanGeometryUpdater(dynamicObject, scene);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(fill.getValue(time2)));

        instance = updater.createOutlineGeometryInstance(time2);
        attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(outline.getValue(time2)));
    });

    var time1 = new JulianDate(0, 0);
    var time2 = new JulianDate(1, 0);
    var time3 = new JulianDate(2, 0);

    function makeProperty(value1, value2) {
        var property = new TimeIntervalCollectionProperty();
        property.intervals.addInterval(new TimeInterval(time1, time2, true, false, value1));
        property.intervals.addInterval(new TimeInterval(time2, time3, true, false, value2));
        return property;
    }

    it('dynamic updater sets properties', function() {
        //This test is mostly a smoke screen for now.
        var fan = new DynamicFan();
        fan.radius = makeProperty(4, 5);
        fan.outline = makeProperty(true, false);
        fan.fill = makeProperty(false, true);
        fan.directions = makeProperty(directions, directions);

        var dynamicObject = new DynamicObject();
        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(new TimeInterval(time1, time3, true, false));
        dynamicObject.position = makeProperty(Cartesian3.UNIT_Z, Cartesian3.UNIT_Y);
        dynamicObject.orientation = makeProperty(Quaternion.IDENTITY, new Quaternion(0, 1, 0, 0));
        dynamicObject.fan = fan;

        var updater = new FanGeometryUpdater(dynamicObject, scene);
        var primitives = new CompositePrimitive();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);
        dynamicUpdater.update(time1);
        expect(primitives.length).toBe(1);
        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);

        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        dynamicObject.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
        expect(listener.callCount).toEqual(1);

        dynamicObject.fan.radius = new ConstantProperty(12);
        expect(listener.callCount).toEqual(2);

        dynamicObject.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        dynamicObject.fan.radius = undefined;
        expect(listener.callCount).toEqual(4);

        //Modifying an unrelated property should not have any effect.
        dynamicObject.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);

        dynamicObject.fan.radius = new SampledProperty(Number);
        expect(listener.callCount).toEqual(5);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var dynamicObject = new DynamicObject();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var dynamicObject = new DynamicObject();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicFan();
        dynamicObject.fan.outline = new ConstantProperty(true);
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var dynamicObject = createBasicFan();
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        expect(function() {
            return updater.createDynamicUpdater(new CompositePrimitive());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var dynamicObject = createBasicFan();
        dynamicObject.fan.numberOfRings = new SampledProperty(Number);
        dynamicObject.fan.numberOfRings.addSample(time, 4);
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var dynamicObject = createBasicFan();
        dynamicObject.fan.numberOfRings = new SampledProperty(Number);
        dynamicObject.fan.numberOfRings.addSample(time, 4);
        var updater = new FanGeometryUpdater(dynamicObject, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new CompositePrimitive());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no DynamicObject supplied', function() {
        expect(function() {
            return new FanGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});