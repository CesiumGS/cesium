/*global defineSuite*/
defineSuite([
        'DynamicScene/ReferenceProperty',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/ReferenceFrame',
        'Core/TimeInterval',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicBillboard',
        'DynamicScene/DynamicObject',
        'DynamicScene/DynamicObjectCollection'
    ], function(
        ReferenceProperty,
        Cartesian3,
        Color,
        JulianDate,
        ReferenceFrame,
        TimeInterval,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicBillboard,
        DynamicObject,
        DynamicObjectCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    it('constructor sets expected values', function() {
        var collection = new DynamicObjectCollection();
        var objectId = 'testId';
        var propertyNames = ['foo', 'bar', 'baz'];
        var property = new ReferenceProperty(collection, objectId, propertyNames);

        expect(property.targetCollection).toBe(collection);
        expect(property.targetId).toEqual(objectId);
        expect(property.targetPropertyNames).toEqual(propertyNames);
    });

    it('fromString sets expected values', function() {
        var collection = new DynamicObjectCollection();
        var objectId = 'testId';
        var propertyNames = ['foo', 'bar', 'baz'];

        var property = ReferenceProperty.fromString(collection, 'testId#foo.bar.baz');

        expect(property.targetCollection).toBe(collection);
        expect(property.targetId).toEqual(objectId);
        expect(property.targetPropertyNames).toEqual(propertyNames);
    });

    it('fromString works with escaped values', function() {
        var collection = new DynamicObjectCollection();
        var objectId = '#identif\\#ier.';
        var propertyNames = ["propertyName", ".abc\\", "def"];
        var property = ReferenceProperty.fromString(collection, '\\#identif\\\\\\#ier\\.#propertyName.\\.abc\\\\.def');

        expect(property.targetCollection).toBe(collection);
        expect(property.targetId).toEqual(objectId);
        expect(property.targetPropertyNames).toEqual(propertyNames);
    });

    it('properly tracks resolved property', function() {
        var testObject = new DynamicObject('testId');
        testObject.billboard = new DynamicBillboard();
        testObject.billboard.scale = new ConstantProperty(5);

        var collection = new DynamicObjectCollection();
        collection.add(testObject);

        //Basic property resolution
        var property = ReferenceProperty.fromString(collection, 'testId#billboard.scale');
        expect(property.referenceFrame).toBeUndefined();
        expect(property.isConstant).toEqual(true);
        expect(property.resolvedProperty).toBe(testObject.billboard.scale);
        expect(property.getValue(time)).toEqual(5);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        //Change to exist target property is reflected in reference.
        testObject.billboard.scale.setValue(6);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(6);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        //Assignment of new leaf property to existing target is reflected in reference.
        testObject.billboard.scale = new ConstantProperty(7);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(7);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        //Assignment of non-leaf property to existing target is reflected in reference.
        testObject.billboard = new DynamicBillboard();
        testObject.billboard.scale = new ConstantProperty(8);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(8);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        //Removing an adding a new object is properly referenced.
        collection.remove(testObject);

        var testObject2 = new DynamicObject('testId');
        testObject2.billboard = new DynamicBillboard();
        testObject2.billboard.scale = new ConstantProperty(9);
        collection.add(testObject2);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(9);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();
    });

    it('works with position properties', function() {
        var testObject = new DynamicObject('testId');
        testObject.position = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.FIXED);

        var collection = new DynamicObjectCollection();
        collection.add(testObject);

        //Basic property resolution
        var property = ReferenceProperty.fromString(collection, 'testId#position');
        expect(property.isConstant).toEqual(true);
        expect(property.referenceFrame).toEqual(ReferenceFrame.FIXED);
        expect(property.getValue(time)).toEqual(testObject.position.getValue(time));
        expect(property.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL)).toEqual(testObject.position.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL));
    });

    it('works with material properties', function() {
        var testObject = new DynamicObject('testId');
        testObject.addProperty('testMaterial');
        testObject.testMaterial = ColorMaterialProperty.fromColor(Color.WHITE);

        var collection = new DynamicObjectCollection();
        collection.add(testObject);

        //Basic property resolution
        var property = ReferenceProperty.fromString(collection, 'testId#testMaterial');
        expect(property.isConstant).toEqual(true);
        expect(property.getType(time)).toEqual(testObject.testMaterial.getType(time));
        expect(property.getValue(time)).toEqual(testObject.testMaterial.getValue(time));
    });

    it('equals works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();

        var left = ReferenceProperty.fromString(dynamicObjectCollection, 'objectId#foo.bar');
        var right = ReferenceProperty.fromString(dynamicObjectCollection, 'objectId#foo.bar');
        expect(left.equals(right)).toEqual(true);

        //collection differs
        right = ReferenceProperty.fromString(new DynamicObjectCollection(), 'objectId#foo.bar');
        expect(left.equals(right)).toEqual(false);

        //target id differs
        right = ReferenceProperty.fromString(dynamicObjectCollection, 'otherObjectId#foo.bar');
        expect(left.equals(right)).toEqual(false);

        //number of sub-properties differ
        right = ReferenceProperty.fromString(dynamicObjectCollection, 'objectId#foo');
        expect(left.equals(right)).toEqual(false);

        //sub-properties of same length differ
        right = ReferenceProperty.fromString(dynamicObjectCollection, 'objectId#foo.baz');
        expect(left.equals(right)).toEqual(false);
    });

    it('constructor throws with undefined targetCollection', function() {
        expect(function() {
            return new ReferenceProperty(undefined, 'objectid', ['property']);
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined targetId', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), undefined, ['property']);
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined targetPropertyNames', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), 'objectId', undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with empty targetPropertyNames', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), 'objectId', []);
        }).toThrowDeveloperError();
    });

    it('constructor throws with empty targetId', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), '', ['property']);
        }).toThrowDeveloperError();
    });

    it('fromString throws with undefined targetCollection', function() {
        expect(function() {
            return ReferenceProperty.fromString(undefined, 'objectid#property');
        }).toThrowDeveloperError();
    });

    it('fromString throws with undefined referenceString', function() {
        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromString throws with invalid referenceString', function() {
        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), 'foo');
        }).toThrowDeveloperError();

        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), 'foo#');
        }).toThrowDeveloperError();

        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), '#bar');
        }).toThrowDeveloperError();
    });

    it('throws RuntimeError if targetId can not be resolved', function() {
        var collection = new DynamicObjectCollection();
        var property = ReferenceProperty.fromString(collection, 'testId#foo.bar');
        expect(function() {
            property.getValue(time);
        }).toThrowRuntimeError();
    });

    it('throws RuntimeError if property can not be resolved', function() {
        var collection = new DynamicObjectCollection();

        var testObject = new DynamicObject('testId');
        collection.add(testObject);

        var property = ReferenceProperty.fromString(collection, 'testId#billboard');
        expect(function() {
            property.getValue(time);
        }).toThrowRuntimeError();
    });

    it('throws RuntimeError if sub-property can not be resolved', function() {
        var collection = new DynamicObjectCollection();

        var testObject = new DynamicObject('testId');
        testObject.billboard = new DynamicBillboard();
        collection.add(testObject);

        var property = ReferenceProperty.fromString(collection, 'testId#billboard.foo');
        expect(function() {
            property.getValue(time);
        }).toThrowRuntimeError();
    });
});