import {
  createWorldImageryAsync,
  BingMapsStyle,
  IonImageryProvider,
  Resource,
} from "../../index.js";

import createFakeBingMapsMetadataResponse from "../createFakeBingMapsMetadataResponse.js";

describe("Core/createWorldImageryAsync", function () {
  it("resolves to IonImageryProvider instance with default parameters", async function () {
    spyOn(Resource.prototype, "fetchJsonp").and.callFake(() =>
      Promise.resolve(createFakeBingMapsMetadataResponse(BingMapsStyle.AERIAL))
    );

    const provider = await createWorldImageryAsync();
    expect(provider).toBeInstanceOf(IonImageryProvider);
  });
});
