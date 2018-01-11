define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     */
    var JobType = {
        TEXTURE : 0,
        PROGRAM : 1,
        BUFFER : 2,
        NUMBER_OF_JOB_TYPES : 3
    };

    return freezeObject(JobType);
});
