import {
  createWorldImageryAsync,
  BingMapsStyle,
  IonImageryProvider,
  Resource,
} from "../../index.js";

import createFakeBingMapsMetadataResponse from "../createFakeBingMapsMetadataResponse.js";

describe("Core/createWorldImageryAsync", function () {
  it("resolves to IonImageryProvider instance with default parameters", async function () {
    const originalLoadWithXhr = Resource._Implementations.loadWithXhr;
    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(
      function (url, responseType, method, data, headers, overrideMimeType) {
        if (url.includes("REST/v1/Imagery/Metadata")) {
          return Promise.resolve(
            JSON.stringify(
              createFakeBingMapsMetadataResponse(BingMapsStyle.AERIAL),
            ),
          );
        }

        return originalLoadWithXhr(
          url,
          responseType,
          method,
          data,
          headers,
          overrideMimeType,
        );
      },
    );

    const provider = await createWorldImageryAsync();
    expect(provider).toBeInstanceOf(IonImageryProvider);
  });
});
