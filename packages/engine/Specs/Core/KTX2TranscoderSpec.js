import {
  buildModuleUrl,
  DeveloperError,
  KTX2Transcoder,
  PixelFormat,
  Resource,
  TaskProcessor,
} from "../../index.js";

describe("Core/KTX2Transcoder", function () {
  let savedProcessor;
  let savedPromise;
  let savedOptions;

  beforeEach(function () {
    savedProcessor = KTX2Transcoder._transcodeTaskProcessor;
    savedPromise = KTX2Transcoder._readyPromise;
    savedOptions = KTX2Transcoder._basisTranscoderOptions;

    KTX2Transcoder._transcodeTaskProcessor = new TaskProcessor(
      "transcodeKTX2",
      Number.POSITIVE_INFINITY,
    );
    KTX2Transcoder._readyPromise = undefined;
    KTX2Transcoder._basisTranscoderOptions = undefined;
  });

  afterEach(function () {
    KTX2Transcoder._transcodeTaskProcessor.destroy();
    KTX2Transcoder._transcodeTaskProcessor = savedProcessor;
    KTX2Transcoder._readyPromise = savedPromise;
    KTX2Transcoder._basisTranscoderOptions = savedOptions;
  });

  function configure() {
    KTX2Transcoder.basisTranscoderOptions = {
      modulePath: "../Build/Specs/TestWorkers/basisTranscoderCustom.js",
      wasmBinaryFile: buildModuleUrl("ThirdParty/basis_transcoder.wasm"),
    };
  }

  it("requires both non-empty URLs", function () {
    for (const value of [
      {},
      "basis.js",
      { modulePath: "basis.js" },
      { wasmBinaryFile: "basis.wasm" },
      { modulePath: "", wasmBinaryFile: "basis.wasm" },
      { modulePath: "basis.js", wasmBinaryFile: 42 },
    ]) {
      expect(function () {
        KTX2Transcoder.basisTranscoderOptions = value;
      }).toThrowError(DeveloperError);
    }
  });

  it("copies options and permits resetting them before initialization", function () {
    const options = { modulePath: "basis.js", wasmBinaryFile: "basis.wasm" };
    KTX2Transcoder.basisTranscoderOptions = options;
    options.modulePath = "changed.js";

    expect(KTX2Transcoder.basisTranscoderOptions.modulePath).toBe("basis.js");
    expect(Object.isFrozen(KTX2Transcoder.basisTranscoderOptions)).toBe(true);

    KTX2Transcoder.basisTranscoderOptions = undefined;

    expect(KTX2Transcoder.basisTranscoderOptions).toBeUndefined();
  });

  for (const [file, size] of [
    ["Green4x4_ETC1S.ktx2", 4],
    ["Logo32x32_UASTC_Zstd.ktx2", 32],
  ]) {
    it(`transcodes ${file} with app-supplied assets`, async function () {
      configure();

      const buffer = await Resource.fetchArrayBuffer(`./Data/Images/${file}`);
      const result = await KTX2Transcoder.transcode(buffer, { etc: true });

      expect(result.width).toBe(size);
      expect(result.height).toBe(size);
      expect(PixelFormat.isCompressedFormat(result.internalFormat)).toBe(true);
      expect(result.bufferView.byteLength).toBeGreaterThan(0);
    });
  }

  it("rejects configuration changes while initialization is pending", async function () {
    configure();

    const buffer = await Resource.fetchArrayBuffer(
      "./Data/Images/Green4x4_ETC1S.ktx2",
    );
    const promise = KTX2Transcoder.transcode(buffer, { etc: true });

    expect(function () {
      KTX2Transcoder.basisTranscoderOptions = undefined;
    }).toThrowError(DeveloperError);

    await promise;
  });

  it("rejects a failed wrapper import", async function () {
    configure();

    KTX2Transcoder.basisTranscoderOptions = {
      ...KTX2Transcoder.basisTranscoderOptions,
      modulePath: "./missing-basis-wrapper.js",
    };

    await expectAsync(
      KTX2Transcoder.transcode(new Uint8Array(), { etc: true }),
    ).toBeRejected();
  });

  it("rejects a failed binary fetch", async function () {
    configure();

    KTX2Transcoder.basisTranscoderOptions = {
      ...KTX2Transcoder.basisTranscoderOptions,
      wasmBinaryFile: "./missing-basis.wasm",
    };

    await expectAsync(
      KTX2Transcoder.transcode(new Uint8Array(), { etc: true }),
    ).toBeRejected();
  });
});
