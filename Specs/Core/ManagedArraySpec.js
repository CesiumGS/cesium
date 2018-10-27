defineSuite([
        'Core/ManagedArray'
    ], function(
        ManagedArray) {
    'use strict';

    it('constructor has expected default values', function() {
        var array = new ManagedArray();
        expect(array.length).toEqual(0);
    });

    it('constructor initializes length', function() {
        var array = new ManagedArray(10);
        expect(array.length).toEqual(10);
        expect(array.values.length).toEqual(10);
    });

    it('can get and set values', function() {
        var length = 10;
        var array = new ManagedArray(length);
        var i;
        for (i = 0; i < length; ++i) {
            array.set(i, i*i);
        }
        for (i = 0; i < length; ++i) {
            expect(array.get(i)).toEqual(i*i);
            expect(array.values[i]).toEqual(i*i);
        }
    });

    it('get throws if index does not exist', function() {
        var array = new ManagedArray();
        array.reserve(5);
        expect(array.values.length).toEqual(5);
        expect(function() {
            array.get(5);
        }).toThrowDeveloperError();
    });

    it('set throws if index invalid', function() {
        var array = new ManagedArray();
        array.resize(10);
        expect(function() {
            array.set(undefined, 5);
        }).toThrowDeveloperError();
    });

    it('set resizes array', function() {
        var array = new ManagedArray();
        array.set(0, 'a');
        expect(array.length).toEqual(1);
        array.set(5, 'b');
        expect(array.length).toEqual(6);
        array.set(2, 'c');
        expect(array.length).toEqual(6);
    });

    it('peeks at the last element of the array', function() {
        var array = new ManagedArray();
        expect(array.peek()).toBeUndefined();
        array.push(0);
        expect(array.peek()).toBe(0);
        array.push(1);
        array.push(2);
        expect(array.peek()).toBe(2);
    });

    it('can push values', function() {
        var array = new ManagedArray();
        var length = 10;
        for (var i = 0; i < length; ++i) {
            var val = Math.random();
            array.push(val);
            expect(array.length).toEqual(i+1);
            expect(array.values.length).toEqual(i+1);
            expect(array.get(i)).toEqual(val);
            expect(array.values[i]).toEqual(val);
        }
    });

    it('can pop values', function() {
        var length = 10;
        var array = new ManagedArray(length);
        var i;
        for (i = 0; i < length; ++i) {
            array.set(i, Math.random());
        }
        for (i = length - 1; i >= 0; --i) {
            var val = array.get(i);
            expect(array.pop()).toEqual(val);
            expect(array.length).toEqual(i);
            expect(array.values.length).toEqual(length);
        }
    });

    it('reserve throws if length is less than 0', function() {
        var array = new ManagedArray();
        expect(function() {
            array.reserve(-1);
        }).toThrowDeveloperError();
    });

    it('reserve', function() {
        var array = new ManagedArray(2);
        array.reserve(10);
        expect(array.values.length).toEqual(10);
        expect(array.length).toEqual(2);
        array.reserve(20);
        expect(array.values.length).toEqual(20);
        expect(array.length).toEqual(2);
        array.reserve(5);
        expect(array.values.length).toEqual(20);
        expect(array.length).toEqual(2);
    });

    it('resize throws if length is less than 0', function() {
        var array = new ManagedArray();
        expect(function() {
            array.resize(-1);
        }).toThrowDeveloperError();
    });

    it('resize', function() {
        var array = new ManagedArray(2);
        array.resize(10);
        expect(array.values.length).toEqual(10);
        expect(array.length).toEqual(10);
        array.resize(20);
        expect(array.values.length).toEqual(20);
        expect(array.length).toEqual(20);
        array.resize(5);
        expect(array.values.length).toEqual(20);
        expect(array.length).toEqual(5);
    });

    it('trim', function() {
        var array = new ManagedArray(2);
        array.reserve(10);
        expect(array.length).toEqual(2);
        expect(array.values.length).toEqual(10);
        array.trim();
        expect(array.values.length).toEqual(2);
        array.trim(5);
        expect(array.length).toEqual(2);
        expect(array.values.length).toEqual(5);
        array.trim(3);
        expect(array.length).toEqual(2);
        expect(array.values.length).toEqual(3);
    });
});
