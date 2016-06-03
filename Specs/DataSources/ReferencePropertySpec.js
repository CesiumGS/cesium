/*global defineSuite*/
defineSuite([
        'DataSources/ReferenceProperty',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/ReferenceFrame',
        'DataSources/BillboardGraphics',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/EntityCollection'
    ], function(
        ReferenceProperty,
        Cartesian3,
        Color,
        JulianDate,
        ReferenceFrame,
        BillboardGraphics,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        Entity,
        EntityCollection) {
    'use strict';

    var time = JulianDate.now();

    it('constructor sets expected values', function() {
        var collection = new EntityCollection();
        var objectId = 'testId';
        var propertyNames = ['foo', 'bar', 'baz'];
        var property = new ReferenceProperty(collection, objectId, propertyNames);

        expect(property.targetCollection).toBe(collection);
        expect(property.targetId).toEqual(objectId);
        expect(property.targetPropertyNames).toEqual(propertyNames);
    });

    it('fromString sets expected values', function() {
        var collection = new EntityCollection();
        var objectId = 'testId';
        var propertyNames = ['foo', 'bar', 'baz'];

        var property = ReferenceProperty.fromString(collection, 'testId#foo.bar.baz');

        expect(property.targetCollection).toBe(collection);
        expect(property.targetId).toEqual(objectId);
        expect(property.targetPropertyNames).toEqual(propertyNames);
    });

    it('fromString works with escaped values', function() {
        var collection = new EntityCollection();
        var objectId = '#identif\\#ier.';
        var propertyNames = ["propertyName", ".abc\\", "def"];
        var property = ReferenceProperty.fromString(collection, '\\#identif\\\\\\#ier\\.#propertyName.\\.abc\\\\.def');

        expect(property.targetCollection).toBe(collection);
        expect(property.targetId).toEqual(objectId);
        expect(property.targetPropertyNames).toEqual(propertyNames);
    });

    it('properly tracks resolved property', function() {
        var testObject = new Entity({
            id : 'testId'
        });
        testObject.billboard = new BillboardGraphics();
        testObject.billboard.scale = new ConstantProperty(5);

        var collection = new EntityCollection();
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
        expect(listener).toHaveBeenCalledWith(property);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(6);
        listener.calls.reset();

        //Assignment of new leaf property to existing target is reflected in reference.
        testObject.billboard.scale = new ConstantProperty(7);
        expect(listener).toHaveBeenCalledWith(property);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(7);
        listener.calls.reset();

        //Assignment of non-leaf property to existing target is reflected in reference.
        testObject.billboard = new BillboardGraphics();
        testObject.billboard.scale = new ConstantProperty(8);
        expect(listener).toHaveBeenCalledWith(property);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(8);
        listener.calls.reset();

        //Removing an object should cause the reference to be severed but maintain last value
        collection.remove(testObject);

        expect(listener).not.toHaveBeenCalledWith();
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(8);
        listener.calls.reset();

        //adding a new object should re-wire the reference.
        var testObject2 = new Entity({
            id : 'testId'
        });
        testObject2.billboard = new BillboardGraphics();
        testObject2.billboard.scale = new ConstantProperty(9);
        collection.add(testObject2);
        expect(listener).toHaveBeenCalledWith(property);
        expect(property.isConstant).toEqual(true);
        expect(property.getValue(time)).toEqual(9);
    });

    it('works with position properties', function() {
        var testObject = new Entity({
            id : 'testId'
        });
        testObject.position = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.FIXED);

        var collection = new EntityCollection();
        collection.add(testObject);

        //Basic property resolution
        var property = ReferenceProperty.fromString(collection, 'testId#position');
        expect(property.isConstant).toEqual(true);
        expect(property.referenceFrame).toEqual(ReferenceFrame.FIXED);
        expect(property.getValue(time)).toEqual(testObject.position.getValue(time));
        expect(property.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL)).toEqual(testObject.position.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL));
    });

    it('works with material properties', function() {
        var testObject = new Entity({
            id : 'testId'
        });
        testObject.addProperty('testMaterial');
        testObject.testMaterial = new ColorMaterialProperty(Color.WHITE);

        var collection = new EntityCollection();
        collection.add(testObject);

        //Basic property resolution
        var property = ReferenceProperty.fromString(collection, 'testId#testMaterial');
        expect(property.isConstant).toEqual(true);
        expect(property.getType(time)).toEqual(testObject.testMaterial.getType(time));
        expect(property.getValue(time)).toEqual(testObject.testMaterial.getValue(time));
    });

    it('equals works', function() {
        var entityCollection = new EntityCollection();

        var left = ReferenceProperty.fromString(entityCollection, 'objectId#foo.bar');
        var right = ReferenceProperty.fromString(entityCollection, 'objectId#foo.bar');
        expect(left.equals(right)).toEqual(true);

        //collection differs
        right = ReferenceProperty.fromString(new EntityCollection(), 'objectId#foo.bar');
        expect(left.equals(right)).toEqual(false);

        //target id differs
        right = ReferenceProperty.fromString(entityCollection, 'otherObjectId#foo.bar');
        expect(left.equals(right)).toEqual(false);

        //number of sub-properties differ
        right = ReferenceProperty.fromString(entityCollection, 'objectId#foo');
        expect(left.equals(right)).toEqual(false);

        //sub-properties of same length differ
        right = ReferenceProperty.fromString(entityCollection, 'objectId#foo.baz');
        expect(left.equals(right)).toEqual(false);
    });

    it('does not raise definition changed when target entity has not changed.', function() {
        var testObject = new Entity({
            id : 'testId'
        });
        testObject.billboard = new BillboardGraphics();
        testObject.billboard.scale = new ConstantProperty(5);

        var otherObject = new Entity({
            id : 'other'
        });

        var collection = new EntityCollection();
        collection.add(testObject);
        collection.add(otherObject);

        var property = ReferenceProperty.fromString(collection, 'testId#billboard.scale');
        expect(property.resolvedProperty).toBe(testObject.billboard.scale);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        collection.remove(otherObject);
        expect(listener).not.toHaveBeenCalled();
        collection.remove(testObject);
        expect(listener).not.toHaveBeenCalled();
    });

    it('constructor throws with undefined targetCollection', function() {
        expect(function() {
            return new ReferenceProperty(undefined, 'objectid', ['property']);
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined targetId', function() {
        expect(function() {
            return new ReferenceProperty(new EntityCollection(), undefined, ['property']);
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined targetPropertyNames', function() {
        expect(function() {
            return new ReferenceProperty(new EntityCollection(), 'objectId', undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with empty targetPropertyNames', function() {
        expect(function() {
            return new ReferenceProperty(new EntityCollection(), 'objectId', []);
        }).toThrowDeveloperError();
    });

    it('constructor throws with empty targetId', function() {
        expect(function() {
            return new ReferenceProperty(new EntityCollection(), '', ['property']);
        }).toThrowDeveloperError();
    });

    it('fromString throws with undefined targetCollection', function() {
        expect(function() {
            return ReferenceProperty.fromString(undefined, 'objectid#property');
        }).toThrowDeveloperError();
    });

    it('fromString throws with undefined referenceString', function() {
        expect(function() {
            return ReferenceProperty.fromString(new EntityCollection(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromString throws with invalid referenceString', function() {
        expect(function() {
            return ReferenceProperty.fromString(new EntityCollection(), 'foo');
        }).toThrowDeveloperError();

        expect(function() {
            return ReferenceProperty.fromString(new EntityCollection(), 'foo#');
        }).toThrowDeveloperError();

        expect(function() {
            return ReferenceProperty.fromString(new EntityCollection(), '#bar');
        }).toThrowDeveloperError();
    });

    it('throws RuntimeError if targetId can not be resolved', function() {
        var collection = new EntityCollection();
        var property = ReferenceProperty.fromString(collection, 'testId#foo.bar');
        expect(function() {
            property.getValue(time);
        }).toThrowRuntimeError();
    });

    it('throws RuntimeError if property can not be resolved', function() {
        var collection = new EntityCollection();

        var testObject = new Entity({
            id : 'testId'
        });
        collection.add(testObject);

        var property = ReferenceProperty.fromString(collection, 'testId#billboard');
        expect(function() {
            property.getValue(time);
        }).toThrowRuntimeError();
    });

    it('throws RuntimeError if sub-property can not be resolved', function() {
        var collection = new EntityCollection();

        var testObject = new Entity({
            id : 'testId'
        });
        testObject.billboard = new BillboardGraphics();
        collection.add(testObject);

        var property = ReferenceProperty.fromString(collection, 'testId#billboard.foo');
        expect(function() {
            property.getValue(time);
        }).toThrowRuntimeError();
    });
});
