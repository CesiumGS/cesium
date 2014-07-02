/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicCone',
        'Core/Color',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty'
    ], function(
        DynamicCone,
        Color,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicCone();
        source.capMaterial = new ColorMaterialProperty();
        source.innerMaterial = new ColorMaterialProperty();
        source.silhouetteMaterial = new ColorMaterialProperty();
        source.outerMaterial = new ColorMaterialProperty();
        source.innerHalfAngle = new ConstantProperty(1);
        source.maximumClockAngle = new ConstantProperty(1);
        source.minimumClockAngle = new ConstantProperty(1);
        source.outerHalfAngle = new ConstantProperty(1);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);


        var target = new DynamicCone();
        target.merge(source);

        expect(target.capMaterial).toBe(source.capMaterial);
        expect(target.innerMaterial).toBe(source.innerMaterial);
        expect(target.silhouetteMaterial).toBe(source.silhouetteMaterial);
        expect(target.outerMaterial).toBe(source.outerMaterial);
        expect(target.innerHalfAngle).toBe(source.innerHalfAngle);
        expect(target.maximumClockAngle).toBe(source.maximumClockAngle);
        expect(target.minimumClockAngle).toBe(source.minimumClockAngle);
        expect(target.outerHalfAngle).toBe(source.outerHalfAngle);
        expect(target.intersectionColor).toBe(source.intersectionColor);
        expect(target.radius).toBe(source.radius);
        expect(target.show).toBe(source.show);
        expect(target.showIntersection).toBe(source.showIntersection);
        expect(target.intersectionWidth).toBe(source.intersectionWidth);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicCone();
        source.capMaterial = new ColorMaterialProperty();
        source.innerMaterial = new ColorMaterialProperty();
        source.silhouetteMaterial = new ColorMaterialProperty();
        source.outerMaterial = new ColorMaterialProperty();
        source.innerHalfAngle = new ConstantProperty(1);
        source.maximumClockAngle = new ConstantProperty(1);
        source.minimumClockAngle = new ConstantProperty(1);
        source.outerHalfAngle = new ConstantProperty(1);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var capMaterial = new ColorMaterialProperty();
        var innerMaterial = new ColorMaterialProperty();
        var silhouetteMaterial = new ColorMaterialProperty();
        var outerMaterial = new ColorMaterialProperty();
        var innerHalfAngle = new ConstantProperty(1);
        var maximumClockAngle = new ConstantProperty(1);
        var minimumClockAngle = new ConstantProperty(1);
        var outerHalfAngle = new ConstantProperty(1);
        var intersectionColor = new ConstantProperty(Color.WHITE);
        var radius = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var showIntersection = new ConstantProperty(true);
        var intersectionWidth = new ConstantProperty(1);

        var target = new DynamicCone();
        source.capMaterial = capMaterial;
        source.innerMaterial = innerMaterial;
        source.silhouetteMaterial = silhouetteMaterial;
        source.outerMaterial = outerMaterial;
        source.innerHalfAngle = innerHalfAngle;
        source.maximumClockAngle = maximumClockAngle;
        source.minimumClockAngle = minimumClockAngle;
        source.outerHalfAngle = outerHalfAngle;
        source.intersectionColor = intersectionColor;
        source.radius = radius;
        source.show = show;
        source.showIntersection = showIntersection;
        source.intersectionWidth = intersectionWidth;

        target.merge(source);

        expect(target.capMaterial).toBe(capMaterial);
        expect(target.innerMaterial).toBe(innerMaterial);
        expect(target.silhouetteMaterial).toBe(silhouetteMaterial);
        expect(target.outerMaterial).toBe(outerMaterial);
        expect(target.innerHalfAngle).toBe(innerHalfAngle);
        expect(target.maximumClockAngle).toBe(maximumClockAngle);
        expect(target.minimumClockAngle).toBe(minimumClockAngle);
        expect(target.outerHalfAngle).toBe(outerHalfAngle);
        expect(target.intersectionColor).toBe(intersectionColor);
        expect(target.radius).toBe(radius);
        expect(target.show).toBe(show);
        expect(target.showIntersection).toBe(showIntersection);
        expect(target.intersectionWidth).toBe(intersectionWidth);
    });

    it('clone works', function() {
        var source = new DynamicCone();
        source.capMaterial = new ColorMaterialProperty();
        source.innerMaterial = new ColorMaterialProperty();
        source.silhouetteMaterial = new ColorMaterialProperty();
        source.outerMaterial = new ColorMaterialProperty();
        source.innerHalfAngle = new ConstantProperty(1);
        source.maximumClockAngle = new ConstantProperty(1);
        source.minimumClockAngle = new ConstantProperty(1);
        source.outerHalfAngle = new ConstantProperty(1);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var result = source.clone();
        expect(result.capMaterial).toBe(source.capMaterial);
        expect(result.innerMaterial).toBe(source.innerMaterial);
        expect(result.silhouetteMaterial).toBe(source.silhouetteMaterial);
        expect(result.outerMaterial).toBe(source.outerMaterial);
        expect(result.innerHalfAngle).toBe(source.innerHalfAngle);
        expect(result.maximumClockAngle).toBe(source.maximumClockAngle);
        expect(result.minimumClockAngle).toBe(source.minimumClockAngle);
        expect(result.outerHalfAngle).toBe(source.outerHalfAngle);
        expect(result.intersectionColor).toBe(source.intersectionColor);
        expect(result.radius).toBe(source.radius);
        expect(result.show).toBe(source.show);
        expect(result.showIntersection).toBe(source.showIntersection);
        expect(result.intersectionWidth).toBe(source.intersectionWidth);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicCone();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});