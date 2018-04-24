define([], function() {
    'use strict';

    return function returnWasmConfig(event) {
        var data = event.data;
        var wasmConfig = data.webAssemblyConfig;
        self.postMessage(wasmConfig);
    };
});
