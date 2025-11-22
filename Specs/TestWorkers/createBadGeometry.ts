import { createTaskProcessorWorker } from "@cesium/engine";

export default createTaskProcessorWorker(function () {
  throw new Error("BadGeometry.createGeometry");
});
