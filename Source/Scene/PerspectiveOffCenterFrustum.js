define([
        '../Core/deprecationWarning',
        '../Core/PerspectiveOffCenterFrustum'
    ], function(
        deprecationWarning,
        PerspectiveOffCenterFrustum) {
    'use strict';

    function DeprecatedPerspectiveOffCenterFrustum(options) {
        deprecationWarning('PerspectiveOffCenterFrustum', 'Scene/PerspectiveOffCenterFrustum is deprecated. It has moved to Core/PerspectiveOffCenterFrustum in 1.36. Scene/PerspectiveOffCenterFrustum will be removed in 1.38.');
        return new PerspectiveOffCenterFrustum(options);
    }

    return DeprecatedPerspectiveOffCenterFrustum;
});
