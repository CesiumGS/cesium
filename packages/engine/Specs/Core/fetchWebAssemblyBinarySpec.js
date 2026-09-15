import { fetchWebAssemblyBinary, Resource } from "../../index.js";

describe("Core/fetchWebAssemblyBinary", function () {
  it("returns undefined when the configuration already has binary bytes", async function () {
    const wasmBinary = new ArrayBuffer(1);
    const config = Object.freeze({
      wasmBinaryFile: "https://example.com/module.wasm",
      wasmBinary: wasmBinary,
    });
    const fetchArrayBuffer = spyOn(Resource, "fetchArrayBuffer");

    const result = await fetchWebAssemblyBinary(config);

    expect(result).toBeUndefined();
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
});
