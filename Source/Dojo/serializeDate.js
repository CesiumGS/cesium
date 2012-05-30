/*global define*/
define(['../Core/TimeStandard'],
function(TimeStandard) {
    "use strict";

    return function(date) {
        date = TimeStandard.convertUtcToTai(date);
        return JSON.stringify({
            day : date.getJulianDayNumber(),
            secondsOfDay : date.getSecondsOfDay()
        });
    };
});