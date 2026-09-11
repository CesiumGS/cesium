import {
  fetchWebAssemblyBinary,
  Resource,
  TrustedServers,
} from "../../index.js";

describe("Core/fetchWebAssemblyBinary", function () {
  afterEach(function () {
    TrustedServers.clear();
  });

  it("returns the binary bytes without fetching when already present", async function () {
    const wasmBinary = new ArrayBuffer(1);
    const config = Object.freeze({
      wasmBinaryFile: "https://example.com/module.wasm",
      wasmBinary: wasmBinary,
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer");

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBe(wasmBinary);
    expect(fetchArrayBuffer).not.toHaveBeenCalled();
    expect(config).toEqual({
      wasmBinaryFile: "https://example.com/module.wasm",
      wasmBinary: wasmBinary,
    });
  });

  it("returns undefined when the binary URL is absent", async function () {
    const config = Object.freeze({
      modulePath: "fallback.js",
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer");

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBeUndefined();
    expect(fetchArrayBuffer).not.toHaveBeenCalled();
    expect(config).toEqual({
      modulePath: "fallback.js",
    });
  });

  it("returns fetched bytes without changing the configuration", async function () {
    const wasmBinary = new ArrayBuffer(2);
    const url = "https://example.com/module.wasm";
    const config = Object.freeze({
      wasmBinaryFile: url,
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer").and.resolveTo(
      wasmBinary,
    );

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBe(wasmBinary);
    expect(fetchArrayBuffer).toHaveBeenCalledWith({
      url: url,
    });
    expect(config).toEqual({
      wasmBinaryFile: url,
    });
  });

  it("propagates a fetch rejection without changing the configuration", async function () {
    const error = new Error("fetch failed");
    const config = Object.freeze({
      wasmBinaryFile: "https://example.com/module.wasm",
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
    });
  });

  it("does not pass its own withCredentials option, deferring to Resource's TrustedServers lookup", async function () {
    const url = "https://example.com/module.wasm";
    TrustedServers.add("example.com", 443);

    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer").and.resolveTo(
      new ArrayBuffer(1),
    );

    await fetchWebAssemblyBinary(Object.freeze({ wasmBinaryFile: url }));

    // fetchWebAssemblyBinary has no opinion on credentials. Resource.fetchArrayBuffer
    // resolves them itself from TrustedServers, the same as any other request.
    expect(fetchArrayBuffer).toHaveBeenCalledWith({ url: url });
    expect(TrustedServers.contains(url)).toBe(true);
  });
});
