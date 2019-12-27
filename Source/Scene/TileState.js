import freezeObject from '../Core/freezeObject.js';

    /**
     * @private
     */
    var TileState = {
        START : 0,
        LOADING : 1,
        READY : 2,
        UPSAMPLED_ONLY : 3
    };
export default freezeObject(TileState);
