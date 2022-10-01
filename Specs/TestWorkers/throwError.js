define(["Workers/createTaskProcessorWorker"], function (
  createTaskProcessorWorker
) {
  "use strict";

  return createTaskProcessorWorker(function (parameters, transferableObjects) {
    throw new Error(parameters.message);
  });
});
