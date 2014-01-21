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
        testObject.availability = TimeInterval.fromIso8601('2012/2013');
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
        }).toThrowDeveloperError();
    });

    it('constructor throws if missing targetObjectId parameter', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), undefined, 'property');
        }).toThrowDeveloperError();
    });

    it('constructor throws if missing targetPropertyName parameter', function() {
        expect(function() {
            return new ReferenceProperty(new DynamicObjectCollection(), 'object', undefined);
        }).toThrowDeveloperError();
    });

    it('fromString throws if missing dynamicObjectCollection parameter', function() {
        expect(function() {
            return ReferenceProperty.fromString(undefined, 'object.property');
        }).toThrowDeveloperError();
    });

    it('fromString throws if missing string parameter', function() {
        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromString throws if invalid string parameter', function() {
        expect(function() {
            return ReferenceProperty.fromString(new DynamicObjectCollection(), 'a.b.c');
        }).toThrowDeveloperError();
    });

    it('getValue throws with undefined time', function() {
        var property = ReferenceProperty.fromString(new DynamicObjectCollection(), 'object.property');
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('getValue returned undefined for unresolved property', function() {
        var property = ReferenceProperty.fromString(new DynamicObjectCollection(), 'object.property');
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('Resolves getValue property on collection', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValue');
        var property = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var result = {};
        expect(property.getValue(validTime, result)).toEqual(result);
        expect(result.expectedValue).toEqual(true);
        expect(result.expectedTime).toEqual(validTime);
        expect(property.getValue(invalidTime, result)).toBeUndefined();
    });

    it('equals works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        createTestObject(dynamicObjectCollection, 'getValue');
        var left = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        var right = ReferenceProperty.fromString(dynamicObjectCollection, testObjectLink);
        expect(left.equals(right)).toEqual(true);

        right = new ReferenceProperty(dynamicObjectCollection, 'testObject', 'property2');
        expect(left.equals(right)).toEqual(false);

        right = new ReferenceProperty(dynamicObjectCollection, 'testObject2', 'property');
        expect(left.equals(right)).toEqual(false);
    });
});