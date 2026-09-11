import { createWebAssemblyTaskProcessorWorker } from "@cesium/engine";

export default createWebAssemblyTaskProcessorWorker(
  async function returnWasmConfig(webAssemblyConfig) {
    return webAssemblyConfig;
  },
  function unusedTask() {
    throw new Error("not used");
  },
);
