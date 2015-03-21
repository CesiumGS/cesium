/*global defineSuite*/
defineSuite([
        'Renderer/ShaderCache',
        'Specs/createContext'
    ], function(
        ShaderCache,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('adds and removes', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram(vs, fs, {
            position : 0
        });
        expect(sp._cachedShader.count).toEqual(1);

        cache.releaseShaderProgram(sp);
        expect(sp.isDestroyed()).toEqual(false);

        cache.destroyReleasedShaderPrograms();
        expect(sp.isDestroyed()).toEqual(true);

        cache.destroy();
    });

    it('adds and removes 2', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram(vs, fs, {
            position : 0
        });
        expect(sp._cachedShader.count).toEqual(1);

        sp.destroy();
        expect(sp.isDestroyed()).toEqual(false);

        cache.destroyReleasedShaderPrograms();
        expect(sp.isDestroyed()).toEqual(true);

        cache.destroy();
    });

    it('has a cache hit', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram(vs, fs, {
            position : 0
        });
        var sp2 = cache.getShaderProgram(vs, fs, {
            position : 0
        });

        expect(sp).toBe(sp2);
        expect(sp._cachedShader.count).toEqual(2);

        sp.destroy();
        sp2.destroy();
        cache.destroyReleasedShaderPrograms();

        expect(sp.isDestroyed()).toEqual(true);

        cache.destroy();
    });

    it('replaces a shader program', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        var fs2 = 'void main() { gl_FragColor = vec4(0.5); }';
        var attributeLocations = {
            position : 0
        };

        var cache = new ShaderCache(context);
        var sp;

        sp = cache.replaceShaderProgram(sp, vs, fs, attributeLocations);
        var sp2 = cache.replaceShaderProgram(sp, vs, fs2, attributeLocations);

        expect(sp._cachedShader.count).toEqual(0);
        expect(sp2._cachedShader.count).toEqual(1);

        cache.destroy();
    });

    it('avoids thrashing', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram(vs, fs, {
            position : 0
        });
        sp.destroy();
        var sp2 = cache.getShaderProgram(vs, fs, {
            position : 0
        }); // still cache hit

        cache.destroyReleasedShaderPrograms(); // does not destroy
        expect(sp.isDestroyed()).toEqual(false);
        expect(sp2.isDestroyed()).toEqual(false);

        sp2.destroy();
        cache.destroyReleasedShaderPrograms(); // destroys

        expect(sp.isDestroyed()).toEqual(true);
        expect(sp2.isDestroyed()).toEqual(true);

        cache.destroy();
    });

    it('is destroyed', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram(vs, fs, {
            position : 0
        });

        cache.destroy();

        expect(sp.isDestroyed()).toEqual(true);
        expect(cache.isDestroyed()).toEqual(true);
    });

    it('is not destroyed', function() {
        var cache = new ShaderCache(context);
        expect(cache.isDestroyed()).toEqual(false);
    });
}, 'WebGL');