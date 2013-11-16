/*global defineSuite*/
defineSuite([
         'Renderer/Context',
         'Core/Color',
         'Core/IndexDatatype',
         'Renderer/BufferUsage',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/renderFragment'
     ], function(
         Context,
         Color,
         IndexDatatype,
         BufferUsage,
         createContext,
         destroyContext,
         renderFragment) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('has a unique ID', function() {
        var c = createContext();
        expect(c.getId()).toBeDefined();
        expect(c.getId()).not.toEqual(context.getId());
        destroyContext(c);
    });

    it('getCanvas', function() {
        expect(context.getCanvas()).not.toBeNull();
    });

    it('getVersion', function() {
        expect(context.getVersion()).toMatch('WebGL');
    });

    it('getShadingLanguageVersion', function() {
        expect(context.getShadingLanguageVersion()).toMatch('WebGL GLSL ES');
    });

    it('getVendor', function() {
        expect(context.getVendor()).not.toBeNull();
    });

    it('getRenderer', function() {
        expect(context.getRenderer()).not.toBeNull();
    });

    it('getRedBits', function() {
        expect(context.getRedBits()).toEqual(8);
    });

    it('getGreenBits', function() {
        expect(context.getGreenBits()).toEqual(8);
    });

    it('getBlueBits', function() {
        expect(context.getBlueBits()).toEqual(8);
    });

    it('getAlphaBits', function() {
        expect(context.getAlphaBits()).toEqual(8);
    });

    it('getDepthBits', function() {
        expect(context.getDepthBits()).toBeGreaterThanOrEqualTo(16);
    });

    it('getStencilBits', function() {
        expect(context.getStencilBits()).toBeGreaterThanOrEqualTo(0);
    });

    it('getMaximumCombinedTextureImageUnits', function() {
        expect(context.getMaximumCombinedTextureImageUnits()).toBeGreaterThanOrEqualTo(8);
    });

    it('getMaximumCubeMapSize', function() {
        expect(context.getMaximumCubeMapSize()).toBeGreaterThanOrEqualTo(16);
    });

    it('getMaximumFragmentUniformVectors', function() {
        expect(context.getMaximumFragmentUniformVectors()).toBeGreaterThanOrEqualTo(16);
    });

    it('getMaximumTextureImageUnits', function() {
        expect(context.getMaximumTextureImageUnits()).toBeGreaterThanOrEqualTo(8);
    });

    it('getMaximumRenderbufferSize', function() {
        expect(context.getMaximumRenderbufferSize()).toBeGreaterThanOrEqualTo(1);
    });

    it('getMaximumTextureSize', function() {
        expect(context.getMaximumTextureSize()).toBeGreaterThanOrEqualTo(64);
    });

    it('getMaximumVaryingVectors', function() {
        expect(context.getMaximumVaryingVectors()).toBeGreaterThanOrEqualTo(8);
    });

    it('getMaximumVertexAttributes', function() {
        expect(context.getMaximumVertexAttributes()).toBeGreaterThanOrEqualTo(8);
    });

    it('getMaximumVertexTextureImageUnits', function() {
        expect(context.getMaximumVertexTextureImageUnits()).toBeGreaterThanOrEqualTo(0);
    });

    it('getMaximumVertexUniformVectors', function() {
        expect(context.getMaximumVertexUniformVectors()).toBeGreaterThanOrEqualTo(1);
    });

    it('getMinimumAliasedLineWidth', function() {
        expect(context.getMinimumAliasedLineWidth()).toBeLessThanOrEqualTo(1);
    });

    it('getMaximumAliasedLineWidth', function() {
        expect(context.getMaximumAliasedLineWidth()).toBeGreaterThanOrEqualTo(1);
    });

    it('getMinimumAliasedPointSize', function() {
        expect(context.getMinimumAliasedPointSize()).toBeLessThanOrEqualTo(1);
    });

    it('getMaximumAliasedPointSize', function() {
        expect(context.getMaximumAliasedPointSize()).toBeGreaterThanOrEqualTo(1);
    });

    it('getMaximumViewportWidth', function() {
        expect(context.getMaximumViewportWidth()).toBeGreaterThan(0);
    });

    it('getMaximumViewportHeight', function() {
        expect(context.getMaximumViewportHeight()).toBeGreaterThan(0);
    });

    it('gets antialias', function() {
        var c = createContext({
            antialias : false
        });
        expect(c.getAntialias()).toEqual(false);
        destroyContext(c);
    });

    it('gets the standard derivatives extension', function() {
        var fs =
            '#ifdef GL_OES_standard_derivatives\n' +
            '  #extension GL_OES_standard_derivatives : enable\n' +
            '#endif\n' +
            'void main()\n' +
            '{\n' +
            '#ifdef GL_OES_standard_derivatives\n' +
            '  gl_FragColor = vec4(dFdx(1.0), dFdy(1.0), 1.0, 1.0);\n' +
            '#else\n' +
            '  gl_FragColor = vec4(1.0);\n' +
            '#endif\n' +
            '}';

        var pixel = renderFragment(context, fs);

        if (context.getStandardDerivatives()) {
            expect(pixel).toEqual([0, 0, 255, 255]);
        } else {
            expect(pixel).toEqual([255, 255, 255, 255]);
        }
    });

    it('gets the element index uint extension', function() {
        if (context.getElementIndexUint()) {
            var buffer = context.createIndexBuffer(6, BufferUsage.STREAM_DRAW, IndexDatatype.UNSIGNED_INT);
            expect(buffer).toBeDefined();
            buffer.destroy();
        } else {
            expect(function() {
                context.createIndexBuffer(6, BufferUsage.STREAM_DRAW, IndexDatatype.UNSIGNED_INT);
            }).toThrow();
        }
    });

    it('gets the depth texture extension', function() {
        expect(context.getDepthTexture()).toBeDefined();
    });

    it('gets the texture float extension', function() {
        expect(context.getFloatingPointTexture()).toBeDefined();
    });

    it('gets texture filter anisotropic extension', function() {
        expect(context.getTextureFilterAnisotropic()).toBeDefined();
    });

    it('gets maximum texture filter anisotropy', function() {
        if(context.getTextureFilterAnisotropic()) {
            expect(context.getMaximumTextureFilterAnisotropy() >= 2.0).toEqual(true);
        } else {
            expect(context.getMaximumTextureFilterAnisotropy()).toEqual(1.0);
        }
    });

    it('gets vertex array object extension', function() {
        expect(context.getVertexArrayObject()).toBeDefined();
    });

    it('get the fragment depth extension', function() {
        var fs =
            'void main()\n' +
            '{\n' +
            '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
            '}';

        var pixel = renderFragment(context, fs, 0.5, true);
        expect(pixel).toEqual([255, 0, 0, 255]);

        var fsDragDepth =
            '#ifdef GL_EXT_frag_depth\n' +
            '  #extension GL_EXT_frag_depth : enable\n' +
            '#endif\n' +
            'void main()\n' +
            '{\n' +
            '  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);\n' +
            '#ifdef GL_EXT_frag_depth\n' +
            '  gl_FragDepthEXT = 0.0;\n' +
            '#endif\n' +
            '}';

        pixel = renderFragment(context, fsDragDepth, 1.0, false);

        if (context.getFragmentDepth()) {
            expect(pixel).toEqual([0, 255, 0, 255]);
        } else {
            expect(pixel).toEqual([255, 0, 0, 255]);
        }
    });

    it('sets shader program validation', function() {
        context.setValidateShaderProgram(false);
        expect(context.getValidateShaderProgram()).toEqual(false);

        context.setValidateShaderProgram(true);
        expect(context.getValidateShaderProgram()).toEqual(true);
    });

    it('sets framebuffer validation', function() {
        context.setValidateFramebuffer(false);
        expect(context.getValidateFramebuffer()).toEqual(false);

        context.setValidateFramebuffer(true);
        expect(context.getValidateFramebuffer()).toEqual(true);
    });

    it('sets logging shader compilation', function() {
        context.setLogShaderCompilation(false);
        expect(context.getLogShaderCompilation()).toEqual(false);

        context.setLogShaderCompilation(true);
        expect(context.getLogShaderCompilation()).toEqual(true);
    });

    it('sets throws on WebGL errors', function() {
        context.setThrowOnWebGLError(false);
        expect(context.getThrowOnWebGLError()).toEqual(false);

        context.setThrowOnWebGLError(true);
        expect(context.getThrowOnWebGLError()).toEqual(true);
    });

    it('can create a pick ID and retrieve an object by pick color', function() {
        var o = {};
        var pickId = context.createPickId(o);

        expect(pickId).toBeDefined();
        expect(context.getObjectByPickColor(pickId.color)).toBe(o);
    });

    it('throws when creating a pick ID without an object', function() {
        expect(function() {
            context.createPickId(undefined);
        }).toThrow();
    });

    it('returns undefined when retrieving an object by unknown pick color', function() {
        expect(context.getObjectByPickColor(Color.WHITE)).toBeUndefined();
    });

    it('throws when getObjectByPickColor is called without a color', function() {
        expect(function() {
            context.getObjectByPickColor(undefined);
        }).toThrow();
    });

    it('fails to construct (null canvas)', function() {
        expect(function() {
            return new Context();
        }).toThrow();
    });

    it('isDestroyed', function() {
        var c = createContext();
        expect(c.isDestroyed()).toEqual(false);
        destroyContext(c);
        expect(c.isDestroyed()).toEqual(true);
    });

    it('destroying Context destroys objects in cache', function() {
        var c = createContext();
        var destroyableObject = jasmine.createSpyObj('destroyableObject', ['destroy']);
        c.cache.foo = destroyableObject;
        destroyContext(c);
        expect(destroyableObject.destroy).toHaveBeenCalled();
    });

    it('non-destroyable objects are allowed in the cache', function() {
        var c = createContext();
        var nonDestroyableObject = {};
        c.cache.foo = nonDestroyableObject;
        destroyContext(c);
    });

    it('returns the underling drawingBufferWidth', function() {
        var c = createContext(undefined, 1024, 768);
        expect(c.getDrawingBufferWidth()).toBe(1024);
        destroyContext(c);
    });

    it('returns the underling drawingBufferHeight', function() {
        var c = createContext(undefined, 1024, 768);
        expect(c.getDrawingBufferHeight()).toBe(768);
        destroyContext(c);
    });
}, 'WebGL');
