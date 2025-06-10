import { Frozen, FeatureDetection } from "@cesium/engine";

function createMouseEvent(type, options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const canBubble = options.canBubble ?? true;
  const cancelable = options.cancelable ?? true;
  const view = options.view ?? window;
  const detail = options.detail ?? 0;
  const screenX = options.screenX ?? 0;
  const screenY = options.screenY ?? 0;
  const clientX = options.clientX ?? 0;
  const clientY = options.clientY ?? 0;
  const ctrlKey = options.ctrlKey ?? false;
  const altKey = options.altKey ?? false;
  const shiftKey = options.shiftKey ?? false;
  const metaKey = options.metaKey ?? false;
  const button = options.button ?? 0;
  const relatedTarget = options.relatedTarget ?? null;

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
    relatedTarget,
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
  options = options ?? Frozen.EMPTY_OBJECT;
  const canBubble = options.canBubble ?? true;
  const cancelable = options.cancelable ?? true;
  const view = options.view ?? window;
  const detail = options.detail ?? 0;
  const screenX = options.screenX ?? 0;
  const screenY = options.screenY ?? 0;
  const clientX = options.clientX ?? 0;
  const clientY = options.clientY ?? 0;
  const button = options.button ?? 0;
  const relatedTarget = options.relatedTarget ?? null;
  const ctrlKey = options.ctrlKey ?? false;
  const altKey = options.altKey ?? false;
  const shiftKey = options.shiftKey ?? false;
  const metaKey = options.metaKey ?? false;
  const wheelDelta = options.wheelDelta ?? 0;

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
    wheelDelta,
  );
  return event;
}

function createWheelEvent(type, options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const canBubble = options.canBubble ?? true;
  const cancelable = options.cancelable ?? true;
  const view = options.view ?? window;
  const detail = options.detail ?? 0;
  const screenX = options.screenX ?? 0;
  const screenY = options.screenY ?? 0;
  const clientX = options.clientX ?? 0;
  const clientY = options.clientY ?? 0;
  const button = options.button ?? 0;
  const relatedTarget = options.relatedTarget ?? null;
  const ctrlKey = options.ctrlKey ?? false;
  const altKey = options.altKey ?? false;
  const shiftKey = options.shiftKey ?? false;
  const metaKey = options.metaKey ?? false;
  const deltaX = options.deltaX ?? 0;
  const deltaY = options.deltaY ?? 0;
  const deltaZ = options.deltaZ ?? 0;
  const deltaMode = options.deltaMode ?? 0;

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
      metaKey,
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
      deltaMode,
    );
    return event;
  }
}

function createTouchEvent(type, options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const canBubble = options.canBubble ?? true;
  const cancelable = options.cancelable ?? true;
  const view = options.view ?? window;
  const detail = options.detail ?? 0;

  const event = document.createEvent("UIEvent");
  event.initUIEvent(type, canBubble, cancelable, view, detail);

  event.touches = options.touches ?? Frozen.EMPTY_ARRAY;
  event.targetTouches = options.targetTouches ?? Frozen.EMPTY_ARRAY;
  event.changedTouches = options.changedTouches ?? Frozen.EMPTY_ARRAY;

  return event;
}

function createPointerEvent(type, options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  let event;

  if (FeatureDetection.isInternetExplorer()) {
    const canBubble = options.canBubble ?? true;
    const cancelable = options.cancelable ?? true;
    const view = options.view ?? window;
    const detail = options.detail ?? 0;
    const screenX = options.screenX ?? 0;
    const screenY = options.screenY ?? 0;
    const clientX = options.clientX ?? 0;
    const clientY = options.clientY ?? 0;
    const ctrlKey = options.ctrlKey ?? false;
    const altKey = options.altKey ?? false;
    const shiftKey = options.shiftKey ?? false;
    const metaKey = options.metaKey ?? false;
    const button = options.button ?? 0;
    const relatedTarget = options.relatedTarget ?? null;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;
    const width = options.width ?? 0;
    const height = options.height ?? 0;
    const pressure = options.pressure ?? 0;
    const rotation = options.rotation ?? 0;
    const tiltX = options.tiltX ?? 0;
    const tiltY = options.tiltY ?? 0;
    const pointerId = options.pointerId ?? 1;
    const pointerType = options.pointerType ?? 0;
    const hwTimestamp = options.hwTimestamp ?? 0;
    const isPrimary = options.isPrimary ?? 0;

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
      isPrimary,
    );
  } else {
    event = new window.PointerEvent(type, {
      canBubble: options.canBubble ?? true,
      cancelable: options.cancelable ?? true,
      view: options.view ?? window,
      detail: options.detail ?? 0,
      screenX: options.screenX ?? 0,
      screenY: options.screenY ?? 0,
      clientX: options.clientX ?? 0,
      clientY: options.clientY ?? 0,
      ctrlKey: options.ctrlKey ?? false,
      altKey: options.altKey ?? false,
      shiftKey: options.shiftKey ?? false,
      metaKey: options.metaKey ?? false,
      button: options.button ?? 0,
      relatedTarget: options.relatedTarget ?? null,
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
      width: options.width ?? 0,
      height: options.height ?? 0,
      pressure: options.pressure ?? 0,
      rotation: options.rotation ?? 0,
      tiltX: options.tiltX ?? 0,
      tiltY: options.tiltY ?? 0,
      pointerId: options.pointerId ?? 1,
      pointerType: options.pointerType ?? 0,
      hwTimestamp: options.hwTimestamp ?? 0,
      isPrimary: options.isPrimary ?? 0,
    });
  }
  return event;
}

function createDeviceOrientationEvent(type, options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const canBubble = options.canBubble ?? true;
  const cancelable = options.cancelable ?? true;
  const alpha = options.alpha ?? 0.0;
  const beta = options.beta ?? 0.0;
  const gamma = options.gamma ?? 0.0;
  const absolute = options.absolute ?? false;

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
      absolute,
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
      createDeviceOrientationEvent("deviceorientation", options),
    );
  },
  fireMockEvent: function (eventHandler, event) {
    eventHandler.call(window, event);
  },
};
export default DomEventSimulator;
