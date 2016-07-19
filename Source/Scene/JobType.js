/*global define*/
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
        // Potential additional types:
        // * CPU - e.g., for getting terrain heights for billboards/labels
        // * GPUCompute - e.g., for reprojecting imagery using GPGPU
        // * Content specific - e.g., favor terrain over buildings or vice versa
    };

    return freezeObject(JobType);
});
