/*global define*/
define(function() {
    "use strict";

    return function(date) {
        return JSON.stringify({
            day : date.getJulianDayNumber(),
            secondsOfDay : date.getSecondsOfDay()
        });
    };
});