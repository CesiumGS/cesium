import {
  fetchWebAssemblyBinary,
  Resource,
  TrustedServers,
} from "../../index.js";

describe("Core/fetchWebAssemblyBinary", function () {
  afterEach(function () {
    TrustedServers.clear();
  });

  it("returns undefined when the configuration already has binary bytes", async function () {
    const wasmBinary = new ArrayBuffer(1);
    const config = Object.freeze({
      wasmBinaryFile: "https://example.com/module.wasm",
      wasmBinary: wasmBinary,
      withCredentials: true,
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer");

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBeUndefined();
    expect(fetchArrayBuffer).not.toHaveBeenCalled();
    expect(config).toEqual({
      wasmBinaryFile: "https://example.com/module.wasm",
      wasmBinary: wasmBinary,
      withCredentials: true,
    });
  });

  it("returns undefined when the binary URL is absent", async function () {
    const config = Object.freeze({
      modulePath: "fallback.js",
      withCredentials: false,
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer");

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBeUndefined();
    expect(fetchArrayBuffer).not.toHaveBeenCalled();
    expect(config).toEqual({
      modulePath: "fallback.js",
      withCredentials: false,
    });
  });

  it("returns fetched bytes without changing the configuration", async function () {
    const wasmBinary = new ArrayBuffer(2);
    const url = "https://example.com/module.wasm";
    const config = Object.freeze({
      wasmBinaryFile: url,
      withCredentials: true,
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer").and.resolveTo(
      wasmBinary,
    );

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBe(wasmBinary);
    expect(fetchArrayBuffer).toHaveBeenCalledWith({
      url: url,
      withCredentials: true,
    });
    expect(config).toEqual({
      wasmBinaryFile: url,
      withCredentials: true,
    });
  });

  it("propagates a fetch rejection without changing the configuration", async function () {
    const error = new Error("fetch failed");
    const config = Object.freeze({
      wasmBinaryFile: "https://example.com/module.wasm",
      withCredentials: false,
    });
    spyOn(Resource, "fetchArrayBuffer").and.rejectWith(error);

    let rejectedError;
    try {
      await fetchWebAssemblyBinary(config);
    } catch (caughtError) {
      rejectedError = caughtError;
    }

    expect(rejectedError).toBe(error);
    expect(config).toEqual({
      wasmBinaryFile: "https://example.com/module.wasm",
      withCredentials: false,
    });
  });

  it("selects credentials for each request without mutating TrustedServers", async function () {
    const requests = [];
    spyOn(Resource, "fetchArrayBuffer").and.callFake(function (options) {
      requests.push(options);
      return Promise.resolve(new ArrayBuffer(1));
    });

    const url = "https://example.com/module.wasm";
    const credentialedConfig = Object.freeze({
      wasmBinaryFile: url,
      withCredentials: true,
    });
    const uncredentialedConfig = Object.freeze({
      wasmBinaryFile: url,
      withCredentials: false,
    });

    const results = await Promise.all([
      fetchWebAssemblyBinary(credentialedConfig),
      fetchWebAssemblyBinary(uncredentialedConfig),
    ]);

    expect(requests).toEqual([
      {
        url: url,
        withCredentials: true,
      },
      {
        url: url,
        withCredentials: false,
      },
    ]);
    expect(results[0]).toEqual(jasmine.any(ArrayBuffer));
    expect(results[1]).toEqual(jasmine.any(ArrayBuffer));
    expect(TrustedServers.contains(url)).toBe(false);
    expect(credentialedConfig).toEqual({
      wasmBinaryFile: url,
      withCredentials: true,
    });
    expect(uncredentialedConfig).toEqual({
      wasmBinaryFile: url,
      withCredentials: false,
    });
  });
});
