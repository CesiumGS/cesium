/*global define*/
define([
        '../Core/freezeObject'
], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     */
    var RequestState = {
        UNISSUED : 0,   // Initial unissued state.
        ISSUED : 1,     // Issued but not yet active. Will become active when open slots are available.
        ACTIVE : 2,     // Actual http request has been sent.
        RECEIVED : 3,   // Request completed successfully.
        CANCELLED : 4,  // Request was cancelled, either explicitly or automatically because of low priority.
        FAILED : 5      // Request failed.
    };

    return freezeObject(RequestState);
});
