import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Fullscreen from "./Fullscreen.js";

let theNavigator;
if (typeof navigator !== "undefined") {
  theNavigator = navigator;
} else {
  theNavigator = {};
}

function extractVersion(versionString) {
  const parts = versionString.split(".");
  for (let i = 0, len = parts.length; i < len; ++i) {
    parts[i] = parseInt(parts[i], 10);
  }
  return parts;
}

let isChromeResult;
let chromeVersionResult;
function isChrome() {
  if (!defined(isChromeResult)) {
    isChromeResult = false;
    // Edge contains Chrome in the user agent too
    if (!isEdge()) {
      const fields = / Chrome\/([\.0-9]+)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isChromeResult = true;
        chromeVersionResult = extractVersion(fields[1]);
      }
    }
  }

  return isChromeResult;
}

function chromeVersion() {
  return isChrome() && chromeVersionResult;
}

let isSafariResult;
let safariVersionResult;
function isSafari() {
  if (!defined(isSafariResult)) {
    isSafariResult = false;

    // Chrome and Edge contain Safari in the user agent too
    if (
      !isChrome() &&
      !isEdge() &&
      / Safari\/[\.0-9]+/.test(theNavigator.userAgent)
    ) {
      const fields = / Version\/([\.0-9]+)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isSafariResult = true;
        safariVersionResult = extractVersion(fields[1]);
      }
    }
  }

  return isSafariResult;
}

function safariVersion() {
  return isSafari() && safariVersionResult;
}

let isWebkitResult;
let webkitVersionResult;
function isWebkit() {
  if (!defined(isWebkitResult)) {
    isWebkitResult = false;

    const fields = / AppleWebKit\/([\.0-9]+)(\+?)/.exec(theNavigator.userAgent);
    if (fields !== null) {
      isWebkitResult = true;
      webkitVersionResult = extractVersion(fields[1]);
      webkitVersionResult.isNightly = !!fields[2];
    }
  }

  return isWebkitResult;
}

function webkitVersion() {
  return isWebkit() && webkitVersionResult;
}

let isInternetExplorerResult;
let internetExplorerVersionResult;
function isInternetExplorer() {
  if (!defined(isInternetExplorerResult)) {
    isInternetExplorerResult = false;

    let fields;
    if (theNavigator.appName === "Microsoft Internet Explorer") {
      fields = /MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isInternetExplorerResult = true;
        internetExplorerVersionResult = extractVersion(fields[1]);
      }
    } else if (theNavigator.appName === "Netscape") {
      fields = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(
        theNavigator.userAgent
      );
      if (fields !== null) {
        isInternetExplorerResult = true;
        internetExplorerVersionResult = extractVersion(fields[1]);
      }
    }
  }
  return isInternetExplorerResult;
}

function internetExplorerVersion() {
  return isInternetExplorer() && internetExplorerVersionResult;
}

let isEdgeResult;
let edgeVersionResult;
function isEdge() {
  if (!defined(isEdgeResult)) {
    isEdgeResult = false;
    const fields = / Edg\/([\.0-9]+)/.exec(theNavigator.userAgent);
    if (fields !== null) {
      isEdgeResult = true;
      edgeVersionResult = extractVersion(fields[1]);
    }
  }
  return isEdgeResult;
}

function edgeVersion() {
  return isEdge() && edgeVersionResult;
}

let isFirefoxResult;
let firefoxVersionResult;
function isFirefox() {
  if (!defined(isFirefoxResult)) {
    isFirefoxResult = false;

    const fields = /Firefox\/([\.0-9]+)/.exec(theNavigator.userAgent);
    if (fields !== null) {
      isFirefoxResult = true;
      firefoxVersionResult = extractVersion(fields[1]);
    }
  }
  return isFirefoxResult;
}

let isWindowsResult;
function isWindows() {
  if (!defined(isWindowsResult)) {
    isWindowsResult = /Windows/i.test(theNavigator.appVersion);
  }
  return isWindowsResult;
}

let isIPadOrIOSResult;
function isIPadOrIOS() {
  if (!defined(isIPadOrIOSResult)) {
    isIPadOrIOSResult =
      navigator.platform === "iPhone" ||
      navigator.platform === "iPod" ||
      navigator.platform === "iPad";
  }

  return isIPadOrIOSResult;
}

function firefoxVersion() {
  return isFirefox() && firefoxVersionResult;
}

let hasPointerEvents;
function supportsPointerEvents() {
  if (!defined(hasPointerEvents)) {
    //While navigator.pointerEnabled is deprecated in the W3C specification
    //we still need to use it if it exists in order to support browsers
    //that rely on it, such as the Windows WebBrowser control which defines
    //PointerEvent but sets navigator.pointerEnabled to false.

    //Firefox disabled because of https://github.com/CesiumGS/cesium/issues/6372
    hasPointerEvents =
      !isFirefox() &&
      typeof PointerEvent !== "undefined" &&
      (!defined(theNavigator.pointerEnabled) || theNavigator.pointerEnabled);
  }
  return hasPointerEvents;
}

let imageRenderingValueResult;
let supportsImageRenderingPixelatedResult;
function supportsImageRenderingPixelated() {
  if (!defined(supportsImageRenderingPixelatedResult)) {
    const canvas = document.createElement("canvas");
    canvas.setAttribute(
      "style",
      "image-rendering: -moz-crisp-edges;" + "image-rendering: pixelated;"
    );
    //canvas.style.imageRendering will be undefined, null or an empty string on unsupported browsers.
    const tmp = canvas.style.imageRendering;
    supportsImageRenderingPixelatedResult = defined(tmp) && tmp !== "";
    if (supportsImageRenderingPixelatedResult) {
      imageRenderingValueResult = tmp;
    }
  }
  return supportsImageRenderingPixelatedResult;
}

