/*global define*/
define([
        '../Core/BoxGeometry',
        './createTaskProcessorWorker'
    ], function(
        BoxGeometry,
        createTaskProcessorWorker) {
    "use strict";

    function createBoxGeometry(parameters, transferableObjects) {
        var boxGeometry = parameters.geometry;
        var geometry = BoxGeometry.createGeometry(boxGeometry);

        var attributes = geometry.attributes;
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name) &&
                    typeof attributes[name] !== 'undefined' &&
                    typeof attributes[name].values !== 'undefined' &&
                    transferableObjects.indexOf(attributes[name].values.buffer) < 0) {
                transferableObjects.push(attributes[name].values.buffer);
            }
        }

        if (typeof geometry.indices !== 'undefined') {
            transferableObjects.push(geometry.indices.buffer);
        }

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createBoxGeometry);
});
