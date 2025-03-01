import {
  BoundingRectangle,
  Cartesian2,
  createGuid,
  PixelFormat,
  Resource,
  TextureAtlas,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollWhilePromise from "../../../../Specs/pollWhilePromise.js";

describe("Scene/TextureAtlas", function () {
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
    return Promise.all([
      Resource.fetchImage("./Data/Images/Green.png").then(function (image) {
        greenImage = image;
        greenGuid = createGuid();
      }),
      Resource.fetchImage("./Data/Images/Green4x4.png").then(function (image) {
        bigGreenImage = image;
        bigGreenGuid = createGuid();
      }),
      Resource.fetchImage("./Data/Images/Green1x4.png").then(function (image) {
        tallGreenImage = image;
        tallGreenGuid = createGuid();
      }),
      Resource.fetchImage("./Data/Images/Blue.png").then(function (image) {
        blueImage = image;
        blueGuid = createGuid();
      }),
      Resource.fetchImage("./Data/Images/Red16x16.png").then(function (image) {
        bigRedImage = image;
        bigRedGuid = createGuid();
      }),
      Resource.fetchImage("./Data/Images/Blue10x10.png").then(function (image) {
        bigBlueImage = image;
        bigBlueGuid = createGuid();
      }),
    ]);
  });

  let atlas;
  afterEach(function () {
    atlas = atlas && atlas.destroy();
  });

  it("throws with a negative borderWidthInPixels", function () {
    expect(function () {
      atlas = new TextureAtlas({
        borderWidthInPixels: -1,
      });
    }).toThrowDeveloperError();
  });

  it("throws with a initialSize less than one", function () {
    expect(function () {
      atlas = new TextureAtlas({
        initialSize: new Cartesian2(0, 1),
      });
    }).toThrowDeveloperError();

    expect(function () {
      atlas = new TextureAtlas({
        initialSize: new Cartesian2(1, 0),
      });
    }).toThrowDeveloperError();
  });

  it("constructs with default parameters", function () {
    atlas = new TextureAtlas();

    expect(atlas.borderWidthInPixels).toEqual(1);
    expect(atlas.pixelFormat).toEqual(PixelFormat.RGBA);
  });

  it("constructs with parameters", function () {
    atlas = new TextureAtlas({
      pixelFormat: PixelFormat.RGB,
      borderWidthInPixels: 0,
    });

    expect(atlas.borderWidthInPixels).toEqual(0);
    expect(atlas.pixelFormat).toEqual(PixelFormat.RGB);
  });

  it("addImage throws without id", function () {
    atlas = new TextureAtlas();

    expect(function () {
      atlas.addImage(undefined, blueImage);
    }).toThrowDeveloperError();
  });

  it("addImage throws without image", function () {
    atlas = new TextureAtlas();

    expect(function () {
      atlas.addImage("./Data/Images/Green.png", undefined);
    }).toThrowDeveloperError();
  });

  it("add image throws if a promise returns undefined", async function () {
    atlas = new TextureAtlas();

    const promise = atlas.addImage(greenGuid, Promise.resolve());

    expect(atlas.numberOfImages).toEqual(1);
    await expectAsync(promise).toBeRejectedWithDeveloperError();
  });

  it("add image rejects if a promised image rejects", async function () {
    atlas = new TextureAtlas();

    const promise = atlas.addImage(greenGuid, Promise.reject());

    expect(atlas.numberOfImages).toEqual(1);
    await expectAsync(promise).toBeRejected();
  });

  it("add subregion throws without id", function () {
    atlas = new TextureAtlas();
    expect(() => {
      atlas.addImageSubRegion();
    }).toThrowDeveloperError();
  });

  it("add subregion throws without subregion", function () {
    atlas = new TextureAtlas();
    expect(() => {
      atlas.addImageSubRegion("xyz");
    }).toThrowDeveloperError();
  });

  it("add subregion throws if an image with specified id is not in atlas", function () {
    atlas = new TextureAtlas();
    expect(() => {
      atlas.addImageSubRegion("xyz", new BoundingRectangle());
    }).toThrowError();
  });

  it("destroys successfully while image is resolving", async function () {
    atlas = new TextureAtlas();

    const promise = atlas.addImage(greenGuid, greenImage);
    atlas.destroy();

    const index = await promise;

    expect(index).toEqual(-1);
    expect(atlas.isDestroyed()).toBeTrue();

    atlas = undefined;
  });

  describe(
    "with WebGL context",
    function () {
      let scene;
      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      function createRenderResources(texture, textureCoordinates) {
        const x = textureCoordinates.x + textureCoordinates.width / 2.0;
        const y = textureCoordinates.y + textureCoordinates.height / 2.0;
        const fs =
          `${
            "uniform sampler2D u_texture;" +
            "void main() {" +
            "  out_FragColor = texture(u_texture, vec2("
          }${x}, ${y}));` + `}`;
        const uniformMap = {
          u_texture: function () {
            return texture;
          },
        };

        return {
          context: scene.context,
          fragmentShader: fs,
          uniformMap: uniformMap,
        };
      }

      it("updates and creates rendering resources", function () {
        atlas = new TextureAtlas({
          pixelFormat: PixelFormat.RGB,
          initialSize: new Cartesian2(1, 1),
        });

        atlas.update(scene.frameState.context);

        expect(atlas.texture).toBeDefined();
        expect(atlas.texture.pixelFormat).toEqual(PixelFormat.RGB);
        expect(atlas.texture.width).toEqual(1);
        expect(atlas.texture.height).toEqual(1);
      });

      it("adds an image to an atlas", async function () {
        atlas = new TextureAtlas();

        const promise = atlas.addImage(greenGuid, greenImage);

        expect(atlas.numberOfImages).toEqual(1);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;

        expect(index).toEqual(0);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(16);
        expect(texture.height).toEqual(16);

        const coords = atlas.rectangles[index];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);
      });

      it("caches images with the same id", async function () {
        atlas = new TextureAtlas();

        const promiseA = atlas.addImage(greenGuid, greenImage);
        const promiseB = atlas.addImage(greenGuid, greenImage);

        expect(atlas.numberOfImages).toEqual(1);

        await pollWhilePromise(Promise.all([promiseA, promiseB]), () => {
          atlas.update(scene.frameState.context);
        });

        const indexA = await promiseA;
        const indexB = await promiseB;

        expect(indexA).toEqual(0);
        expect(indexB).toEqual(0);
      });

      it("adds a promised image to an atlas", async function () {
        atlas = new TextureAtlas();

        const promise = atlas.addImage(greenGuid, Promise.resolve(greenImage));

        expect(atlas.numberOfImages).toEqual(1);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;

        expect(index).toEqual(0);

        const coords = atlas.rectangles[index];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);
      });

      it("adds an image from a function to an atlas", async function () {
        atlas = new TextureAtlas();

        const spy = jasmine.createSpy("green_image");
        spy.and.returnValue(greenImage);

        const promise = atlas.addImage(greenGuid, spy);

        expect(atlas.numberOfImages).toEqual(1);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;

        expect(index).toEqual(0);
        expect(spy).toHaveBeenCalledWith(greenGuid);

        const coords = atlas.rectangles[index];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);
      });

      it("adds an image from a URL to an atlas", async function () {
        atlas = new TextureAtlas();

        const greenUrl = "./Data/Images/Green.png";

        const promise = atlas.addImage(greenUrl, greenUrl);

        expect(atlas.numberOfImages).toEqual(1);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;

        expect(index).toEqual(0);

        const coords = atlas.rectangles[index];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);
      });

      it("adds an image from a Resource to an atlas", async function () {
        atlas = new TextureAtlas();

        const greenResource = new Resource("./Data/Images/Green.png");

        const promise = atlas.addImage(greenResource.url, greenResource);

        expect(atlas.numberOfImages).toEqual(1);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;

        expect(index).toEqual(0);

        const coords = atlas.rectangles[index];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);
      });

      it("computes texture coordinates", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const promise = atlas.addImage(greenGuid, greenImage);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;

        const atlasWidth = 16;
        const atlasHeight = 16;

        const coords = atlas.computeTextureCoordinates(index);
        expect(coords.x).toEqual(0.0 / atlasWidth);
        expect(coords.y).toEqual(0.0 / atlasHeight);
        expect(coords.width).toEqual(1.0 / atlasWidth);
        expect(coords.height).toEqual(1.0 / atlasHeight);
      });

      it("renders a single image atlas", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const promise = atlas.addImage(greenGuid, greenImage);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;
        const texture = atlas.texture;
        const coords = atlas.computeTextureCoordinates(index);

        expect(createRenderResources(texture, coords)).contextToRender([
          0, 255, 0, 255,
        ]);
      });

      it("renders a single image atlas with a border", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 1,
        });

        const promise = atlas.addImage(greenGuid, greenImage);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;
        const texture = atlas.texture;
        const coords = atlas.computeTextureCoordinates(index);

        expect(createRenderResources(texture, coords)).contextToRender([
          0, 255, 0, 255,
        ]);
      });

      it("renders a single non-square image atlas with a border", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 1,
        });

        const promise = atlas.addImage(tallGreenGuid, tallGreenImage);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        const index = await promise;
        const texture = atlas.texture;
        const coords = atlas.computeTextureCoordinates(index);

        expect(createRenderResources(texture, coords)).contextToRender([
          0, 255, 0, 255,
        ]);
      });

      it("add image resizes the initial texture atlas if needed", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const promiseA = atlas.addImage(greenGuid, greenImage);
        const promiseB = atlas.addImage("Another image", greenImage);

        expect(atlas.numberOfImages).toEqual(2);

        await pollWhilePromise(Promise.all([promiseA, promiseB]), () => {
          atlas.update(scene.frameState.context);
        });

        const indexA = await promiseA;
        const indexB = await promiseB;

        expect(indexA).toEqual(0);
        expect(indexB).toEqual(1);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(2);
        expect(texture.height).toEqual(1);

        let coords = atlas.rectangles[indexA];
        expect(coords.x).toEqual(0);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        let textureCoordinates = atlas.computeTextureCoordinates(indexA);
        expect(textureCoordinates.x).toEqual(0);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(0.5);
        expect(textureCoordinates.height).toEqual(1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        coords = atlas.rectangles[indexB];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        textureCoordinates = atlas.computeTextureCoordinates(indexB);
        expect(textureCoordinates.x).toEqual(0.5);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(0.5);
        expect(textureCoordinates.height).toEqual(1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);
      });

      it("add image resizes the texture atlas if needed, copying existing images", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const promiseA = atlas.addImage(greenGuid, greenImage);

        await pollWhilePromise(promiseA, () => {
          atlas.update(scene.frameState.context);
        });

        const indexA = await promiseA;

        const promiseB = atlas.addImage("Another image", greenImage);

        await pollWhilePromise(promiseB, () => {
          atlas.update(scene.frameState.context);
        });

        const indexB = await promiseB;

        expect(indexA).toEqual(0);
        expect(indexB).toEqual(1);

        expect(atlas.numberOfImages).toEqual(2);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(2);
        expect(texture.height).toEqual(1);

        let coords = atlas.rectangles[indexA];
        expect(coords.x).toEqual(0);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        let textureCoordinates = atlas.computeTextureCoordinates(indexA);
        expect(textureCoordinates.x).toEqual(0);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(0.5);
        expect(textureCoordinates.height).toEqual(1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        coords = atlas.rectangles[indexB];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        textureCoordinates = atlas.computeTextureCoordinates(indexB);
        expect(textureCoordinates.x).toEqual(0.5);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(0.5);
        expect(textureCoordinates.height).toEqual(1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);
      });

      it("add image resizes the initial texture atlas for images with mixed dimensions", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const greenPromise = atlas.addImage(tallGreenGuid, tallGreenImage);
        const bluePromise = atlas.addImage(blueGuid, blueImage);
        const redPromise = atlas.addImage(bigRedGuid, bigRedImage);
        const bigBluePromise = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(
          Promise.all([greenPromise, bluePromise, redPromise, bigBluePromise]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const greenIndex = await greenPromise;
        const blueIndex = await bluePromise;
        const redIndex = await redPromise;
        const bigBlueIndex = await bigBluePromise;

        expect(greenIndex).toEqual(0);
        expect(blueIndex).toEqual(1);
        expect(redIndex).toEqual(2);
        expect(bigBlueIndex).toEqual(3);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(32);
        expect(texture.height).toEqual(16);

        let coords = atlas.rectangles[greenIndex];
        expect(coords.x).toEqual(26);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(4);

        let textureCoordinates = atlas.computeTextureCoordinates(greenIndex);
        expect(textureCoordinates.x).toEqual(26 / 32);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(1 / 32);
        expect(textureCoordinates.height).toEqual(4 / 16);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        coords = atlas.rectangles[blueIndex];
        expect(coords.x).toEqual(27);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        textureCoordinates = atlas.computeTextureCoordinates(blueIndex);
        expect(textureCoordinates.x).toEqual(27 / 32);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(1 / 32);
        expect(textureCoordinates.height).toEqual(1 / 16);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        coords = atlas.rectangles[redIndex];
        expect(coords.x).toEqual(0);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(16);
        expect(coords.height).toEqual(16);

        textureCoordinates = atlas.computeTextureCoordinates(redIndex);
        expect(textureCoordinates.x).toEqual(0);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(16 / 32);
        expect(textureCoordinates.height).toEqual(16 / 16);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        coords = atlas.rectangles[bigBlueIndex];
        expect(coords.x).toEqual(16);
        expect(coords.y).toEqual(0);
        expect(coords.width).toEqual(10);
        expect(coords.height).toEqual(10);

        textureCoordinates = atlas.computeTextureCoordinates(bigBlueIndex);
        expect(textureCoordinates.x).toEqual(16 / 32);
        expect(textureCoordinates.y).toEqual(0);
        expect(textureCoordinates.width).toEqual(10 / 32);
        expect(textureCoordinates.height).toEqual(10 / 16);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add image resizes the texture atlas if needed, copying existing images, with mixed dimensions", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const greenPromise = atlas.addImage(tallGreenGuid, tallGreenImage);
        const bluePromise = atlas.addImage(blueGuid, blueImage);
        const bigBluePromise = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(3);

        await pollWhilePromise(
          Promise.all([greenPromise, bluePromise, bigBluePromise]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const greenIndex = await greenPromise;
        const blueIndex = await bluePromise;
        const bigBlueIndex = await bigBluePromise;

        const redPromise = atlas.addImage(bigRedGuid, bigRedImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(redPromise, () => {
          atlas.update(scene.frameState.context);
        });

        const redIndex = await redPromise;

        expect(greenIndex).toEqual(0);
        expect(blueIndex).toEqual(1);
        expect(bigBlueIndex).toEqual(2);
        expect(redIndex).toEqual(3);

        // Webgl1 textures should only be powers of 2
        const textureWidth = scene.frameState.context.webgl2 ? 20 : 32;
        const textureHeight = scene.frameState.context.webgl2 ? 32 : 16;

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(textureWidth);
        expect(texture.height).toEqual(textureHeight);

        let coords = atlas.rectangles[greenIndex];
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(4);

        let textureCoordinates = atlas.computeTextureCoordinates(greenIndex);
        expect(textureCoordinates.width).toEqual(1 / textureWidth);
        expect(textureCoordinates.height).toEqual(4 / textureHeight);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        coords = atlas.rectangles[blueIndex];
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        textureCoordinates = atlas.computeTextureCoordinates(blueIndex);
        expect(textureCoordinates.width).toEqual(1 / textureWidth);
        expect(textureCoordinates.height).toEqual(1 / textureHeight);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        coords = atlas.rectangles[redIndex];
        expect(coords.width).toEqual(16);
        expect(coords.height).toEqual(16);

        textureCoordinates = atlas.computeTextureCoordinates(redIndex);
        expect(textureCoordinates.width).toEqual(16 / textureWidth);
        expect(textureCoordinates.height).toEqual(16 / textureHeight);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        coords = atlas.rectangles[bigBlueIndex];
        expect(coords.width).toEqual(10);
        expect(coords.height).toEqual(10);

        textureCoordinates = atlas.computeTextureCoordinates(bigBlueIndex);
        expect(textureCoordinates.width).toEqual(10 / textureWidth);
        expect(textureCoordinates.height).toEqual(10 / textureHeight);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add image resizes the initial texture atlas with non-zero borderWidthInPixels", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 1,
        });

        const greenPromise = atlas.addImage(greenGuid, greenImage);
        const bluePromise = atlas.addImage(blueGuid, blueImage);
        const redPromise = atlas.addImage(bigRedGuid, bigRedImage);
        const bigBluePromise = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(
          Promise.all([greenPromise, bluePromise, redPromise, bigBluePromise]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const greenIndex = await greenPromise;
        const blueIndex = await bluePromise;
        const redIndex = await redPromise;
        const bigBlueIndex = await bigBluePromise;

        expect(greenIndex).toEqual(0);
        expect(blueIndex).toEqual(1);
        expect(redIndex).toEqual(2);
        expect(bigBlueIndex).toEqual(3);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(32);
        expect(texture.height).toEqual(32);

        let coords = atlas.rectangles[greenIndex];
        expect(coords.x).toEqual(27);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        let textureCoordinates = atlas.computeTextureCoordinates(greenIndex);
        expect(textureCoordinates.x).toEqual(27 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(1 / 32);
        expect(textureCoordinates.height).toEqual(1 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        coords = atlas.rectangles[blueIndex];
        expect(coords.x).toEqual(28);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        textureCoordinates = atlas.computeTextureCoordinates(blueIndex);
        expect(textureCoordinates.x).toEqual(28 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(1 / 32);
        expect(textureCoordinates.height).toEqual(1 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        coords = atlas.rectangles[redIndex];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(16);
        expect(coords.height).toEqual(16);

        textureCoordinates = atlas.computeTextureCoordinates(redIndex);
        expect(textureCoordinates.x).toEqual(1 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(16 / 32);
        expect(textureCoordinates.height).toEqual(16 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        coords = atlas.rectangles[bigBlueIndex];
        expect(coords.x).toEqual(17);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(10);
        expect(coords.height).toEqual(10);

        textureCoordinates = atlas.computeTextureCoordinates(bigBlueIndex);
        expect(textureCoordinates.x).toEqual(17 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(10 / 32);
        expect(textureCoordinates.height).toEqual(10 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add image resizes the initial texture atlas with non-zero borderWidthInPixels, copying existing images", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 1,
          initialSize: new Cartesian2(14, 14),
        });

        const greenPromise = atlas.addImage(greenGuid, greenImage);
        const bluePromise = atlas.addImage(blueGuid, blueImage);
        const bigBluePromise = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(3);

        await pollWhilePromise(
          Promise.all([greenPromise, bluePromise, bigBluePromise]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const greenIndex = await greenPromise;
        const blueIndex = await bluePromise;
        const bigBlueIndex = await bigBluePromise;

        expect(greenIndex).toEqual(0);
        expect(blueIndex).toEqual(1);
        expect(bigBlueIndex).toEqual(2);

        const redPromise = atlas.addImage(bigRedGuid, bigRedImage);

        await pollWhilePromise(redPromise, () => {
          atlas.update(scene.frameState.context);
        });

        expect(atlas.numberOfImages).toEqual(4);

        const redIndex = await redPromise;

        expect(greenIndex).toEqual(0);
        expect(blueIndex).toEqual(1);
        expect(bigBlueIndex).toEqual(2);
        expect(redIndex).toEqual(3);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(32);
        expect(texture.height).toEqual(32);

        let coords = atlas.rectangles[greenIndex];
        expect(coords.x).toEqual(27);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        let textureCoordinates = atlas.computeTextureCoordinates(greenIndex);
        expect(textureCoordinates.x).toEqual(27 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(1 / 32);
        expect(textureCoordinates.height).toEqual(1 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        coords = atlas.rectangles[blueIndex];
        expect(coords.x).toEqual(28);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(1);
        expect(coords.height).toEqual(1);

        textureCoordinates = atlas.computeTextureCoordinates(blueIndex);
        expect(textureCoordinates.x).toEqual(28 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(1 / 32);
        expect(textureCoordinates.height).toEqual(1 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        coords = atlas.rectangles[redIndex];
        expect(coords.x).toEqual(1);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(16);
        expect(coords.height).toEqual(16);

        textureCoordinates = atlas.computeTextureCoordinates(redIndex);
        expect(textureCoordinates.x).toEqual(1 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(16 / 32);
        expect(textureCoordinates.height).toEqual(16 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        coords = atlas.rectangles[bigBlueIndex];
        expect(coords.x).toEqual(17);
        expect(coords.y).toEqual(1);
        expect(coords.width).toEqual(10);
        expect(coords.height).toEqual(10);

        textureCoordinates = atlas.computeTextureCoordinates(bigBlueIndex);
        expect(textureCoordinates.x).toEqual(17 / 32);
        expect(textureCoordinates.y).toEqual(1 / 32);
        expect(textureCoordinates.width).toEqual(10 / 32);
        expect(textureCoordinates.height).toEqual(10 / 32);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add subregion stores a portion of an existng image in the atlas", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const promise = atlas.addImage(bigRedGuid, bigRedImage);

        const promiseA = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 0, 4, 4),
        );
        const promiseB = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );
        const promiseC = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(4, 0, 4, 4),
        );
        const promiseD = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(4, 4, 4, 4),
        );

        expect(atlas.numberOfImages).toEqual(5);

        await pollWhilePromise(
          Promise.all([promise, promiseA, promiseB, promiseC, promiseD]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const index = await promise;
        const indexA = await promiseA;
        const indexB = await promiseB;
        const indexC = await promiseC;
        const indexD = await promiseD;

        expect(index).toEqual(0);
        expect(indexA).toEqual(1);
        expect(indexB).toEqual(2);
        expect(indexC).toEqual(3);
        expect(indexD).toEqual(4);

        expect(atlas.getImageIndex(bigRedGuid)).toEqual(index);

        const atlasWidth = 16;
        const atlasHeight = 16;

        let rectangle = atlas.rectangles[indexA];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(0);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        let coordinates = atlas.computeTextureCoordinates(indexA);
        expect(coordinates.x).toEqual(0 / atlasWidth);
        expect(coordinates.y).toEqual(0 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        rectangle = atlas.rectangles[indexB];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(4);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        coordinates = atlas.computeTextureCoordinates(indexB);
        expect(coordinates.x).toEqual(0 / atlasWidth);
        expect(coordinates.y).toEqual(4 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        rectangle = atlas.rectangles[indexC];
        expect(rectangle.x).toEqual(4);
        expect(rectangle.y).toEqual(0);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        coordinates = atlas.computeTextureCoordinates(indexC);
        expect(coordinates.x).toEqual(4 / atlasWidth);
        expect(coordinates.y).toEqual(0 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        rectangle = atlas.rectangles[indexD];
        expect(rectangle.x).toEqual(4);
        expect(rectangle.y).toEqual(4);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        coordinates = atlas.computeTextureCoordinates(indexD);
        expect(coordinates.x).toEqual(4 / atlasWidth);
        expect(coordinates.y).toEqual(4 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);
      });

      it("caches subregions of the same image and equivalent bounds", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const redPromise = atlas.addImage(bigRedGuid, bigRedImage);

        const promiseA = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 0, 4, 4),
        );
        const promiseB = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );
        const promiseC = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );

        await pollWhilePromise(
          Promise.all([redPromise, promiseA, promiseB, promiseC]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const redIndex = await redPromise;
        expect(atlas.getImageIndex(bigRedGuid)).toEqual(redIndex);

        const bluePromise = atlas.addImage(bigBlueGuid, bigBlueImage);

        const promiseD = atlas.addImageSubRegion(
          bigBlueGuid,
          new BoundingRectangle(0, 0, 4, 4),
        );
        const promiseE = atlas.addImageSubRegion(
          bigBlueGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );
        const promiseF = atlas.addImageSubRegion(
          bigBlueGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );

        await pollWhilePromise(
          Promise.all([bluePromise, promiseD, promiseE, promiseF]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const blueIndex = await bluePromise;
        expect(atlas.getImageIndex(bigBlueGuid)).toEqual(blueIndex);

        expect(atlas.numberOfImages).toEqual(6);

        const indexA = await promiseA;
        const indexB = await promiseB;
        const indexC = await promiseC;
        const indexD = await promiseD;
        const indexE = await promiseE;
        const indexF = await promiseF;

        expect(redIndex).toEqual(0);
        expect(indexA).toEqual(1);
        expect(indexB).toEqual(2);
        expect(indexC).toEqual(2);
        expect(blueIndex).toEqual(3);
        expect(indexD).toEqual(4);
        expect(indexE).toEqual(5);
        expect(indexF).toEqual(5);

        const atlasWidth = 32;
        const atlasHeight = 16;

        let rectangle = atlas.rectangles[indexB];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(4);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        let coordinates = atlas.computeTextureCoordinates(indexB);
        expect(coordinates.x).toEqual(0 / atlasWidth);
        expect(coordinates.y).toEqual(4 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        rectangle = atlas.rectangles[indexC];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(4);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        coordinates = atlas.computeTextureCoordinates(indexC);
        expect(coordinates.x).toEqual(0 / atlasWidth);
        expect(coordinates.y).toEqual(4 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        rectangle = atlas.rectangles[indexE];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(4);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        coordinates = atlas.computeTextureCoordinates(indexE);
        expect(coordinates.x).toEqual(16 / atlasWidth);
        expect(coordinates.y).toEqual(4 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 0, 255, 255]);

        rectangle = atlas.rectangles[indexF];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(4);
        expect(rectangle.width).toEqual(4);
        expect(rectangle.height).toEqual(4);

        coordinates = atlas.computeTextureCoordinates(indexF);
        expect(coordinates.x).toEqual(16 / atlasWidth);
        expect(coordinates.y).toEqual(4 / atlasHeight);
        expect(coordinates.width).toEqual(4 / atlasWidth);
        expect(coordinates.height).toEqual(4 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("computeTextureCoordinates works for subregions when texture atlas resizes", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const greenPromise = atlas.addImage(bigGreenGuid, bigGreenImage);

        const promiseA = atlas.addImageSubRegion(
          bigGreenGuid,
          new BoundingRectangle(0, 0, 2, 2),
        );
        const promiseB = atlas.addImageSubRegion(
          bigGreenGuid,
          new BoundingRectangle(2, 2, 2, 2),
        );

        expect(atlas.numberOfImages).toEqual(3);

        await pollWhilePromise(
          Promise.all([greenPromise, promiseA, promiseB]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const indexGreen = await greenPromise;
        const indexA = await promiseA;
        const indexB = await promiseB;

        const redPromise = atlas.addImage(bigRedGuid, bigRedImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(redPromise, () => {
          atlas.update(scene.frameState.context);
        });

        const indexRed = await redPromise;

        expect(indexGreen).toEqual(0);
        expect(indexA).toEqual(1);
        expect(indexB).toEqual(2);
        expect(indexRed).toEqual(3);

        expect(atlas.getImageIndex(bigGreenGuid)).toEqual(indexGreen);
        expect(atlas.getImageIndex(bigRedGuid)).toEqual(indexRed);

        const atlasWidth = 32;
        const atlasHeight = 16;

        let rectangle = atlas.rectangles[indexA];
        expect(rectangle.x).toEqual(0);
        expect(rectangle.y).toEqual(0);
        expect(rectangle.width).toEqual(2);
        expect(rectangle.height).toEqual(2);

        let coordinates = atlas.computeTextureCoordinates(indexA);
        expect(coordinates.x).toEqual(16 / atlasWidth);
        expect(coordinates.y).toEqual(0 / atlasHeight);
        expect(coordinates.width).toEqual(2 / atlasWidth);
        expect(coordinates.height).toEqual(2 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 255, 0, 255]);

        rectangle = atlas.rectangles[indexB];
        expect(rectangle.x).toEqual(2);
        expect(rectangle.y).toEqual(2);
        expect(rectangle.width).toEqual(2);
        expect(rectangle.height).toEqual(2);

        coordinates = atlas.computeTextureCoordinates(indexB);
        expect(coordinates.x).toEqual(18 / atlasWidth);
        expect(coordinates.y).toEqual(2 / atlasHeight);
        expect(coordinates.width).toEqual(2 / atlasWidth);
        expect(coordinates.height).toEqual(2 / atlasHeight);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 255, 0, 255]);
      });

      it("GUID changes when atlas texure is modified", async function () {
        atlas = new TextureAtlas();

        const guid1 = atlas.guid;

        const promise = atlas.addImage(bigRedGuid, bigRedImage);

        await pollWhilePromise(promise, () => {
          atlas.update(scene.frameState.context);
        });

        await promise;

        const guid2 = atlas.guid;
        expect(guid1).not.toEqual(guid2);
      });

      it("destroys successfully while image is queued", async function () {
        atlas = new TextureAtlas();

        const promise = atlas.addImage(greenGuid, greenImage);

        atlas.update(scene.frameState.context);
        const texture = atlas.texture;

        // Allow the image to resolve before we destroy
        await Promise.resolve();

        atlas.destroy();

        const index = await promise;

        expect(index).toEqual(-1);
        expect(atlas.isDestroyed()).toBeTrue();
        expect(texture.isDestroyed()).toBeTrue();

        atlas = undefined;
      });
    },
    "WebGL",
  );
});
