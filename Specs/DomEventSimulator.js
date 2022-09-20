import { defaultValue, FeatureDetection } from "../packages/engine/index.js";

function createMouseEvent(type, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const canBubble = defaultValue(options.canBubble, true);
  const cancelable = defaultValue(options.cancelable, true);
  const view = defaultValue(options.view, window);
  const detail = defaultValue(options.detail, 0);
  const screenX = defaultValue(options.screenX, 0);
  const screenY = defaultValue(options.screenY, 0);
  const clientX = defaultValue(options.clientX, 0);
  const clientY = defaultValue(options.clientY, 0);
  const ctrlKey = defaultValue(options.ctrlKey, false);
  const altKey = defaultValue(options.altKey, false);
  const shiftKey = defaultValue(options.shiftKey, false);
  const metaKey = defaultValue(options.metaKey, false);
  const button = defaultValue(options.button, 0);
  const relatedTarget = defaultValue(options.relatedTarget, null);

  const event = document.createEvent("MouseEvent");
  event.initMouseEvent(
    type,
    canBubble,
    cancelable,
    view,
    detail,
    screenX,
    screenY,
    clientX,
    clientY,
    ctrlKey,
    altKey,
    shiftKey,
    metaKey,
    button,
    relatedTarget
  );
  return event;
}

function createModifiersList(ctrlKey, altKey, shiftKey, metaKey) {
  const modifiers = [];
  if (ctrlKey) {
    modifiers.push("Control");
  }
  if (altKey) {
    modifiers.push("Alt");
  }
  if (shiftKey) {
    modifiers.push("Shift");
  }
  if (metaKey) {
    modifiers.push("Meta");
  }
  return modifiers.join(" ");
}

// MouseWheelEvent is legacy
function createMouseWheelEvent(type, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const canBubble = defaultValue(options.canBubble, true);
  const cancelable = defaultValue(options.cancelable, true);
  const view = defaultValue(options.view, window);
  const detail = defaultValue(options.detail, 0);
  const screenX = defaultValue(options.screenX, 0);
  const screenY = defaultValue(options.screenY, 0);
  const clientX = defaultValue(options.clientX, 0);
  const clientY = defaultValue(options.clientY, 0);
  const button = defaultValue(options.button, 0);
  const relatedTarget = defaultValue(options.relatedTarget, null);
  const ctrlKey = defaultValue(options.ctrlKey, false);
  const altKey = defaultValue(options.altKey, false);
  const shiftKey = defaultValue(options.shiftKey, false);
  const metaKey = defaultValue(options.metaKey, false);
  const wheelDelta = defaultValue(options.wheelDelta, 0);

  const event = document.createEvent("MouseWheelEvent");
  const modifiersList = createModifiersList(ctrlKey, altKey, shiftKey, metaKey);
  event.initMouseWheelEvent(
    type,
    canBubble,
    cancelable,
    view,
    detail,
    screenX,
    screenY,
    clientX,
    clientY,
    button,
    relatedTarget,
    modifiersList,
    wheelDelta
  );
  return event;
}

function createWheelEvent(type, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const canBubble = defaultValue(options.canBubble, true);
  const cancelable = defaultValue(options.cancelable, true);
  const view = defaultValue(options.view, window);
  const detail = defaultValue(options.detail, 0);
  const screenX = defaultValue(options.screenX, 0);
  const screenY = defaultValue(options.screenY, 0);
  const clientX = defaultValue(options.clientX, 0);
  const clientY = defaultValue(options.clientY, 0);
  const button = defaultValue(options.button, 0);
  const relatedTarget = defaultValue(options.relatedTarget, null);
  const ctrlKey = defaultValue(options.ctrlKey, false);
  const altKey = defaultValue(options.altKey, false);
  const shiftKey = defaultValue(options.shiftKey, false);
  const metaKey = defaultValue(options.metaKey, false);
  const deltaX = defaultValue(options.deltaX, 0);
  const deltaY = defaultValue(options.deltaY, 0);
  const deltaZ = defaultValue(options.deltaZ, 0);
  const deltaMode = defaultValue(options.deltaMode, 0);

  try {
    return new WheelEvent(type, {
      view: view,
      detail: detail,
      screenX: screenX,
      screenY: screenY,
      clientX: clientX,
      clientY: clientY,
      button: button,
      relatedTarget: relatedTarget,
      ctrlKey: ctrlKey,
      altKey: altKey,
      shiftKey: shiftKey,
      metaKey: metaKey,
      deltaX: deltaX,
      deltaY: deltaY,
      deltaZ: deltaZ,
      deltaMode: deltaMode,
    });
  } catch (e) {
    const event = document.createEvent("WheelEvent");
    const modifiersList = createModifiersList(
      ctrlKey,
      altKey,
      shiftKey,
      metaKey
    );
    event.initWheelEvent(
      type,
      canBubble,
      cancelable,
      view,
      detail,
      screenX,
      screenY,
      clientX,
      clientY,
      button,
      relatedTarget,
      modifiersList,
      deltaX,
      deltaY,
      deltaZ,
      deltaMode
    );
    return event;
  }
}

