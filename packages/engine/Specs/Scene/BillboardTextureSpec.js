import BillboardTexture from "../../Source/Scene/BillboardTexture.js";
import BillboardLoadState from "../../Source/Scene/BillboardLoadState.js";

describe("Scene/BillboardTexture", function () {
  function createMockCollection(atlas) {
    return {
      textureAtlas: atlas,
      billboardTextureCache: new Map(),
    };
  }

  it("transitions to FAILED when atlas.addImage resolves to an undefined rectangle", async function () {
    // Reproduces the crash described at
    // https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Scene/BillboardTexture.js
    // where `atlas.addImage` resolves to an index whose rectangle slot is
    // still unset (e.g. an atlas resize left this slot empty). The previous
    // behavior dereferenced `rectangle.width` and threw an unhandled
    // TypeError; the texture should now transition to FAILED instead.
    const index = 3;
    const atlas = {
      rectangles: [], // rectangles[index] is undefined
      addImage: function () {
        return Promise.resolve(index);
      },
    };
    const texture = new BillboardTexture(createMockCollection(atlas));

    await expectAsync(
      texture.loadImage("test-id", new Image(), undefined, undefined),
    ).toBeResolved();

    expect(texture.loadState).toEqual(BillboardLoadState.FAILED);
    expect(texture._index).toEqual(-1);
    expect(texture.ready).toBe(false);
  });

  it("loads successfully when the rectangle is populated", async function () {
    const index = 0;
    const atlas = {
      rectangles: [{ width: 32, height: 48 }],
      addImage: function () {
        return Promise.resolve(index);
      },
    };
    const texture = new BillboardTexture(createMockCollection(atlas));

    await texture.loadImage("ok-id", new Image(), undefined, undefined);

    expect(texture.loadState).toEqual(BillboardLoadState.LOADED);
    expect(texture.width).toEqual(32);
    expect(texture.height).toEqual(48);
    expect(texture.ready).toBe(true);
  });
});
