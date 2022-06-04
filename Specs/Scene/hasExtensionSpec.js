import { hasExtension } from "../../Source/Cesium.js";

describe("Scene/hasExtension", function () {
  it("detects the presence of an extension", function () {
    const tile = {
      extensions: {
        "3DTILES_extension": {},
      },
    };
    expect(hasExtension(tile, "3DTILES_extension")).toEqual(true);
  });

  it("detects the absence of an extension", function () {
    let tile = {};
    expect(hasExtension(tile, "3DTILES_extension")).toEqual(false);
    tile = {
      extensions: {},
    };
    expect(hasExtension(tile, "3DTILES_extension")).toEqual(false);
    tile = {
      extensions: {
        "3DTILES_other_extension": {},
      },
    };
    expect(hasExtension(tile, "3DTILES_extension")).toEqual(false);
  });
});