function createTouchEvent(type, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const canBubble = defaultValue(options.canBubble, true);
  const cancelable = defaultValue(options.cancelable, true);
  const view = defaultValue(options.view, window);
  const detail = defaultValue(options.detail, 0);

  const event = document.createEvent("UIEvent");
  event.initUIEvent(type, canBubble, cancelable, view, detail);

  event.touches = defaultValue(options.touches, []);
  event.targetTouches = defaultValue(options.targetTouches, []);
  event.changedTouches = defaultValue(options.changedTouches, []);

  return event;
}

function createPointerEvent(type, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  let event;

  if (FeatureDetection.isInternetExplorer()) {
    const canBubble = defaultValue(options.canBubble, true);
    const cancelable = defaultValue(options.cancelable, true);
    const view = defaultValue(options.view, window);
    const detail = defaultValue(options.detail, 0);
    const screenX = defaultValue(options.screenX, 0);
    const screenY = defaultValue(options.screenY, 0);
    const clientX = defaultValue(options.clientX, 0);
    const clientY = defaultValue(options.clientY, 0);
    const ctrlKey = defaultValue(options.ctrlKey, false);
    const altKey = defaultValue(options.altKey, false);
    const shiftKey = defaultValue(options.shiftKey, false);
    const metaKey = defaultValue(options.metaKey, false);
    const button = defaultValue(options.button, 0);
    const relatedTarget = defaultValue(options.relatedTarget, null);
    const offsetX = defaultValue(options.offsetX, 0);
    const offsetY = defaultValue(options.offsetY, 0);
    const width = defaultValue(options.width, 0);
    const height = defaultValue(options.height, 0);
    const pressure = defaultValue(options.pressure, 0);
    const rotation = defaultValue(options.rotation, 0);
    const tiltX = defaultValue(options.tiltX, 0);
    const tiltY = defaultValue(options.tiltY, 0);
    const pointerId = defaultValue(options.pointerId, 1);
    const pointerType = defaultValue(options.pointerType, 0);
    const hwTimestamp = defaultValue(options.hwTimestamp, 0);
    const isPrimary = defaultValue(options.isPrimary, 0);

    event = document.createEvent("PointerEvent");
    event.initPointerEvent(
      type,
      canBubble,
      cancelable,
      view,
      detail,
      screenX,
      screenY,
      clientX,
      clientY,
      ctrlKey,
      altKey,
      shiftKey,
      metaKey,
      button,
      relatedTarget,
      offsetX,
      offsetY,
      width,
      height,
      pressure,
      rotation,
      tiltX,
      tiltY,
      pointerId,
      pointerType,
      hwTimestamp,
      isPrimary
    );
  } else {
    event = new window.PointerEvent(type, {
      canBubble: defaultValue(options.canBubble, true),
      cancelable: defaultValue(options.cancelable, true),
      view: defaultValue(options.view, window),
      detail: defaultValue(options.detail, 0),
      screenX: defaultValue(options.screenX, 0),
      screenY: defaultValue(options.screenY, 0),
      clientX: defaultValue(options.clientX, 0),
      clientY: defaultValue(options.clientY, 0),
      ctrlKey: defaultValue(options.ctrlKey, false),
      altKey: defaultValue(options.altKey, false),
      shiftKey: defaultValue(options.shiftKey, false),
      metaKey: defaultValue(options.metaKey, false),
      button: defaultValue(options.button, 0),
      relatedTarget: defaultValue(options.relatedTarget, null),
      offsetX: defaultValue(options.offsetX, 0),
      offsetY: defaultValue(options.offsetY, 0),
      width: defaultValue(options.width, 0),
      height: defaultValue(options.height, 0),
      pressure: defaultValue(options.pressure, 0),
      rotation: defaultValue(options.rotation, 0),
      tiltX: defaultValue(options.tiltX, 0),
      tiltY: defaultValue(options.tiltY, 0),
      pointerId: defaultValue(options.pointerId, 1),
      pointerType: defaultValue(options.pointerType, 0),
      hwTimestamp: defaultValue(options.hwTimestamp, 0),
      isPrimary: defaultValue(options.isPrimary, 0),
    });
  }
  return event;
}

