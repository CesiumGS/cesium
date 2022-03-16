import { FeatureDetection } from "../../Source/Cesium.js";
import { TaskProcessor } from "../../Source/Cesium.js";
import absolutize from "../absolutize.js";

describe("Core/TaskProcessor", function () {
  let taskProcessor;

  afterEach(function () {
    if (taskProcessor && !taskProcessor.isDestroyed()) {
      taskProcessor = taskProcessor.destroy();
    }
  });

  it("works with a simple worker defined as relative to TaskProcessor._workerModulePrefix", function () {
    TaskProcessor._workerModulePrefix = absolutize("../Specs/TestWorkers/");
    taskProcessor = new TaskProcessor("returnParameters.js");

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };

    return taskProcessor
      .scheduleTask(parameters)
      .then(function (result) {
        expect(result).toEqual(parameters);
      })
      .finally(function () {
        TaskProcessor._workerModulePrefix =
          TaskProcessor._defaultWorkerModulePrefix;
      });
  });

  it("can be destroyed", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnParameters.js")
    );

    expect(taskProcessor.isDestroyed()).toEqual(false);

    taskProcessor.destroy();

    expect(taskProcessor.isDestroyed()).toEqual(true);
  });

  it("can transfer array buffer", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnByteLength.js")
    );

    const byteLength = 100;
    const parameters = new ArrayBuffer(byteLength);
    expect(parameters.byteLength).toEqual(byteLength);

    return Promise.resolve(TaskProcessor._canTransferArrayBuffer).then(
      function (canTransferArrayBuffer) {
        const promise = taskProcessor.scheduleTask(parameters, [parameters]);

        // the worker should see the array with proper byte length
        return promise.then(function (result) {
          if (canTransferArrayBuffer) {
            // array buffer should be neutered when transferred
            expect(parameters.byteLength).toEqual(0);
          }

          expect(result).toEqual(byteLength);
        });
      }
    );
  });

  it("can transfer array buffer back from worker", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/transferArrayBuffer.js")
    );

    const byteLength = 100;
    const parameters = {
      byteLength: byteLength,
    };

    // the worker should see the array with proper byte length
    return taskProcessor.scheduleTask(parameters).then(function (result) {
      expect(result.byteLength).toEqual(100);
    });
  });

  it("rejects promise if worker throws", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/throwError.js")
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    return taskProcessor
      .scheduleTask(parameters)
      .then(function () {
        fail("should not be called");
      })
      .catch(function (error) {
        expect(error.message).toEqual(message);
      });
  });

  it("rejects promise if worker returns a non-clonable result", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnNonCloneable.js")
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    return taskProcessor
      .scheduleTask(parameters)
      .then(function () {
        fail("should not be called");
      })
      .catch(function (error) {
        expect(error).toContain("postMessage failed");
      });
  });

  it("successful task raises the taskCompletedEvent", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnParameters.js")
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

    return taskProcessor
      .scheduleTask(parameters)
      .then(function (result) {
        expect(eventRaised).toBe(true);
      })
      .finally(function () {
        removeListenerCallback();
      });
  });

  it("unsuccessful task raises the taskCompletedEvent with error", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnNonCloneable.js")
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

    return taskProcessor
      .scheduleTask(parameters)
      .then(function () {
        fail("should not be called");
      })
      .catch(function (error) {
        expect(eventRaised).toBe(true);
      })
      .finally(function () {
        removeListenerCallback();
      });
  });

  it("can load and compile web assembly module", function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnWasmConfig.js", 5)
    );
    const promise = taskProcessor.initWebAssemblyModule({
      modulePath: "TestWasm/testWasmWrapper",
      wasmBinaryFile: binaryUrl,
      fallbackModulePath: "TestWasm/testWasmFallback",
    });

    return promise.then(function (result) {
      expect(result).toBeDefined();
      if (FeatureDetection.supportsWebAssembly()) {
        expect(result.modulePath).toMatch(/TestWasm\/testWasmWrapper/);
        expect(result.wasmBinary).toBeDefined();
      }
    });
  });

  it("uses a backup module if web assembly is not supported", function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnWasmConfig.js", 5)
    );

    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    const promise = taskProcessor.initWebAssemblyModule({
      modulePath: "TestWasm/testWasmWrapper",
      wasmBinaryFile: binaryUrl,
      fallbackModulePath: "TestWasm/testWasmFallback",
    });

    return promise.then(function (result) {
      expect(result).toBeDefined();
      expect(result.modulePath).toMatch(/TestWasm\/testWasmFallback/);
      expect(result.wasmBinary).not.toBeDefined();
    });
  });

  it("throws runtime error if web assembly is not supported and no backup is provided", function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/TestWorkers/returnWasmConfig.js", 5)
    );

    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    expect(function () {
      taskProcessor.initWebAssemblyModule({
        modulePath: "TestWasm/testWasmWrapper",
        wasmBinaryFile: binaryUrl,
      });
    }).toThrowRuntimeError();
  });
});
