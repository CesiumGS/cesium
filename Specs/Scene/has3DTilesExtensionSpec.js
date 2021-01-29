import { has3DTilesExtension } from "../../Source/Cesium.js";

fdescribe("Scene/has3DTilesExtension", function () {
  it("detects the presence of an extension", function () {
    expect(
      has3DTilesExtension(
        {
          extensions: {
            "3DTILES_extension": {},
          },
        },
        "3DTILES_extension"
      )
    ).toEqual(true);
  });

  it("detects the absence of an extension", function () {
    expect(has3DTilesExtension({}, "3DTILES_extension")).toEqual(false);
    expect(
      has3DTilesExtension(
        {
          extensions: {},
        },
        "3DTILES_extension"
      )
    ).toEqual(false);
    expect(
      has3DTilesExtension(
        {
          extensions: {
            "3DTILES_other_extension": {},
          },
        },
        "3DTILES_extension"
      )
    ).toEqual(false);
  });
});
