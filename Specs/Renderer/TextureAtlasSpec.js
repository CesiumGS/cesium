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
    var bigRedImage;

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

        bigRedImage = new Image();
        bigRedImage.src = './Data/Images/Red16x16.png';

        waitsFor(function() {
            return greenImage.complete && tallGreenImage.complete && blueImage.complete && bigRedImage.complete;
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
        var images = [greenImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * greenImage.width;

        expect(atlas.getBorderWidthInPixels()).toEqual(0);

        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(1.0);
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.0);
        expect(coordinates[0].x1).toEqual(0.5);
        expect(coordinates[0].y1).toEqual(0.5);
    });

    it('renders a single image atlas', function() {
        var images = [greenImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : ((coordinates.x0 + coordinates.x1) / 2.0),
            y : ((coordinates.y0 + coordinates.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates a two image atlas', function() {
        var images = [greenImage, blueImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * (greenImage.width + blueImage.width);

        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(2);
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.0);
        expect(coordinates[0].x1).toEqual(0.25);
        expect(coordinates[0].y1).toEqual(0.25);

        expect(coordinates[1].x0).toEqual(0.25);
        expect(coordinates[1].y0).toEqual(0.0);
        expect(coordinates[1].x1).toEqual(0.5);
        expect(coordinates[1].y1).toEqual(0.25);
    });

    it('renders a two image atlas', function() {
        var images = [greenImage, blueImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

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
        var images = [greenImage, blueImage, blueImage, greenImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

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
        var images = [blueImage, tallGreenImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * Math.max(tallGreenImage.width + blueImage.width,
                                       tallGreenImage.height + blueImage.height);

        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(2);
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].x1).toEqual(0.1);
        expect(coordinates[0].y0).toEqual(0.4);
        expect(coordinates[0].y1).toEqual(0.5);

        expect(coordinates[1].x0).toEqual(0.0);
        expect(coordinates[1].x1).toEqual(0.1);
        expect(coordinates[1].y0).toEqual(0.0);
        expect(coordinates[1].y1).toEqual(0.4);
    });

    it('renders an atlas with different image heights', function() {
        var images = [blueImage, tallGreenImage];
        atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 2);

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
        var images = [greenImage, blueImage];
        atlas = new TextureAtlas(context, [images[0]], PixelFormat.RGBA, 0, 2);
        atlas.addImage(images[1]);
        atlas.addImage(images[0]);
        atlas.addImage(images[1]);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * greenImage.width;

        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        expect(coordinates.length).toEqual(4);

        //  ---------
        //  |G2 |B2 |
        //  ---------
        //  |G1 |B1 |
        //  ---------

        // first green image
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.0);
        expect(coordinates[0].x1).toEqual(0.5);
        expect(coordinates[0].y1).toEqual(0.5);

        // first blue image
        expect(coordinates[1].x0).toEqual(0.5);
        expect(coordinates[1].y0).toEqual(0.0);
        expect(coordinates[1].x1).toEqual(1.0);
        expect(coordinates[1].y1).toEqual(0.5);

        // second green image
        expect(coordinates[2].x0).toEqual(0.0);
        expect(coordinates[2].y0).toEqual(0.5);
        expect(coordinates[2].x1).toEqual(0.5);
        expect(coordinates[2].y1).toEqual(1.0);

        // second blue image
        expect(coordinates[3].x0).toEqual(0.5);
        expect(coordinates[3].y0).toEqual(0.5);
        expect(coordinates[3].x1).toEqual(1.0);
        expect(coordinates[3].y1).toEqual(1.0);
    });

    it('renders an atlas that adds images at different points in time', function() {
        var images = [greenImage, blueImage];
        atlas = new TextureAtlas(context, [images[0]], PixelFormat.RGBA, 0, 2);
        atlas.addImage(images[1]);
        atlas.addImage(images[0]);
        atlas.addImage(images[1]);

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
        var images = [blueImage, tallGreenImage];
        atlas = new TextureAtlas(context, [images[0]], PixelFormat.RGBA, 0, 2);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();
        var atlasSize = 2.0 * blueImage.width;

        expect(coordinates.length).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image
        expect(coordinates[0].x0).toEqual(0.0);
        expect(coordinates[0].y0).toEqual(0.0);
        expect(coordinates[0].x1).toEqual(0.5);
        expect(coordinates[0].y1).toEqual(0.5);

        //Add the tall green image
        atlas.addImage(images[1]);
        texture = atlas.getTexture();
        coordinates = atlas.getTextureCoordinates();
        atlasSize = 2.0 * (atlasSize + tallGreenImage.height);

        expect(coordinates.length).toEqual(2);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image
        expect(coordinates[0].x0).toEqual((0.0 / atlasSize));
        expect(coordinates[0].y0).toEqual((0.0 / atlasSize));
        expect(coordinates[0].x1).toEqual((1.0 / atlasSize));
        expect(coordinates[0].y1).toEqual((1.0 / atlasSize));

        // tall green image
        expect(coordinates[1].x0).toEqual((0.0 / atlasSize));
        expect(coordinates[1].y0).toEqual((2.0 / atlasSize));
        expect(coordinates[1].x1).toEqual((1.0 / atlasSize));
        expect(coordinates[1].y1).toEqual((6.0 / atlasSize));
    });

    it('renders an atlas that dynamically resizes', function() {

        //Add the blue image
        var images = [blueImage, tallGreenImage];
        atlas = new TextureAtlas(context, [images[0]], PixelFormat.RGBA, 0, 2);
        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];

        // blue image
        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.x0 + blueCoordinates.x1) / 2.0),
            y : ((blueCoordinates.y0 + blueCoordinates.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        //Add the tall green image
        atlas.addImage(images[1]);
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

    it('creates an atlas that dynamically resizes twice', function() {
        var images = [blueImage, tallGreenImage, bigRedImage];
        atlas = new TextureAtlas(context, [images[0]], PixelFormat.RGBA, 0, 2);
        atlas.addImage(images[1]);
        atlas.addImage(images[2]);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasSize = 2.0 * blueImage.width; // 2
        atlasSize = 2.0 * (atlasSize + tallGreenImage.height); // 12
        atlasSize = 2.0 * (atlasSize + bigRedImage.height); // 56

        expect(coordinates.length).toEqual(3);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image
        expect(coordinates[0].x0).toEqual((0.0 / atlasSize));
        expect(coordinates[0].y0).toEqual((0.0 / atlasSize));
        expect(coordinates[0].x1).toEqual((1.0 / atlasSize));
        expect(coordinates[0].y1).toEqual((1.0 / atlasSize));

        // tall green image
        expect(coordinates[1].x0).toEqual((0.0 / atlasSize));
        expect(coordinates[1].y0).toEqual((2.0 / atlasSize));
        expect(coordinates[1].x1).toEqual((1.0 / atlasSize));
        expect(coordinates[1].y1).toEqual((6.0 / atlasSize));

        // big red image
        expect(coordinates[2].x0).toEqual((0.0 / atlasSize));
        expect(coordinates[2].y0).toEqual((12.0 / atlasSize));
        expect(coordinates[2].x1).toEqual((16.0 / atlasSize));
        expect(coordinates[2].y1).toEqual((28.0 / atlasSize));
    });

    it('renders an atlas that dynamically resizes twice', function() {
        var images = [blueImage, tallGreenImage, bigRedImage];
        atlas = new TextureAtlas(context, [images[0]], PixelFormat.RGBA, 0, 2);
        atlas.addImage(images[1]);
        atlas.addImage(images[2]);

        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];
        var tallGreenCoordinates = atlas.getTextureCoordinates()[1];
        var bigRedCoordinates = atlas.getTextureCoordinates()[2];

        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.x0 + blueCoordinates.x1) / 2.0),
            y : ((blueCoordinates.y0 + blueCoordinates.y1) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((tallGreenCoordinates.x0 + tallGreenCoordinates.x1) / 2.0),
            y : ((tallGreenCoordinates.y0 + tallGreenCoordinates.y1) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((bigRedCoordinates.x0 + bigRedCoordinates.x1) / 2.0),
            y : ((bigRedCoordinates.y0 + bigRedCoordinates.y1) / 2.0)
        }])).toEqualArray([255, 0, 0, 255]);
    });

    it('throws without images', function() {
        expect(function() {
            atlas = new TextureAtlas(context, [], PixelFormat.RGBA, 0, 2);
            atlas.addImages([]);
        }).toThrow();
    });

    it('throws with a negative borderWidthInPixels', function() {
        expect(function() {
            var images = [greenImage, blueImage];
            atlas = new TextureAtlas(context, images, PixelFormat.RGBA, -1, 2);
        }).toThrow();
    });

    it('throws with an invalid scalingFactor', function() {
       expect(function() {
           var images = [greenImage, blueImage];
           atlas = new TextureAtlas(context, images, PixelFormat.RGBA, 0, 0);
       }).toThrow();
    });

    it('throws without context', function() {
        expect(function() {
            return new TextureAtlas();
        }).toThrow();
    });
});
