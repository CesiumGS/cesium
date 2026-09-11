import {
  createWebAssemblyTaskProcessorWorker,
  TrustedServers,
} from "@cesium/engine";

export default createWebAssemblyTaskProcessorWorker(
  async function checkTrustedServer(webAssemblyConfig) {
    return TrustedServers.contains(webAssemblyConfig.wasmBinaryFile);
  },
  function unusedTask() {
    throw new Error("not used");
  },
);
