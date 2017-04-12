/*global defineSuite*/
defineSuite([
        'Renderer/ShaderCache',
        'Specs/createContext'
    ], function(
        ShaderCache,
        createContext) {
    'use strict';

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

        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });

        expect(sp._cachedShader.count).toEqual(1);
        expect(cache.numberOfShaders).toEqual(1);

        cache.releaseShaderProgram(sp);
        expect(sp.isDestroyed()).toEqual(false);
        expect(cache.numberOfShaders).toEqual(1);

        cache.destroyReleasedShaderPrograms();
        expect(sp.isDestroyed()).toEqual(true);
        expect(cache.numberOfShaders).toEqual(0);

        cache.destroy();
    });

    it('adds and removes 2', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
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
        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });
        var sp2 = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });

        expect(sp).toBe(sp2);
        expect(sp._cachedShader.count).toEqual(2);
        expect(cache.numberOfShaders).toEqual(1);

        sp.destroy();
        sp2.destroy();
        cache.destroyReleasedShaderPrograms();

        expect(sp.isDestroyed()).toEqual(true);
        expect(cache.numberOfShaders).toEqual(0);

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
        var sp = cache.replaceShaderProgram({
            shaderProgram : sp,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : attributeLocations
        });

        var sp2 = cache.replaceShaderProgram({
            shaderProgram : sp,
            vertexShaderSource : vs,
            fragmentShaderSource : fs2,
            attributeLocations : attributeLocations
        });

        expect(sp._cachedShader.count).toEqual(0);
        expect(sp2._cachedShader.count).toEqual(1);

        cache.destroy();
    });

    it('avoids thrashing', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });
        sp.destroy();
        var sp2 = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
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

    it('create derived shader program', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });

        var keyword = 'derived';
        var spDerived = cache.getDerivedShaderProgram(sp, keyword);
        expect(spDerived).not.toBeDefined();

        var fsDerived = 'void main() { gl_FragColor = vec4(vec3(1.0), 0.5); }';
        spDerived = cache.createDerivedShaderProgram(sp, keyword, {
            vertexShaderSource : vs,
            fragmentShaderSource : fsDerived,
            attributeLocations : {
                position : 0
            }
        });
        expect(spDerived).toBeDefined();

        cache.destroy();
    });

    it('destroying a shader program destroys its derived shaders', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
        });

        var keyword = 'derived';
        var fsDerived = 'void main() { gl_FragColor = vec4(vec3(1.0), 0.5); }';
        var spDerived = cache.createDerivedShaderProgram(sp, keyword, {
            vertexShaderSource : vs,
            fragmentShaderSource : fsDerived,
            attributeLocations : {
                position : 0
            }
        });
        expect(spDerived).toBeDefined();

        sp.destroy();
        cache.destroyReleasedShaderPrograms();

        expect(sp.isDestroyed()).toEqual(true);
        expect(spDerived.isDestroyed()).toEqual(true);

        cache.destroy();
    });

    it('is destroyed', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var cache = new ShaderCache(context);
        var sp = cache.getShaderProgram({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : {
                position : 0
            }
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
