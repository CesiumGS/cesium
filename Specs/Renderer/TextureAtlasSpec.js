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
    var bigBlueImage;

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

        bigBlueImage = new Image();
        bigBlueImage.src = './Data/Images/Blue10x10.png';

        waitsFor(function() {
            return greenImage.complete && tallGreenImage.complete && blueImage.complete && bigRedImage.complete && bigBlueImage.complete;
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
        atlas = context.createTextureAtlas({image : greenImage, borderWidthInPixels : 0, initialSize : 1});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        expect(atlas.getBorderWidthInPixels()).toEqual(0);
        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(1);
        expect(texture.getHeight()).toEqual(1);

        expect(greenCoords.bottomLeft.x).toEqual(0.0);
        expect(greenCoords.bottomLeft.y).toEqual(0.0);
        expect(greenCoords.topRight.x).toEqual(1.0);
        expect(greenCoords.topRight.y).toEqual(1.0);
    });

    it('renders a single image atlas', function() {
        atlas = context.createTextureAtlas({image : greenImage, borderWidthInPixels : 0, initialSize : 1});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : ((greenCoords.bottomLeft.x + greenCoords.topRight.x) / 2.0),
            y : ((greenCoords.bottomLeft.y + greenCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates a single image atlas with default values', function() {
        atlas = context.createTextureAtlas({image : greenImage});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        expect(atlas.getBorderWidthInPixels()).toEqual(1);
        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(16);
        expect(texture.getHeight()).toEqual(16);

        expect(greenCoords.bottomLeft.x).toEqual(0.0);
        expect(greenCoords.bottomLeft.y).toEqual(0.0);
        expect(greenCoords.topRight.x).toEqual(1.0 / 16.0);
        expect(greenCoords.topRight.y).toEqual(1.0 / 16.0);
    });

    it('renders a single image atlas with default values', function() {
        atlas = context.createTextureAtlas({image : greenImage});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : ((greenCoords.bottomLeft.x + greenCoords.topRight.x) / 2.0),
            y : ((greenCoords.bottomLeft.y + greenCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates a two image atlas', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : 2});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];
        var blueCoords = atlas.getTextureCoordinates()[1];

        expect(texture.getWidth()).toEqual(2);
        expect(texture.getHeight()).toEqual(2);
        expect(atlas.getNumberOfImages()).toEqual(2);

        expect(greenCoords.bottomLeft.x).toEqual(0.0);
        expect(greenCoords.bottomLeft.y).toEqual(0.0);
        expect(greenCoords.topRight.x).toEqual(0.5);
        expect(greenCoords.topRight.y).toEqual(0.5);

        expect(blueCoords.bottomLeft.x).toEqual(0.5);
        expect(blueCoords.bottomLeft.y).toEqual(0.0);
        expect(blueCoords.topRight.x).toEqual(1.0);
        expect(blueCoords.topRight.y).toEqual(0.5);
    });

    it('renders a two image atlas', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : 2});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];
        var blueCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((greenCoords.bottomLeft.x + greenCoords.topRight.x) / 2.0),
            y : ((greenCoords.bottomLeft.y + greenCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((blueCoords.bottomLeft.x + blueCoords.topRight.x) / 2.0),
            y : ((blueCoords.bottomLeft.y + blueCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);
    });

    it('renders a four image atlas', function() {
        var images = [greenImage, blueImage, blueImage, greenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : 2});

        var texture = atlas.getTexture();
        var c0 = atlas.getTextureCoordinates()[0];
        var c1 = atlas.getTextureCoordinates()[1];
        var c2 = atlas.getTextureCoordinates()[2];
        var c3 = atlas.getTextureCoordinates()[3];

        expect(atlas.getNumberOfImages()).toEqual(4);

        expect(draw.apply(this, [texture, {
            x : ((c0.bottomLeft.x + c0.topRight.x) / 2.0),
            y : ((c0.bottomLeft.y + c0.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((c1.bottomLeft.x + c1.topRight.x) / 2.0),
            y : ((c1.bottomLeft.y + c1.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((c2.bottomLeft.x + c2.topRight.x) / 2.0),
            y : ((c2.bottomLeft.y + c2.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((c3.bottomLeft.x + c3.topRight.x) / 2.0),
            y : ((c3.bottomLeft.y + c3.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates a four image atlas with non-zero borderWidthInPixels', function() {
        var images = [greenImage, blueImage, greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : 4});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(atlas.getBorderWidthInPixels()).toEqual(2);
        expect(atlas.getNumberOfImages()).toEqual(4);
        expect(texture.getWidth()).toEqual(4);
        expect(texture.getHeight()).toEqual(4);

        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(0.25);
        expect(coordinates[0].topRight.y).toEqual(0.25);

        expect(coordinates[1].bottomLeft.x).toEqual(0.75);
        expect(coordinates[1].bottomLeft.y).toEqual(0.0);
        expect(coordinates[1].topRight.x).toEqual(1.0);
        expect(coordinates[1].topRight.y).toEqual(0.25);

        expect(coordinates[2].bottomLeft.x).toEqual(0.0);
        expect(coordinates[2].bottomLeft.y).toEqual(0.75);
        expect(coordinates[2].topRight.x).toEqual(0.25);
        expect(coordinates[2].topRight.y).toEqual(1.0);

        expect(coordinates[3].bottomLeft.x).toEqual(0.75);
        expect(coordinates[3].bottomLeft.y).toEqual(0.75);
        expect(coordinates[3].topRight.x).toEqual(1.0);
        expect(coordinates[3].topRight.y).toEqual(1.0);
    });

    it('renders a four image atlas with non-zero borderWidthInPixels', function() {
        var images = [greenImage, blueImage, greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : 4});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(draw.apply(this, [texture, {
            x : ((coordinates[0].bottomLeft.x + coordinates[0].topRight.x) / 2.0),
            y : ((coordinates[0].bottomLeft.y + coordinates[0].topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((coordinates[1].bottomLeft.x + coordinates[1].topRight.x) / 2.0),
            y : ((coordinates[1].bottomLeft.y + coordinates[1].topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((coordinates[2].bottomLeft.x + coordinates[2].topRight.x) / 2.0),
            y : ((coordinates[2].bottomLeft.y + coordinates[2].topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((coordinates[3].bottomLeft.x + coordinates[3].topRight.x) / 2.0),
            y : ((coordinates[3].bottomLeft.y + coordinates[3].topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);
    });

    it('creates an atlas with different image heights', function() {
        var images = [blueImage, tallGreenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : 4});

        var texture = atlas.getTexture();
        var blueCoords = atlas.getTextureCoordinates()[0];
        var greenCoords = atlas.getTextureCoordinates()[1];

        expect(texture.getWidth()).toEqual(4);
        expect(texture.getHeight()).toEqual(4);
        expect(atlas.getNumberOfImages()).toEqual(2);

        expect(blueCoords.bottomLeft.x).toEqual(0.25);
        expect(blueCoords.bottomLeft.y).toEqual(0.0);
        expect(blueCoords.topRight.x).toEqual(0.5);
        expect(blueCoords.topRight.y).toEqual(0.25);

        expect(greenCoords.bottomLeft.x).toEqual(0.0);
        expect(greenCoords.bottomLeft.y).toEqual(0.0);
        expect(greenCoords.topRight.x).toEqual(0.25);
        expect(greenCoords.topRight.y).toEqual(1.0);
    });

    it('renders an atlas with different image heights', function() {
        var images = [blueImage, tallGreenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : 4});

        var texture = atlas.getTexture();
        var blueCoords = atlas.getTextureCoordinates()[0];
        var greenCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((blueCoords.bottomLeft.x + blueCoords.topRight.x) / 2.0),
            y : ((blueCoords.bottomLeft.y + blueCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        var pixels = draw.apply(this, [texture, {
            x : ((greenCoords.bottomLeft.x + greenCoords.topRight.x) / 2.0),
            y : ((greenCoords.bottomLeft.y + greenCoords.topRight.y) / 2.0)
        }]);

        expect((pixels[0] === 0) || (pixels[0] === 1)).toEqual(true); // Workaround:  Firefox on Windows
        expect(pixels[1]).toEqual(255);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('creates an atlas that adds images at different points in time', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 2});

        atlas.addImage(greenImage); // G1
        atlas.addImage(blueImage); // B1
        atlas.addImage(greenImage); // G2
        atlas.addImage(blueImage); // B2

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(texture.getWidth()).toEqual(2);
        expect(texture.getHeight()).toEqual(2);
        expect(atlas.getNumberOfImages()).toEqual(4);

        //  ---------
        //  |G2 |B2 |
        //  ---------
        //  |G1 |B1 |
        //  ---------

        // first green image
        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(0.5);
        expect(coordinates[0].topRight.y).toEqual(0.5);

        // first blue image
        expect(coordinates[1].bottomLeft.x).toEqual(0.5);
        expect(coordinates[1].bottomLeft.y).toEqual(0.0);
        expect(coordinates[1].topRight.x).toEqual(1.0);
        expect(coordinates[1].topRight.y).toEqual(0.5);

        // second green image
        expect(coordinates[2].bottomLeft.x).toEqual(0.0);
        expect(coordinates[2].bottomLeft.y).toEqual(0.5);
        expect(coordinates[2].topRight.x).toEqual(0.5);
        expect(coordinates[2].topRight.y).toEqual(1.0);

        // second blue image
        expect(coordinates[3].bottomLeft.x).toEqual(0.5);
        expect(coordinates[3].bottomLeft.y).toEqual(0.5);
        expect(coordinates[3].topRight.x).toEqual(1.0);
        expect(coordinates[3].topRight.y).toEqual(1.0);
    });

    it('renders an atlas that adds images at different points in time', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 2});

        atlas.addImage(greenImage);
        atlas.addImage(blueImage);
        atlas.addImage(greenImage);
        atlas.addImage(blueImage);

        var texture = atlas.getTexture();
        var firstGreenCoords = atlas.getTextureCoordinates()[0];
        var firstBlueCoords = atlas.getTextureCoordinates()[1];
        var secondGreenCoords = atlas.getTextureCoordinates()[2];
        var secondBlueCoords = atlas.getTextureCoordinates()[3];

        expect(draw.apply(this, [texture, {
            x : ((firstGreenCoords.bottomLeft.x + firstGreenCoords.topRight.x) / 2.0),
            y : ((firstGreenCoords.bottomLeft.y + firstGreenCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((firstBlueCoords.bottomLeft.x + firstBlueCoords.topRight.x) / 2.0),
            y : ((firstBlueCoords.bottomLeft.y + firstBlueCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((secondGreenCoords.bottomLeft.x + secondGreenCoords.topRight.x) / 2.0),
            y : ((secondGreenCoords.bottomLeft.y + secondGreenCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((secondBlueCoords.bottomLeft.x + secondBlueCoords.topRight.x) / 2.0),
            y : ((secondBlueCoords.bottomLeft.y + secondBlueCoords.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);
    });

    it('creates an atlas that dynamically resizes', function() {
        atlas = context.createTextureAtlas({image : blueImage, borderWidthInPixels : 0, initialSize : 1});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(1);
        expect(texture.getHeight()).toEqual(1);

        // blue image
        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(1.0);
        expect(coordinates[0].topRight.y).toEqual(1.0);

        //Add the tall green image
        atlas.addImage(tallGreenImage);
        texture = atlas.getTexture();
        coordinates = atlas.getTextureCoordinates();

        expect(atlas.getNumberOfImages()).toEqual(2);
        expect(texture.getWidth()).toEqual(10);
        expect(texture.getHeight()).toEqual(10);

        // blue image
        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(0.1);
        expect(coordinates[0].topRight.y).toEqual(0.1);

        // tall green image
        expect(coordinates[1].bottomLeft.x).toEqual(0.0);
        expect(coordinates[1].bottomLeft.y).toEqual(0.1);
        expect(coordinates[1].topRight.x).toEqual(0.1);
        expect(coordinates[1].topRight.y).toEqual(0.5);
    });

    it('renders an atlas that dynamically resizes', function() {

        atlas = context.createTextureAtlas({image : blueImage, borderWidthInPixels : 0, initialSize : 1});

        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];

        // blue image
        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.bottomLeft.x + blueCoordinates.topRight.x) / 2.0),
            y : ((blueCoordinates.bottomLeft.y + blueCoordinates.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        //Add the tall green image
        atlas.addImage(tallGreenImage);
        texture = atlas.getTexture();
        blueCoordinates = atlas.getTextureCoordinates()[0];
        var tallGreenCoordinates = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.bottomLeft.x + blueCoordinates.topRight.x) / 2.0),
            y : ((blueCoordinates.bottomLeft.y + blueCoordinates.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((tallGreenCoordinates.bottomLeft.x + tallGreenCoordinates.topRight.x) / 2.0),
            y : ((tallGreenCoordinates.bottomLeft.y + tallGreenCoordinates.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates an atlas with smaller initialSize than first image', function() {
        atlas = context.createTextureAtlas({image : bigRedImage, borderWidthInPixels : 0, initialSize : 1});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(32);
        expect(texture.getHeight()).toEqual(32);

        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(0.5);
        expect(coordinates[0].topRight.y).toEqual(0.5);
    });

    it('renders an atlas with smaller initialSize than first image', function() {
        atlas = context.createTextureAtlas({image : bigRedImage, borderWidthInPixels : 0, initialSize : 1});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : ((coordinates.bottomLeft.x + coordinates.topRight.x) / 2.0),
            y : ((coordinates.bottomLeft.y + coordinates.topRight.y) / 2.0)
        }])).toEqualArray([255, 0, 0, 255]);
    });

    it('creates a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : 2});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(atlas.getBorderWidthInPixels()).toEqual(2);
        expect(atlas.getNumberOfImages()).toEqual(2);
        expect(texture.getWidth()).toEqual(10);
        expect(texture.getHeight()).toEqual(10);

        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(0.1);
        expect(coordinates[0].topRight.y).toEqual(0.1);

        expect(coordinates[1].bottomLeft.x).toEqual(0.4);
        expect(coordinates[1].bottomLeft.y).toEqual(0.0);
        expect(coordinates[1].topRight.x).toEqual(0.5);
        expect(coordinates[1].topRight.y).toEqual(0.1);
    });

    it('renders a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : 2});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(draw.apply(this, [texture, {
            x : ((coordinates[0].bottomLeft.x + coordinates[0].topRight.x) / 2.0),
            y : ((coordinates[0].bottomLeft.y + coordinates[0].topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((coordinates[1].bottomLeft.x + coordinates[1].topRight.x) / 2.0),
            y : ((coordinates[1].bottomLeft.y + coordinates[1].topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);
    });

    it('creates an atlas that dynamically resizes twice', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 1});
        atlas.addImage(blueImage);
        atlas.addImage(tallGreenImage);
        atlas.addImages([bigRedImage, bigRedImage, bigRedImage, bigRedImage, bigRedImage, bigRedImage]);
        atlas.addImages([tallGreenImage, tallGreenImage, tallGreenImage]);
        atlas.addImage(blueImage);
        atlas.addImages([bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage]);
        atlas.addImage(blueImage);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasSize = blueImage.width; // 1
        atlasSize = 2.0 * (atlasSize + tallGreenImage.height); // 10
        atlasSize = 2.0 * (atlasSize + bigRedImage.height); // 52

        expect(atlas.getNumberOfImages()).toEqual(21);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image 1
        expect(coordinates[0].bottomLeft.x).toEqual((0.0 / atlasSize));
        expect(coordinates[0].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[0].topRight.x).toEqual((1.0 / atlasSize));
        expect(coordinates[0].topRight.y).toEqual((1.0 / atlasSize));

        // tall green image 1
        expect(coordinates[1].bottomLeft.x).toEqual((0.0 / atlasSize));
        expect(coordinates[1].bottomLeft.y).toEqual((1.0 / atlasSize));
        expect(coordinates[1].topRight.x).toEqual((1.0 / atlasSize));
        expect(coordinates[1].topRight.y).toEqual((5.0 / atlasSize));

        // big red image 1
        expect(coordinates[2].bottomLeft.x).toEqual((0.0 / atlasSize));
        expect(coordinates[2].bottomLeft.y).toEqual((10.0 / atlasSize));
        expect(coordinates[2].topRight.x).toEqual((16.0 / atlasSize));
        expect(coordinates[2].topRight.y).toEqual((26.0 / atlasSize));

        // big red image 2
        expect(coordinates[3].bottomLeft.x).toEqual((0.0 / atlasSize));
        expect(coordinates[3].bottomLeft.y).toEqual((26.0 / atlasSize));
        expect(coordinates[3].topRight.x).toEqual((16.0 / atlasSize));
        expect(coordinates[3].topRight.y).toEqual((42.0 / atlasSize));

        // big red image 3
        expect(coordinates[4].bottomLeft.x).toEqual((16.0 / atlasSize));
        expect(coordinates[4].bottomLeft.y).toEqual((10.0 / atlasSize));
        expect(coordinates[4].topRight.x).toEqual((32.0 / atlasSize));
        expect(coordinates[4].topRight.y).toEqual((26.0 / atlasSize));

        // big red image 4
        expect(coordinates[5].bottomLeft.x).toEqual((32.0 / atlasSize));
        expect(coordinates[5].bottomLeft.y).toEqual((10.0 / atlasSize));
        expect(coordinates[5].topRight.x).toEqual((48.0 / atlasSize));
        expect(coordinates[5].topRight.y).toEqual((26.0 / atlasSize));

        // big red image 5
        expect(coordinates[6].bottomLeft.x).toEqual((16.0 / atlasSize));
        expect(coordinates[6].bottomLeft.y).toEqual((26.0 / atlasSize));
        expect(coordinates[6].topRight.x).toEqual((32.0 / atlasSize));
        expect(coordinates[6].topRight.y).toEqual((42.0 / atlasSize));

        // big red image 6
        expect(coordinates[7].bottomLeft.x).toEqual((32.0 / atlasSize));
        expect(coordinates[7].bottomLeft.y).toEqual((26.0 / atlasSize));
        expect(coordinates[7].topRight.x).toEqual((48.0 / atlasSize));
        expect(coordinates[7].topRight.y).toEqual((42.0 / atlasSize));

        // tall green image 2
        expect(coordinates[8].bottomLeft.x).toEqual((0.0 / atlasSize));
        expect(coordinates[8].bottomLeft.y).toEqual((5.0 / atlasSize));
        expect(coordinates[8].topRight.x).toEqual((1.0 / atlasSize));
        expect(coordinates[8].topRight.y).toEqual((9.0 / atlasSize));

        // tall green image 3
        expect(coordinates[9].bottomLeft.x).toEqual((1.0 / atlasSize));
        expect(coordinates[9].bottomLeft.y).toEqual((1.0 / atlasSize));
        expect(coordinates[9].topRight.x).toEqual((2.0 / atlasSize));
        expect(coordinates[9].topRight.y).toEqual((5.0 / atlasSize));

        // tall green image 4
        expect(coordinates[10].bottomLeft.x).toEqual((1.0 / atlasSize));
        expect(coordinates[10].bottomLeft.y).toEqual((5.0 / atlasSize));
        expect(coordinates[10].topRight.x).toEqual((2.0 / atlasSize));
        expect(coordinates[10].topRight.y).toEqual((9.0 / atlasSize));

        // blue image 2
        expect(coordinates[11].bottomLeft.x).toEqual((1.0 / atlasSize));
        expect(coordinates[11].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[11].topRight.x).toEqual((2.0 / atlasSize));
        expect(coordinates[11].topRight.y).toEqual((1.0 / atlasSize));

        // big blue image 1
        expect(coordinates[12].bottomLeft.x).toEqual((10.0 / atlasSize));
        expect(coordinates[12].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[12].topRight.x).toEqual((20.0 / atlasSize));
        expect(coordinates[12].topRight.y).toEqual((10.0 / atlasSize));

        // big blue image 2
        expect(coordinates[13].bottomLeft.x).toEqual((20.0 / atlasSize));
        expect(coordinates[13].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[13].topRight.x).toEqual((30.0 / atlasSize));
        expect(coordinates[13].topRight.y).toEqual((10.0 / atlasSize));

        // big blue image 3
        expect(coordinates[14].bottomLeft.x).toEqual((30.0 / atlasSize));
        expect(coordinates[14].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[14].topRight.x).toEqual((40.0 / atlasSize));
        expect(coordinates[14].topRight.y).toEqual((10.0 / atlasSize));

        // big blue image 4
        expect(coordinates[15].bottomLeft.x).toEqual((40.0 / atlasSize));
        expect(coordinates[15].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[15].topRight.x).toEqual((50.0 / atlasSize));
        expect(coordinates[15].topRight.y).toEqual((10.0 / atlasSize));

        // big blue image 5
        expect(coordinates[16].bottomLeft.x).toEqual((0.0 / atlasSize));
        expect(coordinates[16].bottomLeft.y).toEqual((42.0 / atlasSize));
        expect(coordinates[16].topRight.x).toEqual((10.0 / atlasSize));
        expect(coordinates[16].topRight.y).toEqual((52.0 / atlasSize));

        // big blue image 6
        expect(coordinates[17].bottomLeft.x).toEqual((16.0 / atlasSize));
        expect(coordinates[17].bottomLeft.y).toEqual((42.0 / atlasSize));
        expect(coordinates[17].topRight.x).toEqual((26.0 / atlasSize));
        expect(coordinates[17].topRight.y).toEqual((52.0 / atlasSize));

        // big blue image 7
        expect(coordinates[18].bottomLeft.x).toEqual((32.0 / atlasSize));
        expect(coordinates[18].bottomLeft.y).toEqual((42.0 / atlasSize));
        expect(coordinates[18].topRight.x).toEqual((42.0 / atlasSize));
        expect(coordinates[18].topRight.y).toEqual((52.0 / atlasSize));

        // big blue image 8
        expect(coordinates[19].bottomLeft.x).toEqual((42.0 / atlasSize));
        expect(coordinates[19].bottomLeft.y).toEqual((42.0 / atlasSize));
        expect(coordinates[19].topRight.x).toEqual((52.0 / atlasSize));
        expect(coordinates[19].topRight.y).toEqual((52.0 / atlasSize));

        // blue image 3
        expect(coordinates[20].bottomLeft.x).toEqual((2.0 / atlasSize));
        expect(coordinates[20].bottomLeft.y).toEqual((0.0 / atlasSize));
        expect(coordinates[20].topRight.x).toEqual((3.0 / atlasSize));
        expect(coordinates[20].topRight.y).toEqual((1.0 / atlasSize));
    });

    it('renders an atlas that dynamically resizes twice', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 1});
        atlas.addImage(blueImage);
        atlas.addImage(tallGreenImage);
        atlas.addImage(bigRedImage);

        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];
        var tallGreenCoordinates = atlas.getTextureCoordinates()[1];
        var bigRedCoordinates = atlas.getTextureCoordinates()[2];

        expect(draw.apply(this, [texture, {
            x : ((blueCoordinates.bottomLeft.x + blueCoordinates.topRight.x) / 2.0),
            y : ((blueCoordinates.bottomLeft.y + blueCoordinates.topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((tallGreenCoordinates.bottomLeft.x + tallGreenCoordinates.topRight.x) / 2.0),
            y : ((tallGreenCoordinates.bottomLeft.y + tallGreenCoordinates.topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : ((bigRedCoordinates.bottomLeft.x + bigRedCoordinates.topRight.x) / 2.0),
            y : ((bigRedCoordinates.bottomLeft.y + bigRedCoordinates.topRight.y) / 2.0)
        }])).toEqualArray([255, 0, 0, 255]);
    });

    it('gets index after calling addImage and addImages', function() {
        var images = [blueImage, tallGreenImage];
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 4});
        var index;

        index = atlas.addImage(images[0]);
        expect(index).toEqual(0);

        index = atlas.addImage(images[1]);
        expect(index).toEqual(1);

        index = atlas.addImages(images);
        expect(index).toEqual(2);

        index = atlas.addImage(images[0]);
        expect(index).toEqual(4);

        expect(atlas.getNumberOfImages()).toEqual(5);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(draw.apply(this, [texture, {
            x : ((coordinates[2].bottomLeft.x + coordinates[2].topRight.x) / 2.0),
            y : ((coordinates[2].bottomLeft.y + coordinates[2].topRight.y) / 2.0)
        }])).toEqualArray([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : ((coordinates[3].bottomLeft.x + coordinates[3].topRight.x) / 2.0),
            y : ((coordinates[3].bottomLeft.y + coordinates[3].topRight.y) / 2.0)
        }])).toEqualArray([0, 255, 0, 255]);
    });

    it('creates an atlas with subregions', function() {

        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 1});

        atlas.addSubRegions(greenImage, [
            { x:0.0, y:0.0, width:0.5, height:0.5 },
            { x:0.0, y:0.5, width:0.5, height:0.5 },
            { x:0.5, y:0.0, width:0.5, height:0.5 },
            { x:0.5, y:0.5, width:0.5, height:0.5 }
        ]);

        var coordinates = atlas.getTextureCoordinates();

        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(1.0);
        expect(coordinates[0].topRight.y).toEqual(1.0);

        expect(coordinates[1].bottomLeft.x).toEqual(0.0);
        expect(coordinates[1].bottomLeft.y).toEqual(0.0);
        expect(coordinates[1].topRight.x).toEqual(0.5);
        expect(coordinates[1].topRight.y).toEqual(0.5);

        expect(coordinates[2].bottomLeft.x).toEqual(0.0);
        expect(coordinates[2].bottomLeft.y).toEqual(0.5);
        expect(coordinates[2].topRight.x).toEqual(0.5);
        expect(coordinates[2].topRight.y).toEqual(1.0);

        expect(coordinates[3].bottomLeft.x).toEqual(0.5);
        expect(coordinates[3].bottomLeft.y).toEqual(0.0);
        expect(coordinates[3].topRight.x).toEqual(1.0);
        expect(coordinates[3].topRight.y).toEqual(0.5);

        expect(coordinates[4].bottomLeft.x).toEqual(0.5);
        expect(coordinates[4].bottomLeft.y).toEqual(0.5);
        expect(coordinates[4].topRight.x).toEqual(1.0);
        expect(coordinates[4].topRight.y).toEqual(1.0);

        expect(atlas.getNumberOfImages()).toEqual(5);
    });

    it('creates an atlas that resizes with subregions', function() {

        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : 1});

        atlas.addSubRegions(greenImage, [
            { x:0.0, y:0.0, width:0.5, height:0.5 },
            { x:0.0, y:0.5, width:0.5, height:0.5 },
            { x:0.5, y:0.0, width:0.5, height:0.5 },
            { x:0.5, y:0.5, width:0.5, height:0.5 }
        ]);

        var coordinates = atlas.getTextureCoordinates();

        expect(coordinates[0].bottomLeft.x).toEqual(0.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0);
        expect(coordinates[0].topRight.x).toEqual(1.0);
        expect(coordinates[0].topRight.y).toEqual(1.0);

        expect(coordinates[1].bottomLeft.x).toEqual(0.0);
        expect(coordinates[1].bottomLeft.y).toEqual(0.0);
        expect(coordinates[1].topRight.x).toEqual(0.5);
        expect(coordinates[1].topRight.y).toEqual(0.5);

        expect(coordinates[2].bottomLeft.x).toEqual(0.0);
        expect(coordinates[2].bottomLeft.y).toEqual(0.5);
        expect(coordinates[2].topRight.x).toEqual(0.5);
        expect(coordinates[2].topRight.y).toEqual(1.0);

        expect(coordinates[3].bottomLeft.x).toEqual(0.5);
        expect(coordinates[3].bottomLeft.y).toEqual(0.0);
        expect(coordinates[3].topRight.x).toEqual(1.0);
        expect(coordinates[3].topRight.y).toEqual(0.5);

        expect(coordinates[4].bottomLeft.x).toEqual(0.5);
        expect(coordinates[4].bottomLeft.y).toEqual(0.5);
        expect(coordinates[4].topRight.x).toEqual(1.0);
        expect(coordinates[4].topRight.y).toEqual(1.0);

        expect(atlas.getNumberOfImages()).toEqual(5);

        atlas.addImage(blueImage);

        expect(coordinates[0].bottomLeft.x).toEqual(0.0 / 4.0);
        expect(coordinates[0].bottomLeft.y).toEqual(0.0 / 4.0);
        expect(coordinates[0].topRight.x).toEqual(1.0 / 4.0);
        expect(coordinates[0].topRight.y).toEqual(1.0 / 4.0);

        expect(coordinates[1].bottomLeft.x).toEqual(0.0 / 4.0);
        expect(coordinates[1].bottomLeft.y).toEqual(0.0 / 4.0);
        expect(coordinates[1].topRight.x).toEqual(0.5 / 4.0);
        expect(coordinates[1].topRight.y).toEqual(0.5 / 4.0);

        expect(coordinates[2].bottomLeft.x).toEqual(0.0 / 4.0);
        expect(coordinates[2].bottomLeft.y).toEqual(0.5 / 4.0);
        expect(coordinates[2].topRight.x).toEqual(0.5 / 4.0);
        expect(coordinates[2].topRight.y).toEqual(1.0 / 4.0);

        expect(coordinates[3].bottomLeft.x).toEqual(0.5 / 4.0);
        expect(coordinates[3].bottomLeft.y).toEqual(0.0 / 4.0);
        expect(coordinates[3].topRight.x).toEqual(1.0 / 4.0);
        expect(coordinates[3].topRight.y).toEqual(0.5 / 4.0);

        expect(coordinates[4].bottomLeft.x).toEqual(0.5 / 4.0);
        expect(coordinates[4].bottomLeft.y).toEqual(0.5 / 4.0);
        expect(coordinates[4].topRight.x).toEqual(1.0 / 4.0);
        expect(coordinates[4].topRight.y).toEqual(1.0 / 4.0);

        expect(coordinates[5].bottomLeft.x).toEqual(0.25);
        expect(coordinates[5].bottomLeft.y).toEqual(0.0);
        expect(coordinates[5].topRight.x).toEqual(0.5);
        expect(coordinates[5].topRight.y).toEqual(0.25);

        expect(atlas.getNumberOfImages()).toEqual(6);
    });

    it('throws without image', function() {
       expect(function() {
           atlas = context.createTextureAtlas();
           atlas.addImage();
       }).toThrow();
    });

    it('throws without images', function() {
        expect(function() {
            atlas = context.createTextureAtlas();
            atlas.addImages([]);
        }).toThrow();
    });

    it('throws with a negative borderWidthInPixels', function() {
        expect(function() {
            atlas = context.createTextureAtlas({borderWidthInPixels : -1});
        }).toThrow();
    });

    it('throws with a initialSize less than one', function() {
        expect(function() {
            atlas = context.createTextureAtlas({initialSize : 0});
        }).toThrow();
    });
    it('throws without context', function() {
        expect(function() {
            return new TextureAtlas();
        }).toThrow();
    });
});
