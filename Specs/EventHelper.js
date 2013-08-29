/*global define*/
define([
        'Core/defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    function createMouseEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canBubble = defaultValue(options.canBubble, true);
        var cancelable = defaultValue(options.cancelable, true);
        var view = defaultValue(options.view, window);
        var detail = defaultValue(options.detail, 0);
        var screenX = defaultValue(options.screenX, 0);
        var screenY = defaultValue(options.screenY, 0);
        var clientX = defaultValue(options.clientX, 0);
        var clientY = defaultValue(options.clientY, 0);
        var ctrlKey = defaultValue(options.ctrlKey, false);
        var altKey = defaultValue(options.altKey, false);
        var shiftKey = defaultValue(options.shiftKey, false);
        var metaKey = defaultValue(options.metaKey, false);
        var button = defaultValue(options.button, 0);
        var relatedTarget = defaultValue(options.relatedTarget, null);

        var event = document.createEvent('MouseEvent');
        event.initMouseEvent(type, canBubble, cancelable, view, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget);
        return event;
    }

    function createTouchEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canBubble = defaultValue(options.canBubble, true);
        var cancelable = defaultValue(options.cancelable, true);
        var view = defaultValue(options.view, window);
        var detail = defaultValue(options.detail, 0);

        var event = document.createEvent('UIEvent');
        event.initUIEvent(type, canBubble, cancelable, view, detail);
        return event;
    }

    var EventHelper = {
        fireMouseDown : function(element, options) {
            element.dispatchEvent(createMouseEvent('mousedown', options));
        },
        fireClick : function(element, options) {
            element.dispatchEvent(createMouseEvent('click', options));
        },
        fireTouchStart : function(element, options) {
            element.dispatchEvent(createTouchEvent('touchstart', options));
        },
        fireMockEvent : function(eventHandler, event) {
            eventHandler.call(window, event);
        }
    };

    return EventHelper;
});