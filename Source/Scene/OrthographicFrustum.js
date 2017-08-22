define([
        '../Core/deprecationWarning',
        '../Core/OrthographicFrustum'
    ], function(
        deprecationWarning,
        OrthographicFrustum) {
    'use strict';

    function DeprecatedOrthographicFrustum(options) {
        deprecationWarning('OrthographicFrustum', 'Scene/OrthographicFrustum is deprecated. It has moved to Core/OrthographicFrustum in 1.36. Scene/OrthographicFrustum will be removed in 1.38.');
        return new OrthographicFrustum(options);
    }

    return DeprecatedOrthographicFrustum;
});
