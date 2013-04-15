/*global defineSuite*/
defineSuite([
         'Renderer/createPickFragmentShaderSource'
     ], function(
         createPickFragmentShaderSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('modifies a fragment shader', function() {
        var pickFS = createPickFragmentShaderSource('void main() { gl_FragColor = vec4(1.0); }', 'uniform');
        expect(pickFS).toContain('uniform vec4 czm_pickColor;');
        expect(pickFS).toContain('gl_FragColor = czm_pickColor;');
    });

    it('modifies a fragment shader with a varying', function() {
        var pickFS = createPickFragmentShaderSource('void main() { gl_FragColor = vec4(1.0); }', 'varying');
        expect(pickFS).toContain('varying vec4 czm_pickColor;');
        expect(pickFS).toContain('gl_FragColor = czm_pickColor;');
    });

    it('throws without fragmentShaderSource', function() {
        expect(function() {
            createPickFragmentShaderSource();
        }).toThrow();
    });

    it('throws with invalid qualifier', function() {
        expect(function() {
            createPickFragmentShaderSource('void main() { gl_FragColor = vec4(1.0); }', 'const');
        }).toThrow();
    });
});