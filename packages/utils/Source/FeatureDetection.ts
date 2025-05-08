import Check from "./Check";
import defined from "./defined";
import DeveloperError from "./DeveloperError";
import Fullscreen from "./Fullscreen";

let theNavigator: Navigator | Record<string, any>;
if (typeof navigator !== "undefined") {
  theNavigator = navigator;
} else {
  theNavigator = {};
}

function extractVersion(
  versionString: string,
): number[] & { isNightly?: boolean } {
  const parts = versionString.split(".").map((p) => parseInt(p, 10));
  return parts;
}

let isChromeResult: boolean | undefined;
let chromeVersionResult: (number[] & { isNightly?: boolean }) | undefined;
function isChrome(): boolean {
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

let isSafariResult: boolean | undefined;
let safariVersionResult: (number[] & { isNightly?: boolean }) | undefined;
function isSafari(): boolean {
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

let isWebkitResult: boolean | undefined;
let webkitVersionResult: (number[] & { isNightly?: boolean }) | undefined;
function isWebkit(): boolean {
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

let isInternetExplorerResult: boolean | undefined;
let internetExplorerVersionResult: number[] | undefined;
function isInternetExplorer(): boolean {
  if (!defined(isInternetExplorerResult)) {
    isInternetExplorerResult = false;
    let fields: RegExpExecArray | null;
    if (theNavigator.appName === "Microsoft Internet Explorer") {
      fields = /MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isInternetExplorerResult = true;
        internetExplorerVersionResult = extractVersion(fields[1]);
      }
    } else if (theNavigator.appName === "Netscape") {
      fields = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(
        theNavigator.userAgent,
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

let isEdgeResult: boolean | undefined;
let edgeVersionResult: number[] | undefined;
function isEdge(): boolean {
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

let isFirefoxResult: boolean | undefined;
let firefoxVersionResult: number[] | undefined;
function isFirefox(): boolean {
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

let isWindowsResult: boolean | undefined;
function isWindows(): boolean {
  if (!defined(isWindowsResult)) {
    isWindowsResult = /Windows/i.test(theNavigator.appVersion);
  }
  return isWindowsResult;
}

let isIPadOrIOSResult: boolean | undefined;
function isIPadOrIOS(): boolean {
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

let hasPointerEvents: boolean | undefined;
function supportsPointerEvents(): boolean | undefined {
  if (!defined(hasPointerEvents)) {
    //While navigator.pointerEnabled is deprecated in the W3C specification
    //we still need to use it if it exists in order to support browsers
    //that rely on it, such as the Windows WebBrowser control which defines
    //PointerEvent but sets navigator.pointerEnabled to false.

    //Firefox disabled because of https://github.com/CesiumGS/cesium/issues/6372
    hasPointerEvents =
      !isFirefox() &&
      typeof PointerEvent !== "undefined" &&
      (!defined((theNavigator as any).pointerEnabled) ||
        (theNavigator as any).pointerEnabled);
  }
  return hasPointerEvents;
}

let imageRenderingValueResult: string | undefined;
let supportsImageRenderingPixelatedResult: boolean | undefined;
function supportsImageRenderingPixelated(): boolean {
  if (!defined(supportsImageRenderingPixelatedResult)) {
    const canvas = document.createElement("canvas");
    canvas.setAttribute(
      "style",
      "image-rendering: -moz-crisp-edges;" + "image-rendering: pixelated;",
    );
    //canvas.style.imageRendering will be undefined, null or an empty string on unsupported browsers.
    const tmp = (canvas.style as any).imageRendering;
    supportsImageRenderingPixelatedResult = defined(tmp) && tmp !== "";
    if (supportsImageRenderingPixelatedResult) {
      imageRenderingValueResult = tmp;
    }
  }
  return supportsImageRenderingPixelatedResult;
}

function imageRenderingValue(): string | undefined {
  return supportsImageRenderingPixelated()
    ? imageRenderingValueResult
    : undefined;
}

interface SupportsWebPFunction {
  (): boolean;
  _promise?: Promise<boolean>;
  _result?: boolean;
  initialize: () => Promise<boolean>;
  readonly initialized: boolean;
}

// Create and type the function
const supportsWebP: SupportsWebPFunction = function () {
  //>>includeStart('debug', pragmas.debug);
  if (!supportsWebP.initialized) {
    throw new DeveloperError(
      "You must call FeatureDetection.supportsWebP.initialize and wait for the promise to resolve before calling FeatureDetection.supportsWebP",
    );
  }
  //>>includeEnd('debug');
  return supportsWebP._result!;
} as SupportsWebPFunction;

// Add the initialize method
supportsWebP.initialize = function (): Promise<boolean> {
  // From https://developers.google.com/speed/webp/faq#how_can_i_detect_browser_support_for_webp
  if (defined(supportsWebP._promise)) {
    return supportsWebP._promise;
  }

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
    image.src =
      "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
  });

  return supportsWebP._promise;
};

// Define the dynamic getter for `initialized`
Object.defineProperty(supportsWebP, "initialized", {
  get: function () {
    return defined(supportsWebP._result);
  },
});

const typedArrayTypes: Function[] = [];
if (typeof ArrayBuffer !== "undefined") {
  typedArrayTypes.push(
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
  );
  if (typeof Uint8ClampedArray !== "undefined") {
    typedArrayTypes.push(Uint8ClampedArray);
  }
  if (typeof BigInt64Array !== "undefined") {
    typedArrayTypes.push(BigInt64Array);
  }
  if (typeof BigUint64Array !== "undefined") {
    typedArrayTypes.push(BigUint64Array);
  }
}

interface FeatureDetectionInterface {
  isChrome: () => boolean;
  chromeVersion: () => false | number[] | undefined;
  isSafari: () => boolean;
  safariVersion: () => false | number[] | undefined;
  isWebkit: () => boolean;
  webkitVersion: () => false | (number[] & { isNightly?: boolean }) | undefined;
  isInternetExplorer: () => boolean;
  internetExplorerVersion: () => false | number[] | undefined;
  isEdge: () => boolean;
  edgeVersion: () => false | number[] | undefined;
  isFirefox: () => boolean;
  firefoxVersion: () => false | number[] | undefined;
  isWindows: () => boolean;
  isIPadOrIOS: () => boolean;
  hardwareConcurrency: number;
  supportsPointerEvents: () => boolean | undefined;
  supportsImageRenderingPixelated: () => boolean;
  imageRenderingValue: () => string | undefined;
  supportsWebP: typeof supportsWebP;
  typedArrayTypes: any[];

  supportsBasis: (scene: any) => boolean;
  supportsFullscreen: () => boolean;
  supportsTypedArrays: () => boolean;
  supportsBigInt64Array: () => boolean;
  supportsBigUint64Array: () => boolean;
  supportsBigInt: () => boolean;
  supportsWebWorkers: () => boolean;
  supportsWebAssembly: () => boolean;
  supportsWebgl2: (scene: any) => boolean;
  supportsEsmWebWorkers: () => boolean;
}

/**
 * A set of functions to detect whether the current browser supports
 * various features.
 *
 * @namespace FeatureDetection
 */
const FeatureDetection: FeatureDetectionInterface = {
  isChrome,
  chromeVersion,
  isSafari,
  safariVersion,
  isWebkit,
  webkitVersion,
  isInternetExplorer,
  internetExplorerVersion,
  isEdge,
  edgeVersion,
  isFirefox,
  firefoxVersion,
  isWindows,
  isIPadOrIOS,
  hardwareConcurrency: theNavigator.hardwareConcurrency ?? 3,
  supportsPointerEvents,
  supportsImageRenderingPixelated,
  imageRenderingValue,
  supportsWebP,
  typedArrayTypes,

  /**
   * Detects whether the current browser supports Basis Universal textures and the web assembly modules needed to transcode them.
   *
   * @param {Scene} scene
   * @returns {boolean} true if the browser supports web assembly modules and the scene supports Basis Universal textures, false if not.
   */
  supportsBasis: (scene: any) =>
    FeatureDetection.supportsWebAssembly() && scene.context.supportsBasis,

  /**
   * Detects whether the current browser supports the full screen standard.
   *
   * @returns {boolean} true if the browser supports the full screen standard, false if not.
   *
   * @see Fullscreen
   * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
   */
  supportsFullscreen: () => Fullscreen.supportsFullscreen(),

  /**
   * Detects whether the current browser supports typed arrays.
   *
   * @returns {boolean} true if the browser supports typed arrays, false if not.
   *
   * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
   */
  supportsTypedArrays: () => typeof ArrayBuffer !== "undefined",

  /**
   * Detects whether the current browser supports BigInt64Array typed arrays.
   *
   * @returns {boolean} true if the browser supports BigInt64Array typed arrays, false if not.
   *
   * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
   */
  supportsBigInt64Array: () => typeof BigInt64Array !== "undefined",

  /**
   * Detects whether the current browser supports BigUint64Array typed arrays.
   *
   * @returns {boolean} true if the browser supports BigUint64Array typed arrays, false if not.
   *
   * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
   */
  supportsBigUint64Array: () => typeof BigUint64Array !== "undefined",

  /**
   * Detects whether the current browser supports BigInt.
   *
   * @returns {boolean} true if the browser supports BigInt, false if not.
   *
   * @see {@link https://tc39.es/ecma262/#sec-bigint-objects|BigInt Specification}
   */
  supportsBigInt: () => typeof BigInt !== "undefined",

  /**
   * Detects whether the current browser supports Web Workers.
   *
   * @returns {boolean} true if the browsers supports Web Workers, false if not.
   *
   * @see {@link http://www.w3.org/TR/workers/}
   */
  supportsWebWorkers: () => typeof Worker !== "undefined",

  /**
   * Detects whether the current browser supports Web Assembly.
   *
   * @returns {boolean} true if the browsers supports Web Assembly, false if not.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/WebAssembly}
   */
  supportsWebAssembly: () => typeof WebAssembly !== "undefined",

  /**
   * Detects whether the current browser supports a WebGL2 rendering context for the specified scene.
   *
   * @param {Scene} scene the Cesium scene specifying the rendering context
   * @returns {boolean} true if the browser supports a WebGL2 rendering context, false if not.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext|WebGL2RenderingContext}
   */
  supportsWebgl2: (scene: any) => {
    Check.defined("scene", scene);
    return scene.context.webgl2;
  },

  /**
   * Detects whether the current browser supports ECMAScript modules in web workers.
   * @returns {boolean} true if the browser supports ECMAScript modules in web workers.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Worker|Worker}
   */
  supportsEsmWebWorkers: () =>
    !isFirefox() || parseInt(firefoxVersionResult as any) >= 114,
};

export default FeatureDetection;
