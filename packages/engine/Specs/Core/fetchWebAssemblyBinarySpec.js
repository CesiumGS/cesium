import {
  fetchWebAssemblyBinary,
  Resource,
  TrustedServers,
} from "../../index.js";

describe("Core/fetchWebAssemblyBinary", function () {
  afterEach(function () {
    TrustedServers.clear();
  });

  it("selects credentials per request without mutating TrustedServers", async function () {
    const requests = [];
    spyOn(Resource, "fetchArrayBuffer").and.callFake(function (options) {
      return new Promise(function (resolve) {
        requests.push({
          options: options,
          resolve: resolve,
        });
      });
    });

    const url = "https://example.com/module.wasm";
    const credentialedConfig = {
      wasmBinaryFile: url,
      withCredentials: true,
    };
    const uncredentialedConfig = {
      wasmBinaryFile: url,
      withCredentials: false,
    };

    const credentialedPromise = fetchWebAssemblyBinary(credentialedConfig);
    const uncredentialedPromise = fetchWebAssemblyBinary(uncredentialedConfig);

    expect(requests.length).toBe(2);
    expect(requests[0].options).toEqual({
      url: url,
      withCredentials: true,
    });
    expect(requests[1].options).toEqual({
      url: url,
      withCredentials: false,
    });
    expect(TrustedServers.contains(url)).toBe(false);

    requests[0].resolve(new ArrayBuffer(1));
    requests[1].resolve(new ArrayBuffer(2));
    await Promise.all([credentialedPromise, uncredentialedPromise]);
    expect(credentialedConfig.wasmBinary.byteLength).toBe(1);
    expect(uncredentialedConfig.wasmBinary.byteLength).toBe(2);
  });
});
