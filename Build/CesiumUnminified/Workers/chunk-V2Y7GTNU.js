/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  defined_default
} from "./chunk-7KX4PCVC.js";

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

export {
  createTaskProcessorWorker_default
};
