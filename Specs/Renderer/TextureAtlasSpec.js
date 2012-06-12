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
        var atlasSize = 2.0 * greenImage.width;

        expect(atlas.getBorderWidthInPixels()).toEqual(0);

        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(1.0);
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.5);
        expect(coordinates[0].x1).toEqual(0.5);
        expect(coordinates[0].y1).toEqual(1.0);
    });

    it('renders a single image atlas', function() {
        atlas = context.createTextureAtlas([greenImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : ((coordinates.x0 + coordinates.x1) / 2.0),
            y : ((coordinates.y0 + coordinates.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates a two image atlas', function() {
        atlas = context.createTextureAtlas([greenImage, blueImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * (greenImage.width + blueImage.width);

        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(2);
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.75);
        expect(coordinates[0].x1).toEqual(0.25);
        expect(coordinates[0].y1).toEqual(1.0);

        expect(coordinates[1].x0).toEqual(0.25);
        expect(coordinates[1].y0).toEqual(0.75);
        expect(coordinates[1].x1).toEqual(0.5);
        expect(coordinates[1].y1).toEqual(1.0);
    });

    it('renders a two image atlas', function() {
        atlas = context.createTextureAtlas([greenImage, blueImage], PixelFormat.RGBA, 0);

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];
        var blueCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((greenCoords.x0 + greenCoords.x1) / 2.0),
            y : ((greenCoords.y0 + greenCoords.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((blueCoords.x0 + blueCoords.x1) / 2.0),
            y : ((blueCoords.y0 + blueCoords.y1) / 2.0)
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
            x : ((c0.x0 + c0.x1) / 2.0),
            y : ((c0.y0 + c0.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((c1.x0 + c1.x1) / 2.0),
            y : ((c1.y0 + c1.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((c2.x0 + c2.x1) / 2.0),
            y : ((c2.y0 + c2.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((c3.x0 + c3.x1) / 2.0),
            y : ((c3.y0 + c3.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates an atlas with different image heights', function() {
        atlas = context.createTextureAtlas([blueImage, tallGreenImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * Math.max(tallGreenImage.width + blueImage.width,
                                       tallGreenImage.height + blueImage.height);

        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(2);
        expect(coordinates[0].x0).toEqual(coordinates[1].x0);
        expect(coordinates[1].y0).toBeLessThan(coordinates[0].y0);
    });

    it('renders an atlas with different image heights', function() {
        atlas = context.createTextureAtlas([blueImage, tallGreenImage], PixelFormat.RGBA, 0);

        var texture = atlas.getTexture();
        var blueCoords = atlas.getTextureCoordinates()[0];
        var greenCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((blueCoords.x0 + blueCoords.x1) / 2.0),
            y : ((blueCoords.y0 + blueCoords.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        var pixels = draw.apply(this, [texture, {
            x : ((greenCoords.x0 + greenCoords.x1) / 2.0),
            y : ((greenCoords.y0 + greenCoords.y1) / 2.0)
        }]);
        expect((pixels[0] === 0) || (pixels[0] === 1)).toEqual(true); // Workaround:  Firefox on Windows
        expect(pixels[1]).toEqual(255);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('creates an atlas that adds images at different points in time', function() {
        atlas = context.createTextureAtlas([greenImage], PixelFormat.RGBA, 0);
        atlas.addImages([blueImage]);
        atlas.addImages([greenImage]);
        atlas.addImages([blueImage]);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * greenImage.width;

        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(4);

        //  ---------
        //  |G1 |B1 |
        //  ---------
        //  |G2 |B2 |
        //  ---------

        // first green image
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.5);
        expect(coordinates[0].x1).toEqual(0.5);
        expect(coordinates[0].y1).toEqual(1.0);

        // first blue image
        expect(coordinates[1].x0).toEqual(0.5);
        expect(coordinates[1].y0).toEqual(0.5);
        expect(coordinates[1].x1).toEqual(1.0);
        expect(coordinates[1].y1).toEqual(1.0);

        // second green image
        expect(coordinates[2].x0).toEqual(0.0);
        expect(coordinates[2].y0).toEqual(0.0);
        expect(coordinates[2].x1).toEqual(0.5);
        expect(coordinates[2].y1).toEqual(0.5);

        // second blue image
        expect(coordinates[3].x0).toEqual(0.5);
        expect(coordinates[3].y0).toEqual(0.0);
        expect(coordinates[3].x1).toEqual(1.0);
        expect(coordinates[3].y1).toEqual(0.5);
    });

    it('renders an atlas that adds images at different points in time', function() {
        atlas = context.createTextureAtlas([greenImage], PixelFormat.RGBA, 0);
        atlas.addImages([blueImage]);
        atlas.addImages([greenImage]);
        atlas.addImages([blueImage]);

        var texture = atlas.getTexture();
        var firstGreenCoords = atlas.getTextureCoordinates()[0];
        var firstBlueCoords = atlas.getTextureCoordinates()[1];
        var secondGreenCoords = atlas.getTextureCoordinates()[0];
        var secondBlueCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((firstGreenCoords.x0 + firstGreenCoords.x1) / 2.0),
            y : ((firstGreenCoords.y0 + firstGreenCoords.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((firstBlueCoords.x0 + firstBlueCoords.x1) / 2.0),
            y : ((firstBlueCoords.y0 + firstBlueCoords.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((secondGreenCoords.x0 + secondGreenCoords.x1) / 2.0),
            y : ((secondGreenCoords.y0 + secondGreenCoords.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((secondBlueCoords.x0 + secondBlueCoords.x1) / 2.0),
            y : ((secondBlueCoords.y0 + secondBlueCoords.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);
    });

    it('creates an atlas that dynamically resizes', function() {

        //Add the blue image
        atlas = context.createTextureAtlas([blueImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * blueImage.width;

        expect(coordinates.length).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.5);
        expect(coordinates[0].x1).toEqual(0.5);
        expect(coordinates[0].y1).toEqual(1.0);

        //Add the tall green image
        atlas.addImages([tallGreenImage]);
        texture = atlas.getTexture();
        coordinates = atlas.getTextureCoordinates();
        atlasSize = 2.0 * Math.max(tallGreenImage.width + blueImage.width,
                                   tallGreenImage.height + blueImage.height);

        expect(coordinates.length).toEqual(2);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.9);
        expect(coordinates[0].x1).toEqual(0.1);
        expect(coordinates[0].y1).toEqual(1.0);

        // tall green image
        expect(coordinates[1].x0).toEqual(0.0);
        expect(coordinates[1].y0).toEqual(0.5);
        expect(coordinates[1].x1).toEqual(0.1);
        expect(coordinates[1].y1).toEqual(0.9);
    });

    it('renders an atlas that dynamically resizes', function() {

        //Add the blue image
        atlas = context.createTextureAtlas([blueImage], PixelFormat.RGBA, 0);
        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];

        // blue image
        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.x0 + blueCoordinates.x1) / 2.0),
            y : ((blueCoordinates.y0 + blueCoordinates.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        //Add the tall green image
        atlas.addImages([tallGreenImage]);
        texture = atlas.getTexture();
        blueCoordinates = atlas.getTextureCoordinates()[0];
        var tallGreenCoordinates = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.x0 + blueCoordinates.x1) / 2.0),
            y : ((blueCoordinates.y0 + blueCoordinates.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((tallGreenCoordinates.x0 + tallGreenCoordinates.x1) / 2.0),
            y : ((tallGreenCoordinates.y0 + tallGreenCoordinates.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
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
