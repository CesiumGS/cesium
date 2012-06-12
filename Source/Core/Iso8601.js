/*global define*/
define(['./JulianDate',
        './TimeInterval',
        './TimeStandard'
       ], function(
       JulianDate,
       TimeInterval,
       TimeStandard) {
    "use strict";

    var MINIMUM_VALUE = Object.freeze(JulianDate.fromDate(new Date(Date.UTC(-1, 0, 1, 0, 0, 0))), TimeStandard.TAI);
    var MAXIMUM_VALUE = Object.freeze(JulianDate.fromDate(new Date(Date.UTC(10000, 0, 0, 0, 0, 0))), TimeStandard.TAI);

    var Iso8601 = {
        MINIMUM_VALUE : MINIMUM_VALUE,

        MAXIMUM_VALUE : MAXIMUM_VALUE,

        MAXIMUM_INTERVAL : Object.freeze(new TimeInterval(MINIMUM_VALUE, MAXIMUM_VALUE, true, true))
    };
    return Iso8601;
});