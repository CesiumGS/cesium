/*global defineSuite*/
defineSuite([
         'Renderer/TextureAtlas',
         '../Specs/createContext',
         '../Specs/destroyContext',
         'Core/PrimitiveType',
         'Renderer/BufferUsage',
         'Renderer/PixelFormat'
     ], function(
         TextureAtlas,
         createContext,
         destroyContext,
         PrimitiveType,
         BufferUsage,
         PixelFormat) {
    "use strict";
    /*global it,expect,beforeEach,afterEach,waitsFor*/

    var context;
    var atlas;
    var greenImage;
    var tallGreenImage;
    var blueImage;

    beforeEach(function() {
        context = createContext();
    });

    afterEach(function() {
        atlas = atlas && atlas.destroy();
        destroyContext(context);
    });

    it('initialize suite', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        tallGreenImage = new Image();
        tallGreenImage.src = './Data/Images/Green1x4.png';

        blueImage = new Image();
        blueImage.src = './Data/Images/Blue.png';

        waitsFor(function() {
            return greenImage.complete && tallGreenImage.complete && blueImage.complete;
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

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        sp = sp.destroy();
        va = va.destroy();

        return context.readPixels();
    };

    it('creates a single image atlas', function() {
        atlas = context.createTextureAtlas([greenImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(atlas.getBorderWidthInPixels()).toEqual(0);

        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(texture.getWidth()).toEqual(greenImage.width);
        expect(texture.getHeight()).toEqual(greenImage.height);

        expect(coordinates.length).toEqual(1);
        expect(coordinates[0].x0).toEqual(0);
        expect(coordinates[0].y0).toEqual(0);
        expect(coordinates[0].x1).toEqual(1);
        expect(coordinates[0].y1).toEqual(1);
    });

    it('renders a single image atlas', function() {
        atlas = context.createTextureAtlas([greenImage], PixelFormat.RGBA, 0);

        expect(draw.apply(this, [atlas.getTexture(), {
            x : 0.5,
            y : 0.5
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates a two image atlas', function() {
        atlas = context.createTextureAtlas([greenImage, blueImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(texture.getWidth()).toEqual(1);
        expect(texture.getHeight()).toEqual(2);

        expect(coordinates.length).toEqual(2);
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.0);
        expect(coordinates[0].x1).toEqual(1.0);
        expect(coordinates[0].y1).toEqual(0.5);

        expect(coordinates[1].x0).toEqual(0.0);
        expect(coordinates[1].y0).toEqual(0.5);
        expect(coordinates[1].x1).toEqual(1.0);
        expect(coordinates[1].y1).toEqual(1.0);
    });

    it('renders a two image atlas', function() {
        atlas = context.createTextureAtlas([greenImage, blueImage], PixelFormat.RGBA, 0);

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];
        var blueCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : (greenCoords.x0 + greenCoords.x1 / 2.0),
            y : (greenCoords.y0 + greenCoords.y1 / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (blueCoords.x0 + blueCoords.x1 / 2.0),
            y : (blueCoords.y0 + blueCoords.y1 / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);
    });

    it('renders a four image atlas', function() {
        atlas = context.createTextureAtlas([greenImage, blueImage, blueImage, greenImage], PixelFormat.RGBA, 0);
        expect(atlas.getTextureCoordinates().length).toEqual(4);

        var texture = atlas.getTexture();
        var c0 = atlas.getTextureCoordinates()[0];
        var c1 = atlas.getTextureCoordinates()[1];
        var c2 = atlas.getTextureCoordinates()[2];
        var c3 = atlas.getTextureCoordinates()[3];

        expect(draw.apply(this, [texture, {
            x : (c0.x0 + c0.x1 / 2.0),
            y : (c0.y0 + c0.y1 / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (c1.x0 + c1.x1 / 2.0),
            y : (c1.y0 + c1.y1 / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (c2.x0 + c2.x1 / 2.0),
            y : (c2.y0 + c2.y1 / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (c3.x0 + c3.x1 / 2.0),
            y : (c3.y0 + c3.y1 / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates an atlas with different image heights', function() {
        atlas = context.createTextureAtlas([blueImage, tallGreenImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(texture.getWidth()).toEqual(tallGreenImage.width + blueImage.width);
        expect(texture.getHeight()).toEqual(tallGreenImage.height);

        expect(coordinates.length).toEqual(2);
        expect(coordinates[1].x0).toBeLessThan(coordinates[0].x0); // Sorted left to right by height
        expect(coordinates[1].y0).toEqual(coordinates[1].y0);
    });

    it('renders an atlas with different image heights', function() {
        atlas = context.createTextureAtlas([blueImage, tallGreenImage], PixelFormat.RGBA, 0);

        var texture = atlas.getTexture();
        var blueCoords = atlas.getTextureCoordinates()[0];
        var greenCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : (blueCoords.x0 + blueCoords.x1) * 0.5,
            y : (blueCoords.y0 + blueCoords.y1) * 0.5
        }])).toEqualArray([0, 0, 255, 255]);

        var pixels = draw.apply(this, [texture, {
            x : (greenCoords.x0 + greenCoords.x1) * 0.5,
            y : (greenCoords.y0 + greenCoords.y1) * 0.5
        }]);
        expect((pixels[0] === 0) || (pixels[0] === 1)).toEqual(true); // Workaround:  Firefox on Windows
        expect(pixels[1]).toEqual(255);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('throws without images', function() {
        expect(function() {
            atlas = context.createTextureAtlas();
        }).toThrow();
    });

    it('throws with a negative borderWidthInPixels', function() {
        expect(function() {
            atlas = context.createTextureAtlas([greenImage, blueImage], PixelFormat.RGBA, -1);
        }).toThrow();
    });

    it('throws without context', function() {
        expect(function() {
            return new TextureAtlas();
        }).toThrow();
    });
});
