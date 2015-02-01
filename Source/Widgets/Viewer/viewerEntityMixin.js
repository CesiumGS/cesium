/*global define*/
define([
        '../../Core/deprecationWarning'
    ], function(
        deprecationWarning) {
    "use strict";

    /**
     * @private
     */
    var viewerEntityMixin = function(viewer) {
        deprecationWarning('viewerEntityMixin', 'As of Cesium 1.5, viewerEntityMixin functionality has been made part of Viewer.  You no longer need to call this function; it will be removed in Cesium 1.6.');
    };

    return viewerEntityMixin;
});