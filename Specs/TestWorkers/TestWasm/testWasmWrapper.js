define([], function() {
    'use strict';
    return function (config) {
        return WebAssembly.instantiate(config.wasmBinary)
            .then(function (result) {
                return result.instance.exports;
            });
    };
});
