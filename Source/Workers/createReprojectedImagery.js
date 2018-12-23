define([
        '../Core/AsynchronousReprojectionWorker',
        '../Core/defined',
        './createTaskProcessorWorker'
    ], function(
        AsynchronousReprojectionWorker,
        defined,
        createTaskProcessorWorker) {
    'use strict';

    var asynchronousReprojectionWorker;

    function run(parameters) {
        return asynchronousReprojectionWorker.runTask(parameters);
    }

    function initWorker(stbModule) {
        asynchronousReprojectionWorker = new AsynchronousReprojectionWorker(stbModule);
        self.onmessage = createTaskProcessorWorker(run);
        self.postMessage(true);
    }

    function createReprojectedImagery(event) {
        var data = event.data;

        // Expect the first message to be to load a web assembly module
        var wasmConfig = data.webAssemblyConfig;
        if (defined(wasmConfig)) {
            // Require and compile WebAssembly module, or use fallback if not supported
            return require([wasmConfig.modulePath], function(stbModule) {
                if (defined(wasmConfig.wasmBinaryFile)) {
                    if (!defined(stbModule)) {
                        stbModule = self.Module;
                    }

                    stbModule(wasmConfig).then(function (compiledModule) {
                        initWorker(compiledModule);
                    });
                } else {
                    initWorker(stbModule());
                }
            });
        }
    }

    return createReprojectedImagery;
});
