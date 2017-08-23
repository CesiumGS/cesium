define([
        '../Core/deprecationWarning',
        '../Core/OrthographicOffCenterFrustum'
    ], function(
        deprecationWarning,
        OrthographicOffCenterFrustum) {
    'use strict';

    function DeprecatedOrthographicOffCenterFrustum(options) {
        deprecationWarning('OrthographicOffCenterFrustum', 'Scene/OrthographicOffCenterFrustum is deprecated. It has moved to Core/OrthographicOffCenterFrustum in 1.36. Scene/OrthographicOffCenterFrustum will be removed in 1.38.');
        return new OrthographicOffCenterFrustum(options);
    }

    return DeprecatedOrthographicOffCenterFrustum;
});
