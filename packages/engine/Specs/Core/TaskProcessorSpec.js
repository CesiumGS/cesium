import { FeatureDetection, RuntimeError, TaskProcessor } from "../../index.js";

import absolutize from "../../../../Specs/absolutize.js";

describe("Core/TaskProcessor", function () {
  let taskProcessor;

  afterEach(function () {
    TaskProcessor._workerModulePrefix =
      TaskProcessor._defaultWorkerModulePrefix;

    if (taskProcessor && !taskProcessor.isDestroyed()) {
      taskProcessor = taskProcessor.destroy();
    }
  });

  it("throws runtime error if browser is not supported", async function () {
    spyOn(FeatureDetection, "supportsEsmWebWorkers").and.returnValue(false);
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/Build/TestWorkers/returnParameters.js")
    );

    expect(() => taskProcessor.scheduleTask()).toThrowError(RuntimeError);
  });

  it("works with a simple worker", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnParameters.js")
    );

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeResolvedTo(
      parameters
    );
  });

  it("works with a simple worker defined as relative to TaskProcessor._workerModulePrefix", async function () {
    window.CESIUM_WORKERS = undefined;

    TaskProcessor._workerModulePrefix = absolutize(
      "../Build/Specs/TestWorkers/"
    );
    taskProcessor = new TaskProcessor("returnParameters.js");

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeResolvedTo(
      parameters
    );
  });

  it("can be destroyed", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/Build/TestWorkers/returnParameters.js")
    );

    expect(taskProcessor.isDestroyed()).toEqual(false);

    taskProcessor.destroy();

    expect(taskProcessor.isDestroyed()).toEqual(true);
  });

  it("can transfer array buffer", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnByteLength.js")
    );

    const byteLength = 100;
    const parameters = new ArrayBuffer(byteLength);
    expect(parameters.byteLength).toEqual(byteLength);

    const canTransferArrayBuffer = await TaskProcessor._canTransferArrayBuffer;
    const result = await taskProcessor.scheduleTask(parameters, [parameters]);

    // the worker should see the array with proper byte length
    if (canTransferArrayBuffer) {
      // array buffer should be neutered when transferred
      expect(parameters.byteLength).toEqual(0);
    }

    expect(result).toEqual(byteLength);
  });

  it("can transfer array buffer back from worker", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/transferArrayBuffer.js")
    );

    const byteLength = 100;
    const parameters = {
      byteLength: byteLength,
    };

    // the worker should see the array with proper byte length
    const result = await taskProcessor.scheduleTask(parameters);
    expect(result.byteLength).toEqual(100);
  });

  it("rejects promise if worker throws", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/throwError.js")
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    await expectAsync(
      taskProcessor.scheduleTask(parameters)
    ).toBeRejectedWithError(Error, message);
  });

  it("rejects promise if worker returns a non-clonable result", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnNonCloneable.js")
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeRejectedWith(
      jasmine.stringContaining("postMessage failed")
    );
  });

  it("successful task raises the taskCompletedEvent", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnParameters.js")
    );

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };
    let eventRaised = false;
    const removeListenerCallback = TaskProcessor.taskCompletedEvent.addEventListener(
      function () {
        eventRaised = true;
      }
    );

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeResolved();
    expect(eventRaised).toBe(true);
    removeListenerCallback();
  });

  it("unsuccessful task raises the taskCompletedEvent with error", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnNonCloneable.js")
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    let eventRaised = false;
    const removeListenerCallback = TaskProcessor.taskCompletedEvent.addEventListener(
      function (error) {
        eventRaised = true;
        expect(error).toBeDefined();
      }
    );

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeRejected();
    expect(eventRaised).toBe(true);
    removeListenerCallback();
  });

  it("can load and compile web assembly module", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5)
    );
    const result = await taskProcessor.initWebAssemblyModule({
      wasmBinaryFile: binaryUrl,
      fallbackModulePath: "TestWasm/testWasmFallback",
    });

    expect(result).toBeDefined();
    if (FeatureDetection.supportsWebAssembly()) {
      expect(result.wasmBinary).toBeDefined();
      expect(result.wasmBinaryFile).toEqual(binaryUrl);
    }
  });

  it("uses a backup module if web assembly is not supported", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5)
    );

    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    const result = await taskProcessor.initWebAssemblyModule({
      wasmBinaryFile: binaryUrl,
      fallbackModulePath: "TestWasm/testWasmFallback",
    });

    expect(result).toBeDefined();
    expect(result.modulePath).toMatch(/TestWasm\/testWasmFallback/);
    expect(result.wasmBinary).not.toBeDefined();
  });

  it("throws runtime error if web assembly is not supported and no backup is provided", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5)
    );

    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    await expectAsync(
      taskProcessor.initWebAssemblyModule({
        wasmBinaryFile: binaryUrl,
      })
    ).toBeRejectedWithError(RuntimeError);
  });
});
