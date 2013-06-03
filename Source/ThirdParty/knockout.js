/*global define*/
define([
        './knockout-2.2.1',
        './knockout-es5'
    ], function(
        knockout,
        knockout_es5) {
    "use strict";

    knockout_es5.attachToKo(knockout);
    return knockout;
});