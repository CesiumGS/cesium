// packages/engine/Source/Core/defined.js
function defined(value) {
  return value !== void 0 && value !== null;
}
var defined_default = defined;

// packages/engine/Source/Core/formatError.js
function formatError(object) {
  let result;
  const name = object.name;
  const message = object.message;
  if (defined_default(name) && defined_default(message)) {
    result = `${name}: ${message}`;
  } else {
    result = object.toString();
  }
  const stack = object.stack;
  if (defined_default(stack)) {
    result += `
${stack}`;
  }
  return result;
}
var formatError_default = formatError;

// packages/engine/Source/Workers/createTaskProcessorWorker.js
function createTaskProcessorWorker(workerFunction) {
  async function onMessageHandler({ data }) {
    const transferableObjects = [];
    const responseMessage = {
      id: data.id,
      result: void 0,
      error: void 0
    };
    self.CESIUM_BASE_URL = data.baseUrl;
    try {
      const result = await workerFunction(data.parameters, transferableObjects);
      responseMessage.result = result;
    } catch (error) {
      if (error instanceof Error) {
        responseMessage.error = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      } else {
        responseMessage.error = error;
      }
    }
    if (!data.canTransferArrayBuffer) {
      transferableObjects.length = 0;
    }
    try {
      postMessage(responseMessage, transferableObjects);
    } catch (error) {
      responseMessage.result = void 0;
      responseMessage.error = `postMessage failed with error: ${formatError_default(
        error
      )}
  with responseMessage: ${JSON.stringify(responseMessage)}`;
      postMessage(responseMessage);
    }
  }
  function onMessageErrorHandler(event) {
    postMessage({
      id: event.data?.id,
      error: `postMessage failed with error: ${JSON.stringify(event)}`
    });
  }
  self.onmessage = onMessageHandler;
  self.onmessageerror = onMessageErrorHandler;
  return self;
}
var createTaskProcessorWorker_default = createTaskProcessorWorker;

// packages/engine/index.js
globalThis.CESIUM_VERSION = "1.109";

// Specs/TestWorkers/transferArrayBuffer.js
var transferArrayBuffer_default = createTaskProcessorWorker_default(function(parameters, transferableObjects) {
  const arrayBuffer = new ArrayBuffer(parameters.byteLength);
  transferableObjects.push(arrayBuffer);
  return arrayBuffer;
});
export {
  transferArrayBuffer_default as default
};
//# sourceMappingURL=transferArrayBuffer.js.map
