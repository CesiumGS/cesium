/*global define*/
define(['Core/Enumeration'],
function(Enumeration) {
    "use strict";

    var ClockStep = {
        FRAME_DEPENDANT : new Enumeration(0, "FRAME_DEPENDANT"),
        SYSTEM_CLOCK : new Enumeration(1, "SYSTEM_CLOCK")
    };

    return ClockStep;
});
