/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipsoid',
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicVertexPositionsProperty',
             'Core/Cartesian3',
             'Core/Color'
         ], function(
             DynamicEllipsoid,
             ColorMaterialProperty,
             ConstantProperty,
             DynamicVertexPositionsProperty,
             Cartesian3,
             Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicEllipsoid();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty(new Cartesian3());
        source.show = new ConstantProperty(true);

        var target = new DynamicEllipsoid();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.radii).toBe(source.radii);
        expect(target.show).toBe(source.show);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicEllipsoid();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty(new Cartesian3());
        source.show = new ConstantProperty(true);

        var material = new ColorMaterialProperty();
        var radii = new ConstantProperty(new Cartesian3());
        var show = new ConstantProperty(true);

        var target = new DynamicEllipsoid();
        target.material = material;
        target.radii = radii;
        target.show = show;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.radii).toBe(radii);
        expect(target.show).toBe(show);
    });

    it('clone works', function() {
        var source = new DynamicEllipsoid();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty(new Cartesian3());
        source.show = new ConstantProperty(true);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.radii).toBe(source.radii);
        expect(result.show).toBe(source.show);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicEllipsoid();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});