define([
        'Core/defaultValue',
        'Specs/getWebGLStub',
        'Widgets/Viewer/Viewer'
    ], function(
        defaultValue,
        getWebGLStub,
        Viewer) {
    'use strict';

    function createViewer(container, options) {
        options = defaultValue(options, {});
        options.contextOptions = defaultValue(options.contextOptions, {});
        options.contextOptions.webgl = defaultValue(options.contextOptions.webgl, {});
        if (!!window.webglStub) {
            options.contextOptions.getWebGLStub = getWebGLStub;
        }

        return new Viewer(container, options);
    }

    return createViewer;
});
