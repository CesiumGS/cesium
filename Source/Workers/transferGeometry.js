/*global define*/
define(['../Core/defined'], function(defined) {
    "use strict";

    function transferGeometry(geometry, transferableObjects) {
        var attributes = geometry.attributes;
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name) &&
                    defined(attributes[name]) &&
                    defined(attributes[name].values) &&
                    transferableObjects.indexOf(attributes[name].values.buffer) < 0) {
                transferableObjects.push(attributes[name].values.buffer);
            }
        }

        if (defined(geometry.indices)) {
            transferableObjects.push(geometry.indices.buffer);
        }
    }

    return transferGeometry;
});
