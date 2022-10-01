define([], function () {
  "use strict";

  return function returnWasmConfig(event) {
    const data = event.data;
    const wasmConfig = data.webAssemblyConfig;
    self.postMessage(wasmConfig);
  };
});
