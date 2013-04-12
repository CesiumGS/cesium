/*global defineSuite*/
defineSuite([
         'Renderer/createPickFragmentShaderSource',
     ], function(
         createPickFragmentShaderSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('modifies a fragment shader', function() {
        var pickFS = createPickFragmentShaderSource('void main() { gl_FragColor = vec4(1.0); }');
        expect(pickFS).toContain('gl_FragColor = u_czm_pickColor;');
    });

    it('throws without fragmentShaderSource', function() {
        expect(function() {
            createPickFragmentShaderSource();
        }).toThrow();
    });
});