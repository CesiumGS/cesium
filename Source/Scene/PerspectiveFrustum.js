define([
        '../Core/deprecationWarning',
        '../Core/PerspectiveFrustum'
    ], function(
        deprecationWarning,
        PerspectiveFrustum) {
    'use strict';

    function DeprecatedPerspectiveFrustum(options) {
        deprecationWarning('PerspectiveFrustum', 'Scene/PerspectiveFrustum is deprecated. It has moved to Core/PerspectiveFrustum in 1.36. Scene/PerspectiveFrustum will be removed in 1.38.');
        return new PerspectiveFrustum(options);
    }

    return DeprecatedPerspectiveFrustum;
});
