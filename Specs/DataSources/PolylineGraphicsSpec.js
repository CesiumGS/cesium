/*global defineSuite*/
defineSuite([
        'DataSources/PolylineGraphics',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        PolylineGraphics,
        Color,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.width = new ConstantProperty();
        source.show = new ConstantProperty();

        var target = new PolylineGraphics();
        target.merge(source);
        expect(target.material).toBe(source.material);
        expect(target.positions).toBe(source.positions);
        expect(target.width).toBe(source.width);
        expect(target.show).toBe(source.show);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.width = new ConstantProperty();
        source.show = new ConstantProperty();

        var color = new ColorMaterialProperty();
        var positions = new ConstantProperty();
        var width = new ConstantProperty();
        var show = new ConstantProperty();

        var target = new PolylineGraphics();
        target.material = color;
        target.positions = positions;
        target.width = width;
        target.show = show;

        target.merge(source);
        expect(target.material).toBe(color);
        expect(target.positions).toBe(positions);
        expect(target.width).toBe(width);
        expect(target.show).toBe(show);
    });

    it('clone works', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.positions).toBe(source.positions);
        expect(result.width).toBe(source.width);
        expect(result.show).toBe(source.show);
    });

    it('merge throws if source undefined', function() {
        var target = new PolylineGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new PolylineGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'positions', [], []);
        testDefinitionChanged(property, 'width', 3, 4);
    });
});