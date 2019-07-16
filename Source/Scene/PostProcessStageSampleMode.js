define(function() {
    'use strict';

    /**
     * Determines how input texture to a {@link PostProcessStage} is sampled.
     *
     * @exports PostProcessStageSampleMode
     */
    var PostProcessStageSampleMode = {
        /**
         * Samples the texture by returning the closest texel.
         *
         * @type {Number}
         * @constant
         */
        NEAREST : 0,
        /**
         * Samples the texture through bi-linear interpolation of the four nearest texels.
         *
         * @type {Number}
         * @constant
         */
        LINEAR : 1
    };

    return PostProcessStageSampleMode;
});
