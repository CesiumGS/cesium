import { createTaskProcessorWorker, TrustedServers } from "@cesium/engine";

export default createTaskProcessorWorker(function (parameters) {
  const url = parameters.webAssemblyConfig?.wasmBinaryFile ?? parameters.url;
  return TrustedServers.contains(url);
});
