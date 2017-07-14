define([
        '../Core/CullingVolume',
        '../Core/deprecationWarning'
    ], function(
        CullingVolume,
        deprecationWarning) {
    'use strict';

    function DeprecatedCullingVolume(planes) {
        deprecationWarning('CullingVolume', 'Scene/CullingVolume is deprecated. It has moved to Core/CullingVolume in 1.36. Scene/CullingVolume will be removed in 1.38.');
        return new CullingVolume(planes);
    }

    return DeprecatedCullingVolume;
});
