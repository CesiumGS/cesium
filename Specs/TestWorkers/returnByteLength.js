import createTaskProcessorWorker from "../../Source/WorkersES6/createTaskProcessorWorker.js";

export default createTaskProcessorWorker(function (
  parameters,
  transferableObjects
) {
  return parameters.byteLength;
});
