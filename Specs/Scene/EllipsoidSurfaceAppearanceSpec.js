/*global defineSuite*/
defineSuite([
         'Scene/EllipsoidSurfaceAppearance',
         'Scene/Appearance',
         'Scene/Material'
     ], function(
         EllipsoidSurfaceAppearance,
         Appearance,
         Material) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor', function() {
        var a = new EllipsoidSurfaceAppearance();

        expect(a.material).toBeDefined();
        expect(a.material.type).toEqual(Material.ColorType);
        expect(a.vertexShaderSource).toBeDefined();
        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(true, true));
        expect(a.vertexFormat).toEqual(EllipsoidSurfaceAppearance.VERTEX_FORMAT);
        expect(a.flat).toEqual(false);
        expect(a.faceForward).toEqual(false);
        expect(a.translucent).toEqual(true);
        expect(a.aboveGround).toEqual(false);
    });

});
