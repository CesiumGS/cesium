import { has3DTilesExtension } from "../../Source/Cesium.js";

describe("Scene/has3DTilesExtension", function () {
  it("detects the presence of an extension", function () {
    var tile = {
      extensions: {
        "3DTILES_extension": {},
      },
    };
    expect(has3DTilesExtension(tile, "3DTILES_extension")).toEqual(true);
  });

  it("detects the absence of an extension", function () {
    var tile = {};
    expect(has3DTilesExtension(tile, "3DTILES_extension")).toEqual(false);
    tile = {
      extensions: {},
    };
    expect(has3DTilesExtension(tile, "3DTILES_extension")).toEqual(false);
    tile = {
      extensions: {
        "3DTILES_other_extension": {},
      },
    };
    expect(has3DTilesExtension(tile, "3DTILES_extension")).toEqual(false);
  });
});
