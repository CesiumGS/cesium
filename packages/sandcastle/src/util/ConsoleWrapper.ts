import { BridgeToApp } from "./IframeBridge";

let bucket = window.location.href;
const pos = bucket.lastIndexOf("/");
if (pos > 0 && pos < bucket.length - 1) {
  bucket = bucket.substring(pos + 1);
}

/**
 * Convert an object to a single line string only displaying the top level keys and values.
 * This is meant as a compromise instead of displaying [object Object]
 *
 * This is handy for logging simple object values while also avoiding getting way out of hand
 * when logging large complex objects that would create a massive string using JSON.stringify directly.
 * This can still generate large strings for large objects like our Viewer but it's still shorter.
 */
function simpleStringify(obj: object) {
  if ("toString" in obj && obj.toString !== Object.prototype.toString) {
    // Use customized toString functions if they're specified
    // if it's the native function continue instead of getting [object Object]
    return obj.toString();
  }

  const properties = Object.entries(obj);

  if (obj.constructor.name !== "Object") {
    // Iterate through the prototype's properties too to grab any extra getters
    // which are common across CesiumJS classes
    // https://stackoverflow.com/questions/60400066/how-to-enumerate-discover-getters-and-setters-in-javascript
    const prototypeProperties = Object.entries(
      Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(obj)),
    );
    properties.push(...prototypeProperties);
  }

  const keyValueStrings = properties.map(([key, value]) => {
    let valueStr = value;
    if (typeof value === "string") {
      valueStr = `"${value}"`;
    } else if (typeof value === "function") {
      valueStr = functionString(value, true);
    } else if (Array.isArray(value)) {
      valueStr = arrayString(value);
    }
    return `${key}: ${valueStr}`;
  });

  const className =
    obj.constructor.name !== "Object" ? `${obj.constructor.name} ` : "";
  return `${className}{${keyValueStrings.join(", ")}}`;
}

/**
 * Join an array with commas and wrap with []
 *
 * @param arr Input array
 */
function arrayString(arr: unknown[]) {
  return `[${arr.join(", ")}]`;
}

/**
 * Print a function to a string. If the function is long or nested you can use the signatureOnly param
 * to return a shorter string containing only the signature
 *
 * @param func Input function
 * @param signatureOnly Whether to only output the function signature or the full function
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function functionString(func: Function, signatureOnly?: boolean) {
  const functionAsString = func.toString();
  if (signatureOnly) {
    const signaturePattern = /function.*\)/;
    const functionSigMatch = functionAsString
      .toString()
      .match(signaturePattern);
    return functionSigMatch
      ? `${functionSigMatch[0].replace("function", "ƒ")} {...}`
      : "ƒ () {...}";
  }

  const lineTruncatePattern = /function.*(?:\n.*){0,4}/;
  const linesTruncatedMatch = functionAsString.match(lineTruncatePattern);
  if (linesTruncatedMatch === null) {
    // unable to match and truncate by lines for some reason
    return functionAsString;
  }
  let truncated = linesTruncatedMatch[0];
  if (functionAsString.length > truncated.length) {
    truncated += "\n...";
  }
  return truncated.replace("function", "ƒ");
}

/**
 * Get the line of the error. Attempts to extract from the error stack itself
 *
 * @param error Input error
 */
function errorLineNumber(error: Error | { stack: unknown }) {
  if (typeof error.stack !== "string") {
    return;
  }

  // Look for error.stack, "bucket.html:line:char"
  let lineNumber = -1;
  const stack = error.stack;
  let pos = stack.indexOf(bucket);
  if (pos < 0) {
    pos = stack.indexOf("<anonymous>");
  }
  if (pos >= 0) {
    const lineStart = stack.indexOf(":", pos);
    if (lineStart > pos) {
      let lineEnd1 = stack.indexOf(":", lineStart + 1);
      const lineEnd2 = stack.indexOf("\n", lineStart + 1);
      if (
        lineEnd2 > lineStart &&
        (lineEnd2 < lineEnd1 || lineEnd1 < lineStart)
      ) {
        lineEnd1 = lineEnd2;
      }
      if (lineEnd1 > lineStart) {
        /*eslint-disable no-empty*/
        try {
          lineNumber = parseInt(stack.substring(lineStart + 1, lineEnd1), 10);
        } catch {}
        /*eslint-enable no-empty*/
      }
    }
  }
  return lineNumber;
}

