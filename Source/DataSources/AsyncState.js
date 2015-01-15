/*global define*/
define(function() {
    "use strict";

    /**
     * @private
     */
    var AsyncState = {
        COMPLETED : 0,
        PENDING : 1,
        FAILED : 2
    };

    return AsyncState;
});
