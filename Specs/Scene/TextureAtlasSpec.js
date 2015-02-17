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
        'Specs/waitsForPromise',
        'ThirdParty/when'
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
        waitsForPromise,
        when) {
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
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        if (!greenImage) {
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
        }
    });

    afterEach(function() {
        atlas = atlas && atlas.destroy();
    });

    function draw(texture, textureCoordinates) {
        var x = textureCoordinates.x + textureCoordinates.width / 2.0;
        var y = textureCoordinates.y + textureCoordinates.height / 2.0;

        var context = scene.context;
        var vs = '\
attribute vec4 position;\n\
void main() {\n\
  gl_PointSize = 1.0;\n\
  gl_Position = position;\n\
}';
        var fs = '\
uniform sampler2D u_texture;\n\
void main() {\n\
  gl_FragColor = texture2D(u_texture, vec2(' + x + ', ' + y + '));\n\
}';
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
    }

    it('creates a single image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var promise = atlas.addImage(greenImage.src, greenImage);

        waitsForPromise(promise, function(index) {
            expect(index).toEqual(0);

            expect(atlas.numberOfImages).toEqual(1);
            expect(atlas.borderWidthInPixels).toEqual(0);

            var texture = atlas.texture;
            var atlasWidth = 1.0;
            var atlasHeight = 1.0;
            expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            var coords = atlas.textureCoordinates[index];
            expect(coords.x).toEqual(0.0 / atlasWidth);
            expect(coords.y).toEqual(0.0 / atlasHeight);
            expect(coords.width).toEqual(1.0 / atlasWidth);
            expect(coords.height).toEqual(1.0 / atlasHeight);
        });
    });

    it('renders a single image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var promise = atlas.addImage(greenImage.src, greenImage);

        waitsForPromise(promise, function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expect(draw(texture, coords)).toEqual([0, 255, 0, 255]);
        });
    });

    it('creates a single image atlas with default values', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        var promise = atlas.addImage(greenImage.src, greenImage);

        waitsForPromise(promise, function(index) {
            expect(index).toEqual(0);

            expect(atlas.numberOfImages).toEqual(1);
            expect(atlas.borderWidthInPixels).toEqual(1);

            var texture = atlas.texture;

            var atlasWidth = 16.0;
            var atlasHeight = 16.0;
            expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            var coords = atlas.textureCoordinates[index];
            expect(coords.x).toEqual(0.0 / atlasWidth);
            expect(coords.y).toEqual(0.0 / atlasHeight);
            expect(coords.width).toEqual(1.0 / atlasWidth);
            expect(coords.height).toEqual(1.0 / atlasHeight);
        });
    });

    it('renders a single image atlas with default values', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        var promise = atlas.addImage(greenImage.src, greenImage);

        waitsForPromise(promise, function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expect(draw(texture, coords)).toEqual([0, 255, 0, 255]);
        });
    });

    it('creates a single image atlas with non-square initialSize', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 5.0)
        });

        var promise = atlas.addImage(tallGreenImage.src, tallGreenImage);

        waitsForPromise(promise, function(index) {
            expect(index).toEqual(0);

            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;

            var atlasWidth = 1.0;
            var atlasHeight = 5.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            var coords = atlas.textureCoordinates[index];
            expect(coords.x).toEqual(0.0 / atlasWidth);
            expect(coords.y).toEqual(0.0 / atlasHeight);
            expect(coords.width).toEqual(1.0 / atlasWidth);
            expect(coords.height).toEqual(4.0 / atlasHeight);
        });
    });

    it('renders a single image atlas with non-square initialSize', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 5.0)
        });

        var promise = atlas.addImage(tallGreenImage.src, tallGreenImage);

        waitsForPromise(promise, function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expect(draw(texture, coords)).toEqual([0, 255, 0, 255]);
        });
    });

    it('creates a two image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(2, 2)
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var greenIndex;

        waitsForPromise(greenPromise, function(index) {
            greenIndex = index;
        });

        var bluePromise;
        var blueIndex;

        runs(function() {
            bluePromise = atlas.addImage(blueImage.src, blueImage);

            waitsForPromise(bluePromise, function(index) {
                blueIndex = index;
            });
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(2);

            var texture = atlas.texture;
            var atlasWidth = 2.0;
            var atlasHeight = 2.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            var greenCoords = atlas.textureCoordinates[greenIndex];
            expect(greenCoords.x).toEqual(0.0 / atlasWidth);
            expect(greenCoords.y).toEqual(0.0 / atlasHeight);
            expect(greenCoords.width).toEqual(1.0 / atlasWidth);
            expect(greenCoords.height).toEqual(1.0 / atlasHeight);

            var blueCoords = atlas.textureCoordinates[blueIndex];
            expect(blueCoords.x).toEqual(1.0 / atlasWidth);
            expect(blueCoords.y).toEqual(0.0 / atlasHeight);
            expect(blueCoords.width).toEqual(1.0 / atlasWidth);
            expect(blueCoords.height).toEqual(1.0 / atlasHeight);
        });
    });

    it('renders a two image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(2, 2)
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var greenIndex;

        waitsForPromise(greenPromise, function(index) {
            greenIndex = index;
        });

        var bluePromise;
        var blueIndex;

        runs(function() {
            bluePromise = atlas.addImage(blueImage.src, blueImage);

            waitsForPromise(bluePromise, function(index) {
                blueIndex = index;
            });
        });

        runs(function() {
            var texture = atlas.texture;

            var greenCoords = atlas.textureCoordinates[greenIndex];
            expect(draw(texture, greenCoords)).toEqual([0, 255, 0, 255]);

            var blueCoords = atlas.textureCoordinates[blueIndex];
            expect(draw(texture, blueCoords)).toEqual([0, 0, 255, 255]);
        });
    });

    it('renders a four image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var bluePromise = atlas.addImage(blueImage.src, blueImage);
        var bigRedPromise = atlas.addImage(bigRedImage.src, bigRedImage);
        var bigBluePromise = atlas.addImage(bigBlueImage.src, bigBlueImage);

        var combinedPromise = when.all([greenPromise, bluePromise, bigRedPromise, bigBluePromise]);
        waitsForPromise(combinedPromise, function(indices) {
            var greenIndex = indices.shift();
            var blueIndex = indices.shift();
            var bigRedIndex = indices.shift();
            var bigBlueIndex = indices.shift();

            expect(atlas.numberOfImages).toEqual(4);

            var texture = atlas.texture;
            var c0 = atlas.textureCoordinates[greenIndex];
            var c1 = atlas.textureCoordinates[blueIndex];
            var c2 = atlas.textureCoordinates[bigRedIndex];
            var c3 = atlas.textureCoordinates[bigBlueIndex];

            expect(draw(texture, c0)).toEqual([0, 255, 0, 255]);
            expect(draw(texture, c1)).toEqual([0, 0, 255, 255]);
            expect(draw(texture, c2)).toEqual([255, 0, 0, 255]);
            expect(draw(texture, c3)).toEqual([0, 0, 255, 255]);
        });
    });

    it('creates a four image atlas with non-zero borderWidthInPixels', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var bluePromise = atlas.addImage(blueImage.src, blueImage);
        var bigRedPromise = atlas.addImage(bigRedImage.src, bigRedImage);
        var bigBluePromise = atlas.addImage(bigBlueImage.src, bigBlueImage);

        var combinedPromise = when.all([greenPromise, bluePromise, bigRedPromise, bigBluePromise]);
        waitsForPromise(combinedPromise, function(indices) {
            var greenIndex = indices.shift();
            var blueIndex = indices.shift();
            var bigRedIndex = indices.shift();
            var bigBlueIndex = indices.shift();

            expect(atlas.borderWidthInPixels).toEqual(2);
            expect(atlas.numberOfImages).toEqual(4);

            var texture = atlas.texture;
            var c0 = atlas.textureCoordinates[greenIndex];
            var c1 = atlas.textureCoordinates[blueIndex];
            var c2 = atlas.textureCoordinates[bigRedIndex];
            var c3 = atlas.textureCoordinates[bigBlueIndex];

            var atlasWidth = 68.0;
            var atlasHeight = 68.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            expect(c0.x).toEqualEpsilon(0.0 / atlasWidth, CesiumMath.EPSILON16);
            expect(c0.y).toEqualEpsilon(0.0 / atlasHeight, CesiumMath.EPSILON16);
            expect(c0.width).toEqualEpsilon(greenImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c0.height).toEqualEpsilon(greenImage.height / atlasHeight, CesiumMath.EPSILON16);

            expect(c1.x).toEqualEpsilon((greenImage.width + atlas.borderWidthInPixels) / atlasWidth, CesiumMath.EPSILON16);
            expect(c1.y).toEqualEpsilon(0.0 / atlasHeight, CesiumMath.EPSILON16);
            expect(c1.width).toEqualEpsilon(blueImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c1.height).toEqualEpsilon(blueImage.width / atlasHeight, CesiumMath.EPSILON16);

            expect(c2.x).toEqualEpsilon((bigRedImage.width + atlas.borderWidthInPixels) / atlasWidth, CesiumMath.EPSILON16);
            expect(c2.y).toEqualEpsilon(0.0 / atlasHeight, CesiumMath.EPSILON16);
            expect(c2.width).toEqualEpsilon(bigRedImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c2.height).toEqualEpsilon(bigRedImage.height / atlasHeight, CesiumMath.EPSILON16);

            expect(c3.x).toEqualEpsilon(0.0 / atlasWidth, CesiumMath.EPSILON16);
            expect(c3.y).toEqualEpsilon((greenImage.height + atlas.borderWidthInPixels) / atlasHeight, CesiumMath.EPSILON16);
            expect(c3.width).toEqualEpsilon(bigBlueImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c3.height).toEqualEpsilon(bigBlueImage.height / atlasHeight, CesiumMath.EPSILON16);
        });
    });

    it('renders a four image atlas with non-zero borderWidthInPixels', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var bluePromise = atlas.addImage(blueImage.src, blueImage);
        var bigRedPromise = atlas.addImage(bigRedImage.src, bigRedImage);
        var bigBluePromise = atlas.addImage(bigBlueImage.src, bigBlueImage);

        var combinedPromise = when.all([greenPromise, bluePromise, bigRedPromise, bigBluePromise]);
        waitsForPromise(combinedPromise, function(indices) {
            var greenIndex = indices.shift();
            var blueIndex = indices.shift();
            var bigRedIndex = indices.shift();
            var bigBlueIndex = indices.shift();

            expect(atlas.numberOfImages).toEqual(4);

            var texture = atlas.texture;
            var c0 = atlas.textureCoordinates[greenIndex];
            var c1 = atlas.textureCoordinates[blueIndex];
            var c2 = atlas.textureCoordinates[bigRedIndex];
            var c3 = atlas.textureCoordinates[bigBlueIndex];

            expect(draw(texture, c0)).toEqual([0, 255, 0, 255]);
            expect(draw(texture, c1)).toEqual([0, 0, 255, 255]);
            expect(draw(texture, c2)).toEqual([255, 0, 0, 255]);
            expect(draw(texture, c3)).toEqual([0, 0, 255, 255]);
        });
    });

    it('creates an atlas that dynamically resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var bluePromise = atlas.addImage(blueImage.src, blueImage);
        var blueIndex;

        waitsForPromise(bluePromise, function(index) {
            blueIndex = index;
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var atlasWidth = 1.0;
            var atlasHeight = 1.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            // blue image
            expect(coordinates[blueIndex].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
            expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);
        });

        var greenPromise;
        var greenIndex;
        runs(function() {
            //Add the big green image
            greenPromise = atlas.addImage(bigGreenImage.src, bigGreenImage);

            waitsForPromise(greenPromise, function(index) {
                greenIndex = index;
            });
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(2);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var atlasWidth = 10.0;
            var atlasHeight = 10.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            // blue image
            expect(coordinates[blueIndex].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
            expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);

            // big green image
            expect(coordinates[greenIndex].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[greenIndex].y).toEqual(1.0 / atlasHeight);
            expect(coordinates[greenIndex].width).toEqual(4.0 / atlasWidth);
            expect(coordinates[greenIndex].height).toEqual(4.0 / atlasHeight);
        });
    });

    it('renders an atlas that dynamically resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var bluePromise = atlas.addImage(blueImage.src, blueImage);
        var blueIndex;

        waitsForPromise(bluePromise, function(index) {
            blueIndex = index;
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var blueCoords = coordinates[blueIndex];
            expect(draw(texture, blueCoords)).toEqual([0, 0, 255, 255]);
        });

        var greenPromise;
        var greenIndex;
        runs(function() {
            //Add the big green image
            greenPromise = atlas.addImage(bigGreenImage.src, bigGreenImage);

            waitsForPromise(greenPromise, function(index) {
                greenIndex = index;
            });
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(2);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var blueCoords = coordinates[blueIndex];
            expect(draw(texture, blueCoords)).toEqual([0, 0, 255, 255]);

            var greenCoords = coordinates[greenIndex];
            expect(draw(texture, greenCoords)).toEqual([0, 255, 0, 255]);
        });
    });

    it('creates an atlas with smaller initialSize than first image', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var promise = atlas.addImage(bigRedImage.src, bigRedImage);

        waitsForPromise(promise, function(index) {
            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var atlasWidth = 32.0;
            var atlasHeight = 32.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            expect(coordinates[index].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[index].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[index].width).toEqual(16.0 / atlasWidth);
            expect(coordinates[index].height).toEqual(16.0 / atlasHeight);
        });
    });

    it('renders an atlas with smaller initialSize than first image', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var promise = atlas.addImage(bigRedImage.src, bigRedImage);

        waitsForPromise(promise, function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expect(draw(texture, coords)).toEqual([255, 0, 0, 255]);
        });
    });

    it('creates a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2,
            initialSize : new Cartesian2(2, 2)
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var bluePromise = atlas.addImage(blueImage.src, blueImage);

        var combinedPromise = when.all([greenPromise, bluePromise]);
        waitsForPromise(combinedPromise, function(indices) {
            var greenIndex = indices.shift();
            var blueIndex = indices.shift();

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var atlasWidth = 10.0;
            var atlasHeight = 10.0;
            expect(atlas.borderWidthInPixels).toEqual(2);
            expect(atlas.numberOfImages).toEqual(2);
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            expect(coordinates[greenIndex].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[greenIndex].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[greenIndex].width).toEqual(1.0 / atlasWidth);
            expect(coordinates[greenIndex].height).toEqual(1.0 / atlasHeight);

            expect(coordinates[blueIndex].x).toEqual(4.0 / atlasWidth);
            expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
            expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);
        });
    });

    it('renders a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2,
            initialSize : new Cartesian2(2, 2)
        });

        var greenPromise = atlas.addImage(greenImage.src, greenImage);
        var bluePromise = atlas.addImage(blueImage.src, blueImage);

        var combinedPromise = when.all([greenPromise, bluePromise]);
        waitsForPromise(combinedPromise, function(indices) {
            var greenIndex = indices.shift();
            var blueIndex = indices.shift();

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var greenCoords = coordinates[greenIndex];
            var blueCoords = coordinates[blueIndex];

            expect(draw(texture, greenCoords)).toEqual([0, 255, 0, 255]);
            expect(draw(texture, blueCoords)).toEqual([0, 0, 255, 255]);
        });
    });

    it('creates an atlas with non-square initialSize that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 1.0)
        });

        var promise = atlas.addImage(tallGreenImage.src, tallGreenImage);
        waitsForPromise(promise, function(index) {
            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var atlasWidth = 2;
            var atlasHeight = 8;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            expect(coordinates[index].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[index].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[index].width).toEqual(tallGreenImage.width / atlasWidth);
            expect(coordinates[index].height).toEqual(tallGreenImage.height / atlasHeight);
        });
    });

    it('renders an atlas with non-square initialSize that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 1.0)
        });

        var promise = atlas.addImage(tallGreenImage.src, tallGreenImage);
        waitsForPromise(promise, function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expect(draw(texture, coords)).toEqual([0, 255, 0, 255]);
        });
    });

    it('renders an atlas that dynamically resizes twice', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var bluePromise = atlas.addImage(blueImage.src, blueImage);
        var bigGreenPromise = atlas.addImage(bigGreenImage.src, bigGreenImage);
        var bigRedPromise = atlas.addImage(bigRedImage.src, bigRedImage);

        var combinedPromise = when.all([bluePromise, bigGreenPromise, bigRedPromise]);
        waitsForPromise(combinedPromise, function(indices) {
            var blueIndex = indices.shift();
            var bigGreenIndex = indices.shift();
            var bigRedIndex = indices.shift();

            var texture = atlas.texture;
            var blueCoordinates = atlas.textureCoordinates[blueIndex];
            var bigGreenCoordinates = atlas.textureCoordinates[bigGreenIndex];
            var bigRedCoordinates = atlas.textureCoordinates[bigRedIndex];

            expect(draw(texture, blueCoordinates)).toEqual([0, 0, 255, 255]);
            expect(draw(texture, bigGreenCoordinates)).toEqual([0, 255, 0, 255]);
            expect(draw(texture, bigRedCoordinates)).toEqual([255, 0, 0, 255]);
        });
    });

    it('promise resolves to index after calling addImage with Image', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(4, 4)
        });

        var promise = atlas.addImage(blueImage.src, blueImage);
        var blueIndex;

        waitsForPromise(promise, function(index) {
            expect(index).toEqual(0);
            blueIndex = index;
        });

        var greenIndex;
        runs(function() {
            promise = atlas.addImage(greenImage.src, greenImage);

            waitsForPromise(promise, function(index) {
                expect(index).toEqual(1);
                greenIndex = index;
            });
        });

        runs(function() {
            promise = atlas.addImage(blueImage.src, blueImage);

            waitsForPromise(promise, function(index) {
                expect(index).toEqual(blueIndex);
            });
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(2);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var blueCoordinates = coordinates[blueIndex];
            var greenCoordinates = coordinates[greenIndex];

            expect(draw(texture, blueCoordinates)).toEqual([0, 0, 255, 255]);
            expect(draw(texture, greenCoordinates)).toEqual([0, 255, 0, 255]);
        });
    });

    it('creates an atlas with subregions', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenImage.src, greenImage);

        var promise1 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.0, 0.5, 0.5));
        var promise2 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.5, 0.5, 0.5));
        var promise3 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.0, 0.5, 0.5));
        var promise4 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.5, 0.5, 0.5));

        var combinedPromise = when.all([promise1, promise2, promise3, promise4]);
        waitsForPromise(combinedPromise, function(indices) {
            var index1 = indices.shift();
            var index2 = indices.shift();
            var index3 = indices.shift();
            var index4 = indices.shift();

            expect(atlas.numberOfImages).toEqual(5);

            var coordinates = atlas.textureCoordinates;
            var atlasWidth = 1.0;
            var atlasHeight = 1.0;

            expect(coordinates[index1].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[index1].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[index1].width).toEqual(0.5 / atlasWidth);
            expect(coordinates[index1].height).toEqual(0.5 / atlasHeight);

            expect(coordinates[index2].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[index2].y).toEqual(0.5 / atlasHeight);
            expect(coordinates[index2].width).toEqual(0.5 / atlasWidth);
            expect(coordinates[index2].height).toEqual(0.5 / atlasHeight);

            expect(coordinates[index3].x).toEqual(0.5 / atlasWidth);
            expect(coordinates[index3].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[index3].width).toEqual(0.5 / atlasWidth);
            expect(coordinates[index3].height).toEqual(0.5 / atlasHeight);

            expect(coordinates[index4].x).toEqual(0.5 / atlasWidth);
            expect(coordinates[index4].y).toEqual(0.5 / atlasHeight);
            expect(coordinates[index4].width).toEqual(0.5 / atlasWidth);
            expect(coordinates[index4].height).toEqual(0.5 / atlasHeight);
        });
    });

    it('creates an atlas that resizes with subregions', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenImage.src, greenImage);

        var promise1 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.0, 0.5, 0.5));
        var promise2 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.5, 0.5, 0.5));
        var promise3 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.0, 0.5, 0.5));
        var promise4 = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.5, 0.5, 0.5, 0.5));

        var combinedPromise = when.all([promise1, promise2, promise3, promise4]);
        waitsForPromise(combinedPromise, function(indices) {
            var index1 = indices.shift();
            var index2 = indices.shift();
            var index3 = indices.shift();
            var index4 = indices.shift();

            expect(atlas.numberOfImages).toEqual(5);

            var bluePromise = atlas.addImage(blueImage.src, blueImage);
            waitsForPromise(bluePromise, function(blueIndex) {
                expect(atlas.numberOfImages).toEqual(6);

                var coordinates = atlas.textureCoordinates;
                var atlasWidth = 4.0;
                var atlasHeight = 4.0;

                expect(coordinates[index1].x).toEqual(0.0 / atlasWidth);
                expect(coordinates[index1].y).toEqual(0.0 / atlasHeight);
                expect(coordinates[index1].width).toEqual(0.5 / atlasWidth);
                expect(coordinates[index1].height).toEqual(0.5 / atlasHeight);

                expect(coordinates[index2].x).toEqual(0.0 / atlasWidth);
                expect(coordinates[index2].y).toEqual(0.5 / atlasHeight);
                expect(coordinates[index2].width).toEqual(0.5 / atlasWidth);
                expect(coordinates[index2].height).toEqual(0.5 / atlasHeight);

                expect(coordinates[index3].x).toEqual(0.5 / atlasWidth);
                expect(coordinates[index3].y).toEqual(0.0 / atlasHeight);
                expect(coordinates[index3].width).toEqual(0.5 / atlasWidth);
                expect(coordinates[index3].height).toEqual(0.5 / atlasHeight);

                expect(coordinates[index4].x).toEqual(0.5 / atlasWidth);
                expect(coordinates[index4].y).toEqual(0.5 / atlasHeight);
                expect(coordinates[index4].width).toEqual(0.5 / atlasWidth);
                expect(coordinates[index4].height).toEqual(0.5 / atlasHeight);

                expect(coordinates[blueIndex].x).toEqual(1.0 / atlasWidth);
                expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
                expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
                expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);
            });
        });
    });

    it('creates a two image atlas using a url and a function', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            pixelFormat : PixelFormat.RGBA,
            borderWidthInPixels : 0
        });

        var greenUrl = './Data/Images/Green.png';
        var greenPromise = atlas.addImage(greenUrl, greenUrl);

        var bluePromise = atlas.addImage('Blue Image', function(id) {
            expect(id).toEqual('Blue Image');
            return blueImage;
        });

        var greenIndex;
        waitsForPromise(greenPromise, function(index) {
            greenIndex = index;
        });

        var blueIndex;
        waitsForPromise(bluePromise, function(index) {
            blueIndex = index;
        });

        runs(function() {
            expect(atlas.numberOfImages).toEqual(2);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;
            var blueCoordinates = coordinates[blueIndex];
            var greenCoordinates = coordinates[greenIndex];

            expect(draw(texture, blueCoordinates)).toEqual([0, 0, 255, 255]);
            expect(draw(texture, greenCoordinates)).toEqual([0, 255, 0, 255]);

            // after loading 'Blue Image', further adds should not call the function

            bluePromise = atlas.addImage('Blue Image', function(id) {
                throw 'should not get here';
            });

            waitsForPromise(bluePromise, function(index) {
                expect(index).toEqual(blueIndex);
            });
        });
    });

    it('GUID changes when atlas is modified', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        var guid1 = atlas.guid;

        var promise = atlas.addImage(greenImage.src, greenImage);
        waitsForPromise(promise, function(index) {
            var guid2 = atlas.guid;
            expect(guid1).toNotEqual(guid2);

            promise = atlas.addSubRegion(greenImage.src, new BoundingRectangle(0.0, 0.0, 0.5, 0.5));
            waitsForPromise(promise, function(index) {
                var guid3 = atlas.guid;
                expect(guid2).toNotEqual(guid3);
            });
        });
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

    it('addImage throws without id', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });
        expect(function() {
            atlas.addImage(undefined, blueImage);
        }).toThrowDeveloperError();
    });

    it('addImage throws without image', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        expect(function() {
            atlas.addImage('./Data/Images/Green.png', undefined);
        }).toThrowDeveloperError();
    });

    it('addSubRegion throws without id', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        expect(function() {
            atlas.addSubRegion(undefined, new BoundingRectangle());
        }).toThrowDeveloperError();
    });

    it('addSubRegion throws without subregion', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        expect(function() {
            atlas.addSubRegion('asdf', undefined);
        }).toThrowDeveloperError();
    });
}, 'WebGL');