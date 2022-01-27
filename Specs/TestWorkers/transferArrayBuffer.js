define(["Workers/createTaskProcessorWorker"], function (
  createTaskProcessorWorker
) {
  "use strict";

  return createTaskProcessorWorker(function (parameters, transferableObjects) {
    const arrayBuffer = new ArrayBuffer(parameters.byteLength);
    transferableObjects.push(arrayBuffer);
    return arrayBuffer;
  });
});
