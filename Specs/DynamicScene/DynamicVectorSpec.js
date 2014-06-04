/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicVector',
        'Core/Cartesian3',
        'Core/Color',
        'DynamicScene/ConstantProperty'
    ], function(
        DynamicVector,
        Cartesian3,
        Color,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicVector();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.length = new ConstantProperty(2);
        source.direction = new ConstantProperty(new Cartesian3(1, 0, 0));
        source.show = new ConstantProperty(true);

        var target = new DynamicVector();
        target.merge(source);
        expect(target.color).toBe(source.color);
        expect(target.width).toBe(source.width);
        expect(target.length).toBe(source.length);
        expect(target.direction).toBe(source.direction);
        expect(target.show).toBe(source.show);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicVector();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.length = new ConstantProperty(2);
        source.direction = new ConstantProperty(new Cartesian3(1, 0, 0));
        source.show = new ConstantProperty(true);

        var color = new ConstantProperty(Color.WHITE);
        var width = new ConstantProperty(1);
        var length = new ConstantProperty(2);
        var direction = new ConstantProperty(new Cartesian3(1, 0, 0));
        var show = new ConstantProperty(true);

        var target = new DynamicVector();
        target.color = color;
        target.width = width;
        target.length = length;
        target.direction = direction;
        target.show = show;

        target.merge(source);
        expect(target.color).toBe(color);
        expect(target.width).toBe(width);
        expect(target.length).toBe(length);
        expect(target.direction).toBe(direction);
        expect(target.show).toBe(show);
    });

    it('clone works', function() {
        var source = new DynamicVector();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.length = new ConstantProperty(2);
        source.direction = new ConstantProperty(new Cartesian3(1, 0, 0));
        source.show = new ConstantProperty(true);

        var result = source.clone();
        expect(result.color).toBe(source.color);
        expect(result.width).toBe(source.width);
        expect(result.length).toBe(source.length);
        expect(result.direction).toBe(source.direction);
        expect(result.show).toBe(source.show);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicVector();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});