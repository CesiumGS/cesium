/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    var ClockStep = {
        FRAME_DEPENDENT : new Enumeration(0, 'FRAME_DEPENDENT'),
        SYSTEM_CLOCK : new Enumeration(1, 'SYSTEM_CLOCK')
    };

    return ClockStep;
});