function imageRenderingValue() {
  return supportsImageRenderingPixelated()
    ? imageRenderingValueResult
    : undefined;
}

function supportsWebP() {
  //>>includeStart('debug', pragmas.debug);
  if (!supportsWebP.initialized) {
    throw new DeveloperError(
      "You must call FeatureDetection.supportsWebP.initialize and wait for the promise to resolve before calling FeatureDetection.supportsWebP"
    );
  }
  //>>includeEnd('debug');
  return supportsWebP._result;
}
supportsWebP._promise = undefined;
supportsWebP._result = undefined;
supportsWebP.initialize = function () {
  // From https://developers.google.com/speed/webp/faq#how_can_i_detect_browser_support_for_webp
  if (defined(supportsWebP._promise)) {
    return supportsWebP._promise;
  }

  const image = new Image();
  supportsWebP._promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = function () {
      supportsWebP._result = image.width > 0 && image.height > 0;
      resolve(supportsWebP._result);
    };

    image.onerror = function () {
      supportsWebP._result = false;
      resolve(supportsWebP._result);
    };
  });

  image.src =
    "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

  return supportsWebP._promise;
};

Object.defineProperties(supportsWebP, {
  initialized: {
    get: function () {
      return defined(supportsWebP._result);
    },
  },
});

const typedArrayTypes = [];
if (typeof ArrayBuffer !== "undefined") {
  typedArrayTypes.push(
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array
  );

  if (typeof Uint8ClampedArray !== "undefined") {
    typedArrayTypes.push(Uint8ClampedArray);
  }

  if (typeof Uint8ClampedArray !== "undefined") {
    typedArrayTypes.push(Uint8ClampedArray);
  }

  if (typeof BigInt64Array !== "undefined") {
    // eslint-disable-next-line no-undef
    typedArrayTypes.push(BigInt64Array);
  }

  if (typeof BigUint64Array !== "undefined") {
    // eslint-disable-next-line no-undef
    typedArrayTypes.push(BigUint64Array);
  }
}

/**
 * A set of functions to detect whether the current browser supports
 * various features.
 *
 * @namespace FeatureDetection
 */
const FeatureDetection = {
  isChrome: isChrome,
  chromeVersion: chromeVersion,
  isSafari: isSafari,
  safariVersion: safariVersion,
  isWebkit: isWebkit,
  webkitVersion: webkitVersion,
  isInternetExplorer: isInternetExplorer,
  internetExplorerVersion: internetExplorerVersion,
  isEdge: isEdge,
  edgeVersion: edgeVersion,
  isFirefox: isFirefox,
  firefoxVersion: firefoxVersion,
  isWindows: isWindows,
  isIPadOrIOS: isIPadOrIOS,
  hardwareConcurrency: defaultValue(theNavigator.hardwareConcurrency, 3),
  supportsPointerEvents: supportsPointerEvents,
  supportsImageRenderingPixelated: supportsImageRenderingPixelated,
  supportsWebP: supportsWebP,
  imageRenderingValue: imageRenderingValue,
  typedArrayTypes: typedArrayTypes,
};

/**
 * Detects whether the current browser supports Basis Universal textures and the web assembly modules needed to transcode them.
 *
 * @param {Scene} scene
 * @returns {Boolean} true if the browser supports web assembly modules and the scene supports Basis Universal textures, false if not.
 */
FeatureDetection.supportsBasis = function (scene) {
  return FeatureDetection.supportsWebAssembly() && scene.context.supportsBasis;
};

/**
 * Detects whether the current browser supports the full screen standard.
 *
 * @returns {Boolean} true if the browser supports the full screen standard, false if not.
 *
 * @see Fullscreen
 * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
 */
FeatureDetection.supportsFullscreen = function () {
  return Fullscreen.supportsFullscreen();
};

/**
 * Detects whether the current browser supports typed arrays.
 *
 * @returns {Boolean} true if the browser supports typed arrays, false if not.
 *
 * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
 */
FeatureDetection.supportsTypedArrays = function () {
  return typeof ArrayBuffer !== "undefined";
};

/**
 * Detects whether the current browser supports BigInt64Array typed arrays.
 *
 * @returns {Boolean} true if the browser supports BigInt64Array typed arrays, false if not.
 *
 * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
 */
FeatureDetection.supportsBigInt64Array = function () {
  return typeof BigInt64Array !== "undefined";
};

/**
 * Detects whether the current browser supports BigUint64Array typed arrays.
 *
 * @returns {Boolean} true if the browser supports BigUint64Array typed arrays, false if not.
 *
 * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
 */
FeatureDetection.supportsBigUint64Array = function () {
  return typeof BigUint64Array !== "undefined";
};

/**
 * Detects whether the current browser supports BigInt.
 *
 * @returns {Boolean} true if the browser supports BigInt, false if not.
 *
 * @see {@link https://tc39.es/ecma262/#sec-bigint-objects|BigInt Specification}
 */
FeatureDetection.supportsBigInt = function () {
  return typeof BigInt !== "undefined";
};

/**
 * Detects whether the current browser supports Web Workers.
 *
 * @returns {Boolean} true if the browsers supports Web Workers, false if not.
 *
 * @see {@link http://www.w3.org/TR/workers/}
 */
FeatureDetection.supportsWebWorkers = function () {
  return typeof Worker !== "undefined";
};

/**
 * Detects whether the current browser supports Web Assembly.
 *
 * @returns {Boolean} true if the browsers supports Web Assembly, false if not.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/WebAssembly}
 */
FeatureDetection.supportsWebAssembly = function () {
  return typeof WebAssembly !== "undefined";
};
export default FeatureDetection;
