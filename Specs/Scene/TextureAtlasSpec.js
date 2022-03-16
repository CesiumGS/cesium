import { BoundingRectangle } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { createGuid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TextureAtlas } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe(
  "Scene/TextureAtlas",
  function () {
    let scene;
    let atlas;
    let greenImage;
    let tallGreenImage;
    let blueImage;
    let bigRedImage;
    let bigBlueImage;
    let bigGreenImage;

    let greenGuid;
    let tallGreenGuid;
    let blueGuid;
    let bigRedGuid;
    let bigBlueGuid;
    let bigGreenGuid;

    beforeAll(function () {
      scene = createScene();

      return Promise.all([
        Resource.fetchImage("./Data/Images/Green.png").then(function (image) {
          greenImage = image;
          greenGuid = createGuid();
        }),
        Resource.fetchImage("./Data/Images/Green1x4.png").then(function (
          image
        ) {
          tallGreenImage = image;
          tallGreenGuid = createGuid();
        }),
        Resource.fetchImage("./Data/Images/Blue.png").then(function (image) {
          blueImage = image;
          blueGuid = createGuid();
        }),
        Resource.fetchImage("./Data/Images/Red16x16.png").then(function (
          image
        ) {
          bigRedImage = image;
          bigRedGuid = createGuid();
        }),
        Resource.fetchImage("./Data/Images/Blue10x10.png").then(function (
          image
        ) {
          bigBlueImage = image;
          bigBlueGuid = createGuid();
        }),
        Resource.fetchImage("./Data/Images/Green4x4.png").then(function (
          image
        ) {
          bigGreenImage = image;
          bigGreenGuid = createGuid();
        }),
      ]);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      atlas = atlas && atlas.destroy();
    });

    function expectToRender(texture, textureCoordinates, expected) {
      const x = textureCoordinates.x + textureCoordinates.width / 2.0;
      const y = textureCoordinates.y + textureCoordinates.height / 2.0;
      const fs =
        `${
          "uniform sampler2D u_texture;" +
          "void main() {" +
          "  gl_FragColor = texture2D(u_texture, vec2("
        }${x}, ${y}));` + `}`;
      const uniformMap = {
        u_texture: function () {
          return texture;
        },
      };

      expect({
        context: scene.context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender(expected);
    }

    it("creates a single image atlas", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      return atlas.addImage(greenGuid, greenImage).then(function (index) {
        expect(index).toEqual(0);

        expect(atlas.numberOfImages).toEqual(1);
        expect(atlas.borderWidthInPixels).toEqual(0);

        const texture = atlas.texture;
        const atlasWidth = 2.0;
        const atlasHeight = 2.0;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        const coords = atlas.textureCoordinates[index];
        expect(coords.x).toEqual(0.0 / atlasWidth);
        expect(coords.y).toEqual(0.0 / atlasHeight);
        expect(coords.width).toEqual(1.0 / atlasWidth);
        expect(coords.height).toEqual(1.0 / atlasHeight);
      });
    });

    it("renders a single image atlas", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      return atlas.addImage(greenGuid, greenImage).then(function (index) {
        const texture = atlas.texture;
        const coords = atlas.textureCoordinates[index];

        expectToRender(texture, coords, [0, 255, 0, 255]);
      });
    });

    it("creates a single image atlas with default values", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });

      return atlas.addImage(greenGuid, greenImage).then(function (index) {
        expect(index).toEqual(0);

        expect(atlas.numberOfImages).toEqual(1);
        expect(atlas.borderWidthInPixels).toEqual(1);

        const texture = atlas.texture;

        const atlasWidth = 16.0;
        const atlasHeight = 16.0;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        const coords = atlas.textureCoordinates[index];
        expect(coords.x).toEqual(1.0 / atlasWidth);
        expect(coords.y).toEqual(1.0 / atlasHeight);
        expect(coords.width).toEqual(1.0 / atlasWidth);
        expect(coords.height).toEqual(1.0 / atlasHeight);
      });
    });

    it("renders a single image atlas with default values", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });

      return atlas.addImage(greenGuid, greenImage).then(function (index) {
        const texture = atlas.texture;
        const coords = atlas.textureCoordinates[index];

        expectToRender(texture, coords, [0, 255, 0, 255]);
      });
    });

    it("creates a single image atlas with non-square initialSize", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1.0, 5.0),
      });

      return atlas
        .addImage(tallGreenGuid, tallGreenImage)
        .then(function (index) {
          expect(index).toEqual(0);

          expect(atlas.numberOfImages).toEqual(1);

          const texture = atlas.texture;

          const atlasWidth = 2.0;
          const atlasHeight = 8.0;
          expect(texture.width).toEqual(atlasWidth);
          expect(texture.height).toEqual(atlasHeight);

          const coords = atlas.textureCoordinates[index];
          expect(coords.x).toEqual(0.0 / atlasWidth);
          expect(coords.y).toEqual(0.0 / atlasHeight);
          expect(coords.width).toEqual(1.0 / atlasWidth);
          expect(coords.height).toEqual(4.0 / atlasHeight);
        });
    });

    it("renders a single image atlas with non-square initialSize", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1.0, 5.0),
      });

      return atlas
        .addImage(tallGreenGuid, tallGreenImage)
        .then(function (index) {
          const texture = atlas.texture;
          const coords = atlas.textureCoordinates[index];

          expectToRender(texture, coords, [0, 255, 0, 255]);
        });
    });

    it("creates a two image atlas", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(2, 2),
      });

      const promises = [];
      promises.push(atlas.addImage(greenGuid, greenImage));
      promises.push(atlas.addImage(blueGuid, blueImage));

      return Promise.all(promises, function (indices) {
        const greenIndex = indices[0];
        const blueIndex = indices[1];

        expect(atlas.numberOfImages).toEqual(2);

        const texture = atlas.texture;
        const atlasWidth = 2.0;
        const atlasHeight = 2.0;
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        const greenCoords = atlas.textureCoordinates[greenIndex];
        expect(greenCoords.x).toEqual(0.0 / atlasWidth);
        expect(greenCoords.y).toEqual(0.0 / atlasHeight);
        expect(greenCoords.width).toEqual(1.0 / atlasWidth);
        expect(greenCoords.height).toEqual(1.0 / atlasHeight);

        const blueCoords = atlas.textureCoordinates[blueIndex];
        expect(blueCoords.x).toEqual(1.0 / atlasWidth);
        expect(blueCoords.y).toEqual(0.0 / atlasHeight);
        expect(blueCoords.width).toEqual(1.0 / atlasWidth);
        expect(blueCoords.height).toEqual(1.0 / atlasHeight);
      });
    });

    it("renders a two image atlas", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(2, 2),
      });

      const promises = [];
      promises.push(atlas.addImage(greenGuid, greenImage));
      promises.push(atlas.addImage(blueGuid, blueImage));

      return Promise.all(promises, function (indices) {
        const greenIndex = indices[0];
        const blueIndex = indices[1];

        const texture = atlas.texture;

        const greenCoords = atlas.textureCoordinates[greenIndex];
        expectToRender(texture, greenCoords, [0, 255, 0, 255]);

        const blueCoords = atlas.textureCoordinates[blueIndex];
        expectToRender(texture, blueCoords, [0, 0, 255, 255]);
      });
    });

    it("renders a four image atlas", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
      });

      const promises = [];
      promises.push(atlas.addImage(greenGuid, greenImage));
      promises.push(atlas.addImage(blueGuid, blueImage));
      promises.push(atlas.addImage(bigRedGuid, bigRedImage));
      promises.push(atlas.addImage(bigBlueGuid, bigBlueImage));

      return Promise.all(promises, function (indices) {
        const greenIndex = indices.shift();
        const blueIndex = indices.shift();
        const bigRedIndex = indices.shift();
        const bigBlueIndex = indices.shift();

        expect(atlas.numberOfImages).toEqual(4);

        const texture = atlas.texture;
        const c0 = atlas.textureCoordinates[greenIndex];
        const c1 = atlas.textureCoordinates[blueIndex];
        const c2 = atlas.textureCoordinates[bigRedIndex];
        const c3 = atlas.textureCoordinates[bigBlueIndex];

        expectToRender(texture, c0, [0, 255, 0, 255]);
        expectToRender(texture, c1, [0, 0, 255, 255]);
        expectToRender(texture, c2, [255, 0, 0, 255]);
        expectToRender(texture, c3, [0, 0, 255, 255]);
      });
    });

    it("creates a four image atlas with non-zero borderWidthInPixels", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 2,
      });

      const promises = [];
      promises.push(atlas.addImage(greenGuid, greenImage));
      promises.push(atlas.addImage(blueGuid, blueImage));
      promises.push(atlas.addImage(bigRedGuid, bigRedImage));
      promises.push(atlas.addImage(bigBlueGuid, bigBlueImage));

      return Promise.all(promises, function (indices) {
        const greenIndex = indices.shift();
        const blueIndex = indices.shift();
        const bigRedIndex = indices.shift();
        const bigBlueIndex = indices.shift();

        expect(atlas.borderWidthInPixels).toEqual(2);
        expect(atlas.numberOfImages).toEqual(4);

        const texture = atlas.texture;
        const c0 = atlas.textureCoordinates[greenIndex];
        const c1 = atlas.textureCoordinates[blueIndex];
        const c2 = atlas.textureCoordinates[bigRedIndex];
        const c3 = atlas.textureCoordinates[bigBlueIndex];

        const atlasWidth = 68.0;
        const atlasHeight = 68.0;
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(c0.x).toEqualEpsilon(2.0 / atlasWidth, CesiumMath.EPSILON16);
        expect(c0.y).toEqualEpsilon(2.0 / atlasHeight, CesiumMath.EPSILON16);
        expect(c0.width).toEqualEpsilon(
          greenImage.width / atlasWidth,
          CesiumMath.EPSILON16
        );
        expect(c0.height).toEqualEpsilon(
          greenImage.height / atlasHeight,
          CesiumMath.EPSILON16
        );

        expect(c1.x).toEqualEpsilon(
          (greenImage.width + 2 * atlas.borderWidthInPixels) / atlasWidth,
          CesiumMath.EPSILON16
        );
        expect(c1.y).toEqualEpsilon(2.0 / atlasHeight, CesiumMath.EPSILON16);
        expect(c1.width).toEqualEpsilon(
          blueImage.width / atlasWidth,
          CesiumMath.EPSILON16
        );
        expect(c1.height).toEqualEpsilon(
          blueImage.width / atlasHeight,
          CesiumMath.EPSILON16
        );

        expect(c2.x).toEqualEpsilon(2.0 / atlasWidth, CesiumMath.EPSILON16);
        expect(c2.y).toEqualEpsilon(
          (bigRedImage.height + atlas.borderWidthInPixels) / atlasHeight,
          CesiumMath.EPSILON16
        );
        expect(c2.width).toEqualEpsilon(
          bigRedImage.width / atlasWidth,
          CesiumMath.EPSILON16
        );
        expect(c2.height).toEqualEpsilon(
          bigRedImage.height / atlasHeight,
          CesiumMath.EPSILON16
        );

        expect(c3.x).toEqualEpsilon(2.0 / atlasWidth, CesiumMath.EPSILON16);
        expect(c3.y).toEqualEpsilon(
          (greenImage.height + 2 * atlas.borderWidthInPixels) / atlasHeight,
          CesiumMath.EPSILON16
        );
        expect(c3.width).toEqualEpsilon(
          bigBlueImage.width / atlasWidth,
          CesiumMath.EPSILON16
        );
        expect(c3.height).toEqualEpsilon(
          bigBlueImage.height / atlasHeight,
          CesiumMath.EPSILON16
        );
      });
    });

    it("renders a four image atlas with non-zero borderWidthInPixels", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 2,
      });

      const promises = [];
      promises.push(atlas.addImage(greenGuid, greenImage));
      promises.push(atlas.addImage(blueGuid, blueImage));
      promises.push(atlas.addImage(bigRedGuid, bigRedImage));
      promises.push(atlas.addImage(bigBlueGuid, bigBlueImage));

      return Promise.all(promises, function (indices) {
        const greenIndex = indices.shift();
        const blueIndex = indices.shift();
        const bigRedIndex = indices.shift();
        const bigBlueIndex = indices.shift();

        expect(atlas.numberOfImages).toEqual(4);

        const texture = atlas.texture;
        const c0 = atlas.textureCoordinates[greenIndex];
        const c1 = atlas.textureCoordinates[blueIndex];
        const c2 = atlas.textureCoordinates[bigRedIndex];
        const c3 = atlas.textureCoordinates[bigBlueIndex];

        expectToRender(texture, c0, [0, 255, 0, 255]);
        expectToRender(texture, c1, [0, 0, 255, 255]);
        expectToRender(texture, c2, [255, 0, 0, 255]);
        expectToRender(texture, c3, [0, 0, 255, 255]);
      });
    });

    it("creates an atlas that dynamically resizes", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      return atlas.addImage(blueGuid, blueImage).then(function (blueIndex) {
        expect(atlas.numberOfImages).toEqual(1);

        const texture = atlas.texture;
        const coordinates = atlas.textureCoordinates;

        const atlasWidth = 2.0;
        const atlasHeight = 2.0;
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        // blue image
        expect(coordinates[blueIndex].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[blueIndex].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);

        //Add the big green image
        return atlas
          .addImage(bigGreenGuid, bigGreenImage)
          .then(function (greenIndex) {
            expect(atlas.numberOfImages).toEqual(2);

            const texture = atlas.texture;
            const coordinates = atlas.textureCoordinates;

            const atlasWidth = 12.0;
            const atlasHeight = 12.0;
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

    it("renders an atlas that dynamically resizes", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      return atlas.addImage(blueGuid, blueImage).then(function (blueIndex) {
        expect(atlas.numberOfImages).toEqual(1);

        const texture = atlas.texture;
        const coordinates = atlas.textureCoordinates;

        const blueCoords = coordinates[blueIndex];
        expectToRender(texture, blueCoords, [0, 0, 255, 255]);

        return atlas
          .addImage(bigGreenGuid, bigGreenImage)
          .then(function (greenIndex) {
            expect(atlas.numberOfImages).toEqual(2);

            const texture = atlas.texture;
            const coordinates = atlas.textureCoordinates;

            const blueCoords = coordinates[blueIndex];
            expectToRender(texture, blueCoords, [0, 0, 255, 255]);

            const greenCoords = coordinates[greenIndex];
            expectToRender(texture, greenCoords, [0, 255, 0, 255]);
          });
      });
    });

    it("creates an atlas with smaller initialSize than first image", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      return atlas.addImage(bigRedGuid, bigRedImage).then(function (index) {
        expect(atlas.numberOfImages).toEqual(1);

        const texture = atlas.texture;
        const coordinates = atlas.textureCoordinates;

        const atlasWidth = 32.0;
        const atlasHeight = 32.0;
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(coordinates[index].x).toEqual(0.0 / atlasWidth);
        expect(coordinates[index].y).toEqual(0.0 / atlasHeight);
        expect(coordinates[index].width).toEqual(16.0 / atlasWidth);
        expect(coordinates[index].height).toEqual(16.0 / atlasHeight);
      });
    });

    it("renders an atlas with smaller initialSize than first image", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      return atlas.addImage(bigRedGuid, bigRedImage).then(function (index) {
        const texture = atlas.texture;
        const coords = atlas.textureCoordinates[index];

        expectToRender(texture, coords, [255, 0, 0, 255]);
      });
    });

    it("creates a two image atlas with non-zero borderWidthInPixels that resizes", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 2,
        initialSize: new Cartesian2(2, 2),
      });

      const greenPromise = atlas.addImage(greenGuid, greenImage);
      const bluePromise = atlas.addImage(blueGuid, blueImage);

      return Promise.all([greenPromise, bluePromise], function (indices) {
        const greenIndex = indices.shift();
        const blueIndex = indices.shift();

        const texture = atlas.texture;
        const coordinates = atlas.textureCoordinates;

        const atlasWidth = 10.0;
        const atlasHeight = 10.0;
        expect(atlas.borderWidthInPixels).toEqual(2);
        expect(atlas.numberOfImages).toEqual(2);
        expect(texture.width).toEqual(atlasWidth);
        expect(texture.height).toEqual(atlasHeight);

        expect(coordinates[greenIndex].x).toEqual(
          atlas.borderWidthInPixels / atlasWidth
        );
        expect(coordinates[greenIndex].y).toEqual(
          atlas.borderWidthInPixels / atlasHeight
        );
        expect(coordinates[greenIndex].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[greenIndex].height).toEqual(1.0 / atlasHeight);

        expect(coordinates[blueIndex].x).toEqual(5.0 / atlasWidth);
        expect(coordinates[blueIndex].y).toEqual(2.0 / atlasHeight);
        expect(coordinates[blueIndex].width).toEqual(1.0 / atlasWidth);
        expect(coordinates[blueIndex].height).toEqual(1.0 / atlasHeight);
      });
    });

    it("renders a two image atlas with non-zero borderWidthInPixels that resizes", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 2,
        initialSize: new Cartesian2(2, 2),
      });

      const greenPromise = atlas.addImage(greenGuid, greenImage);
      const bluePromise = atlas.addImage(blueGuid, blueImage);

      return Promise.all([greenPromise, bluePromise], function (indices) {
        const greenIndex = indices.shift();
        const blueIndex = indices.shift();

        const texture = atlas.texture;
        const coordinates = atlas.textureCoordinates;

        const greenCoords = coordinates[greenIndex];
        const blueCoords = coordinates[blueIndex];

        expectToRender(texture, greenCoords, [0, 255, 0, 255]);
        expectToRender(texture, blueCoords, [0, 0, 255, 255]);
      });
    });

    it("creates an atlas with non-square initialSize that resizes", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1.0, 1.0),
      });

      return atlas
        .addImage(tallGreenGuid, tallGreenImage)
        .then(function (index) {
          expect(atlas.numberOfImages).toEqual(1);

          const texture = atlas.texture;
          const coordinates = atlas.textureCoordinates;

          const atlasWidth = 2;
          const atlasHeight = 8;
          expect(texture.width).toEqual(atlasWidth);
          expect(texture.height).toEqual(atlasHeight);

          expect(coordinates[index].x).toEqual(0.0 / atlasWidth);
          expect(coordinates[index].y).toEqual(0.0 / atlasHeight);
          expect(coordinates[index].width).toEqual(
            tallGreenImage.width / atlasWidth
          );
          expect(coordinates[index].height).toEqual(
            tallGreenImage.height / atlasHeight
          );
        });
    });

    it("renders an atlas with non-square initialSize that resizes", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1.0, 1.0),
      });

      return atlas
        .addImage(tallGreenGuid, tallGreenImage)
        .then(function (index) {
          const texture = atlas.texture;
          const coords = atlas.textureCoordinates[index];

          expectToRender(texture, coords, [0, 255, 0, 255]);
        });
    });

    it("renders an atlas that dynamically resizes twice", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      const bluePromise = atlas.addImage(blueGuid, blueImage);
      const bigGreenPromise = atlas.addImage(bigGreenGuid, bigGreenImage);
      const bigRedPromise = atlas.addImage(bigRedGuid, bigRedImage);

      return Promise.all(
        [bluePromise, bigGreenPromise, bigRedPromise],
        function (indices) {
          const blueIndex = indices.shift();
          const bigGreenIndex = indices.shift();
          const bigRedIndex = indices.shift();

          const texture = atlas.texture;
          const blueCoordinates = atlas.textureCoordinates[blueIndex];
          const bigGreenCoordinates = atlas.textureCoordinates[bigGreenIndex];
          const bigRedCoordinates = atlas.textureCoordinates[bigRedIndex];

          expectToRender(texture, blueCoordinates, [0, 0, 255, 255]);
          expectToRender(texture, bigGreenCoordinates, [0, 255, 0, 255]);
          expectToRender(texture, bigRedCoordinates, [255, 0, 0, 255]);
        }
      );
    });

    it("promise resolves to index after calling addImage with Image", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(4, 4),
      });

      return atlas.addImage(blueGuid, blueImage).then(function (blueIndex) {
        expect(blueIndex).toEqual(0);

        return atlas
          .addImage(greenGuid, greenImage)
          .then(function (greenIndex) {
            expect(greenIndex).toEqual(1);

            return atlas.addImage(blueGuid, blueImage).then(function (index) {
              expect(index).toEqual(blueIndex);

              expect(atlas.numberOfImages).toEqual(2);

              const texture = atlas.texture;
              const coordinates = atlas.textureCoordinates;

              const blueCoordinates = coordinates[blueIndex];
              const greenCoordinates = coordinates[greenIndex];

              expectToRender(texture, blueCoordinates, [0, 0, 255, 255]);
              expectToRender(texture, greenCoordinates, [0, 255, 0, 255]);
            });
          });
      });
    });

    it("creates an atlas with subregions", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      atlas.addImage(greenGuid, greenImage);

      const promise1 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.0, 0.0, 0.5, 0.5)
      );
      const promise2 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.0, 0.5, 0.5, 0.5)
      );
      const promise3 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.5, 0.0, 0.5, 0.5)
      );
      const promise4 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.5, 0.5, 0.5, 0.5)
      );

      return Promise.all([promise1, promise2, promise3, promise4], function (
        indices
      ) {
        const index1 = indices.shift();
        const index2 = indices.shift();
        const index3 = indices.shift();
        const index4 = indices.shift();

        expect(atlas.numberOfImages).toEqual(5);

        const coordinates = atlas.textureCoordinates;
        const atlasWidth = 2.0;
        const atlasHeight = 2.0;

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

    it("creates an atlas that resizes with subregions", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        borderWidthInPixels: 0,
        initialSize: new Cartesian2(1, 1),
      });

      atlas.addImage(greenGuid, greenImage);

      const promise1 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.0, 0.0, 0.5, 0.5)
      );
      const promise2 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.0, 0.5, 0.5, 0.5)
      );
      const promise3 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.5, 0.0, 0.5, 0.5)
      );
      const promise4 = atlas.addSubRegion(
        greenGuid,
        new BoundingRectangle(0.5, 0.5, 0.5, 0.5)
      );

      return Promise.all([promise1, promise2, promise3, promise4], function (
        indices
      ) {
        const index1 = indices.shift();
        const index2 = indices.shift();
        const index3 = indices.shift();
        const index4 = indices.shift();

        expect(atlas.numberOfImages).toEqual(5);

        return atlas.addImage(blueGuid, blueImage).then(function (blueIndex) {
          expect(atlas.numberOfImages).toEqual(6);

          const coordinates = atlas.textureCoordinates;
          const atlasWidth = 2.0;
          const atlasHeight = 2.0;

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

    it("creates a two image atlas using a url and a function", function () {
      atlas = new TextureAtlas({
        context: scene.context,
        pixelFormat: PixelFormat.RGBA,
        borderWidthInPixels: 0,
      });

      const greenUrl = "./Data/Images/Green.png";
      const greenPromise = atlas.addImage(greenUrl, greenUrl);

      const bluePromise = atlas.addImage("Blue Image", function (id) {
        expect(id).toEqual("Blue Image");
        return blueImage;
      });

      return Promise.all([greenPromise, bluePromise], function (results) {
        const greenIndex = results[0];
        const blueIndex = results[1];

        expect(atlas.numberOfImages).toEqual(2);

        const texture = atlas.texture;
        const coordinates = atlas.textureCoordinates;
        const blueCoordinates = coordinates[blueIndex];
        const greenCoordinates = coordinates[greenIndex];

        expectToRender(texture, blueCoordinates, [0, 0, 255, 255]);
        expectToRender(texture, greenCoordinates, [0, 255, 0, 255]);

        // after loading 'Blue Image', further adds should not call the function

        return atlas
          .addImage("Blue Image", function (id) {
            throw "should not get here";
          })
          .then(function (index) {
            expect(index).toEqual(blueIndex);
          });
      });
    });

    it("GUID changes when atlas is modified", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });

      const guid1 = atlas.guid;

      return atlas.addImage(greenGuid, greenImage).then(function (index) {
        const guid2 = atlas.guid;
        expect(guid1).not.toEqual(guid2);

        return atlas
          .addSubRegion(greenGuid, new BoundingRectangle(0.0, 0.0, 0.5, 0.5))
          .then(function (index) {
            const guid3 = atlas.guid;
            expect(guid2).not.toEqual(guid3);
          });
      });
    });

    it("throws with a negative borderWidthInPixels", function () {
      expect(function () {
        atlas = new TextureAtlas({
          context: scene.context,
          borderWidthInPixels: -1,
        });
      }).toThrowDeveloperError();
    });

    it("throws with a initialSize less than one", function () {
      expect(function () {
        atlas = new TextureAtlas({
          context: scene.context,
          initialSize: new Cartesian2(0, 0),
        });
      }).toThrowDeveloperError();
    });

    it("throws without context", function () {
      expect(function () {
        return new TextureAtlas({});
      }).toThrowDeveloperError();
    });

    it("addImage throws without id", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });
      expect(function () {
        atlas.addImage(undefined, blueImage);
      }).toThrowDeveloperError();
    });

    it("addImage throws without image", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });

      expect(function () {
        atlas.addImage("./Data/Images/Green.png", undefined);
      }).toThrowDeveloperError();
    });

    it("addSubRegion throws without id", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });

      expect(function () {
        atlas.addSubRegion(undefined, new BoundingRectangle());
      }).toThrowDeveloperError();
    });

    it("addSubRegion throws without subregion", function () {
      atlas = new TextureAtlas({
        context: scene.context,
      });

      expect(function () {
        atlas.addSubRegion("asdf", undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
