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

    DeprecatedCullingVolume.fromBoundingSphere = CullingVolume.fromBoundingSphere;

    DeprecatedCullingVolume.MASK_OUTSIDE = CullingVolume.MASK_OUTSIDE;
    DeprecatedCullingVolume.MASK_INSIDE = CullingVolume.MASK_INSIDE;
    DeprecatedCullingVolume.MASK_INDETERMINATE = CullingVolume.MASK_INDETERMINATE;

    return DeprecatedCullingVolume;
});
