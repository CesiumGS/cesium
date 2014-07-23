/*global defineSuite*/
defineSuite([
        'DataSources/EllipsoidGraphics',
        'Core/Cartesian3',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty'
    ], function(
        EllipsoidGraphics,
        Cartesian3,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new EllipsoidGraphics();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty(new Cartesian3());
        source.show = new ConstantProperty(true);
        source.stackPartitions = new ConstantProperty(16);
        source.slicePartitions = new ConstantProperty(32);
        source.subdivisions = new ConstantProperty(64);

        var target = new EllipsoidGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.radii).toBe(source.radii);
        expect(target.show).toBe(source.show);
        expect(target.stackPartitions).toBe(source.stackPartitions);
        expect(target.slicePartitions).toBe(source.slicePartitions);
        expect(target.subdivisions).toBe(source.subdivisions);
    });

    it('merge does not assign assigned properties', function() {
        var source = new EllipsoidGraphics();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty(new Cartesian3());
        source.show = new ConstantProperty(true);
        source.stackPartitions = new ConstantProperty(16);
        source.slicePartitions = new ConstantProperty(32);
        source.subdivisions = new ConstantProperty(64);

        var material = new ColorMaterialProperty();
        var radii = new ConstantProperty(new Cartesian3());
        var show = new ConstantProperty(true);
        var stackPartitions = new ConstantProperty(1);
        var slicePartitions = new ConstantProperty(2);
        var subdivisions = new ConstantProperty(3);

        var target = new EllipsoidGraphics();
        target.material = material;
        target.radii = radii;
        target.show = show;
        target.stackPartitions = stackPartitions;
        target.slicePartitions = slicePartitions;
        target.subdivisions = subdivisions;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.radii).toBe(radii);
        expect(target.show).toBe(show);
        expect(target.stackPartitions).toBe(stackPartitions);
        expect(target.slicePartitions).toBe(slicePartitions);
        expect(target.subdivisions).toBe(subdivisions);
    });

    it('clone works', function() {
        var source = new EllipsoidGraphics();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty(new Cartesian3());
        source.show = new ConstantProperty(true);
        source.stackPartitions = new ConstantProperty(16);
        source.slicePartitions = new ConstantProperty(32);
        source.subdivisions = new ConstantProperty(64);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.radii).toBe(source.radii);
        expect(result.show).toBe(source.show);
        expect(result.stackPartitions).toBe(source.stackPartitions);
        expect(result.slicePartitions).toBe(source.slicePartitions);
        expect(result.subdivisions).toBe(source.subdivisions);
    });

    it('merge throws if source undefined', function() {
        var target = new EllipsoidGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});