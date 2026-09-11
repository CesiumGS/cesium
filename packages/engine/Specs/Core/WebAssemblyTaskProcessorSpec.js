import {
  FeatureDetection,
  Resource,
  RuntimeError,
  TaskProcessor,
  TrustedServers,
  WebAssemblyTaskProcessor,
} from "../../index.js";

import absolutize from "../../../../Specs/absolutize.js";
import createFakeWorker, { createDeferred } from "./createFakeWorker.js";

describe("Core/WebAssemblyTaskProcessor", function () {
  let taskProcessor;

  afterEach(function () {
    if (taskProcessor && !taskProcessor.isDestroyed()) {
      taskProcessor = taskProcessor.destroy();
    }
  });

  it("throws if web assembly is not supported and no backup is provided", function () {
    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    expect(() => {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });
    }).toThrowError(RuntimeError);
  });

  it("rejects pending initialization when destroyed", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);
    TaskProcessor._canTransferArrayBuffer = true;

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      const promise = taskProcessor.initialize();

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

  it("rejects a task destroyed after initialization", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function (message) {
      worker.dispatchEvent("message", {
        data: {
          id: message.id,
          result: "initialized",
        },
      });
    });

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      await expectAsync(taskProcessor.initialize()).toBeResolvedTo(
        "initialized",
      );

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
      if (message.type === "initializeWebAssembly") {
        initializationPosted.resolve();
      } else {
        worker.dispatchEvent("message", {
          data: { id: message.id, result: "processed" },
        });
      }
    });

    try {
      taskProcessor = new WebAssemblyTaskProcessor(
        "worker.js",
        { wasmBinaryFile: "https://example.com/module.wasm" },
        1,
      );

      const firstPromise = taskProcessor.initialize();
      const secondPromise = taskProcessor.initialize();
      const taskPromise = taskProcessor.scheduleTask({ input: true });

      expect(taskProcessor.scheduleTask({ input: false })).toBeUndefined();

      await initializationPosted.promise;

      expect(window.Worker).toHaveBeenCalledTimes(1);
      expect(worker.postMessage).toHaveBeenCalledTimes(1);

      worker.dispatchEvent("message", {
        data: { id: -1, result: "initialized" },
      });

      await expectAsync(firstPromise).toBeResolvedTo("initialized");
      await expectAsync(secondPromise).toBeResolvedTo("initialized");
      await expectAsync(taskPromise).toBeResolvedTo("processed");

      expect(taskProcessor._activeTasks).toBe(0);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects malformed initialization replies", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function (message) {
      worker.dispatchEvent("message", {
        data: { id: message.id },
      });
    });

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      await expectAsync(taskProcessor.initialize()).toBeRejectedWithError(
        RuntimeError,
        "Could not configure wasm module",
      );

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("resets failed initialization so it can be retried", async function () {
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
    secondWorker.postMessage.and.callFake(function (message) {
      secondWorker.dispatchEvent("message", {
        data: { id: message.id, result: "initialized" },
      });
    });

    taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
      wasmBinaryFile: "https://example.com/module.wasm",
    });

    await expectAsync(taskProcessor.initialize()).toBeRejectedWithError(
      Error,
      "worker module evaluation failed",
    );
    await expectAsync(taskProcessor.initialize()).toBeResolvedTo("initialized");
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
        data: { id: message.id, result: "initialized" },
      });
    });
    replacementWorker.postMessage.and.callFake(function (message) {
      replacementWorker.dispatchEvent("message", {
        data: { id: message.id, result: "processed" },
      });
    });

    const options = { wasmBinaryFile: "https://example.com/module.wasm" };

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", options);
      await expectAsync(taskProcessor.initialize()).toBeResolvedTo(
        "initialized",
      );

      firstWorker.dispatchEvent("error", {
        message: "worker failed after initialization",
      });

      const taskPromise = taskProcessor.scheduleTask({ input: true });
      await expectAsync(taskPromise).toBeResolvedTo("processed");

      expect(replacementWorker.postMessage.calls.argsFor(0)[0]).toEqual(
        jasmine.objectContaining({
          type: "initializeWebAssembly",
          webAssemblyConfig: jasmine.objectContaining(options),
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

    firstWorker.postMessage.and.callFake(function (message) {
      firstWorker.dispatchEvent("message", {
        data: { id: message.id, result: "initialized" },
      });
    });

    replacementWorker.postMessage.and.callFake(function (message) {
      if (message.type === "initializeWebAssembly") {
        replacementInitializationPosted.resolve();
      } else {
        replacementTaskMessage = message;
        replacementWorker.dispatchEvent("message", {
          data: { id: message.id, result: "processed" },
        });
      }
    });

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      await expectAsync(taskProcessor.initialize()).toBeResolvedTo(
        "initialized",
      );

      firstWorker.dispatchEvent("error", {
        message: "worker failed after initialization",
      });

      const taskPromise = taskProcessor.scheduleTask({ input: true });
      await replacementInitializationPosted.promise;

      expect(replacementWorker.postMessage).toHaveBeenCalledTimes(1);
      expect(replacementTaskMessage).toBeUndefined();

      replacementWorker.dispatchEvent("message", {
        data: { id: -1, result: "initialized" },
      });

      await expectAsync(taskPromise).toBeResolvedTo("processed");

      expect(replacementTaskMessage).toBeDefined();
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("rejects synchronous initialization postMessage failures", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);

    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function () {
      throw new Error("initialization postMessage failed");
    });

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      await expectAsync(taskProcessor.initialize()).toBeRejectedWithError(
        Error,
        "initialization postMessage failed",
      );

      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("posts the web assembly binary url without fetching the binary", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    const moduleUrl = absolutize(
      "../Build/Specs/TestWorkers/basisTranscoderCustom.js",
    );

    spyOn(Resource, "fetchArrayBuffer").and.callThrough();

    taskProcessor = new WebAssemblyTaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
      {
        wasmBinaryFile: binaryUrl,
        modulePath: moduleUrl,
        fallbackModulePath: "TestWasm/testWasmFallback",
      },
    );

    const result = await taskProcessor.initialize();

    expect(result).toBeDefined();
    if (FeatureDetection.supportsWebAssembly()) {
      expect(result.wasmBinaryFile).toEqual(binaryUrl);
      expect(result.modulePath).toEqual(moduleUrl);
      // The document must not handle the binary; the worker requests it itself.
      expect(result.wasmBinary).not.toBeDefined();
      expect(Resource.fetchArrayBuffer).not.toHaveBeenCalled();
    }
  });

  it("sends the TrustedServers registry alongside the initialization handshake", async function () {
    const previousCanTransferArrayBuffer =
      TaskProcessor._canTransferArrayBuffer;
    const worker = createFakeWorker();

    spyOn(window, "Worker").and.returnValue(worker);
    TaskProcessor._canTransferArrayBuffer = true;

    worker.postMessage.and.callFake(function (message) {
      worker.dispatchEvent("message", {
        data: { id: message.id, result: true },
      });
    });

    TrustedServers.add("example.com", 443);

    try {
      taskProcessor = new WebAssemblyTaskProcessor("worker.js", {
        wasmBinaryFile: "https://example.com/module.wasm",
      });

      await taskProcessor.initialize();

      // The worker's own copy of TrustedServers starts empty; the document has
      // to send its registry across so Resource calls in the worker resolve
      // credentials the same way, without a one-off override.
      expect(worker.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          trustedServers: TrustedServers.pack(),
        }),
      );
    } finally {
      TrustedServers.remove("example.com", 443);
      TaskProcessor._canTransferArrayBuffer = previousCanTransferArrayBuffer;
    }
  });

  it("lets the worker resolve TrustedServers credentials itself", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    const url = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    const parsedUrl = new URL(url);
    const port =
      Number(parsedUrl.port) || (parsedUrl.protocol === "https:" ? 443 : 80);
    TrustedServers.add(parsedUrl.hostname, port);

    try {
      taskProcessor = new WebAssemblyTaskProcessor(
        absolutize("../Build/Specs/TestWorkers/checkTrustedServer.js", 5),
        { wasmBinaryFile: url },
      );

      const isTrusted = await taskProcessor.initialize();

      // Resolved inside the worker's own TrustedServers module, seeded from
      // the document's registry rather than an explicit override.
      expect(isTrusted).toBe(true);
    } finally {
      TrustedServers.remove(parsedUrl.hostname, port);
    }
  });

  it("can load and compile web assembly module in the worker", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");
    taskProcessor = new WebAssemblyTaskProcessor(
      absolutize("../Build/Specs/TestWorkers/compileWasmInWorker.js", 5),
      {
        wasmBinaryFile: binaryUrl,
        fallbackModulePath: "TestWasm/testWasmFallback",
      },
    );

    const result = await taskProcessor.initialize();

    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.exports).toContain("main");
  });

  it("rejects if the worker cannot load the web assembly binary", async function () {
    if (!FeatureDetection.supportsWebAssembly()) {
      return;
    }

    taskProcessor = new WebAssemblyTaskProcessor(
      absolutize("../Build/Specs/TestWorkers/compileWasmInWorker.js", 5),
      {
        wasmBinaryFile: absolutize("../Specs/TestWorkers/TestWasm/nope.wasm"),
      },
    );

    await expectAsync(taskProcessor.initialize()).toBeRejected();
  });

  it("uses a backup module if web assembly is not supported", async function () {
    const binaryUrl = absolutize("../Specs/TestWorkers/TestWasm/testWasm.wasm");

    spyOn(FeatureDetection, "supportsWebAssembly").and.returnValue(false);

    taskProcessor = new WebAssemblyTaskProcessor(
      absolutize("../Build/Specs/TestWorkers/returnWasmConfig.js", 5),
      {
        wasmBinaryFile: binaryUrl,
        fallbackModulePath: "TestWasm/testWasmFallback",
      },
    );

    const result = await taskProcessor.initialize();

    expect(result).toBeDefined();
    expect(result.modulePath).toMatch(/TestWasm\/testWasmFallback/);
    expect(result.wasmBinary).not.toBeDefined();
  });
});
