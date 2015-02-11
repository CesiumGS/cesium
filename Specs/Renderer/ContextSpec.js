/*global defineSuite*/
defineSuite([
        'Renderer/Context',
        'Core/Color',
        'Core/IndexDatatype',
        'Renderer/BufferUsage',
        'Specs/createContext',
        'Specs/renderFragment'
    ], function(
        Context,
        Color,
        IndexDatatype,
        BufferUsage,
        createContext,
        renderFragment) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('has a unique ID', function() {
        var c = createContext();
        expect(c.id).toBeDefined();
        expect(c.id).not.toEqual(context.id);
        c.destroyForSpecs();
    });

    it('get canvas', function() {
        expect(context.canvas).not.toBeNull();
    });

    it('get version', function() {
        expect(context.version).toMatch('WebGL');
    });

    it('get shadingLanguageVersion', function() {
        expect(context.shadingLanguageVersion).toMatch('WebGL GLSL ES');
    });

    it('get vendor', function() {
        expect(context.vendor).not.toBeNull();
    });

    it('get renderer', function() {
        expect(context.renderer).not.toBeNull();
    });

    it('get redBits', function() {
        expect(context.redBits).toEqual(8);
    });

    it('get greenBits', function() {
        expect(context.greenBits).toEqual(8);
    });

    it('get blueBits', function() {
        expect(context.blueBits).toEqual(8);
    });

    it('get alphaBits', function() {
        expect(context.alphaBits).toEqual(8);
    });

    it('get depthBits', function() {
        expect(context.depthBits).toBeGreaterThanOrEqualTo(16);
    });

    it('get stencilBits', function() {
        expect(context.stencilBits).toBeGreaterThanOrEqualTo(0);
    });

    it('get maximumCombinedTextureImageUnits', function() {
        expect(context.maximumCombinedTextureImageUnits).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumCubeMapSize', function() {
        expect(context.maximumCubeMapSize).toBeGreaterThanOrEqualTo(16);
    });

    it('get maximumFragmentUniformVectors', function() {
        expect(context.maximumFragmentUniformVectors).toBeGreaterThanOrEqualTo(16);
    });

    it('get maximumTextureImageUnits', function() {
        expect(context.maximumTextureImageUnits).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumRenderbufferSize', function() {
        expect(context.maximumRenderbufferSize).toBeGreaterThanOrEqualTo(1);
    });

    it('get maximumTextureSize', function() {
        expect(context.maximumTextureSize).toBeGreaterThanOrEqualTo(64);
    });

    it('get maximumVaryingVectors', function() {
        expect(context.maximumVaryingVectors).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumVertexAttributes', function() {
        expect(context.maximumVertexAttributes).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumVertexTextureImageUnits', function() {
        expect(context.maximumVertexTextureImageUnits).toBeGreaterThanOrEqualTo(0);
    });

    it('get maximumVertexUniformVectors', function() {
        expect(context.maximumVertexUniformVectors).toBeGreaterThanOrEqualTo(1);
    });

    it('get minimumAliasedLineWidth', function() {
        expect(context.minimumAliasedLineWidth).toBeLessThanOrEqualTo(1);
    });

    it('get maximumAliasedLineWidth', function() {
        expect(context.maximumAliasedLineWidth).toBeGreaterThanOrEqualTo(1);
    });

    it('get minimumAliasedPointSize', function() {
        expect(context.minimumAliasedPointSize).toBeLessThanOrEqualTo(1);
    });

    it('get maximumAliasedPointSize', function() {
        expect(context.maximumAliasedPointSize).toBeGreaterThanOrEqualTo(1);
    });

    it('get maximumViewportWidth', function() {
        expect(context.maximumViewportWidth).toBeGreaterThan(0);
    });

    it('get maximumViewportHeight', function() {
        expect(context.maximumViewportHeight).toBeGreaterThan(0);
    });

    it('gets antialias', function() {
        var c = createContext({
            webgl : {
                antialias : false
            }
        });
        expect(c.antialias).toEqual(false);
        c.destroyForSpecs();
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

        if (context.standardDerivatives) {
            expect(pixel).toEqual([0, 0, 255, 255]);
        } else {
            expect(pixel).toEqual([255, 255, 255, 255]);
        }
    });

    it('gets the element index uint extension', function() {
        if (context.elementIndexUint) {
            var buffer = context.createIndexBuffer(6, BufferUsage.STREAM_DRAW, IndexDatatype.UNSIGNED_INT);
            expect(buffer).toBeDefined();
            buffer.destroy();
        } else {
            expect(function() {
                context.createIndexBuffer(6, BufferUsage.STREAM_DRAW, IndexDatatype.UNSIGNED_INT);
            }).toThrowDeveloperError();
        }
    });

    it('gets the depth texture extension', function() {
        expect(context.depthTexture).toBeDefined();
    });

    it('gets the texture float extension', function() {
        expect(context.floatingPointTexture).toBeDefined();
    });

    it('gets texture filter anisotropic extension', function() {
        expect(context.textureFilterAnisotropic).toBeDefined();
    });

    it('gets maximum texture filter anisotropy', function() {
        if(context.textureFilterAnisotropic) {
            expect(context.maximumTextureFilterAnisotropy >= 2).toEqual(true);
        } else {
            expect(context.maximumTextureFilterAnisotropy).toEqual(1);
        }
    });

    it('gets vertex array object extension', function() {
        expect(context.vertexArrayObject).toBeDefined();
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

        if (context.fragmentDepth) {
            expect(pixel).toEqual([0, 255, 0, 255]);
        } else {
            expect(pixel).toEqual([255, 0, 0, 255]);
        }
    });

    it('get the draw buffers extension', function() {
        expect(context.drawBuffers).toBeDefined();
    });

    it('get the maximum number of draw buffers', function() {
        if (context.drawBuffers) {
            expect(context.maximumDrawBuffers).toBeGreaterThanOrEqualTo(1);
        } else {
            expect(context.maximumDrawBuffers).toEqual(1);
        }
    });

    it('get the maximum number of color attachments', function() {
        if (context.drawBuffers) {
            expect(context.maximumColorAttachments).toBeGreaterThanOrEqualTo(4);
        } else {
            expect(context.maximumColorAttachments).toEqual(1);
        }
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
        }).toThrowDeveloperError();
    });

    it('returns undefined when retrieving an object by unknown pick color', function() {
        expect(context.getObjectByPickColor(Color.WHITE)).toBeUndefined();
    });

    it('throws when getObjectByPickColor is called without a color', function() {
        expect(function() {
            context.getObjectByPickColor(undefined);
        }).toThrowDeveloperError();
    });

    it('fails to construct (null canvas)', function() {
        expect(function() {
            return new Context();
        }).toThrowDeveloperError();
    });

    it('isDestroyed', function() {
        var c = createContext();
        expect(c.isDestroyed()).toEqual(false);
        c.destroyForSpecs();
        expect(c.isDestroyed()).toEqual(true);
    });

    it('destroying Context destroys objects in cache', function() {
        var c = createContext();
        var destroyableObject = jasmine.createSpyObj('destroyableObject', ['destroy']);
        c.cache.foo = destroyableObject;
        c.destroyForSpecs();
        expect(destroyableObject.destroy).toHaveBeenCalled();
    });

    it('non-destroyable objects are allowed in the cache', function() {
        var c = createContext();
        var nonDestroyableObject = {};
        c.cache.foo = nonDestroyableObject;
        c.destroyForSpecs();
    });

    it('returns the underling drawingBufferWidth', function() {
        var c = createContext(undefined, 1024, 768);
        expect(c.drawingBufferWidth).toBe(1024);
        c.destroyForSpecs();
    });

    it('returns the underling drawingBufferHeight', function() {
        var c = createContext(undefined, 1024, 768);
        expect(c.drawingBufferHeight).toBe(768);
        c.destroyForSpecs();
    });
}, 'WebGL');
