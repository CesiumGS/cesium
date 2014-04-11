/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicFan',
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'Core/Color'
         ], function(
             DynamicFan,
             ColorMaterialProperty,
             ConstantProperty,
             Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicFan();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);
        source.radius = new ConstantProperty(1);
        source.perDirectionRadius = new ConstantProperty(false);
        source.directions = new ConstantProperty([]);
        source.fill = new ConstantProperty(true);
        source.outline = new ConstantProperty(false);
        source.outlineColor = new ConstantProperty(Color.RED);
        source.numberOfRings = new ConstantProperty(12);

        var target = new DynamicFan();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.show).toBe(source.show);
        expect(target.radius).toBe(source.radius);
        expect(target.perDirectionRadius).toBe(source.perDirectionRadius);
        expect(target.directions).toBe(source.directions);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.numberOfRings).toBe(source.numberOfRings);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicFan();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var material = new ColorMaterialProperty();
        var show = new ConstantProperty(true);
        var radius = new ConstantProperty(1);
        var perDirectionRadius = new ConstantProperty(true);
        var directions = new ConstantProperty([]);
        var fill = new ConstantProperty(false);
        var outline = new ConstantProperty(true);
        var outlineColor = new ConstantProperty(Color.BLUE);
        var numberOfRings = new ConstantProperty(4);

        var target = new DynamicFan();
        target.material = material;
        target.show = show;
        target.radius = radius;
        target.perDirectionRadius = perDirectionRadius;
        target.directions = directions;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.numberOfRings = numberOfRings;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.show).toBe(show);
        expect(target.radius).toBe(radius);
        expect(target.perDirectionRadius).toBe(perDirectionRadius);
        expect(target.directions).toBe(directions);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.numberOfRings).toBe(numberOfRings);
    });

    it('clone works', function() {
        var source = new DynamicFan();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);
        source.radius = new ConstantProperty(1);
        source.perDirectionRadius = new ConstantProperty(false);
        source.directions = new ConstantProperty([]);
        source.fill = new ConstantProperty(true);
        source.outline = new ConstantProperty(false);
        source.outlineColor = new ConstantProperty(Color.RED);
        source.numberOfRings = new ConstantProperty(12);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.show).toBe(source.show);
        expect(result.radius).toBe(source.radius);
        expect(result.perDirectionRadius).toBe(source.perDirectionRadius);
        expect(result.directions).toBe(source.directions);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.numberOfRings).toBe(source.numberOfRings);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicFan();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});