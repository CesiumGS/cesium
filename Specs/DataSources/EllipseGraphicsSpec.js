/*global defineSuite*/
defineSuite([
        'DataSources/EllipseGraphics',
        'DataSources/ConstantProperty'
    ], function(
        EllipseGraphics,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new EllipseGraphics();
        source.semiMajorAxis = new ConstantProperty(1);
        source.semiMinorAxis = new ConstantProperty(2);
        source.rotation = new ConstantProperty(3);

        var target = new EllipseGraphics();
        target.merge(source);
        expect(target.semiMajorAxis).toBe(source.semiMajorAxis);
        expect(target.semiMinorAxis).toBe(source.semiMinorAxis);
        expect(target.rotation).toBe(source.rotation);
    });

    it('merge does not assign assigned properties', function() {
        var source = new EllipseGraphics();
        source.semiMajorAxis = new ConstantProperty(1);
        source.semiMinorAxis = new ConstantProperty(2);
        source.rotation = new ConstantProperty(3);

        var semiMajorAxis = new ConstantProperty(1);
        var semiMinorAxis = new ConstantProperty(2);
        var rotation = new ConstantProperty(3);

        var target = new EllipseGraphics();
        target.semiMajorAxis = semiMajorAxis;
        target.semiMinorAxis = semiMinorAxis;
        target.rotation = rotation;

        target.merge(source);
        expect(target.semiMajorAxis).toBe(semiMajorAxis);
        expect(target.semiMinorAxis).toBe(semiMinorAxis);
        expect(target.rotation).toBe(rotation);
    });

    it('clone works', function() {
        var source = new EllipseGraphics();
        source.semiMajorAxis = new ConstantProperty(1);
        source.semiMinorAxis = new ConstantProperty(2);
        source.rotation = new ConstantProperty(3);

        var result = source.clone();
        expect(result.semiMajorAxis).toBe(source.semiMajorAxis);
        expect(result.semiMinorAxis).toBe(source.semiMinorAxis);
        expect(result.rotation).toBe(source.rotation);
    });

    it('merge throws if source undefined', function() {
        var target = new EllipseGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});