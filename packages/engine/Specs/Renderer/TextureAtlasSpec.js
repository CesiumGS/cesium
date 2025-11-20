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

      it("computes image texture coordinates", async function () {
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

      it("computes subregion texture coordinates", async function () {
        const atlasWidth = 12;
        const atlasHeight = 8;
        const borderPx = 2;

        atlas = new TextureAtlas({
          borderWidthInPixels: borderPx,
          initialSize: new Cartesian2(atlasWidth, atlasHeight),
        });

        const imagePromise0 = atlas.addImage(bigGreenGuid, bigGreenImage);
        const promise1 = atlas.addImageSubRegion(
          bigGreenGuid,
          new BoundingRectangle(0, 0, 2, 2),
        );
        const promise2 = atlas.addImageSubRegion(
          bigGreenGuid,
          new BoundingRectangle(2, 0, 1, 2),
        );

        await pollWhilePromise(
          Promise.all([imagePromise0, promise1, promise2]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const imageIndex0 = await imagePromise0;
        const index1 = await promise1;
        const index2 = await promise2;

        expect(drawAtlas(atlas, [imageIndex0, index1, index2])).toBe(
          `
............
............
..0000......
..0000......
..1120......
..1120......
............
............
          `.trim(),
        );

        let coords = atlas.computeTextureCoordinates(imageIndex0);
        expect(coords.x).toEqual(borderPx / atlasWidth);
        expect(coords.y).toEqual(borderPx / atlasHeight);
        expect(coords.width).toEqual(4.0 / atlasWidth);
        expect(coords.height).toEqual(4.0 / atlasHeight);

        coords = atlas.computeTextureCoordinates(index1);
        expect(coords.x).toEqual(borderPx / atlasWidth);
        expect(coords.y).toEqual(borderPx / atlasHeight);
        expect(coords.width).toEqual(2.0 / atlasWidth);
        expect(coords.height).toEqual(2.0 / atlasHeight);

        coords = atlas.computeTextureCoordinates(index2);
        expect(coords.x).toEqual((borderPx + 2.0) / atlasWidth);
        expect(coords.y).toEqual(borderPx / atlasHeight);
        expect(coords.width).toEqual(1.0 / atlasWidth);
        expect(coords.height).toEqual(2.0 / atlasHeight);
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

        const promise0 = atlas.addImage(greenGuid, greenImage);
        const promise1 = atlas.addImage("Another image", greenImage);

        expect(atlas.numberOfImages).toEqual(2);

        await pollWhilePromise(Promise.all([promise0, promise1]), () => {
          atlas.update(scene.frameState.context);
        });

        const index0 = await promise0;
        const index1 = await promise1;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(2);
        expect(texture.height).toEqual(1);

        expect(drawAtlas(atlas, [index0, index1])).toBe("01");

        let textureCoordinates = atlas.computeTextureCoordinates(index0);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);
      });

      it("add image resizes the texture atlas if needed, copying existing images", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const promise0 = atlas.addImage(greenGuid, greenImage);

        await pollWhilePromise(promise0, () => {
          atlas.update(scene.frameState.context);
        });

        const index0 = await promise0;

        expect(drawAtlas(atlas, [index0])).toBe("0");

        const promise1 = atlas.addImage("Another image", greenImage);

        await pollWhilePromise(promise1, () => {
          atlas.update(scene.frameState.context);
        });

        const index1 = await promise1;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);

        expect(atlas.numberOfImages).toEqual(2);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(2);
        expect(texture.height).toEqual(1);

        expect(drawAtlas(atlas, [index0, index1])).toBe("01");

        let textureCoordinates = atlas.computeTextureCoordinates(index0);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);
      });

      it("add image resizes the initial texture atlas for images with mixed dimensions", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const promise0 = atlas.addImage(tallGreenGuid, tallGreenImage);
        const promise1 = atlas.addImage(blueGuid, blueImage);
        const promise2 = atlas.addImage(bigRedGuid, bigRedImage);
        const promise3 = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(
          Promise.all([promise0, promise1, promise2, promise3]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const index0 = await promise0;
        const index1 = await promise1;
        const index2 = await promise2;
        const index3 = await promise3;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);
        expect(index3).toEqual(3);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(32);
        expect(texture.height).toEqual(16);

        expect(drawAtlas(atlas, [index0, index1, index2, index3])).toBe(
          `
2222222222222222................
2222222222222222................
2222222222222222................
2222222222222222................
2222222222222222................
2222222222222222................
22222222222222223333333333......
22222222222222223333333333......
22222222222222223333333333......
22222222222222223333333333......
22222222222222223333333333......
22222222222222223333333333......
222222222222222233333333330.....
222222222222222233333333330.....
222222222222222233333333330.....
2222222222222222333333333301....
          `.trim(),
        );

        let textureCoordinates = atlas.computeTextureCoordinates(index0);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index2);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index3);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add image resizes the texture atlas if needed, copying existing images, with mixed dimensions", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
          initialSize: new Cartesian2(1, 1),
        });

        const promise0 = atlas.addImage(tallGreenGuid, tallGreenImage);
        const promise1 = atlas.addImage(blueGuid, blueImage);
        const promise2 = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(3);

        await pollWhilePromise(
          Promise.all([promise0, promise1, promise2]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const index0 = await promise0;
        const index1 = await promise1;
        const index2 = await promise2;

        const promise3 = atlas.addImage(bigRedGuid, bigRedImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(promise3, () => {
          atlas.update(scene.frameState.context);
        });

        const index3 = await promise3;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);
        expect(index3).toEqual(3);

        // Webgl1 textures should only be powers of 2
        const isWebGL2 = scene.frameState.context.webgl2;
        const textureWidth = isWebGL2 ? 20 : 32;
        const textureHeight = isWebGL2 ? 32 : 16;

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(textureWidth);
        expect(texture.height).toEqual(textureHeight);

        if (isWebGL2) {
          expect(drawAtlas(atlas, [index0, index1, index2, index3])).toBe(
            `
....................
....................
....................
....................
....................
....................
2222222222..........
2222222222..........
2222222222..........
2222222222..........
2222222222..........
2222222222..........
2222222222..........
2222222222..........
2222222222..........
2222222222..........
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
3333333333333333....
33333333333333330...
33333333333333330...
33333333333333330...
333333333333333301..
          `.trim(),
          );
        } else {
          expect(drawAtlas(atlas, [index0, index1, index2, index3])).toBe(
            `
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
33333333333333332222222222......
33333333333333332222222222......
33333333333333332222222222......
33333333333333332222222222......
33333333333333332222222222......
33333333333333332222222222......
333333333333333322222222220.....
333333333333333322222222220.....
333333333333333322222222220.....
3333333333333333222222222201....
          `.trim(),
          );
        }

        let textureCoordinates = atlas.computeTextureCoordinates(index0);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index3);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index2);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add image resizes the initial texture atlas with non-zero borderWidthInPixels", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 1,
        });

        const promise0 = atlas.addImage(greenGuid, greenImage);
        const promise1 = atlas.addImage(blueGuid, blueImage);
        const promise2 = atlas.addImage(bigRedGuid, bigRedImage);
        const promise3 = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(
          Promise.all([promise0, promise1, promise2, promise3]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const index0 = await promise0;
        const index1 = await promise1;
        const index2 = await promise2;
        const index3 = await promise3;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);
        expect(index3).toEqual(3);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(32);
        expect(texture.height).toEqual(32);

        expect(drawAtlas(atlas, [index0, index1, index2, index3])).toBe(
          `
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
.2222222222222222...............
.2222222222222222...............
.2222222222222222...............
.2222222222222222...............
.2222222222222222...............
.2222222222222222...............
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.22222222222222223333333333.....
.2222222222222222333333333301...
................................
          `.trim(),
        );

        let textureCoordinates = atlas.computeTextureCoordinates(index0);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index2);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index3);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add image resizes the initial texture atlas with non-zero borderWidthInPixels, copying existing images", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 1,
          initialSize: new Cartesian2(14, 14),
        });

        const promise0 = atlas.addImage(greenGuid, greenImage);
        const promise1 = atlas.addImage(blueGuid, blueImage);
        const promise2 = atlas.addImage(bigBlueGuid, bigBlueImage);

        expect(atlas.numberOfImages).toEqual(3);

        await pollWhilePromise(
          Promise.all([promise0, promise1, promise2]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const index0 = await promise0;
        const index1 = await promise1;
        const index2 = await promise2;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);

        expect(drawAtlas(atlas, [index0, index1, index2])).toBe(
          `
..............
..............
..............
.2222222222...
.2222222222...
.2222222222...
.2222222222...
.2222222222...
.2222222222...
.2222222222...
.2222222222...
.2222222222...
.222222222201.
..............
          `.trim(),
        );

        const promise3 = atlas.addImage(bigRedGuid, bigRedImage);

        await pollWhilePromise(promise3, () => {
          atlas.update(scene.frameState.context);
        });

        expect(atlas.numberOfImages).toEqual(4);

        const index3 = await promise3;

        expect(index0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);
        expect(index3).toEqual(3);

        const texture = atlas.texture;
        expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(texture.width).toEqual(32);
        expect(texture.height).toEqual(32);

        expect(drawAtlas(atlas, [index0, index1, index2, index3])).toBe(
          `
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
................................
.3333333333333333...............
.3333333333333333...............
.3333333333333333...............
.3333333333333333...............
.3333333333333333...............
.3333333333333333...............
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.33333333333333332222222222.....
.3333333333333333222222222201...
................................
          `.trim(),
        );

        let textureCoordinates = atlas.computeTextureCoordinates(index0);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 255, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index3);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([255, 0, 0, 255]);

        textureCoordinates = atlas.computeTextureCoordinates(index2);
        expect(
          createRenderResources(texture, textureCoordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("add subregion stores a portion of an existng image in the atlas", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const imagePromise0 = atlas.addImage(bigRedGuid, bigRedImage);

        const promise1 = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 0, 4, 4),
        );
        const promise2 = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );
        const promise3 = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(4, 0, 4, 4),
        );
        const promise4 = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(4, 4, 4, 4),
        );

        expect(atlas.numberOfImages).toEqual(5);

        await pollWhilePromise(
          Promise.all([imagePromise0, promise1, promise2, promise3, promise4]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const imageIndex0 = await imagePromise0;
        const index1 = await promise1;
        const index2 = await promise2;
        const index3 = await promise3;
        const index4 = await promise4;

        expect(imageIndex0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);
        expect(index3).toEqual(3);
        expect(index4).toEqual(4);

        expect(atlas.getImageIndex(bigRedGuid)).toEqual(imageIndex0);

        expect(
          drawAtlas(atlas, [imageIndex0, index1, index2, index3, index4]),
        ).toBe(
          `
0000000000000000
0000000000000000
0000000000000000
0000000000000000
0000000000000000
0000000000000000
0000000000000000
0000000000000000
2222444400000000
2222444400000000
2222444400000000
2222444400000000
1111333300000000
1111333300000000
1111333300000000
1111333300000000
          `.trim(),
        );

        let coordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        coordinates = atlas.computeTextureCoordinates(index2);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        coordinates = atlas.computeTextureCoordinates(index3);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        coordinates = atlas.computeTextureCoordinates(index4);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);
      });

      it("caches subregions of the same image and equivalent bounds", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const imagePromise0 = atlas.addImage(bigRedGuid, bigRedImage);

        const promise1 = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 0, 4, 4),
        );
        const promise2a = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );
        const promise2b = atlas.addImageSubRegion(
          bigRedGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );

        await pollWhilePromise(
          Promise.all([imagePromise0, promise1, promise2a, promise2b]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const imageIndex0 = await imagePromise0;
        expect(atlas.getImageIndex(bigRedGuid)).toEqual(imageIndex0);

        const imagePromise3 = atlas.addImage(bigBlueGuid, bigBlueImage);

        const promise4 = atlas.addImageSubRegion(
          bigBlueGuid,
          new BoundingRectangle(0, 0, 4, 4),
        );
        const promise5a = atlas.addImageSubRegion(
          bigBlueGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );
        const promise5b = atlas.addImageSubRegion(
          bigBlueGuid,
          new BoundingRectangle(0, 4, 4, 4),
        );

        await pollWhilePromise(
          Promise.all([imagePromise3, promise4, promise5a, promise5b]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const imageIndex3 = await imagePromise3;
        expect(atlas.getImageIndex(bigBlueGuid)).toEqual(imageIndex3);

        expect(atlas.numberOfImages).toEqual(6);

        const index1 = await promise1;
        const index2a = await promise2a;
        const index2b = await promise2b;
        const index4 = await promise4;
        const index5a = await promise5a;
        const index5b = await promise5b;

        expect(imageIndex0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2a).toEqual(2);
        expect(index2b).toEqual(2);
        expect(imageIndex3).toEqual(3);
        expect(index4).toEqual(4);
        expect(index5a).toEqual(5);
        expect(index5b).toEqual(5);

        // subregions 1:4 and 2:5 overlap completely; draw and test separately.

        expect(
          drawAtlas(atlas, [
            imageIndex0,
            imageIndex3,
            index1,
            index2a,
            index2b,
          ]),
        ).toBe(
          `
0000000000000000................
0000000000000000................
0000000000000000................
0000000000000000................
0000000000000000................
0000000000000000................
00000000000000003333333333......
00000000000000003333333333......
22220000000000003333333333......
22220000000000003333333333......
22220000000000003333333333......
22220000000000003333333333......
11110000000000003333333333......
11110000000000003333333333......
11110000000000003333333333......
11110000000000003333333333......
          `.trim(),
        );

        expect(
          drawAtlas(atlas, [
            imageIndex0,
            imageIndex3,
            index4,
            index5a,
            index5b,
          ]),
        ).toBe(
          `
0000000000000000................
0000000000000000................
0000000000000000................
0000000000000000................
0000000000000000................
0000000000000000................
00000000000000003333333333......
00000000000000003333333333......
00000000000000005555333333......
00000000000000005555333333......
00000000000000005555333333......
00000000000000005555333333......
00000000000000004444333333......
00000000000000004444333333......
00000000000000004444333333......
00000000000000004444333333......
          `.trim(),
        );

        let coordinates = atlas.computeTextureCoordinates(index2a);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        coordinates = atlas.computeTextureCoordinates(index2b);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([255, 0, 0, 255]);

        coordinates = atlas.computeTextureCoordinates(index5a);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 0, 255, 255]);

        coordinates = atlas.computeTextureCoordinates(index5b);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 0, 255, 255]);
      });

      it("computeTextureCoordinates works for subregions when texture atlas resizes", async function () {
        atlas = new TextureAtlas({
          borderWidthInPixels: 0,
        });

        const imagePromise0 = atlas.addImage(bigGreenGuid, bigGreenImage);

        const promise1 = atlas.addImageSubRegion(
          bigGreenGuid,
          new BoundingRectangle(0, 0, 2, 2),
        );
        const promise2 = atlas.addImageSubRegion(
          bigGreenGuid,
          new BoundingRectangle(2, 2, 2, 2),
        );

        expect(atlas.numberOfImages).toEqual(3);

        await pollWhilePromise(
          Promise.all([imagePromise0, promise1, promise2]),
          () => {
            atlas.update(scene.frameState.context);
          },
        );

        const imageIndex0 = await imagePromise0;
        const index1 = await promise1;
        const index2 = await promise2;

        const imagePromise3 = atlas.addImage(bigRedGuid, bigRedImage);

        expect(atlas.numberOfImages).toEqual(4);

        await pollWhilePromise(imagePromise3, () => {
          atlas.update(scene.frameState.context);
        });

        const imageIndex3 = await imagePromise3;

        expect(imageIndex0).toEqual(0);
        expect(index1).toEqual(1);
        expect(index2).toEqual(2);
        expect(imageIndex3).toEqual(3);

        expect(atlas.getImageIndex(bigGreenGuid)).toEqual(imageIndex0);
        expect(atlas.getImageIndex(bigRedGuid)).toEqual(imageIndex3);

        expect(
          drawAtlas(atlas, [imageIndex0, imageIndex3, index1, index2]),
        ).toBe(
          `
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
3333333333333333................
33333333333333330022............
33333333333333330022............
33333333333333331100............
33333333333333331100............
          `.trim(),
        );

        let coordinates = atlas.computeTextureCoordinates(index1);
        expect(
          createRenderResources(atlas.texture, coordinates),
        ).contextToRender([0, 255, 0, 255]);

        coordinates = atlas.computeTextureCoordinates(index2);
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

/**
 * Debugging output for a TextureAtlas, drawing image and subregion
 * rectangles in order of indices passed. When rectangles overlap
 * (e.g. subregions on images), smaller rectangles should be last.
 */
function drawAtlas(atlas, indices) {
  const { width, height } = atlas.texture;

  // initialize empty 'atlas'.
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(new Array(width).fill("."));
  }

  const rect = new BoundingRectangle();

  // draw each rectangle, filling with its index.
  for (const index of indices) {
    // compute rectangle coordinates in pixels.
    atlas.computeTextureCoordinates(index, rect);
    rect.x *= width;
    rect.y *= height;
    rect.width *= width;
    rect.height *= height;

    for (let dx = 0; dx < rect.width; dx++) {
      const x = rect.x + dx;
      for (let dy = 0; dy < rect.height; dy++) {
        const y = rect.y + dy;
        rows[y][x] = index;
      }
    }
  }

  // print. atlas origin is bottom-left.
  return rows
    .reverse()
    .map((row) => row.join(""))
    .join("\n");
}
