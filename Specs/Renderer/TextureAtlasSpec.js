/*global defineSuite*/
defineSuite([
         'Renderer/TextureAtlas',
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/PrimitiveType',
         'Core/Cartesian2',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/PixelFormat'
     ], function(
         TextureAtlas,
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

    it('creates a single image atlas', function() {
        atlas = context.createTextureAtlas({image : greenImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        var atlasWidth = 1.0;
        var atlasHeight = 1.0;
        expect(atlas.getBorderWidthInPixels()).toEqual(0);
        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(1.0 / atlasHeight);
    });

    it('renders a single image atlas', function() {
        atlas = context.createTextureAtlas({image : greenImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : (greenCoords.x + greenCoords.width / 2.0),
            y : (greenCoords.y + greenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates a single image atlas with default values', function() {
        atlas = context.createTextureAtlas({image : greenImage});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        var atlasWidth = 16.0;
        var atlasHeight = 16.0;
        expect(atlas.getBorderWidthInPixels()).toEqual(1);
        expect(texture.getPixelFormat()).toEqual(PixelFormat.RGBA);
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(1.0 / atlasHeight);
    });

    it('renders a single image atlas with default values', function() {
        atlas = context.createTextureAtlas({image : greenImage});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : (greenCoords.x + greenCoords.width / 2.0),
            y : (greenCoords.y + greenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates a single image atlas with non-square initialSize', function() {
        atlas = context.createTextureAtlas({image : tallGreenImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1.0, 5.0)});

        var texture = atlas.getTexture();
        var tallGreenCoords = atlas.getTextureCoordinates()[0];

        var atlasWidth = 1.0;
        var atlasHeight = 5.0;
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(tallGreenCoords.x).toEqual(0.0 / atlasWidth);
        expect(tallGreenCoords.y).toEqual(0.0 / atlasHeight);
        expect(tallGreenCoords.width).toEqual(1.0 / atlasWidth);
        expect(tallGreenCoords.height).toEqual(4.0 / atlasHeight);
    });

    it('renders a single image atlas with non-square initialSize', function() {
        atlas = context.createTextureAtlas({image : tallGreenImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1.0, 5.0)});

        var texture = atlas.getTexture();
        var tallGreenCoords = atlas.getTextureCoordinates()[0];

        var pixels = draw.apply(this, [texture, {
            x : (tallGreenCoords.x + tallGreenCoords.width / 2.0),
            y : (tallGreenCoords.y + tallGreenCoords.height / 2.0)
        }]);

        expect(pixels[0]).toEqual(0);
        expect(pixels[1]).toEqual(255);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('creates a two image atlas', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(2, 2)});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];
        var blueCoords = atlas.getTextureCoordinates()[1];

        var atlasWidth = 2.0;
        var atlasHeight = 2.0;
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);
        expect(atlas.getNumberOfImages()).toEqual(2);

        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(1.0 / atlasHeight);

        expect(blueCoords.x).toEqual(1.0 / atlasWidth);
        expect(blueCoords.y).toEqual(0.0 / atlasHeight);
        expect(blueCoords.width).toEqual(1.0 / atlasWidth);
        expect(blueCoords.height).toEqual(1.0 / atlasHeight);
    });

    it('renders a two image atlas', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(2, 2)});

        var texture = atlas.getTexture();
        var greenCoords = atlas.getTextureCoordinates()[0];
        var blueCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : (greenCoords.x + greenCoords.width / 2.0),
            y : (greenCoords.y + greenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (blueCoords.x + blueCoords.width / 2.0),
            y : (blueCoords.y + blueCoords.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('renders a four image atlas', function() {
        var images = [greenImage, blueImage, blueImage, greenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(2, 2)});

        var texture = atlas.getTexture();
        var c0 = atlas.getTextureCoordinates()[0];
        var c1 = atlas.getTextureCoordinates()[1];
        var c2 = atlas.getTextureCoordinates()[2];
        var c3 = atlas.getTextureCoordinates()[3];

        expect(atlas.getNumberOfImages()).toEqual(4);

        expect(draw.apply(this, [texture, {
            x : (c0.x + c0.width / 2.0),
            y : (c0.y + c0.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (c1.x + c1.width / 2.0),
            y : (c1.y + c1.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (c2.x + c2.width / 2.0),
            y : (c2.y + c2.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (c3.x + c3.width / 2.0),
            y : (c3.y + c3.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates a four image atlas with non-zero borderWidthInPixels', function() {
        var images = [greenImage, blueImage, greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : new Cartesian2(4, 4)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasWidth = 4.0;
        var atlasHeight = 4.0;
        expect(atlas.getBorderWidthInPixels()).toEqual(2);
        expect(atlas.getNumberOfImages()).toEqual(4);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[1].x).toEqual(3.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[1].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[2].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[2].y).toEqual(3.0 / atlasHeight);
        expect(coordinates[2].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[2].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[3].x).toEqual(3.0 / atlasWidth);
        expect(coordinates[3].y).toEqual(3.0 / atlasHeight);
        expect(coordinates[3].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[3].height).toEqual(1.0 / atlasHeight);
    });

    it('renders a four image atlas with non-zero borderWidthInPixels', function() {
        var images = [greenImage, blueImage, greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : new Cartesian2(4, 4)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(draw.apply(this, [texture, {
            x : (coordinates[0].x + coordinates[0].width / 2.0),
            y : (coordinates[0].y + coordinates[0].height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[1].x + coordinates[1].width / 2.0),
            y : (coordinates[1].y + coordinates[1].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[2].x + coordinates[2].width / 2.0),
            y : (coordinates[2].y + coordinates[2].height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[3].x + coordinates[3].width / 2.0),
            y : (coordinates[3].y + coordinates[3].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('creates an atlas with different image heights', function() {
        var images = [blueImage, tallGreenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(4, 4)});

        var texture = atlas.getTexture();
        var blueCoords = atlas.getTextureCoordinates()[0];
        var greenCoords = atlas.getTextureCoordinates()[1];

        var atlasWidth = 4.0;
        var atlasHeight = 4.0;
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);
        expect(atlas.getNumberOfImages()).toEqual(2);

        expect(blueCoords.x).toEqual(1.0 / atlasWidth);
        expect(blueCoords.y).toEqual(0.0 / atlasHeight);
        expect(blueCoords.width).toEqual(1.0 / atlasWidth);
        expect(blueCoords.height).toEqual(1.0 / atlasHeight);

        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(4.0 / atlasHeight);
    });

    it('renders an atlas with different image heights', function() {
        var images = [blueImage, tallGreenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(4, 4)});

        var texture = atlas.getTexture();
        var blueCoords = atlas.getTextureCoordinates()[0];
        var greenCoords = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : (blueCoords.x + blueCoords.width / 2.0),
            y : (blueCoords.y + blueCoords.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        var pixels = draw.apply(this, [texture, {
            x : (greenCoords.x + greenCoords.width / 2.0),
            y : (greenCoords.y + greenCoords.height / 2.0)
        }]);

        expect(pixels[0]).toEqual(0);
        expect(pixels[1]).toEqual(255);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('creates an atlas that adds images at different points in time', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(2, 2)});

        atlas.addImage(greenImage); // G1
        atlas.addImage(blueImage); // B1
        atlas.addImage(greenImage); // G2
        atlas.addImage(blueImage); // B2

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasWidth = 2.0;
        var atlasHeight = 2.0;
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);
        expect(atlas.getNumberOfImages()).toEqual(4);

        // first green image
        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        // first blue image
        expect(coordinates[1].x).toEqual(1.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[1].height).toEqual(1.0 / atlasHeight);

        // second green image
        expect(coordinates[2].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[2].y).toEqual(1.0 / atlasHeight);
        expect(coordinates[2].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[2].height).toEqual(1.0 / atlasHeight);

        // second blue image
        expect(coordinates[3].x).toEqual(1.0 / atlasWidth);
        expect(coordinates[3].y).toEqual(1.0 / atlasHeight);
        expect(coordinates[3].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[3].height).toEqual(1.0 / atlasHeight);
    });

    it('renders an atlas that adds images at different points in time', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(2, 2)});

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
            x : (firstGreenCoords.x + firstGreenCoords.width / 2.0),
            y : (firstGreenCoords.y + firstGreenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (firstBlueCoords.x + firstBlueCoords.width / 2.0),
            y : (firstBlueCoords.y + firstBlueCoords.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (secondGreenCoords.x + secondGreenCoords.width / 2.0),
            y : (secondGreenCoords.y + secondGreenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (secondBlueCoords.x + secondBlueCoords.width / 2.0),
            y : (secondBlueCoords.y + secondBlueCoords.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('creates an atlas that dynamically resizes', function() {
        atlas = context.createTextureAtlas({image : blueImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasWidth = 1.0;
        var atlasHeight = 1.0;
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        // blue image
        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        //Add the big green image
        atlas.addImage(bigGreenImage);
        texture = atlas.getTexture();
        coordinates = atlas.getTextureCoordinates();

        atlasWidth = 10.0;
        atlasHeight = 10.0;
        expect(atlas.getNumberOfImages()).toEqual(2);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        // blue image
        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        // big green image
        expect(coordinates[1].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(1.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(4.0 / atlasWidth);
        expect(coordinates[1].height).toEqual(4.0 / atlasHeight);
    });

    it('renders an atlas that dynamically resizes', function() {

        atlas = context.createTextureAtlas({image : blueImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];

        // blue image
        expect(draw.apply(this, [texture, {
            x : (blueCoordinates.x + blueCoordinates.width / 2.0),
            y : (blueCoordinates.y + blueCoordinates.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        //Add the big green image
        atlas.addImage(bigGreenImage);
        texture = atlas.getTexture();
        blueCoordinates = atlas.getTextureCoordinates()[0];
        var bigGreenCoordinates = atlas.getTextureCoordinates()[1];

        expect(draw.apply(this, [texture, {
            x : (blueCoordinates.x + blueCoordinates.width / 2.0),
            y : (blueCoordinates.y + blueCoordinates.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (bigGreenCoordinates.x + bigGreenCoordinates.width / 2.0),
            y : (bigGreenCoordinates.y + bigGreenCoordinates.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates an atlas with smaller initialSize than first image', function() {
        atlas = context.createTextureAtlas({image : bigRedImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasWidth = 32.0;
        var atlasHeight = 32.0;
        expect(atlas.getNumberOfImages()).toEqual(1);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(16.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(16.0 / atlasHeight);
    });

    it('renders an atlas with smaller initialSize than first image', function() {
        atlas = context.createTextureAtlas({image : bigRedImage, borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates()[0];

        expect(draw.apply(this, [texture, {
            x : (coordinates.x + coordinates.width / 2.0),
            y : (coordinates.y + coordinates.height / 2.0)
        }])).toEqual([255, 0, 0, 255]);
    });

    it('creates a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : new Cartesian2(2, 2)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasWidth = 10.0;
        var atlasHeight = 10.0;
        expect(atlas.getBorderWidthInPixels()).toEqual(2);
        expect(atlas.getNumberOfImages()).toEqual(2);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[1].x).toEqual(4.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[1].height).toEqual(1.0 / atlasHeight);
    });

    it('renders a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        var images = [greenImage, blueImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 2, initialSize : new Cartesian2(2, 2)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        expect(draw.apply(this, [texture, {
            x : (coordinates[0].x + coordinates[0].width / 2.0),
            y : (coordinates[0].y + coordinates[0].height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[1].x + coordinates[1].width / 2.0),
            y : (coordinates[1].y + coordinates[1].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('creates a two image atlas with non-square initialSize that resizes', function() {
        var images = [tallGreenImage, tallGreenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(1.0, 4.0)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasWidth = 4;
        var atlasHeight = 16;
        expect(atlas.getNumberOfImages()).toEqual(2);
        expect(texture.getWidth()).toEqual(atlasWidth);
        expect(texture.getHeight()).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(4.0 / atlasHeight);

        expect(coordinates[1].x).toEqual(1.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[1].height).toEqual(4.0 / atlasHeight);
    });

    it('renders a two image atlas with non-square initialSize that resizes', function() {
        var images = [tallGreenImage, tallGreenImage];
        atlas = context.createTextureAtlas({images : images, borderWidthInPixels : 0, initialSize : new Cartesian2(1.0, 4.0)});

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var pixels1 = draw.apply(this, [texture, {
            x : (coordinates[0].x + coordinates[0].width / 2.0),
            y : (coordinates[0].y + coordinates[0].height / 2.0)
        }]);

        var pixels2 = draw.apply(this, [texture, {
            x : (coordinates[1].x + coordinates[1].width / 2.0),
            y : (coordinates[1].y + coordinates[1].height / 2.0)
        }]);

        expect(pixels1[0]).toEqual(0);
        expect(pixels1[1]).toEqual(255);
        expect(pixels1[2]).toEqual(0);
        expect(pixels1[3]).toEqual(255);

        expect(pixels2[0]).toEqual(0);
        expect(pixels2[1]).toEqual(255);
        expect(pixels2[2]).toEqual(0);
        expect(pixels2[3]).toEqual(255);
    });

    it('creates an atlas that dynamically resizes twice', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});
        atlas.addImage(blueImage);
        atlas.addImage(bigGreenImage);
        atlas.addImages([bigRedImage, bigRedImage, bigRedImage, bigRedImage, bigRedImage, bigRedImage]);
        atlas.addImages([bigGreenImage, bigGreenImage, bigGreenImage]);
        atlas.addImage(blueImage);
        atlas.addImages([bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage, bigBlueImage]);
        atlas.addImage(blueImage);

        var texture = atlas.getTexture();
        var coordinates = atlas.getTextureCoordinates();

        var atlasSize = blueImage.width; // 1
        atlasSize = 2.0 * (atlasSize + bigGreenImage.height); // 10
        atlasSize = 2.0 * (atlasSize + bigRedImage.height); // 52

        expect(atlas.getNumberOfImages()).toEqual(21);
        expect(texture.getWidth()).toEqual(atlasSize);
        expect(texture.getHeight()).toEqual(atlasSize);

        // blue image 1
        expect(coordinates[0].x).toEqual((0.0 / atlasSize));
        expect(coordinates[0].y).toEqual((0.0 / atlasSize));
        expect(coordinates[0].width).toEqual((1.0 / atlasSize));
        expect(coordinates[0].height).toEqual((1.0 / atlasSize));

        // big green image 1
        expect(coordinates[1].x).toEqual((0.0 / atlasSize));
        expect(coordinates[1].y).toEqual((1.0 / atlasSize));
        expect(coordinates[1].width).toEqual((4.0 / atlasSize));
        expect(coordinates[1].height).toEqual((4.0 / atlasSize));

        // big red image 1
        expect(coordinates[2].x).toEqual((0.0 / atlasSize));
        expect(coordinates[2].y).toEqual((10.0 / atlasSize));
        expect(coordinates[2].width).toEqual((16.0 / atlasSize));
        expect(coordinates[2].height).toEqual((16.0 / atlasSize));

        // big red image 2
        expect(coordinates[3].x).toEqual((0.0 / atlasSize));
        expect(coordinates[3].y).toEqual((26.0 / atlasSize));
        expect(coordinates[3].width).toEqual((16.0 / atlasSize));
        expect(coordinates[3].height).toEqual((16.0 / atlasSize));

        // big red image 3
        expect(coordinates[4].x).toEqual((16.0 / atlasSize));
        expect(coordinates[4].y).toEqual((10.0 / atlasSize));
        expect(coordinates[4].width).toEqual((16.0 / atlasSize));
        expect(coordinates[4].height).toEqual((16.0 / atlasSize));

        // big red image 4
        expect(coordinates[5].x).toEqual((32.0 / atlasSize));
        expect(coordinates[5].y).toEqual((10.0 / atlasSize));
        expect(coordinates[5].width).toEqual((16.0 / atlasSize));
        expect(coordinates[5].height).toEqual((16.0 / atlasSize));

        // big red image 5
        expect(coordinates[6].x).toEqual((16.0 / atlasSize));
        expect(coordinates[6].y).toEqual((26.0 / atlasSize));
        expect(coordinates[6].width).toEqual((16.0 / atlasSize));
        expect(coordinates[6].height).toEqual((16.0 / atlasSize));

        // big red image 6
        expect(coordinates[7].x).toEqual((32.0 / atlasSize));
        expect(coordinates[7].y).toEqual((26.0 / atlasSize));
        expect(coordinates[7].width).toEqual((16.0 / atlasSize));
        expect(coordinates[7].height).toEqual((16.0 / atlasSize));

        // big green image 2
        expect(coordinates[8].x).toEqual((0.0 / atlasSize));
        expect(coordinates[8].y).toEqual((5.0 / atlasSize));
        expect(coordinates[8].width).toEqual((4.0 / atlasSize));
        expect(coordinates[8].height).toEqual((4.0 / atlasSize));

        // big green image 3
        expect(coordinates[9].x).toEqual((4.0 / atlasSize));
        expect(coordinates[9].y).toEqual((1.0 / atlasSize));
        expect(coordinates[9].width).toEqual((4.0 / atlasSize));
        expect(coordinates[9].height).toEqual((4.0 / atlasSize));

        // big green image 4
        expect(coordinates[10].x).toEqual((4.0 / atlasSize));
        expect(coordinates[10].y).toEqual((5.0 / atlasSize));
        expect(coordinates[10].width).toEqual((4.0 / atlasSize));
        expect(coordinates[10].height).toEqual((4.0 / atlasSize));

        // blue image 2
        expect(coordinates[11].x).toEqual((1.0 / atlasSize));
        expect(coordinates[11].y).toEqual((0.0 / atlasSize));
        expect(coordinates[11].width).toEqual((1.0 / atlasSize));
        expect(coordinates[11].height).toEqual((1.0 / atlasSize));

        // big blue image 1
        expect(coordinates[12].x).toEqual((10.0 / atlasSize));
        expect(coordinates[12].y).toEqual((0.0 / atlasSize));
        expect(coordinates[12].width).toEqual((10.0 / atlasSize));
        expect(coordinates[12].height).toEqual((10.0 / atlasSize));

        // big blue image 2
        expect(coordinates[13].x).toEqual((20.0 / atlasSize));
        expect(coordinates[13].y).toEqual((0.0 / atlasSize));
        expect(coordinates[13].width).toEqual((10.0 / atlasSize));
        expect(coordinates[13].height).toEqual((10.0 / atlasSize));

        // big blue image 3
        expect(coordinates[14].x).toEqual((30.0 / atlasSize));
        expect(coordinates[14].y).toEqual((0.0 / atlasSize));
        expect(coordinates[14].width).toEqual((10.0 / atlasSize));
        expect(coordinates[14].height).toEqual((10.0 / atlasSize));

        // big blue image 4
        expect(coordinates[15].x).toEqual((40.0 / atlasSize));
        expect(coordinates[15].y).toEqual((0.0 / atlasSize));
        expect(coordinates[15].width).toEqual((10.0 / atlasSize));
        expect(coordinates[15].height).toEqual((10.0 / atlasSize));

        // big blue image 5
        expect(coordinates[16].x).toEqual((0.0 / atlasSize));
        expect(coordinates[16].y).toEqual((42.0 / atlasSize));
        expect(coordinates[16].width).toEqual((10.0 / atlasSize));
        expect(coordinates[16].height).toEqual((10.0 / atlasSize));

        // big blue image 6
        expect(coordinates[17].x).toEqual((16.0 / atlasSize));
        expect(coordinates[17].y).toEqual((42.0 / atlasSize));
        expect(coordinates[17].width).toEqual((10.0 / atlasSize));
        expect(coordinates[17].height).toEqual((10.0 / atlasSize));

        // big blue image 7
        expect(coordinates[18].x).toEqual((32.0 / atlasSize));
        expect(coordinates[18].y).toEqual((42.0 / atlasSize));
        expect(coordinates[18].width).toEqual((10.0 / atlasSize));
        expect(coordinates[18].height).toEqual((10.0 / atlasSize));

        // big blue image 8
        expect(coordinates[19].x).toEqual((42.0 / atlasSize));
        expect(coordinates[19].y).toEqual((42.0 / atlasSize));
        expect(coordinates[19].width).toEqual((10.0 / atlasSize));
        expect(coordinates[19].height).toEqual((10.0 / atlasSize));

        // blue image 3
        expect(coordinates[20].x).toEqual((2.0 / atlasSize));
        expect(coordinates[20].y).toEqual((0.0 / atlasSize));
        expect(coordinates[20].width).toEqual((1.0 / atlasSize));
        expect(coordinates[20].height).toEqual((1.0 / atlasSize));
    });

    it('renders an atlas that dynamically resizes twice', function() {
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});
        atlas.addImage(blueImage);
        atlas.addImage(bigGreenImage);
        atlas.addImage(bigRedImage);

        var texture = atlas.getTexture();
        var blueCoordinates = atlas.getTextureCoordinates()[0];
        var bigGreenCoordinates = atlas.getTextureCoordinates()[1];
        var bigRedCoordinates = atlas.getTextureCoordinates()[2];

        expect(draw.apply(this, [texture, {
            x : (blueCoordinates.x + blueCoordinates.width / 2.0),
            y : (blueCoordinates.y + blueCoordinates.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (bigGreenCoordinates.x + bigGreenCoordinates.width / 2.0),
            y : (bigGreenCoordinates.y + bigGreenCoordinates.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (bigRedCoordinates.x + bigRedCoordinates.width / 2.0),
            y : (bigRedCoordinates.y + bigRedCoordinates.height / 2.0)
        }])).toEqual([255, 0, 0, 255]);
    });

    it('gets index after calling addImage and addImages', function() {
        var images = [blueImage, tallGreenImage];
        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(4, 4)});
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
            x : (coordinates[2].x + coordinates[2].width / 2.0),
            y : (coordinates[2].y + coordinates[2].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        var pixels = draw.apply(this, [texture, {
            x : (coordinates[3].x + coordinates[3].width / 2.0),
            y : (coordinates[3].y + coordinates[3].height / 2.0)
        }]);

        expect(pixels[0]).toEqual(0);
        expect(pixels[1]).toEqual(255);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('creates an atlas with subregions', function() {

        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        atlas.addSubRegions(greenImage, [
            { x:0.0, y:0.0, width:0.5, height:0.5 },
            { x:0.0, y:0.5, width:0.5, height:0.5 },
            { x:0.5, y:0.0, width:0.5, height:0.5 },
            { x:0.5, y:0.5, width:0.5, height:0.5 }
        ]);

        var coordinates = atlas.getTextureCoordinates();
        var atlasWidth = 1.0;
        var atlasHeight = 1.0;

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[1].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[1].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[2].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[2].y).toEqual(0.5 / atlasHeight);
        expect(coordinates[2].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[2].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[3].x).toEqual(0.5 / atlasWidth);
        expect(coordinates[3].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[3].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[3].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[4].x).toEqual(0.5 / atlasWidth);
        expect(coordinates[4].y).toEqual(0.5 / atlasHeight);
        expect(coordinates[4].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[4].height).toEqual(0.5 / atlasHeight);

        expect(atlas.getNumberOfImages()).toEqual(5);
    });

    it('creates an atlas that resizes with subregions', function() {

        atlas = context.createTextureAtlas({borderWidthInPixels : 0, initialSize : new Cartesian2(1, 1)});

        atlas.addSubRegions(greenImage, [
            { x:0.0, y:0.0, width:0.5, height:0.5 },
            { x:0.0, y:0.5, width:0.5, height:0.5 },
            { x:0.5, y:0.0, width:0.5, height:0.5 },
            { x:0.5, y:0.5, width:0.5, height:0.5 }
        ]);

        expect(atlas.getNumberOfImages()).toEqual(5);

        atlas.addImage(blueImage);
        expect(atlas.getNumberOfImages()).toEqual(6);

        var coordinates = atlas.getTextureCoordinates();
        var atlasWidth = 4.0;
        var atlasHeight = 4.0;

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[1].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[1].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[1].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[1].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[2].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[2].y).toEqual(0.5 / atlasHeight);
        expect(coordinates[2].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[2].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[3].x).toEqual(0.5 / atlasWidth);
        expect(coordinates[3].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[3].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[3].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[4].x).toEqual(0.5 / atlasWidth);
        expect(coordinates[4].y).toEqual(0.5 / atlasHeight);
        expect(coordinates[4].width).toEqual(0.5 / atlasWidth);
        expect(coordinates[4].height).toEqual(0.5 / atlasHeight);

        expect(coordinates[5].x).toEqual(1.0 / atlasWidth);
        expect(coordinates[5].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[5].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[5].height).toEqual(1.0 / atlasHeight);
    });

    it('GUID changes when atlas is modified', function() {
        atlas = context.createTextureAtlas();
        var guid1 = atlas.getGUID();

        atlas.addImage(greenImage);
        var guid2 = atlas.getGUID();
        expect(guid1).toNotEqual(guid2);

        atlas.addImages([blueImage, greenImage]);
        var guid3 = atlas.getGUID();
        expect(guid2).toNotEqual(guid3);

        atlas.addSubRegions(greenImage, [
            { x:0.0, y:0.0, width:0.5, height:0.5 },
            { x:0.0, y:0.5, width:0.5, height:0.5 },
            { x:0.5, y:0.0, width:0.5, height:0.5 },
            { x:0.5, y:0.5, width:0.5, height:0.5 }
        ]);
        var guid4 = atlas.getGUID();
        expect(guid3).toNotEqual(guid4);
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
            atlas = context.createTextureAtlas({initialSize : new Cartesian2(0, 0)});
        }).toThrow();
    });

    it('throws without context', function() {
        expect(function() {
            return new TextureAtlas();
        }).toThrow();
    });
}, 'WebGL');