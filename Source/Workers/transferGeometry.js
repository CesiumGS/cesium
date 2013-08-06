/*global define*/
define(function() {
    "use strict";

    function transferGeometry(geometry, transferableObjects) {
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
    }

    return transferGeometry;
});
