define([
        'Core/defaultValue',
        'Core/FeatureDetection'
    ], function(
        defaultValue,
        FeatureDetection) {
    'use strict';

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

    function createModifiersList(ctrlKey, altKey, shiftKey, metaKey) {
        var modifiers = [];
        if (ctrlKey) {
            modifiers.push('Control');
        }
        if (altKey) {
            modifiers.push('Alt');
        }
        if (shiftKey) {
            modifiers.push('Shift');
        }
        if (metaKey) {
            modifiers.push('Meta');
        }
        return modifiers.join(' ');
    }

    // MouseWheelEvent is legacy
    function createMouseWheelEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canBubble = defaultValue(options.canBubble, true);
        var cancelable = defaultValue(options.cancelable, true);
        var view = defaultValue(options.view, window);
        var detail = defaultValue(options.detail, 0);
        var screenX = defaultValue(options.screenX, 0);
        var screenY = defaultValue(options.screenY, 0);
        var clientX = defaultValue(options.clientX, 0);
        var clientY = defaultValue(options.clientY, 0);
        var button = defaultValue(options.button, 0);
        var relatedTarget = defaultValue(options.relatedTarget, null);
        var ctrlKey = defaultValue(options.ctrlKey, false);
        var altKey = defaultValue(options.altKey, false);
        var shiftKey = defaultValue(options.shiftKey, false);
        var metaKey = defaultValue(options.metaKey, false);
        var wheelDelta = defaultValue(options.wheelDelta, 0);

        var event = document.createEvent('MouseWheelEvent');
        var modifiersList = createModifiersList(ctrlKey, altKey, shiftKey, metaKey);
        event.initMouseWheelEvent(type, canBubble, cancelable, view, detail, screenX, screenY, clientX, clientY, button, relatedTarget, modifiersList, wheelDelta);
        return event;
    }

    function createWheelEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canBubble = defaultValue(options.canBubble, true);
        var cancelable = defaultValue(options.cancelable, true);
        var view = defaultValue(options.view, window);
        var detail = defaultValue(options.detail, 0);
        var screenX = defaultValue(options.screenX, 0);
        var screenY = defaultValue(options.screenY, 0);
        var clientX = defaultValue(options.clientX, 0);
        var clientY = defaultValue(options.clientY, 0);
        var button = defaultValue(options.button, 0);
        var relatedTarget = defaultValue(options.relatedTarget, null);
        var ctrlKey = defaultValue(options.ctrlKey, false);
        var altKey = defaultValue(options.altKey, false);
        var shiftKey = defaultValue(options.shiftKey, false);
        var metaKey = defaultValue(options.metaKey, false);
        var deltaX = defaultValue(options.deltaX, 0);
        var deltaY = defaultValue(options.deltaY, 0);
        var deltaZ = defaultValue(options.deltaZ, 0);
        var deltaMode = defaultValue(options.deltaMode, 0);

        try {
            /*global WheelEvent*/
            return new WheelEvent(type, {
                view : view,
                detail : detail,
                screenX : screenX,
                screenY : screenY,
                clientX : clientX,
                clientY : clientY,
                button : button,
                relatedTarget : relatedTarget,
                ctrlKey : ctrlKey,
                altKey : altKey,
                shiftKey : shiftKey,
                metaKey : metaKey,
                deltaX : deltaX,
                deltaY : deltaY,
                deltaZ : deltaZ,
                deltaMode : deltaMode
            });
        } catch (e) {
            var event = document.createEvent('WheelEvent');
            var modifiersList = createModifiersList(ctrlKey, altKey, shiftKey, metaKey);
            event.initWheelEvent(type, canBubble, cancelable, view, detail, screenX, screenY, clientX, clientY, button, relatedTarget, modifiersList, deltaX, deltaY, deltaZ, deltaMode);
            return event;
        }
    }

    function createTouchEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canBubble = defaultValue(options.canBubble, true);
        var cancelable = defaultValue(options.cancelable, true);
        var view = defaultValue(options.view, window);
        var detail = defaultValue(options.detail, 0);

        var event = document.createEvent('UIEvent');
        event.initUIEvent(type, canBubble, cancelable, view, detail);

        event.touches = defaultValue(options.touches, []);
        event.targetTouches = defaultValue(options.targetTouches, []);
        event.changedTouches = defaultValue(options.changedTouches, []);

        return event;
    }

    function createPointerEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var event;

        if (FeatureDetection.isInternetExplorer()) {
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
            var offsetX = defaultValue(options.offsetX, 0);
            var offsetY = defaultValue(options.offsetY, 0);
            var width = defaultValue(options.width, 0);
            var height = defaultValue(options.height, 0);
            var pressure = defaultValue(options.pressure, 0);
            var rotation = defaultValue(options.rotation, 0);
            var tiltX = defaultValue(options.tiltX, 0);
            var tiltY = defaultValue(options.tiltY, 0);
            var pointerId = defaultValue(options.pointerId, 1);
            var pointerType = defaultValue(options.pointerType, 0);
            var hwTimestamp = defaultValue(options.hwTimestamp, 0);
            var isPrimary = defaultValue(options.isPrimary, 0);

            event = document.createEvent('PointerEvent');
            event.initPointerEvent(type, canBubble, cancelable, view, detail, screenX, screenY, clientX, clientY,
                    ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget, offsetX, offsetY, width, height,
                    pressure, rotation, tiltX, tiltY, pointerId, pointerType, hwTimestamp, isPrimary);
        } else {
            event = new window.PointerEvent(type, {
                canBubble : defaultValue(options.canBubble, true),
                cancelable : defaultValue(options.cancelable, true),
                view : defaultValue(options.view, window),
                detail : defaultValue(options.detail, 0),
                screenX : defaultValue(options.screenX, 0),
                screenY : defaultValue(options.screenY, 0),
                clientX : defaultValue(options.clientX, 0),
                clientY : defaultValue(options.clientY, 0),
                ctrlKey : defaultValue(options.ctrlKey, false),
                altKey : defaultValue(options.altKey, false),
                shiftKey : defaultValue(options.shiftKey, false),
                metaKey : defaultValue(options.metaKey, false),
                button : defaultValue(options.button, 0),
                relatedTarget : defaultValue(options.relatedTarget, null),
                offsetX : defaultValue(options.offsetX, 0),
                offsetY : defaultValue(options.offsetY, 0),
                width : defaultValue(options.width, 0),
                height : defaultValue(options.height, 0),
                pressure : defaultValue(options.pressure, 0),
                rotation : defaultValue(options.rotation, 0),
                tiltX : defaultValue(options.tiltX, 0),
                tiltY : defaultValue(options.tiltY, 0),
                pointerId : defaultValue(options.pointerId, 1),
                pointerType : defaultValue(options.pointerType, 0),
                hwTimestamp : defaultValue(options.hwTimestamp, 0),
                isPrimary : defaultValue(options.isPrimary, 0)
            });
        }
        return event;
    }

    function createDeviceOrientationEvent(type, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canBubble = defaultValue(options.canBubble, true);
        var cancelable = defaultValue(options.cancelable, true);
        var alpha = defaultValue(options.alpha, 0.0);
        var beta = defaultValue(options.beta, 0.0);
        var gamma = defaultValue(options.gamma, 0.0);
        var absolute = defaultValue(options.absolute, false);

        var event;
        event = document.createEvent('DeviceOrientationEvent');
        if (typeof event.initDeviceOrientationEvent === 'function') {
            event.initDeviceOrientationEvent(type, canBubble, cancelable, alpha, beta, gamma, absolute);
        } else {
            event = new DeviceOrientationEvent('deviceorientation', {
                alpha : alpha,
                beta : beta,
                gamma : gamma,
                absolute : absolute
            });
        }
        return event;
    }

    var DomEventSimulator = {
        fireMouseDown : function(element, options) {
            element.dispatchEvent(createMouseEvent('mousedown', options));
        },
        fireMouseUp : function(element, options) {
            element.dispatchEvent(createMouseEvent('mouseup', options));
        },
        fireMouseMove : function(element, options) {
            element.dispatchEvent(createMouseEvent('mousemove', options));
        },
        fireClick : function(element, options) {
            element.dispatchEvent(createMouseEvent('click', options));
        },
        fireDoubleClick : function(element, options) {
            element.dispatchEvent(createMouseEvent('dblclick', options));
        },
        fireMouseWheel : function(element, options) {
            element.dispatchEvent(createMouseWheelEvent('mousewheel', options));
        },
        fireWheel : function(element, options) {
            element.dispatchEvent(createWheelEvent('wheel', options));
        },
        fireTouchStart : function(element, options) {
            element.dispatchEvent(createTouchEvent('touchstart', options));
        },
        fireTouchMove : function(element, options) {
            element.dispatchEvent(createTouchEvent('touchmove', options));
        },
        fireTouchEnd : function(element, options) {
            element.dispatchEvent(createTouchEvent('touchend', options));
        },
        fireTouchCancel : function(element, options) {
            element.dispatchEvent(createTouchEvent('touchcancel', options));
        },
        firePointerDown : function(element, options) {
            element.dispatchEvent(createPointerEvent('pointerdown', options));
        },
        firePointerUp : function(element, options) {
            element.dispatchEvent(createPointerEvent('pointerup', options));
        },
        firePointerMove : function(element, options) {
            element.dispatchEvent(createPointerEvent('pointermove', options));
        },
        firePointerCancel : function(element, options) {
            element.dispatchEvent(createPointerEvent('pointercancel', options));
        },
        fireDeviceOrientation : function(element, options) {
            element.dispatchEvent(createDeviceOrientationEvent('deviceorientation', options));
        },
        fireMockEvent : function(eventHandler, event) {
            eventHandler.call(window, event);
        }
    };

    return DomEventSimulator;
});
