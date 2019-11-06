import { BoundingRectangle } from '../../Source/Cesium.js';
import { Cartesian2 } from '../../Source/Cesium.js';
import { createGuid } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { PixelFormat } from '../../Source/Cesium.js';
import { Resource } from '../../Source/Cesium.js';
import { TextureAtlas } from '../../Source/Cesium.js';
import createScene from '../createScene.js';
import { when } from '../../Source/Cesium.js';

describe('Scene/TextureAtlas', function() {

    var scene;
    var atlas;
    var greenImage;
    var tallGreenImage;
    var blueImage;
    var bigRedImage;
    var bigBlueImage;
    var bigGreenImage;

    var greenGuid;
    var tallGreenGuid;
    var blueGuid;
    var bigRedGuid;
    var bigBlueGuid;
    var bigGreenGuid;

    beforeAll(function() {
        scene = createScene();

        return when.join(
            Resource.fetchImage('./Data/Images/Green.png').then(function(image) {
                greenImage = image;
                greenGuid = createGuid();
            }),
            Resource.fetchImage('./Data/Images/Green1x4.png').then(function(image) {
                tallGreenImage = image;
                tallGreenGuid = createGuid();
            }),
            Resource.fetchImage('./Data/Images/Blue.png').then(function(image) {
                blueImage = image;
                blueGuid = createGuid();
            }),
            Resource.fetchImage('./Data/Images/Red16x16.png').then(function(image) {
                bigRedImage = image;
                bigRedGuid = createGuid();
            }),
            Resource.fetchImage('./Data/Images/Blue10x10.png').then(function(image) {
                bigBlueImage = image;
                bigBlueGuid = createGuid();
            }),
            Resource.fetchImage('./Data/Images/Green4x4.png').then(function(image) {
                bigGreenImage = image;
                bigGreenGuid = createGuid();
            }));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        atlas = atlas && atlas.destroy();
    });

    function expectToRender(texture, textureCoordinates, expected) {
        var x = textureCoordinates.x + textureCoordinates.width / 2.0;
        var y = textureCoordinates.y + textureCoordinates.height / 2.0;
        var fs =
            'uniform sampler2D u_texture;' +
            'void main() {' +
            '  gl_FragColor = texture2D(u_texture, vec2(' + x + ', ' + y + '));' +
            '}';
        var uniformMap = {
            u_texture : function() {
                return texture;
            }
        };

        expect({
            context : scene.context,
            fragmentShader : fs,
            uniformMap : uniformMap
        }).contextToRender(expected);
    }

    it('creates a single image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        return atlas.addImage(greenGuid, greenImage).then(function(index) {
            expect(index).toEqual(0);

            expect(atlas.numberOfImages).toEqual(1);
            expect(atlas.borderWidthInPixels).toEqual(0);

            var texture = atlas.texture;
            var atlasWidth = 2.0;
            var atlasHeight = 2.0;
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

        return atlas.addImage(greenGuid, greenImage).then(function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expectToRender(texture, coords, [0, 255, 0, 255]);
        });
    });

    it('creates a single image atlas with default values', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        return atlas.addImage(greenGuid, greenImage).then(function(index) {
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
            expect(coords.x).toEqual(1.0 / atlasWidth);
            expect(coords.y).toEqual(1.0 / atlasHeight);
            expect(coords.width).toEqual(1.0 / atlasWidth);
            expect(coords.height).toEqual(1.0 / atlasHeight);
        });
    });

    it('renders a single image atlas with default values', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        return atlas.addImage(greenGuid, greenImage).then(function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expectToRender(texture, coords, [0, 255, 0, 255]);
        });
    });

    it('creates a single image atlas with non-square initialSize', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 5.0)
        });

        return atlas.addImage(tallGreenGuid, tallGreenImage).then(function(index) {
            expect(index).toEqual(0);

            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;

            var atlasWidth = 2.0;
            var atlasHeight = 8.0;
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

        return atlas.addImage(tallGreenGuid, tallGreenImage).then(function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expectToRender(texture, coords, [0, 255, 0, 255]);
        });
    });

    it('creates a two image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(2, 2)
        });

        var promises = [];
        promises.push(atlas.addImage(greenGuid, greenImage));
        promises.push(atlas.addImage(blueGuid, blueImage));

        return when.all(promises, function(indices) {
            var greenIndex = indices[0];
            var blueIndex = indices[1];

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

        var promises = [];
        promises.push(atlas.addImage(greenGuid, greenImage));
        promises.push(atlas.addImage(blueGuid, blueImage));

        return when.all(promises, function(indices) {
            var greenIndex = indices[0];
            var blueIndex = indices[1];

            var texture = atlas.texture;

            var greenCoords = atlas.textureCoordinates[greenIndex];
            expectToRender(texture, greenCoords, [0, 255, 0, 255]);

            var blueCoords = atlas.textureCoordinates[blueIndex];
            expectToRender(texture, blueCoords, [0, 0, 255, 255]);
        });
    });

    it('renders a four image atlas', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0
        });

        var promises = [];
        promises.push(atlas.addImage(greenGuid, greenImage));
        promises.push(atlas.addImage(blueGuid, blueImage));
        promises.push(atlas.addImage(bigRedGuid, bigRedImage));
        promises.push(atlas.addImage(bigBlueGuid, bigBlueImage));

        return when.all(promises, function(indices) {
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

            expectToRender(texture, c0, [0, 255, 0, 255]);
            expectToRender(texture, c1, [0, 0, 255, 255]);
            expectToRender(texture, c2, [255, 0, 0, 255]);
            expectToRender(texture, c3, [0, 0, 255, 255]);
        });
    });

    it('creates a four image atlas with non-zero borderWidthInPixels', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2
        });

        var promises = [];
        promises.push(atlas.addImage(greenGuid, greenImage));
        promises.push(atlas.addImage(blueGuid, blueImage));
        promises.push(atlas.addImage(bigRedGuid, bigRedImage));
        promises.push(atlas.addImage(bigBlueGuid, bigBlueImage));

        return when.all(promises, function(indices) {
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

            expect(c0.x).toEqualEpsilon(2.0 / atlasWidth, CesiumMath.EPSILON16);
            expect(c0.y).toEqualEpsilon(2.0 / atlasHeight, CesiumMath.EPSILON16);
            expect(c0.width).toEqualEpsilon(greenImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c0.height).toEqualEpsilon(greenImage.height / atlasHeight, CesiumMath.EPSILON16);

            expect(c1.x).toEqualEpsilon((greenImage.width + 2 * atlas.borderWidthInPixels) / atlasWidth, CesiumMath.EPSILON16);
            expect(c1.y).toEqualEpsilon(2.0 / atlasHeight, CesiumMath.EPSILON16);
            expect(c1.width).toEqualEpsilon(blueImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c1.height).toEqualEpsilon(blueImage.width / atlasHeight, CesiumMath.EPSILON16);

            expect(c2.x).toEqualEpsilon(2.0 / atlasWidth, CesiumMath.EPSILON16);
            expect(c2.y).toEqualEpsilon((bigRedImage.height + atlas.borderWidthInPixels) / atlasHeight, CesiumMath.EPSILON16);
            expect(c2.width).toEqualEpsilon(bigRedImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c2.height).toEqualEpsilon(bigRedImage.height / atlasHeight, CesiumMath.EPSILON16);

            expect(c3.x).toEqualEpsilon(2.0 / atlasWidth, CesiumMath.EPSILON16);
            expect(c3.y).toEqualEpsilon((greenImage.height + 2 * atlas.borderWidthInPixels) / atlasHeight, CesiumMath.EPSILON16);
            expect(c3.width).toEqualEpsilon(bigBlueImage.width / atlasWidth, CesiumMath.EPSILON16);
            expect(c3.height).toEqualEpsilon(bigBlueImage.height / atlasHeight, CesiumMath.EPSILON16);
        });
    });

    it('renders a four image atlas with non-zero borderWidthInPixels', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2
        });

        var promises = [];
        promises.push(atlas.addImage(greenGuid, greenImage));
        promises.push(atlas.addImage(blueGuid, blueImage));
        promises.push(atlas.addImage(bigRedGuid, bigRedImage));
        promises.push(atlas.addImage(bigBlueGuid, bigBlueImage));

        return when.all(promises, function(indices) {
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

            expectToRender(texture, c0, [0, 255, 0, 255]);
            expectToRender(texture, c1, [0, 0, 255, 255]);
            expectToRender(texture, c2, [255, 0, 0, 255]);
            expectToRender(texture, c3, [0, 0, 255, 255]);
        });
    });

    it('creates an atlas that dynamically resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        return atlas.addImage(blueGuid, blueImage).then(function(blueIndex) {
            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var atlasWidth = 2.0;
            var atlasHeight = 2.0;
            expect(texture.width).toEqual(atlasWidth);
            expect(texture.height).toEqual(atlasHeight);

            // blue image
            expect(coordinates[blueIndex].x).toEqual(0.0 / atlasWidth);
            expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
            expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
            expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);

            //Add the big green image
            return atlas.addImage(bigGreenGuid, bigGreenImage).then(function(greenIndex) {
                expect(atlas.numberOfImages).toEqual(2);

                var texture = atlas.texture;
                var coordinates = atlas.textureCoordinates;

                var atlasWidth = 12.0;
                var atlasHeight = 12.0;
                expect(texture.width).toEqual(atlasWidth);
                expect(texture.height).toEqual(atlasHeight);

                // blue image
                expect(coordinates[blueIndex].x).toEqual(0.0 / atlasWidth);
                expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
                expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
                expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);

                // big green image
                expect(coordinates[greenIndex].x).toEqual(0.0 / atlasWidth);
                expect(coordinates[greenIndex].y).toEqual(2.0 / atlasHeight);
                expect(coordinates[greenIndex].width).toEqual(4.0 / atlasWidth);
                expect(coordinates[greenIndex].height).toEqual(4.0 / atlasHeight);
            });
        });
    });

    it('renders an atlas that dynamically resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        return atlas.addImage(blueGuid, blueImage).then(function(blueIndex) {
            expect(atlas.numberOfImages).toEqual(1);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var blueCoords = coordinates[blueIndex];
            expectToRender(texture, blueCoords, [0, 0, 255, 255]);

            return atlas.addImage(bigGreenGuid, bigGreenImage).then(function(greenIndex) {
                expect(atlas.numberOfImages).toEqual(2);

                var texture = atlas.texture;
                var coordinates = atlas.textureCoordinates;

                var blueCoords = coordinates[blueIndex];
                expectToRender(texture, blueCoords, [0, 0, 255, 255]);

                var greenCoords = coordinates[greenIndex];
                expectToRender(texture, greenCoords, [0, 255, 0, 255]);
            });
        });
    });

    it('creates an atlas with smaller initialSize than first image', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        return atlas.addImage(bigRedGuid, bigRedImage).then(function(index) {
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

        return atlas.addImage(bigRedGuid, bigRedImage).then(function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expectToRender(texture, coords, [255, 0, 0, 255]);
        });
    });

    it('creates a two image atlas with non-zero borderWidthInPixels that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 2,
            initialSize : new Cartesian2(2, 2)
        });

        var greenPromise = atlas.addImage(greenGuid, greenImage);
        var bluePromise = atlas.addImage(blueGuid, blueImage);

        return when.all([greenPromise, bluePromise], function(indices) {
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

            expect(coordinates[greenIndex].x).toEqual(atlas.borderWidthInPixels / atlasWidth);
            expect(coordinates[greenIndex].y).toEqual(atlas.borderWidthInPixels / atlasHeight);
            expect(coordinates[greenIndex].width).toEqual(1.0 / atlasWidth);
            expect(coordinates[greenIndex].height).toEqual(1.0 / atlasHeight);

            expect(coordinates[blueIndex].x).toEqual(5.0 / atlasWidth);
            expect(coordinates[blueIndex].y).toEqual(2.0 / atlasHeight);
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

        var greenPromise = atlas.addImage(greenGuid, greenImage);
        var bluePromise = atlas.addImage(blueGuid, blueImage);

        return when.all([greenPromise, bluePromise], function(indices) {
            var greenIndex = indices.shift();
            var blueIndex = indices.shift();

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;

            var greenCoords = coordinates[greenIndex];
            var blueCoords = coordinates[blueIndex];

            expectToRender(texture, greenCoords, [0, 255, 0, 255]);
            expectToRender(texture, blueCoords, [0, 0, 255, 255]);
        });
    });

    it('creates an atlas with non-square initialSize that resizes', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1.0, 1.0)
        });

        return atlas.addImage(tallGreenGuid, tallGreenImage).then(function(index) {
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

        return atlas.addImage(tallGreenGuid, tallGreenImage).then(function(index) {
            var texture = atlas.texture;
            var coords = atlas.textureCoordinates[index];

            expectToRender(texture, coords, [0, 255, 0, 255]);
        });
    });

    it('renders an atlas that dynamically resizes twice', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        var bluePromise = atlas.addImage(blueGuid, blueImage);
        var bigGreenPromise = atlas.addImage(bigGreenGuid, bigGreenImage);
        var bigRedPromise = atlas.addImage(bigRedGuid, bigRedImage);

        return when.all([bluePromise, bigGreenPromise, bigRedPromise], function(indices) {
            var blueIndex = indices.shift();
            var bigGreenIndex = indices.shift();
            var bigRedIndex = indices.shift();

            var texture = atlas.texture;
            var blueCoordinates = atlas.textureCoordinates[blueIndex];
            var bigGreenCoordinates = atlas.textureCoordinates[bigGreenIndex];
            var bigRedCoordinates = atlas.textureCoordinates[bigRedIndex];

            expectToRender(texture, blueCoordinates, [0, 0, 255, 255]);
            expectToRender(texture, bigGreenCoordinates, [0, 255, 0, 255]);
            expectToRender(texture, bigRedCoordinates, [255, 0, 0, 255]);
        });
    });

    it('promise resolves to index after calling addImage with Image', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(4, 4)
        });

        return atlas.addImage(blueGuid, blueImage).then(function(blueIndex) {
            expect(blueIndex).toEqual(0);

            return atlas.addImage(greenGuid, greenImage).then(function(greenIndex) {
                expect(greenIndex).toEqual(1);

                return atlas.addImage(blueGuid, blueImage).then(function(index) {
                    expect(index).toEqual(blueIndex);

                    expect(atlas.numberOfImages).toEqual(2);

                    var texture = atlas.texture;
                    var coordinates = atlas.textureCoordinates;

                    var blueCoordinates = coordinates[blueIndex];
                    var greenCoordinates = coordinates[greenIndex];

                    expectToRender(texture, blueCoordinates, [0, 0, 255, 255]);
                    expectToRender(texture, greenCoordinates, [0, 255, 0, 255]);
                });
            });
        });
    });

    it('creates an atlas with subregions', function() {
        atlas = new TextureAtlas({
            context : scene.context,
            borderWidthInPixels : 0,
            initialSize : new Cartesian2(1, 1)
        });

        atlas.addImage(greenGuid, greenImage);

        var promise1 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.0, 0.0, 0.5, 0.5));
        var promise2 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.0, 0.5, 0.5, 0.5));
        var promise3 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.5, 0.0, 0.5, 0.5));
        var promise4 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.5, 0.5, 0.5, 0.5));

        return when.all([promise1, promise2, promise3, promise4], function(indices) {
            var index1 = indices.shift();
            var index2 = indices.shift();
            var index3 = indices.shift();
            var index4 = indices.shift();

            expect(atlas.numberOfImages).toEqual(5);

            var coordinates = atlas.textureCoordinates;
            var atlasWidth = 2.0;
            var atlasHeight = 2.0;

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

        atlas.addImage(greenGuid, greenImage);

        var promise1 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.0, 0.0, 0.5, 0.5));
        var promise2 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.0, 0.5, 0.5, 0.5));
        var promise3 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.5, 0.0, 0.5, 0.5));
        var promise4 = atlas.addSubRegion(greenGuid, new BoundingRectangle(0.5, 0.5, 0.5, 0.5));

        return when.all([promise1, promise2, promise3, promise4], function(indices) {
            var index1 = indices.shift();
            var index2 = indices.shift();
            var index3 = indices.shift();
            var index4 = indices.shift();

            expect(atlas.numberOfImages).toEqual(5);

            return atlas.addImage(blueGuid, blueImage).then(function(blueIndex) {
                expect(atlas.numberOfImages).toEqual(6);

                var coordinates = atlas.textureCoordinates;
                var atlasWidth = 2.0;
                var atlasHeight = 2.0;

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

        return when.all([greenPromise, bluePromise], function(results) {
            var greenIndex = results[0];
            var blueIndex = results[1];

            expect(atlas.numberOfImages).toEqual(2);

            var texture = atlas.texture;
            var coordinates = atlas.textureCoordinates;
            var blueCoordinates = coordinates[blueIndex];
            var greenCoordinates = coordinates[greenIndex];

            expectToRender(texture, blueCoordinates, [0, 0, 255, 255]);
            expectToRender(texture, greenCoordinates, [0, 255, 0, 255]);

            // after loading 'Blue Image', further adds should not call the function

            return atlas.addImage('Blue Image', function(id) {
                throw 'should not get here';
            }).then(function(index) {
                expect(index).toEqual(blueIndex);
            });
        });
    });

    it('GUID changes when atlas is modified', function() {
        atlas = new TextureAtlas({
            context : scene.context
        });

        var guid1 = atlas.guid;

        return atlas.addImage(greenGuid, greenImage).then(function(index) {
            var guid2 = atlas.guid;
            expect(guid1).not.toEqual(guid2);

            return atlas.addSubRegion(greenGuid, new BoundingRectangle(0.0, 0.0, 0.5, 0.5)).then(function(index) {
                var guid3 = atlas.guid;
                expect(guid2).not.toEqual(guid3);
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
