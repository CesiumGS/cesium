/*global defineSuite*/
defineSuite([
        'DataSources/PropertyBag',
        'Core/JulianDate',
        'DataSources/ConstantProperty',
        'DataSources/SampledProperty'
    ], function(
        PropertyBag,
        JulianDate,
        ConstantProperty,
        SampledProperty) {
    'use strict';

    var time = JulianDate.now();

    it('sets correct values when constructed with no arguments', function() {
        var property = new PropertyBag();
        expect(property.isConstant).toBe(true);
        expect(property.getValue(time)).toEqual({});
    });

    it('sets correct values when constructed with arguments', function() {
        var property = new PropertyBag({
            a : new ConstantProperty(1),
            b : new ConstantProperty(2)
        });

        expect(property.propertyNames).toContain('a');
        expect(property.a).toBeDefined();
        expect(property.a).toBeInstanceOf(ConstantProperty);
        expect(property.hasProperty('a')).toEqual(true);

        expect(property.propertyNames).toContain('b');
        expect(property.b).toBeDefined();
        expect(property.b).toBeInstanceOf(ConstantProperty);
        expect(property.hasProperty('b')).toEqual(true);

        expect(property.getValue(time)).toEqual({
            a : 1,
            b : 2
        });
    });

    it('works with result parameter', function() {
        var property = new PropertyBag({
            a : new ConstantProperty(1),
            b : new ConstantProperty(2)
        });

        var expectedResult = {
            a : -1
        };
        var result = property.getValue(time, expectedResult);
        expect(result).toEqual({
            a : 1,
            b : 2
        });
        expect(result).toBe(expectedResult);
    });

    it('leaves extra properties in result object in place', function() {
        var property = new PropertyBag({
            a : new ConstantProperty(1)
        });

        var expectedResult = {
            q : -1
        };
        var result = property.getValue(time, expectedResult);
        expect(result).toEqual({
            a : 1,
            q : -1
        });
        expect(result).toBe(expectedResult);
    });

    it('converts raw values to properties when constructed', function() {
        var property = new PropertyBag({
            a : 1,
            b : 2
        });

        expect(property.propertyNames).toContain('a');
        expect(property.a).toBeInstanceOf(ConstantProperty);

        expect(property.propertyNames).toContain('b');
        expect(property.b).toBeInstanceOf(ConstantProperty);

        expect(property.getValue(time)).toEqual({
            a : 1,
            b : 2
        });
    });

    function FakeProperty(v) {
        this.v = v;
    }
    FakeProperty.prototype.getValue = function() {
        return this.v;
    };
    function createFakeProperty(v) {
        return new FakeProperty(v);
    }

    it('uses the provided function to convert raw values to properties when constructed', function() {
        var property = new PropertyBag({
            a : 1,
            b : 2
        }, createFakeProperty);

        expect(property.propertyNames).toContain('a');
        expect(property.a).toBeDefined();
        expect(property.a).toBeInstanceOf(FakeProperty);

        expect(property.propertyNames).toContain('b');
        expect(property.b).toBeDefined();
        expect(property.b).toBeInstanceOf(FakeProperty);

        expect(property.getValue(time)).toEqual({
            a : 1,
            b : 2
        });
    });

    it('returns correct results from hasProperty', function() {
        var property = new PropertyBag();
        expect(property.hasProperty('a')).toEqual(false);
        property.addProperty('a');
        expect(property.hasProperty('a')).toEqual(true);
    });

    it('allows adding a property without a value', function() {
        var property = new PropertyBag();
        property.addProperty('a');

        expect(property.propertyNames).toEqual(['a']);
        expect(property.a).toBeUndefined();
        expect(property.hasProperty('a')).toEqual(true);

        expect(property.getValue(time)).toEqual({
            a : undefined
        });
    });

    it('allows adding a property with a value', function() {
        var property = new PropertyBag();
        property.addProperty('a', new ConstantProperty(1));

        expect(property.propertyNames).toEqual(['a']);
        expect(property.a).toBeInstanceOf(ConstantProperty);

        expect(property.getValue(time)).toEqual({
            a : 1
        });
    });

    it('uses the provided function to convert raw values to properties when added with a value', function() {
        var property = new PropertyBag();
        property.addProperty('a', 1, createFakeProperty);

        expect(property.propertyNames).toEqual(['a']);
        expect(property.a).toBeInstanceOf(FakeProperty);

        expect(property.getValue(time)).toEqual({
            a : 1
        });
    });

    it('uses the provided function to convert raw values to properties when added without a value', function() {
        var property = new PropertyBag();
        property.addProperty('a', undefined, createFakeProperty);

        expect(property.propertyNames).toEqual(['a']);
        expect(property.a).toBeUndefined();

        property.a = 1;
        expect(property.a).toBeInstanceOf(FakeProperty);

        expect(property.getValue(time)).toEqual({
            a : 1
        });
    });

    it('allows removing a property that was previously added', function() {
        var property = new PropertyBag();

        property.addProperty('a', new ConstantProperty(1));
        expect(property.hasProperty('a')).toEqual(true);

        property.removeProperty('a');

        expect(property.propertyNames).toEqual([]);
        expect(property.a).toBeUndefined();
        expect(property.hasProperty('a')).toEqual(false);

        expect(property.getValue(time)).toEqual({});
    });

    it('throws when removing a property that was not added', function() {
        var property = new PropertyBag();
        expect(function() {
            property.removeProperty('a');
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged event when addProperty is called', function() {
        var property = new PropertyBag();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.addProperty('a');
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('raises definitionChanged event when properties are changed', function() {
        var property = new PropertyBag();
        property.addProperty('a');

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var a = new ConstantProperty(1);
        property.a = a;

        expect(listener).toHaveBeenCalledWith(property, 'a', a, undefined);
    });

    it('requires propertyName in addProperty', function() {
        var property = new PropertyBag();
        expect(function() {
            property.addProperty();
        }).toThrowDeveloperError();
    });

    it('requires propertyName in removeProperty', function() {
        var property = new PropertyBag();
        expect(function() {
            property.removeProperty();
        }).toThrowDeveloperError();
    });

    it('has working equals function', function() {
        var left = new PropertyBag({
            a : new ConstantProperty(1)
        });
        var right = new PropertyBag({
            a : new ConstantProperty(1)
        });

        expect(left.equals(right)).toEqual(true);

        right.addProperty('c');
        expect(left.equals(right)).toEqual(false);

        right = new PropertyBag({
            a : new ConstantProperty(2)
        });
        expect(left.equals(right)).toEqual(false);

        right = new PropertyBag({
            b : new ConstantProperty(1)
        });
        expect(left.equals(right)).toEqual(false);

        right = new PropertyBag();
        expect(left.equals(right)).toEqual(false);

        left = new PropertyBag();
        right = new PropertyBag();
        expect(left.equals(right)).toEqual(true);
    });

    it('returns true from isConstant only if all members are constant', function() {
        var property = new PropertyBag();

        property.addProperty('a', new ConstantProperty(2));
        expect(property.isConstant).toBe(true);

        var sampledProperty = new SampledProperty(Number);
        sampledProperty.addSample(time, 1);
        property.addProperty('b', sampledProperty);

        expect(property.isConstant).toBe(false);
    });
});
