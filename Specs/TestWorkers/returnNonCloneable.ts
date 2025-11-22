import { createTaskProcessorWorker } from "@cesium/engine";

export default createTaskProcessorWorker(function () {
  return function () {
    //functions are not cloneable
  };
});
