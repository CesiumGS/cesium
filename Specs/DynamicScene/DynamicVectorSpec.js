/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicVector',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval',
             'Specs/MockProperty'
            ], function(
                    DynamicVector,
                    DynamicObject,
                    JulianDate,
                    Cartesian3,
                    Color,
                    Iso8601,
                    TimeInterval,
                    MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite vector.', function() {
        var direction = new Cartesian3(1, 2, 3).normalize();
        var vectorPacket = {
            vector : {
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                length : 10.0,
                direction : {
                    unitCartesian : [direction.x, direction.y, direction.z]
                },
                show : true
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicVector.processCzmlPacket(dynamicObject, vectorPacket)).toEqual(true);

        expect(dynamicObject.vector).toBeDefined();
        expect(dynamicObject.vector.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.vector.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(vectorPacket.vector.width);
        expect(dynamicObject.vector.direction.getValue(Iso8601.MINIMUM_VALUE)).toEqual(direction);
        expect(dynamicObject.vector.length.getValue(Iso8601.MINIMUM_VALUE)).toEqual(vectorPacket.vector.length);
        expect(dynamicObject.vector.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('processCzmlPacket adds data for constrained vector.', function() {
        var direction = new Cartesian3(1, 2, 3).normalize();
        var vectorPacket = {
            vector : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                length : 10.0,
                direction : {
                    unitCartesian : [direction.x, direction.y, direction.z]
                },
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(vectorPacket.vector.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicVector.processCzmlPacket(dynamicObject, vectorPacket)).toEqual(true);

        expect(dynamicObject.vector).toBeDefined();
        expect(dynamicObject.vector.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.vector.width.getValue(validTime)).toEqual(vectorPacket.vector.width);
        expect(dynamicObject.vector.direction.getValue(validTime)).toEqual(direction);
        expect(dynamicObject.vector.length.getValue(validTime)).toEqual(vectorPacket.vector.length);
        expect(dynamicObject.vector.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.vector.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.direction.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.length.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicVector.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.vector).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured vector', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.vector = new DynamicVector();
        objectToMerge.vector.color = new MockProperty();
        objectToMerge.vector.width = new MockProperty();
        objectToMerge.vector.length = new MockProperty();
        objectToMerge.vector.direction = new MockProperty();
        objectToMerge.vector.show = new MockProperty();

        var color = new MockProperty();
        var width = new MockProperty();
        var length = new MockProperty();
        var direction = new MockProperty();
        var show = new MockProperty();

        var targetObject = new DynamicObject('targetObject');
        targetObject.vector = new DynamicVector();
        targetObject.vector.color = color;
        targetObject.vector.width = width;
        targetObject.vector.length = length;
        targetObject.vector.direction = direction;
        targetObject.vector.show = show;

        DynamicVector.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.vector.color).toEqual(color);
        expect(targetObject.vector.width).toEqual(width);
        expect(targetObject.vector.length).toEqual(length);
        expect(targetObject.vector.direction).toEqual(direction);
        expect(targetObject.vector.show).toEqual(show);
    });

    it('mergeProperties creates and configures an undefined vector', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.vector = new DynamicVector();
        objectToMerge.vector.color = new MockProperty();
        objectToMerge.vector.width = new MockProperty();
        objectToMerge.vector.length = new MockProperty();
        objectToMerge.vector.direction = new MockProperty();
        objectToMerge.vector.show = new MockProperty();

        var targetObject = new DynamicObject('targetObject');

        DynamicVector.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.vector.color).toEqual(objectToMerge.vector.color);
        expect(targetObject.vector.width).toEqual(objectToMerge.vector.width);
        expect(targetObject.vector.length).toEqual(objectToMerge.vector.length);
        expect(targetObject.vector.direction).toEqual(objectToMerge.vector.direction);
        expect(targetObject.vector.show).toEqual(objectToMerge.vector.show);
    });

    it('mergeProperties does not change when used with an undefined vector', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var color = new MockProperty();
        var width = new MockProperty();
        var length = new MockProperty();
        var direction = new MockProperty();
        var show = new MockProperty();

        var targetObject = new DynamicObject('targetObject');
        targetObject.vector = new DynamicVector();
        targetObject.vector.color = color;
        targetObject.vector.width = width;
        targetObject.vector.length = length;
        targetObject.vector.direction = direction;
        targetObject.vector.show = show;

        DynamicVector.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.vector.color).toEqual(color);
        expect(targetObject.vector.width).toEqual(width);
        expect(targetObject.vector.length).toEqual(length);
        expect(targetObject.vector.direction).toEqual(direction);
        expect(targetObject.vector.show).toEqual(show);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.vector = new DynamicVector();
        DynamicVector.undefineProperties(testObject);
        expect(testObject.vector).toBeUndefined();
    });
});