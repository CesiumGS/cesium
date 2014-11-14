/*global defineSuite*/
defineSuite([
        'DataSources/CallbackProperty',
        'Core/Cartesian3',
        'Core/JulianDate'
    ], function(
        CallbackProperty,
        Cartesian3,
        JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    it('callback received proper parameters', function() {
        var result = {};
        var callback = jasmine.createSpy('callback');
        var property = new CallbackProperty(callback, true);
        property.getValue(time, result);
        expect(callback).toHaveBeenCalledWith(time, result);
    });

    it('getValue returns callback result', function() {
        var result = {};
        var callback = function(time, result) {
            return result;
        };
        var property = new CallbackProperty(callback, true);
        expect(property.getValue(time, result)).toBe(result);
    });

    it('isConstant returns correct value', function() {
        var result = {};
        var property = new CallbackProperty(function() {
        }, true);
        expect(property.isConstant).toBe(true);
        property.setCallback(function() {
        }, false);
        expect(property.isConstant).toBe(false);
    });

    it('setCallback raises definitionChanged event', function() {
        var property = new CallbackProperty(function() {
        }, true);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setCallback(function() {
        }, false);
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('constructor throws with undefined isConstant', function() {
        expect(function() {
            return new CallbackProperty(function() {
            }, undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined callback', function() {
        expect(function() {
            return new CallbackProperty(undefined, true);
        }).toThrowDeveloperError();
    });

    it('equals works', function() {
        var callback = function() {
        };
        var left = new CallbackProperty(callback, true);
        var right = new CallbackProperty(callback, true);

        expect(left.equals(right)).toEqual(true);

        right.setCallback(callback, false);
        expect(left.equals(right)).toEqual(false);

        right.setCallback(function() {
            return undefined;
        }, true);
        expect(left.equals(right)).toEqual(false);
    });
});