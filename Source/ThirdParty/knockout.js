/*global define*/
define([
        './knockout-3.0.0',
        './knockout-es5'
    ], function(
        knockout,
        knockout_es5) {
    "use strict";

    knockout_es5.attachToKo(knockout);
    return knockout;
});