/*global defineSuite*/
defineSuite([
        'Renderer/TextureCoordinateRegion2D',
        'Core/Cartesian2'
    ], function(
        TextureCoordinateRegion2D,
        Cartesian2) {
    "use strict";
    /*global it,expect*/

    it('constructs with default values', function() {
        var v = new TextureCoordinateRegion2D();
        expect(v.bottomLeft.x).toEqual(0.0);
        expect(v.bottomLeft.y).toEqual(0.0);
        expect(v.topRight.x).toEqual(1.0);
        expect(v.topRight.y).toEqual(1.0);
    });

    it('constructs with input', function() {
        var v = new TextureCoordinateRegion2D(new Cartesian2(0.4, 0.5), new Cartesian2(0.6, 0.7));
        expect(v.bottomLeft.x).toEqual(0.4);
        expect(v.bottomLeft.y).toEqual(0.5);
        expect(v.topRight.x).toEqual(0.6);
        expect(v.topRight.y).toEqual(0.7);
    });

    it('toString', function() {
        var v = new TextureCoordinateRegion2D(new Cartesian2(0.4, 0.5), new Cartesian2(0.6, 0.7));
        expect(v.toString()).toEqual('((0.4, 0.5), (0.6, 0.7))');
    });

    it('throws with out-of-range input', function() {
        expect(function() {
            return new TextureCoordinateRegion2D(new Cartesian2(-0.1, -0.1), new Cartesian2(1.0, 1.0));
        }).toThrow();
    });

    it('throws with bottomLeft greater than topRight', function() {
        expect(function() {
            return new TextureCoordinateRegion2D(new Cartesian2(0.2, 0.2), new Cartesian2(0.1, 1.0));
        }).toThrow();
    });
});
