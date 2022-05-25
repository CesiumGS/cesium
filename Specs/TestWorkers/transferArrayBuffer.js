import createTaskProcessorWorker from "../../Source/WorkersES6/createTaskProcessorWorker.js";

export default createTaskProcessorWorker(function (
  parameters,
  transferableObjects
) {
  const arrayBuffer = new ArrayBuffer(parameters.byteLength);
  transferableObjects.push(arrayBuffer);
  return arrayBuffer;
});
