/*global define*/
define([
        'Core/defaultValue',
        'Core/Intersect',
        'Core/Matrix4',
        'Scene/SceneMode'
     ], function(
         defaultValue,
         Intersect,
         Matrix4,
         SceneMode) {
    "use strict";

    function render(context, frameState, primitive) {
        var commandLists = [];
        primitive.update(context, frameState, commandLists);

        var numRendered = 0;
        var cullingVolume = frameState.cullingVolume;
        var occluder;
        if (frameState.mode === SceneMode.SCENE3D) {
            occluder = frameState.occluder;
        }

        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i].colorList;
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                var command = commandList[j];
                var boundingVolume = command.boundingVolume;
                if (typeof boundingVolume !== 'undefined') {
                    var modelMatrix = defaultValue(command.modelMatrix, Matrix4.IDENTITY);
                    var transformedBV = boundingVolume.transform(modelMatrix);
                    if (cullingVolume.getVisibility(transformedBV) === Intersect.OUTSIDE ||
                            (typeof occluder !== 'undefined' && !occluder.isBoundingSphereVisible(transformedBV))) {
                        continue;
                    }
                }

                command.execute(context);
                numRendered++;
            }
        }

        return numRendered;
    }

    return render;
});