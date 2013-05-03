/*global defineSuite*/
defineSuite([
         'Renderer/TextureAtlasBuilder',
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/PrimitiveType',
         'Core/Cartesian2',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/PixelFormat'
     ], function(
         TextureAtlasBuilder,
         createContext,
         destroyContext,
         PrimitiveType,
         Cartesian2,
         BufferUsage,
         ClearCommand,
         PixelFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var atlas;
    var greenImage;
    var tallGreenImage;
    var blueImage;
    var bigRedImage;
    var bigBlueImage;
    var bigGreenImage;
    var whiteImage;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        atlas = atlas && atlas.destroy();
    });

    it('initialize suite', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        tallGreenImage = new Image();
        tallGreenImage.src = './Data/Images/Green1x4.png';

        blueImage = new Image();
        blueImage.src = './Data/Images/Blue.png';

        bigRedImage = new Image();
        bigRedImage.src = './Data/Images/Red16x16.png';

        bigBlueImage = new Image();
        bigBlueImage.src = './Data/Images/Blue10x10.png';

        bigGreenImage = new Image();
        bigGreenImage.src = './Data/Images/Green4x4.png';

        whiteImage = new Image();
        whiteImage.src = './Data/Images/White.png';

        waitsFor(function() {
            return greenImage.complete && tallGreenImage.complete && blueImage.complete && bigRedImage.complete && bigBlueImage.complete && bigGreenImage.complete;
        }, 'Load .png file(s) for texture atlas test.', 3000);
    });

    var draw = function(texture, textureCoordinate, expectedColorArray) {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform sampler2D u_texture;' +
            'void main() { ' +
            '  gl_FragColor = texture2D(u_texture, vec2(' +
                textureCoordinate.x.toString() + ', ' + textureCoordinate.y.toString() +
            '  )); ' +
            '}';
        var sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.getAllUniforms().u_texture.value = texture;

        var va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        sp = sp.destroy();
        va = va.destroy();

        return context.readPixels();
    };

    it('creates a two image atlas using addTextureFromUrl, and addTextureFromFunction', function() {
        atlas = context.createTextureAtlas(undefined, PixelFormat.RGBA, 0);
        var atlasBuilder = new TextureAtlasBuilder(atlas);

        var greenIndex = -1;
        var blueIndex = -1;

        atlasBuilder.addTextureFromUrl('./Data/Images/Green.png', function(index) {
            greenIndex = index;
        });
        atlasBuilder.addTextureFromUrl('./Data/Images/Green.png', function(index) {
            greenIndex = index;
        });
        atlasBuilder.addTextureFromFunction('./Data/Images/Blue.png', function(id, loadedCallback) {
            loadedCallback(blueImage);
        }, function(index) {
            blueIndex = index;
        });

        waitsFor(function() {
            if (greenIndex !== -1 && blueIndex !== -1) {
                var callbackCalled = false;
                atlasBuilder.addTextureFromUrl('./Data/Images/Green.png', function(index) {
                    expect(index).toEqual(greenIndex);
                    callbackCalled = true;
                });
                expect(callbackCalled).toEqual(true);

                var coordinates = atlas.getTextureCoordinates();
                expect(coordinates.length).toEqual(2);
                return true;
            }
            return false;
        }, 'Waits for addTexture and addTextureUrl to complete and verifies the test.', 3000);
    });

    it('throws constructing without a TextureAtlas', function() {
        expect(function() {
            return new TextureAtlasBuilder();
        }).toThrow();
    });

    it('addTextureFromUrl throws without url', function() {
        atlas = context.createTextureAtlas(undefined, PixelFormat.RGBA, 0);
        var atlasBuilder = new TextureAtlasBuilder(atlas);

        expect(function() {
            atlasBuilder.addTextureFromUrl(undefined, function(index) {
            });
        }).toThrow();
    });

    it('addTextureFromUrl throws without callback', function() {
        atlas = context.createTextureAtlas(undefined, PixelFormat.RGBA, 0);
        var atlasBuilder = new TextureAtlasBuilder(atlas);

        expect(function() {
            atlasBuilder.addTextureFromUrl('./Data/Images/Green.png', undefined);
        }).toThrow();
    });

    it('addTextureFromFunction throws without url', function() {
        atlas = context.createTextureAtlas(undefined, PixelFormat.RGBA, 0);
        var atlasBuilder = new TextureAtlasBuilder(atlas);

        expect(function() {
            atlasBuilder.addTextureFromFunction(undefined, function(loadedCallback) {
            }, function(index) {
            });
        }).toThrow();
    });

    it('addTextureFromFunction throws without create callback', function() {
        atlas = context.createTextureAtlas(undefined, PixelFormat.RGBA, 0);
        var atlasBuilder = new TextureAtlasBuilder(atlas);

        expect(function() {
            atlasBuilder.addTextureFromFunction('./Data/Images/Blue.png', undefined, function(index) {
            });
        }).toThrow();
    });

    it('addTextureFromFunction throws without ready callback', function() {
        atlas = context.createTextureAtlas(undefined, PixelFormat.RGBA, 0);
        var atlasBuilder = new TextureAtlasBuilder(atlas);

        expect(function() {
            atlasBuilder.addTextureFromFunction('./Data/Images/Blue.png', function(loadedCallback) {
            }, undefined);
        }).toThrow();
    });
}, 'WebGL');