function createDeviceOrientationEvent(type, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const canBubble = defaultValue(options.canBubble, true);
  const cancelable = defaultValue(options.cancelable, true);
  const alpha = defaultValue(options.alpha, 0.0);
  const beta = defaultValue(options.beta, 0.0);
  const gamma = defaultValue(options.gamma, 0.0);
  const absolute = defaultValue(options.absolute, false);

  let event;
  event = document.createEvent("DeviceOrientationEvent");
  if (typeof event.initDeviceOrientationEvent === "function") {
    event.initDeviceOrientationEvent(
      type,
      canBubble,
      cancelable,
      alpha,
      beta,
      gamma,
      absolute
    );
  } else {
    event = new DeviceOrientationEvent("deviceorientation", {
      alpha: alpha,
      beta: beta,
      gamma: gamma,
      absolute: absolute,
    });
  }
  return event;
}

const DomEventSimulator = {
  fireMouseDown: function (element, options) {
    element.dispatchEvent(createMouseEvent("mousedown", options));
  },
  fireMouseUp: function (element, options) {
    element.dispatchEvent(createMouseEvent("mouseup", options));
  },
  fireMouseMove: function (element, options) {
    element.dispatchEvent(createMouseEvent("mousemove", options));
  },
  fireClick: function (element, options) {
    element.dispatchEvent(createMouseEvent("click", options));
  },
  fireDoubleClick: function (element, options) {
    element.dispatchEvent(createMouseEvent("dblclick", options));
  },
  fireMouseWheel: function (element, options) {
    element.dispatchEvent(createMouseWheelEvent("mousewheel", options));
  },
  fireWheel: function (element, options) {
    element.dispatchEvent(createWheelEvent("wheel", options));
  },
  fireTouchStart: function (element, options) {
    element.dispatchEvent(createTouchEvent("touchstart", options));
  },
  fireTouchMove: function (element, options) {
    element.dispatchEvent(createTouchEvent("touchmove", options));
  },
  fireTouchEnd: function (element, options) {
    element.dispatchEvent(createTouchEvent("touchend", options));
  },
  fireTouchCancel: function (element, options) {
    element.dispatchEvent(createTouchEvent("touchcancel", options));
  },
  firePointerDown: function (element, options) {
    element.dispatchEvent(createPointerEvent("pointerdown", options));
  },
  firePointerUp: function (element, options) {
    element.dispatchEvent(createPointerEvent("pointerup", options));
  },
  firePointerMove: function (element, options) {
    element.dispatchEvent(createPointerEvent("pointermove", options));
  },
  firePointerCancel: function (element, options) {
    element.dispatchEvent(createPointerEvent("pointercancel", options));
  },
  fireDeviceOrientation: function (element, options) {
    element.dispatchEvent(
      createDeviceOrientationEvent("deviceorientation", options)
    );
  },
  fireMockEvent: function (eventHandler, event) {
    eventHandler.call(window, event);
  },
};
export default DomEventSimulator;