/**
 * Take a singular value and return the string representation for it.
 * Handles multiple types with specific handling for arrays, objects and functions.
 * Any value that is not specifically processed will get converted by `value.toString()`
 */
function print(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    // there's a small chance this recurssion gets out of hand for nested arrays
    return arrayString(
      value.map((value) => {
        if (typeof value === "function") {
          return functionString(value, true);
        }
        return print(value);
      }),
    );
  }
  if (
    typeof value === "object" &&
    "stack" in value &&
    typeof value.stack === "string"
  ) {
    // assume this is an Error object and attempt to extract the line number
    const lineNumber = errorLineNumber(value);
    if (lineNumber !== undefined) {
      return `${value.toString()} (on line ${lineNumber})`;
    }
  }
  if (typeof value === "function") {
    return functionString(value);
  }
  if (typeof value === "object") {
    return simpleStringify(value);
  }
  return value.toString();
}

/**
 * Combine any number of arguments into a single string converting them as needed.
 *
 * @param args an array of any values, can be mixed types
 */
function combineArguments(args: unknown[]) {
  return args.map(print).join(" ");
}

export const originalClear = console.clear;
export const originalLog = console.log;
export const originalWarn = console.warn;
export const originalError = console.error;

declare global {
  interface Window {
    originalClear: typeof console.clear;
    originalLog: typeof console.log;
    originalWarn: typeof console.warn;
    originalError: typeof console.error;
  }
}

window.originalClear = originalClear;
window.originalLog = originalLog;
window.originalWarn = originalWarn;
window.originalError = originalError;

/**
 * Return whether the value is defined even if it's falsey
 */
function defined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}

/**
 * Setup the handler to catch uncaught errors on the window itself and send them
 * over the iframe bridge to the app
 *
 * @param iframeBridge Bridge to send messages over
 */
function setupWindowErrorHandler(iframeBridge: BridgeToApp) {
  window.addEventListener("error", (event) => {
    const errorMsg = event.message;
    let lineNumber = event.lineno;
    let url = event.filename;
    if (defined(lineNumber)) {
      if (defined(url) && url.indexOf(bucket) > -1) {
        // if the URL is the bucket itself, ignore it
        url = "";
      }
      if (lineNumber < 1) {
        // Change lineNumber to the local one for highlighting.
        /*eslint-disable no-empty*/
        try {
          let pos = errorMsg.indexOf(`${bucket}:`);
          if (pos < 0) {
            pos = errorMsg.indexOf("<anonymous>");
          }
          if (pos >= 0) {
            pos += 12;
            lineNumber = parseInt(errorMsg.substring(pos), 10);
          }
        } catch {}
        /*eslint-enable no-empty*/
      }
      iframeBridge.sendMessage({
        type: "consoleError",
        error: errorMsg,
        url: url,
        lineNumber: lineNumber,
      });
    } else {
      iframeBridge.sendMessage({
        type: "consoleError",
        error: errorMsg,
        url: url,
      });
    }
    originalError.apply(console, [errorMsg]);
    return false;
  });
}

export type ConsoleMessage =
  | { type: "consoleClear" }
  | { type: "consoleLog"; log: string }
  | { type: "consoleWarn"; warn: string }
  | { type: "consoleError"; error: string; lineNumber?: number; url?: string };

export function wrapConsoleFunctions(iframeBridge: BridgeToApp) {
  console.clear = function () {
    originalClear();
    iframeBridge.sendMessage({
      type: "consoleClear",
    });
  };

  console.log = function (...args) {
    originalLog.apply(console, args);
    iframeBridge.sendMessage({
      type: "consoleLog",
      log: combineArguments(args),
    });
  };

  console.warn = function (...args) {
    originalWarn.apply(console, args);
    iframeBridge.sendMessage({
      type: "consoleWarn",
      warn: combineArguments(args),
    });
  };

  console.error = function (...args) {
    originalError.apply(console, args);
    if (args.length === 0 || !defined(args[0])) {
      iframeBridge.sendMessage({
        type: "consoleError",
        error: "undefined",
      });
      return;
    }

    iframeBridge.sendMessage({
      type: "consoleError",
      error: combineArguments(args),
    });
  };

  setupWindowErrorHandler(iframeBridge);
}
