/*global importScripts,require*/
importScripts('../../ThirdParty/requirejs-1.0.8/require.js');

require({
        baseUrl : '..'
    }, [
        'Core/HeightmapTessellator'
    ], function(
        HeightmapTessellator) {
    "use strict";
    /*global self*/

    var postMessage = self.webkitPostMessage || self.postMessage;

    self.onmessage = function(event) {
        var data = event.data;
        var id = data.id;
        var parameters = data.parameters;

        var arrayWidth = parameters.width;
        var arrayHeight = parameters.height;

        if (parameters.skirtHeight > 0.0) {
            arrayWidth += 2;
            arrayHeight += 2;
        }

        var vertices = new Float32Array(arrayWidth * arrayHeight * 5);
        parameters.vertices = vertices;
        parameters.generateTextureCoordinates = true;
        parameters.interleaveTextureCoordinates = true;

        var statistics = HeightmapTessellator.computeVertices(parameters);

        postMessage({
            id : id,
            result : {
                vertices : vertices,
                statistics : statistics
            }
        }, [vertices.buffer]);
    };
});