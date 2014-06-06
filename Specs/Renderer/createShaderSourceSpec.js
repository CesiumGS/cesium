/*global defineSuite*/
defineSuite([
        'Renderer/createShaderSource'
    ], function(
        createShaderSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('combines #defines', function() {
        var source = createShaderSource({ defines : ['A', 'B', '' ] });
        expect(source).toContain('#define A');
        expect(source).toContain('#define B');
        expect(source.match(/#define/g).length).toEqual(2);
    });

    it('combines sources', function() {
        var source = createShaderSource({ sources : ['void func() {}', 'void main() {}'] });
        expect(source).toContain('void func() {}');
        expect(source).toContain('void main() {}');
        expect(source.match(/#line/g).length).toEqual(2);
    });

    it('combines #defines and sources', function() {
        var source = createShaderSource({
            defines : ['A', 'B', '' ],
            sources : ['void func() {}', 'void main() {}']
        });
        expect(source).toContain('#define A');
        expect(source).toContain('#define B');
        expect(source.match(/#define/g).length).toEqual(2);
        expect(source).toContain('void func() {}');
        expect(source).toContain('void main() {}');
        expect(source.match(/#line/g).length).toEqual(2);
    });

    it('creates a pick shader with a uniform', function() {
        var source = createShaderSource({
            sources : ['void main() { gl_FragColor = vec4(1.0); }'],
            pickColorQualifier : 'uniform'
        });
        expect(source).toContain('uniform vec4 czm_pickColor;');
        expect(source).toContain('gl_FragColor = czm_pickColor;');
    });

    it('creates a pick shader with a varying', function() {
        var source = createShaderSource({
            sources : ['void main() { gl_FragColor = vec4(1.0); }'],
            pickColorQualifier : 'varying'
        });
        expect(source).toContain('varying vec4 czm_pickColor;');
        expect(source).toContain('gl_FragColor = czm_pickColor;');
    });

    it('throws with invalid qualifier', function() {
        expect(function() {
            createShaderSource({ pickColorQualifier : 'const' });
        }).toThrowDeveloperError();
    });
});