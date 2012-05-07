/*global define*/
define(['Core/Enumeration'], function(Enumeration) {
    "use strict";

    var ClockRange = {
        UNBOUNDED : new Enumeration(0, "UNBOUNDED"),
        CLAMPED : new Enumeration(1, "CLAMPED"),
        LOOP : new Enumeration(1, "LOOP")
    };

    return ClockRange;
});
