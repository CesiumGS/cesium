/*global define*/
define([
        'Core/RuntimeError'
    ], function(
        RuntimeError) {
    'use strict';

    return function() {
        throw new RuntimeError('BadGeometry.createGeometry');
    };
});