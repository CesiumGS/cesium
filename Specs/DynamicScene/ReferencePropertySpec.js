/*global defineSuite*/
defineSuite([
             'DynamicScene/ReferenceProperty',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Core/Iso8601'
            ], function(
              ReferenceProperty,
              DynamicObjectCollection,
              DynamicObject,
              JulianDate,
              TimeInterval,
              Iso8601) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var validTime = JulianDate.fromIso8601('2012');
    var invalidTime = JulianDate.fromIso8601('2014');

    var testObjectLink = 'testObject.property';
    function createTestObject(dynamicObjectCollection, methodName) {
        var testObject = dynamicObjectCollection.getOrCreateObject('testObject');
        testObject._setAvailability(TimeInterval.fromIso8601('2012/2013'));
        testObject.property = {};
        testObject.property[methodName] = function(time, result) {
            result.expectedTime = time;
            result.expectedValue = true;
            return result;
        };
        return testObject;
    }

    it('constructor throws if missing dynamicObjectCollection parameter', function() {
        expect(function() {
            return new ReferenceProperty(undefined, 'object', 'property');
        }).toThrow();
    });

    it('constructor throws if missing targetObjectId parameter', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), undefined, 'property');
        }).toThrow();
    });

    it('constructor throws if missing targetPropertyName parameter', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), 'object', undefined);
        }).toThrow();
    });

    it('fromString throws if missing dynamicObjectCollection parameter', function() {
        expect(function() {
            return ReferenceProperty.fromString(undefined, 'object.property');
        }).toThrow();
    });

    it('fromString throws if missing string parameter', function() {
        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), undefined);
        }).toThrow();
    });

    it('fromString throws if invalid string parameter', function() {
        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), 'a.b.c');
        }).toThrow();
    });

    it('getValue returned undefined for unresolved property', function() {
        var property = ReferenceProperty.fromString(new DynamicObjectCollection(), 'object.property');
        expect(property.getValue()).toBeUndefined();
    });

    it('getValueCartographic returned undefined for unresolved property', function() {
        var property = ReferenceProperty.fromString(new DynamicObjectCollection(), 'object.property');
        expect(property.getValueCartographic()).toBeUndefined();
    });

    it('getValueCartesian returned undefined for unresolved property', function() {
        var property = ReferenceProperty.fromString(new DynamicObjectCollection(), 'object.property');
        expect(property.getValueCartesian()).toBeUndefined();
    });

    it('getValueSpherical returned undefined for unresolved property', function() {
        var property = ReferenceProperty.fromString(new DynamicObjectCollection(), 'object.property');
        expect(property.getValueSpherical()).toBeUndefined();
    });

    it('Resolves getValue property on direct collection', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValue');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValue(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValue(invalidTime, result)).toBeUndefined();
    });

    it('Resolves getValue property on parent collection', function() {
        var parent = new DynamicObjectCollection();
        var dynamicObjectCollection = new DynamicObjectCollection();
        dynamicObjectCollection.compositeCollection = parent;
        createTestObject(parent, 'getValue');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValue(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValue(invalidTime, result)).toBeUndefined();
    });

    it('Resolves getValue property on direct collection', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValue');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValue(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValue(invalidTime, result)).toBeUndefined();
    });

    it('Resolves getValueCartographic property on direct collection', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValueCartographic');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValueCartographic(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValueCartographic(invalidTime, result)).toBeUndefined();
    });

    it('Resolves getValueCartesian property on direct collection', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValueCartesian');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValueCartesian(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValueCartesian(invalidTime, result)).toBeUndefined();
    });

    it('Resolves getValueSpherical property on direct collection', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValueSpherical');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValueSpherical(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValueSpherical(invalidTime, result)).toBeUndefined();
    });
});