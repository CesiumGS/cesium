import freezeObject from '../Core/freezeObject.js';

    /**
     * @private
     */
    var JobType = {
        TEXTURE : 0,
        PROGRAM : 1,
        BUFFER : 2,
        NUMBER_OF_JOB_TYPES : 3
    };
export default freezeObject(JobType);
