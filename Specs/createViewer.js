/*global define*/
define([
        'Core/defaultValue',
        'Widgets/Viewer/Viewer'
    ], function(
        defaultValue,
        Viewer) {
    'use strict';

    function createViewer(container, options) {
        options = defaultValue(options, {});
        options.contextOptions = defaultValue(options.contextOptions, {});
        options.contextOptions.webgl = defaultValue(options.contextOptions.webgl, {});

        return new Viewer(container, options);
    }

    return createViewer;
});