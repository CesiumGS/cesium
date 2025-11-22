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
      function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType,
      ) {
        if (url.includes("REST/v1/Imagery/Metadata")) {
          deferred.resolve(
            JSON.stringify(
              createFakeBingMapsMetadataResponse(BingMapsStyle.AERIAL),
            ),
          );
          return;
        }

        return originalLoadWithXhr(
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType,
        );
      },
    );

    const provider = await createWorldImageryAsync();
    expect(provider).toBeInstanceOf(IonImageryProvider);
  });
});
