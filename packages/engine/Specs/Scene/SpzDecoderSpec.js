import DeveloperError from "../../Source/Core/DeveloperError.js";
import SpzDecoder from "../../Source/Scene/SpzDecoder.js";
import absolutize from "../../../../Specs/absolutize.js";

describe("Scene/SpzDecoder", function () {
  beforeEach(function () {
    SpzDecoder._resetForTesting();
  });

  afterEach(function () {
    SpzDecoder._resetForTesting();
  });

  it("uses a configured SPZ decoder worker module", async function () {
    SpzDecoder.workerModuleUrl = absolutize(
      "../Build/Specs/TestWorkers/decodeSpzCustom.js",
    );

    const spzData = new Uint8Array([1, 2, 3]);
    const result = await SpzDecoder.decode(spzData);

    expect(result.numPoints).toBe(1);
    expect(result.shDegree).toBe(0);
    expect(result.positions).toEqual(new Float32Array([1.0, 2.0, 3.0]));
    expect(result.scales).toEqual(new Float32Array([4.0, 5.0, 6.0]));
    expect(result.rotations).toEqual(new Float32Array([0.0, 0.0, 0.0, 1.0]));
    expect(result.alphas).toEqual(new Float32Array([1.0]));
    expect(result.colors).toEqual(new Float32Array([0.5, 0.25, 0.75]));
    expect(result.sh).toEqual(new Float32Array());
  });

  it("uses a configured SPZ decoder worker module URL with a fragment", async function () {
    SpzDecoder.workerModuleUrl = `${absolutize(
      "../Build/Specs/TestWorkers/decodeSpzCustom.js",
    )}#revision`;

    const result = await SpzDecoder.decode(new Uint8Array([1, 2, 3]));

    expect(result.numPoints).toBe(1);
    expect(result.positions).toEqual(new Float32Array([1.0, 2.0, 3.0]));
  });

  it("must be configured before the first SPZ decode", async function () {
    SpzDecoder.workerModuleUrl = absolutize(
      "../Build/Specs/TestWorkers/decodeSpzCustom.js",
    );
    await SpzDecoder.decode(new Uint8Array([1, 2, 3]));

    expect(function () {
      SpzDecoder.workerModuleUrl = "otherDecoder.js";
    }).toThrowError(DeveloperError);
  });

  it("validates the configured SPZ decoder worker module URL", function () {
    expect(function () {
      SpzDecoder.workerModuleUrl = "";
    }).toThrowError(DeveloperError);

    expect(function () {
      SpzDecoder.workerModuleUrl = {};
    }).toThrowError(DeveloperError);
  });
});
