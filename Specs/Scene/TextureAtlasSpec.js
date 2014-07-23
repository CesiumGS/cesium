/*global defineSuite*/
defineSuite([
        'Scene/TextureAtlas',
        'Core/BoundingRectangle',
        'Core/Cartesian2',
        'Core/Math',
        'Core/PixelFormat',
        'Core/PrimitiveType',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        TextureAtlas,
        BoundingRectangle,
        Cartesian2,
        CesiumMath,
        PixelFormat,
        PrimitiveType,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var atlas;
    var greenImage;
    var tallGreenImage;
    var blueImage;
    var bigRedImage;
    var bigBlueImage;
    var bigGreenImage;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
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
        var context = scene.context;
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
        sp.allUniforms.u_texture.value = texture;

        var va = context.createVertexArray([{
            index : sp.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 255]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);

        sp = sp.destroy();
        va = va.destroy();

        return context.readPixels();
    };

    it('creates a single image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenImage, function(index) {});

        var texture = atlas.texture;
        var greenCoords = atlas.textureCoordinates[0];

        var atlasWidth = 1.0;
        var atlasHeight = 1.0;
        expect(atlas.borderWidthInPixels).toEqual(0);
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(atlas.numberOfImages).toEqual(1);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(1.0 / atlasHeight);
    });

    it('renders a single image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenImage, function(index) {});

        var texture = atlas.texture;
        var greenCoords = atlas.textureCoordinates[0];

        expect(draw.apply(this, [texture, {
            x : (greenCoords.x + greenCoords.width / 2.0),
            y : (greenCoords.y + greenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates a single image atlas with default values', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        atlas.addImage(greenImage, function(index) {});

        var texture = atlas.texture;
        var greenCoords = atlas.textureCoordinates[0];

        var atlasWidth = 16.0;
        var atlasHeight = 16.0;
        expect(atlas.borderWidthInPixels).toEqual(1);
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(atlas.numberOfImages).toEqual(1);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(1.0 / atlasHeight);
    });

    it('renders a single image atlas with default values', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        atlas.addImage(greenImage, function(index) {});

        var texture = atlas.texture;
        var greenCoords = atlas.textureCoordinates[0];

        expect(draw.apply(this, [texture, {
            x : (greenCoords.x + greenCoords.width / 2.0),
            y : (greenCoords.y + greenCoords.height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates a single image atlas with non-square initialSize', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 5.0)
        });

        atlas.addImage(tallGreenImage, function(index) {});

        var texture = atlas.texture;
        var tallGreenCoords = atlas.textureCoordinates[0];

        var atlasWidth = 1.0;
        var atlasHeight = 5.0;
        expect(atlas.numberOfImages).toEqual(1);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(tallGreenCoords.x).toEqual(0.0 / atlasWidth);
        expect(tallGreenCoords.y).toEqual(0.0 / atlasHeight);
        expect(tallGreenCoords.width).toEqual(1.0 / atlasWidth);
        expect(tallGreenCoords.height).toEqual(4.0 / atlasHeight);
    });

    it('renders a single image atlas with non-square initialSize', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 5.0)
        });

        atlas.addImage(tallGreenImage, function(index) {});

        var texture = atlas.texture;
        var tallGreenCoords = atlas.textureCoordinates[0];

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
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(2, 2)
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});

        var texture = atlas.texture;
        var greenCoords = atlas.textureCoordinates[0];
        var blueCoords = atlas.textureCoordinates[1];

        var atlasWidth = 2.0;
        var atlasHeight = 2.0;
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);
        expect(atlas.numberOfImages).toEqual(2);

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
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(2, 2)
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});

        var texture = atlas.texture;
        var greenCoords = atlas.textureCoordinates[0];
        var blueCoords = atlas.textureCoordinates[1];

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
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});
        atlas.addImage(bigRedImage, function(index) {});
        atlas.addImage(bigBlueImage, function(index) {});

        var texture = atlas.texture;
        var c0 = atlas.textureCoordinates[0];
        var c1 = atlas.textureCoordinates[1];
        var c2 = atlas.textureCoordinates[2];
        var c3 = atlas.textureCoordinates[3];

        expect(atlas.numberOfImages).toEqual(4);

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
        }])).toEqual([255, 0, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (c3.x + c3.width / 2.0),
            y : (c3.y + c3.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('creates a four image atlas with non-zero borderWidthInPixels', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});
        atlas.addImage(bigRedImage, function(index) {});
        atlas.addImage(bigBlueImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        var atlasWidth = 68.0;
        var atlasHeight = 68.0;
        expect(atlas.borderWidthInPixels).toEqual(2);
        expect(atlas.numberOfImages).toEqual(4);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqualEpsilon(0.0 / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[0].y).toEqualEpsilon(0.0 / atlasHeight, CesiumMath.EPSILON16);
        expect(coordinates[0].width).toEqualEpsilon(greenImage.width / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[0].height).toEqualEpsilon(greenImage.height / atlasHeight, CesiumMath.EPSILON16);

        expect(coordinates[1].x).toEqualEpsilon((greenImage.width + atlas.borderWidthInPixels) / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[1].y).toEqualEpsilon(0.0 / atlasHeight, CesiumMath.EPSILON16);
        expect(coordinates[1].width).toEqualEpsilon(blueImage.width / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[1].height).toEqualEpsilon(blueImage.width / atlasHeight, CesiumMath.EPSILON16);

        expect(coordinates[2].x).toEqualEpsilon((bigRedImage.width + atlas.borderWidthInPixels) / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[2].y).toEqualEpsilon(0.0 / atlasHeight, CesiumMath.EPSILON16);
        expect(coordinates[2].width).toEqualEpsilon(bigRedImage.width / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[2].height).toEqualEpsilon(bigRedImage.height / atlasHeight, CesiumMath.EPSILON16);

        expect(coordinates[3].x).toEqualEpsilon(0.0 / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[3].y).toEqualEpsilon((greenImage.height + atlas.borderWidthInPixels) / atlasHeight, CesiumMath.EPSILON16);
        expect(coordinates[3].width).toEqualEpsilon(bigBlueImage.width / atlasWidth, CesiumMath.EPSILON16);
        expect(coordinates[3].height).toEqualEpsilon(bigBlueImage.height / atlasHeight, CesiumMath.EPSILON16);
    });

    it('renders a four image atlas with non-zero borderWidthInPixels', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});
        atlas.addImage(bigRedImage, function(index) {});
        atlas.addImage(bigBlueImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

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
        }])).toEqual([255, 0, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[3].x + coordinates[3].width / 2.0),
            y : (coordinates[3].y + coordinates[3].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('creates an atlas that dynamically resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(blueImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        var atlasWidth = 1.0;
        var atlasHeight = 1.0;
        expect(atlas.numberOfImages).toEqual(1);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        // blue image
        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(1.0 / atlasHeight);

        //Add the big green image
        atlas.addImage(bigGreenImage, function(index) {});
        texture = atlas.texture;
        coordinates = atlas.textureCoordinates;

        atlasWidth = 10.0;
        atlasHeight = 10.0;
        expect(atlas.numberOfImages).toEqual(2);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

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
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(blueImage, function(index) {});

        var texture = atlas.texture;
        var blueCoordinates = atlas.textureCoordinates[0];

        // blue image
        expect(draw.apply(this, [texture, {
            x : (blueCoordinates.x + blueCoordinates.width / 2.0),
            y : (blueCoordinates.y + blueCoordinates.height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        //Add the big green image
        atlas.addImage(bigGreenImage, function(index) {});
        texture = atlas.texture;
        blueCoordinates = atlas.textureCoordinates[0];
        var bigGreenCoordinates = atlas.textureCoordinates[1];

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
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(bigRedImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        var atlasWidth = 32.0;
        var atlasHeight = 32.0;
        expect(atlas.numberOfImages).toEqual(1);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(16.0 / atlasWidth);
        expect(coordinates[0].height).toEqual(16.0 / atlasHeight);
    });

    it('renders an atlas with smaller initialSize than first image', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(bigRedImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates[0];

        expect(draw.apply(this, [texture, {
            x : (coordinates.x + coordinates.width / 2.0),
            y : (coordinates.y + coordinates.height / 2.0)
        }])).toEqual([255, 0, 0, 255]);
    });

    it('creates a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2,
            initialSize : new Cartesian2(2, 2)
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        var atlasWidth = 10.0;
        var atlasHeight = 10.0;
        expect(atlas.borderWidthInPixels).toEqual(2);
        expect(atlas.numberOfImages).toEqual(2);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

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
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2,
            initialSize : new Cartesian2(2, 2)
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addImage(blueImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        expect(draw.apply(this, [texture, {
            x : (coordinates[0].x + coordinates[0].width / 2.0),
            y : (coordinates[0].y + coordinates[0].height / 2.0)
        }])).toEqual([0, 255, 0, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[1].x + coordinates[1].width / 2.0),
            y : (coordinates[1].y + coordinates[1].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);
    });

    it('creates an atlas with non-square initialSize that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 1.0)
        });

        atlas.addImage(tallGreenImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        var atlasWidth = 2;
        var atlasHeight = 8;
        expect(atlas.numberOfImages).toEqual(1);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(coordinates[0].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[0].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[0].width).toEqual(tallGreenImage.width / atlasWidth);
        expect(coordinates[0].height).toEqual(tallGreenImage.height / atlasHeight);
    });

    it('renders an atlas with non-square initialSize that resizes', function() {
        var images = [tallGreenImage, tallGreenImage];
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 1.0)
        });

        atlas.addImage(tallGreenImage, function(index) {});

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        expect(draw.apply(this, [texture, {
            x : (coordinates[0].x + coordinates[0].width / 2.0),
            y : (coordinates[0].y + coordinates[0].height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('renders an atlas that dynamically resizes twice', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });
        atlas.addImage(blueImage, function(index) {});
        atlas.addImage(bigGreenImage, function(index) {});
        atlas.addImage(bigRedImage, function(index) {});

        var texture = atlas.texture;
        var blueCoordinates = atlas.textureCoordinates[0];
        var bigGreenCoordinates = atlas.textureCoordinates[1];
        var bigRedCoordinates = atlas.textureCoordinates[2];

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

    it('gets index after calling addImage', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(4, 4)
        });
        var index;

        atlas.addImage(blueImage, function(index) {
            expect(index).toEqual(0);
        });
        atlas.addImage(greenImage, function(index) {
            expect(index).toEqual(1);
        });
        atlas.addImage(blueImage, function(index) {
            expect(index).toEqual(0);
        });

        expect(atlas.numberOfImages).toEqual(2);

        var texture = atlas.texture;
        var coordinates = atlas.textureCoordinates;

        expect(draw.apply(this, [texture, {
            x : (coordinates[0].x + coordinates[0].width / 2.0),
            y : (coordinates[0].y + coordinates[0].height / 2.0)
        }])).toEqual([0, 0, 255, 255]);

        expect(draw.apply(this, [texture, {
            x : (coordinates[1].x + coordinates[1].width / 2.0),
            y : (coordinates[1].y + coordinates[1].height / 2.0)
        }])).toEqual([0, 255, 0, 255]);
    });

    it('creates an atlas with subregions', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.0, 0.5, 0.5), function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.5, 0.5, 0.5), function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.0, 0.5, 0.5), function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.5, 0.5, 0.5), function(index) {});

        var coordinates = atlas.textureCoordinates;
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

        expect(atlas.numberOfImages).toEqual(5);
    });

    it('creates an atlas that resizes with subregions', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenImage, function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.0, 0.5, 0.5), function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.5, 0.5, 0.5), function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.0, 0.5, 0.5), function(index) {});
        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.5, 0.5, 0.5), function(index) {});

        expect(atlas.numberOfImages).toEqual(5);

        atlas.addImage(blueImage, function(index) {});
        expect(atlas.numberOfImages).toEqual(6);

        var coordinates = atlas.textureCoordinates;
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
        atlas = new TextureAtlas({
            context : scene.context
        });
        var guid1 = atlas.guid;

        atlas.addImage(greenImage, function(index) {});
        var guid2 = atlas.guid;
        expect(guid1).toNotEqual(guid2);

        atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.0, 0.5, 0.5 ), function(index) {});
        var guid3 = atlas.guid;
        expect(guid2).toNotEqual(guid3);
    });

    it('throws without image', function() {
        atlas = new TextureAtlas({ context : scene.context });
       expect(function() {
           atlas.addImage();
       }).toThrowDeveloperError();
    });

    it('throws with a negative borderWidthInPixels', function() {
        expect(function() {
            atlas = new TextureAtlas({
                context : scene.context,
                borderWidthInPixels : -1
            });
        }).toThrowDeveloperError();
    });

    it('throws with a initialSize less than one', function() {
        expect(function() {
            atlas = new TextureAtlas({
                context : scene.context,
                initialSize : new Cartesian2(0, 0)
            });
        }).toThrowDeveloperError();
    });

    it('throws without context', function() {
        expect(function() {
            return new TextureAtlas({});
        }).toThrowDeveloperError();
    });
}, 'WebGL');