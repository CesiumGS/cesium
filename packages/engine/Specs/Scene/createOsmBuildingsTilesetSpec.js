import {
  Cesium3DTileset,
  Color,
  createOsmBuildingsTileset,
} from "../../index.js";

describe("Scene/createOsmBuildingsTileset", function () {
  it("creates a Cesium3DTileset with default parameters", async function () {
    const tileset = await createOsmBuildingsTileset();
    expect(tileset).toBeInstanceOf(Cesium3DTileset);
    expect(tileset.style.color).toEqual(
      "Boolean(${feature['cesium#color']}) ? color(${feature['cesium#color']}) : rgb(255,255,255)"
    );
  });

  it("creates a Cesium3DTileset with defaultColor", async function () {
    const tileset = await createOsmBuildingsTileset({
      defaultColor: Color.BLUE,
    });
    expect(tileset).toBeInstanceOf(Cesium3DTileset);
    expect(tileset.style.color.expression).toEqual(
      "Boolean(${feature['cesium#color']}) ? color(${feature['cesium#color']}) : rgb(0,0,255)"
    );
  });
});
