/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicVector',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Iso8601',
             'Core/TimeInterval',
             'DynamicScene/ConstantProperty'
            ], function(
                    DynamicVector,
                    DynamicObject,
                    JulianDate,
                    Cartesian3,
                    Color,
                    Iso8601,
                    TimeInterval,
                    ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties does not change a fully configured vector', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.vector = new DynamicVector();
        objectToMerge.vector.color = new ConstantProperty(Color.WHITE);
        objectToMerge.vector.width = new ConstantProperty(1);
        objectToMerge.vector.length = new ConstantProperty(2);
        objectToMerge.vector.direction = new ConstantProperty(new Cartesian3(1, 0, 0));
        objectToMerge.vector.show = new ConstantProperty(true);

        var color = new ConstantProperty(Color.RED);
        var width = new ConstantProperty(2);
        var length = new ConstantProperty(10);
        var direction = new ConstantProperty(new Cartesian3(0, 0, 1));
        var show = new ConstantProperty(false);

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
        objectToMerge.vector.color = new ConstantProperty(Color.WHITE);
        objectToMerge.vector.width = new ConstantProperty(1);
        objectToMerge.vector.length = new ConstantProperty(10);
        objectToMerge.vector.direction = new ConstantProperty(new Cartesian3(0, 0, 1));
        objectToMerge.vector.show = new ConstantProperty(true);

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

        var color = new ConstantProperty(Color.WHITE);
        var width = new ConstantProperty(1);
        var length = new ConstantProperty(10);
        var direction = new ConstantProperty(new Cartesian3(0, 0, 1));
        var show = new ConstantProperty(true);

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