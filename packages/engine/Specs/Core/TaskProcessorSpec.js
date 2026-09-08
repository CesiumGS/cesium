import {
  buildModuleUrl,
  defined,
  FeatureDetection,
  Resource,
  RuntimeError,
  TaskProcessor,
  TrustedServers,
} from "../../index.js";

import absolutize from "../../../../Specs/absolutize.js";
import createFakeWorker, { createDeferred } from "./createFakeWorker.js";

describe("Core/TaskProcessor", function () {
  let taskProcessor;

  async function testTransferProbeFailure(eventType) {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const taskWorker = createFakeWorker();
    const probeWorker = createFakeWorker();
    const workers = [taskWorker, probeWorker];
    spyOn(window, "Worker").and.callFake(function () {
      return workers.shift();
    });
    TaskProcessor._canTransferArrayBuffer = undefined;

    taskWorker.postMessage.and.callFake(function (message) {
      taskWorker.dispatchEvent("message", {
        data: {
          id: message.id,
          result: true,
        },
      });
    });

    try {
      taskProcessor = new TaskProcessor("worker.js");
      const promise = taskProcessor.scheduleTask();
      probeWorker.dispatchEvent(eventType, {});

      await expectAsync(promise).toBeResolvedTo(true);
      expect(TaskProcessor._canTransferArrayBuffer).toBe(false);
      expect(probeWorker.terminate).toHaveBeenCalled();
      expect(taskProcessor._activeTasks).toBe(0);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  }

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
      absolutize("../Specs/Build/TestWorkers/returnParameters.js"),
    );

    expect(() => taskProcessor.scheduleTask()).toThrowError(RuntimeError);
  });

  it("works with a simple worker", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnParameters.js"),
    );

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeResolvedTo(
      parameters,
    );
  });

  it("preserves fragments on absolute worker URLs", async function () {
    const workerUrl = `${absolutize(
      "../Build/Specs/TestWorkers/returnParameters.js",
    )}#revision`;
    const workerSpy = spyOn(window, "Worker").and.callThrough();

    taskProcessor = new TaskProcessor(workerUrl);
    // Creating the worker does not require a task to be dispatched, so this
    // verifies the URL passed to Worker without waiting for a worker response.
    taskProcessor._activeTasks = taskProcessor._maximumActiveTasks;
    await taskProcessor.scheduleTask();

    expect(workerSpy).toHaveBeenCalledWith(workerUrl, { type: "module" });
  });

  it("works with a simple worker defined as relative to TaskProcessor._workerModulePrefix", async function () {
    window.CESIUM_WORKERS = undefined;

    TaskProcessor._workerModulePrefix = absolutize(
      "../Build/Specs/TestWorkers/",
    );
    taskProcessor = new TaskProcessor("returnParameters.js");

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeResolvedTo(
      parameters,
    );
  });

  it("when workers loaded via module ID and it is cross-origin, loads worker with appropriate shim", async function () {
    // Setup a cross origin BASE_URL
    const oldCESIUM_BASE_URL = window.CESIUM_BASE_URL;
    window.CESIUM_BASE_URL = "http://test.com/source/";
    buildModuleUrl._clearBaseResource();

    const blobSpy = spyOn(window, "Blob").and.callThrough();

    // Provide just the module ID, as is prevalent in the codebase
    taskProcessor = new TaskProcessor("transferTypedArrayTest");
    // Create the worker, but don't execute the task this frame
    taskProcessor._activeTasks = taskProcessor._maximumActiveTasks;

    await taskProcessor.scheduleTask();

    expect(blobSpy).toHaveBeenCalledWith(
      [`import "http://test.com/source/Workers/transferTypedArrayTest.js";`],
      { type: "application/javascript" },
    );

    // Reset old values for BASE_URL
    window.CESIUM_BASE_URL = oldCESIUM_BASE_URL;
    buildModuleUrl._clearBaseResource();
  });

  it("when provided a cross-origin URI, loads worker with appropriate shim", async function () {
    const blobSpy = spyOn(window, "Blob").and.callThrough();

    taskProcessor = new TaskProcessor("http://test.com/Workers/testing.js");
    // Create the worker, but don't execute the task this frame
    taskProcessor._activeTasks = taskProcessor._maximumActiveTasks;

    await taskProcessor.scheduleTask();

    expect(blobSpy).toHaveBeenCalledWith(
      [`import "http://test.com/Workers/testing.js";`],
      { type: "application/javascript" },
    );
  });

  it("can be destroyed", function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Specs/Build/TestWorkers/returnParameters.js"),
    );

    expect(taskProcessor.isDestroyed()).toEqual(false);

    taskProcessor.destroy();

    expect(taskProcessor.isDestroyed()).toEqual(true);
  });

  it("rejects pending tasks when destroyed", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    try {
      taskProcessor = new TaskProcessor("worker.js");
      const promise = taskProcessor.scheduleTask();

      taskProcessor.destroy();

      await expectAsync(promise).toBeRejectedWithError(
        RuntimeError,
        "TaskProcessor was destroyed.",
      );

      expect(taskProcessor._activeTasks).toBe(0);
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects pending web assembly initialization when destroyed", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);
    TaskProcessor._canTransferArrayBuffer = true;

    try {
      taskProcessor = new TaskProcessor("worker.js");

      const promise = taskProcessor.initWebAssemblyModule({
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      taskProcessor.destroy();

      await expectAsync(promise).toBeRejectedWithError(
        RuntimeError,
        "TaskProcessor was destroyed.",
      );

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects a task destroyed after wasm initialization", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function (message) {
      if (!defined(message.id)) {
        worker.dispatchEvent("message", {
          data: {
            result: "initialized",
          },
        });
      }
    });

    try {
      taskProcessor = new TaskProcessor("worker.js");

      await expectAsync(
        taskProcessor.initWebAssemblyModule({
          wasmBinaryFile: "https://example.com/module.wasm",
        }),
      ).toBeResolvedTo("initialized");

      const taskPromise = taskProcessor.scheduleTask({ input: true });
      taskProcessor.destroy();

      await expectAsync(taskPromise).toBeRejectedWithError(
        RuntimeError,
        "TaskProcessor was destroyed.",
      );

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("shares initialization and limits tasks while the worker is not ready", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    const initializationPosted = createDeferred();

    worker.postMessage.and.callFake(function (message) {
      if (!defined(message.id)) {
        initializationPosted.resolve();
      } else {
        worker.dispatchEvent("message", {
          data: { id: message.id, result: "processed" },
        });
      }
    });

    try {
      taskProcessor = new TaskProcessor("worker.js", 1);

      const options = {
        wasmBinaryFile: "https://example.com/module.wasm",
      };
      const firstPromise = taskProcessor.initWebAssemblyModule(options);
      const secondPromise = taskProcessor.initWebAssemblyModule(options);
      const taskPromise = taskProcessor.scheduleTask({ input: true });

      expect(taskProcessor.scheduleTask({ input: false })).toBeUndefined();

      await initializationPosted.promise;

      expect(window.Worker).toHaveBeenCalledTimes(1);
      expect(worker.postMessage).toHaveBeenCalledTimes(1);

      worker.dispatchEvent("message", { data: { result: "initialized" } });

      await expectAsync(firstPromise).toBeResolvedTo("initialized");
      await expectAsync(secondPromise).toBeResolvedTo("initialized");
      await expectAsync(taskPromise).toBeResolvedTo("processed");

      expect(taskProcessor._activeTasks).toBe(0);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects work on both workers when destroyed", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const ordinaryWorker = createFakeWorker();
    const wasmWorker = createFakeWorker();
    const workers = [ordinaryWorker, wasmWorker];

    spyOn(window, "Worker").and.callFake(function () {
      return workers.shift();
    });

    TaskProcessor._canTransferArrayBuffer = true;

    try {
      taskProcessor = new TaskProcessor("worker.js");

      const taskPromise = taskProcessor.scheduleTask();
      const initializationPromise = taskProcessor.initWebAssemblyModule({
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      taskProcessor.destroy();

      await expectAsync(taskPromise).toBeRejectedWithError(
        RuntimeError,
        "TaskProcessor was destroyed.",
      );
      await expectAsync(initializationPromise).toBeRejectedWithError(
        RuntimeError,
        "TaskProcessor was destroyed.",
      );

      expect(ordinaryWorker.terminate).toHaveBeenCalledTimes(1);
      expect(wasmWorker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects malformed web assembly initialization replies", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function () {
      worker.dispatchEvent("message", {
        data: {},
      });
    });

    try {
      taskProcessor = new TaskProcessor("worker.js");

      await expectAsync(
        taskProcessor.initWebAssemblyModule({
          wasmBinaryFile: "https://example.com/module.wasm",
        }),
      ).toBeRejectedWithError(RuntimeError, "Could not configure wasm module");

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("can transfer array buffer", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnByteLength.js"),
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

  it("falls back when the transfer probe emits an error", async function () {
    await testTransferProbeFailure("error");
  });

  it("falls back when the transfer probe emits a messageerror", async function () {
    await testTransferProbeFailure("messageerror");
  });

  it("can transfer array buffer back from worker", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/transferArrayBuffer.js"),
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
      absolutize("../Build/Specs/TestWorkers/throwError.js"),
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    await expectAsync(
      taskProcessor.scheduleTask(parameters),
    ).toBeRejectedWithError(Error, message);
  });

  it("rejects pending tasks if the worker emits an error", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();
    spyOn(window, "Worker").and.callFake(function () {
      return worker;
    });
    TaskProcessor._canTransferArrayBuffer = true;

    taskProcessor = new TaskProcessor("worker.js");
    const firstPromise = taskProcessor.scheduleTask();
    const secondPromise = taskProcessor.scheduleTask();
    const error = new Error("worker evaluation failed");
    worker.dispatchEvent("error", { error: error });

    await expectAsync(
      Promise.all([firstPromise, secondPromise]),
    ).toBeRejectedWithError(Error, error.message);
    expect(taskProcessor._activeTasks).toBe(0);
    expect(worker.terminate).toHaveBeenCalled();
    expect(taskProcessor._worker).toBeUndefined();

    TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
  });

  it("rejects pending tasks if the worker emits a messageerror", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();
    spyOn(window, "Worker").and.callFake(function () {
      return worker;
    });
    TaskProcessor._canTransferArrayBuffer = true;

    taskProcessor = new TaskProcessor("worker.js");
    const promise = taskProcessor.scheduleTask();
    worker.dispatchEvent("messageerror", {});

    await expectAsync(promise).toBeRejectedWithError(Error, "Worker failed");
    expect(taskProcessor._activeTasks).toBe(0);
    expect(worker.terminate).toHaveBeenCalled();
    expect(taskProcessor._worker).toBeUndefined();

    TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
  });

  it("resets failed web assembly initialization so it can be retried", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const firstWorker = createFakeWorker();
    const secondWorker = createFakeWorker();
    const workers = [firstWorker, secondWorker];
    spyOn(window, "Worker").and.callFake(function () {
      return workers.shift();
    });
    TaskProcessor._canTransferArrayBuffer = true;

    firstWorker.postMessage.and.callFake(function () {
      firstWorker.dispatchEvent("error", {
        message: "worker module evaluation failed",
      });
    });
    secondWorker.postMessage.and.callFake(function () {
      secondWorker.dispatchEvent("message", {
        data: {
          result: "initialized",
        },
      });
    });

    taskProcessor = new TaskProcessor("worker.js");
    const options = {
      wasmBinaryFile: "https://example.com/module.wasm",
    };
    await expectAsync(
      taskProcessor.initWebAssemblyModule(options),
    ).toBeRejectedWithError(Error, "worker module evaluation failed");
    await expectAsync(
      taskProcessor.initWebAssemblyModule(options),
    ).toBeResolvedTo("initialized");
    expect(window.Worker).toHaveBeenCalledTimes(2);

    TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
  });

  it("reinitializes a replacement worker before scheduling a task", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const firstWorker = createFakeWorker();
    const replacementWorker = createFakeWorker();
    const workers = [firstWorker, replacementWorker];
    spyOn(window, "Worker").and.callFake(function () {
      return workers.shift();
    });
    TaskProcessor._canTransferArrayBuffer = true;

    firstWorker.postMessage.and.callFake(function (message) {
      firstWorker.dispatchEvent("message", {
        data: {
          result: "initialized",
        },
      });
    });
    replacementWorker.postMessage.and.callFake(function (message) {
      replacementWorker.dispatchEvent("message", {
        data: {
          id: message.id,
          result: "processed",
        },
      });
    });

    try {
      taskProcessor = new TaskProcessor("worker.js");
      const options = {
        wasmBinaryFile: "https://example.com/module.wasm",
      };
      await expectAsync(
        taskProcessor.initWebAssemblyModule(options),
      ).toBeResolvedTo("initialized");

      firstWorker.dispatchEvent("error", {
        message: "worker failed after initialization",
      });

      const taskPromise = taskProcessor.scheduleTask({ input: true });
      await expectAsync(taskPromise).toBeResolvedTo("processed");

      expect(replacementWorker.postMessage.calls.argsFor(0)[0]).toEqual(
        jasmine.objectContaining({
          parameters: {
            webAssemblyConfig: jasmine.objectContaining(options),
          },
        }),
      );
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("waits for replacement initialization before scheduling a task", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const firstWorker = createFakeWorker();
    const replacementWorker = createFakeWorker();
    const workers = [firstWorker, replacementWorker];

    spyOn(window, "Worker").and.callFake(function () {
      return workers.shift();
    });

    TaskProcessor._canTransferArrayBuffer = true;

    const replacementInitializationPosted = createDeferred();
    let replacementTaskMessage;

    firstWorker.postMessage.and.callFake(function () {
      firstWorker.dispatchEvent("message", {
        data: {
          result: "initialized",
        },
      });
    });

    replacementWorker.postMessage.and.callFake(function (message) {
      if (defined(message.id)) {
        replacementTaskMessage = message;
        replacementWorker.dispatchEvent("message", {
          data: {
            id: message.id,
            result: "processed",
          },
        });
      } else {
        replacementInitializationPosted.resolve();
      }
    });

    try {
      taskProcessor = new TaskProcessor("worker.js");

      await expectAsync(
        taskProcessor.initWebAssemblyModule({
          wasmBinaryFile: "https://example.com/module.wasm",
        }),
      ).toBeResolvedTo("initialized");

      firstWorker.dispatchEvent("error", {
        message: "worker failed after initialization",
      });
      firstWorker.dispatchEvent("message", {
        data: {
          id: 0,
          result: "stale",
        },
      });
      firstWorker.dispatchEvent("messageerror", {});

      const taskPromise = taskProcessor.scheduleTask({ input: true });
      await replacementInitializationPosted.promise;

      expect(replacementWorker.postMessage).toHaveBeenCalledTimes(1);
      expect(replacementTaskMessage).toBeUndefined();

      replacementWorker.dispatchEvent("message", {
        data: {
          result: "initialized",
        },
      });

      await expectAsync(taskPromise).toBeResolvedTo("processed");

      expect(replacementTaskMessage).toBeDefined();
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects synchronous web assembly initialization postMessage failures", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function () {
      throw new Error("initialization postMessage failed");
    });

    try {
      taskProcessor = new TaskProcessor("worker.js");

      await expectAsync(
        taskProcessor.initWebAssemblyModule({
          wasmBinaryFile: "https://example.com/module.wasm",
        }),
      ).toBeRejectedWithError(Error, "initialization postMessage failed");

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects promise if worker returns a non-clonable result", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnNonCloneable.js"),
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeRejectedWith(
      jasmine.stringContaining("postMessage failed"),
    );
  });

  it("successful task raises the taskCompletedEvent", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnParameters.js"),
    );

    const parameters = {
      prop: "blah",
      obj: {
        val: true,
      },
    };
    let eventRaised = false;
    const removeListenerCallback =
      TaskProcessor.taskCompletedEvent.addEventListener(function () {
        eventRaised = true;
      });

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeResolved();
    expect(eventRaised).toBe(true);
    removeListenerCallback();
  });

  it("unsuccessful task raises the taskCompletedEvent with error", async function () {
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnNonCloneable.js"),
    );

    const message = "foo";
    const parameters = {
      message: message,
    };

    let eventRaised = false;
    const removeListenerCallback =
      TaskProcessor.taskCompletedEvent.addEventListener(function (error) {
        eventRaised = true;
        expect(error).toBeDefined();
      });

    await expectAsync(taskProcessor.scheduleTask(parameters)).toBeRejected();
    expect(eventRaised).toBe(true);
    removeListenerCallback();
  });

  it("posts the web assembly binary url without fetching the binary", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
    );

    spyOn(Resource, "fetchArrayBuffer").and.callThrough();

    const moduleUrl = absolutize(
      "../Build/Specs/TestWorkers/basisTranscoderCustom.js",
    );
    const result = await taskProcessor.initWebAssemblyModule({
      wasmBinaryFile: binaryUrl,
      modulePath: moduleUrl,
      fallbackModulePath: "TestWasm/testWasmFallback",
    });

    expect(result).toBeDefined();
    if (FeatureDetection.supportsWebAssembly()) {
      expect(result.wasmBinaryFile).toEqual(binaryUrl);
      expect(result.modulePath).toEqual(moduleUrl);
      // The document must not handle the binary; the worker requests it itself.
      expect(result.wasmBinary).not.toBeDefined();
      expect(Resource.fetchArrayBuffer).not.toHaveBeenCalled();
    }
  });

  it("carries the TrustedServers credential decision to the worker", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
    );

    // TrustedServers keeps per-realm module state, so the worker cannot re-derive
    // this and the document has to tell it.
    spyOn(TrustedServers, "contains").and.returnValue(true);

    const result = await taskProcessor.initWebAssemblyModule({
      wasmBinaryFile: binaryUrl,
    });

    expect(TrustedServers.contains).toHaveBeenCalledWith(binaryUrl);
    expect(result.withCredentials).toBe(true);
  });

  it("does not request credentials for untrusted hosts", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
    );

    const result = await taskProcessor.initWebAssemblyModule({
      wasmBinaryFile: absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm"),
    });

    expect(result.withCredentials).toBe(false);
  });

  it("can load and compile web assembly module in the worker", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/compileWasmInWorker.js", 5),
    );

    const result = await taskProcessor.initWebAssemblyModule({
      wasmBinaryFile: binaryUrl,
      fallbackModulePath: "TestWasm/testWasmFallback",
    });

    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.exports).toContain("main");
  });

  it("rejects if the worker cannot load the web assembly binary", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/compileWasmInWorker.js", 5),
    );

    await expectAsync(
      taskProcessor.initWebAssemblyModule({
        wasmBinaryFile: absolutize("../Specs/TestWorkers/TestWasm/nope.wasm"),
      }),
    ).toBeRejected();
  });

  it("uses a backup module if web assembly is not supported", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new TaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
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
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
    );

    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    await expectAsync(
      taskProcessor.initWebAssemblyModule({
        wasmBinaryFile: binaryUrl,
      }),
    ).toBeRejectedWithError(RuntimeError);
  });
});
