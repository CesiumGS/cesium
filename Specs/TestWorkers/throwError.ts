import { createTaskProcessorWorker } from "@cesium/engine";

export default createTaskProcessorWorker(function (parameters) {
  throw new Error(parameters.message);
});
