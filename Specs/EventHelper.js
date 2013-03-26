/*global define*/
define(function() {
    "use strict";

    function fireNamedEvent(eventName, element) {
        var event = document.createEvent('HTMLEvents');
        event.initEvent(eventName, true, true);
        event.eventName = eventName;
        event.memo = {};
        element.dispatchEvent(event);
    }

    var EventHelper = {
        fireMouseDown : function(element) {
            fireNamedEvent('mousedown', element);
        },
        fireTouchStart : function(element) {
            fireNamedEvent('touchstart', element);
        },

        fireNamedEvent : fireNamedEvent
    };

    return EventHelper;
});