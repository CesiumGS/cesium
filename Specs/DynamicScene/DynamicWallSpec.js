/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicWall',
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicVertexPositionsProperty',
             'Core/Color',
             'Core/WallGeometry'
         ], function(
             DynamicWall,
             ColorMaterialProperty,
             ConstantProperty,
             DynamicVertexPositionsProperty,
             Color,
             WallGeometry) {
    "use strict";

    it('merge assigns unassigned properties', function() {
        var source = new DynamicWall();
        source.geometry = new WallGeometry({positions: []});
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var target = new DynamicWall();
        target.merge(source);

        expect(target.geometry).toBe(source.geometry);
        expect(target.material).toBe(source.material);
        expect(target.show).toBe(source.show);
    });

    it('clone works', function() {
        var source = new DynamicWall();
        source.geometry = new WallGeometry({positions: []});
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var result = source.clone();
        expect(result.geometry).toBe(source.geometry);
        expect(result.material).toBe(source.material);
        expect(result.show).toBe(source.show);
    });

});