(function () {
  "use strict";
  window.parent.postMessage({ type: "reload" }, "*");

  function defined(value) {
    return value !== undefined;
  }

  function print(value) {
    if (value === null) {
      return "null";
    } else if (defined(value)) {
      return value.toString();
    }
    return "undefined";
  }

  const originalLog = console.log;
  console.log = function (d1) {
    originalLog.apply(console, arguments);
    window.parent.postMessage(
      {
        type: "consoleLog",
        log: print(d1),
      },
      "*",
    );
  };

  const originalWarn = console.warn;
  console.warn = function (d1) {
    originalWarn.apply(console, arguments);
    window.parent.postMessage(
      {
        type: "consoleWarn",
        warn: defined(d1) ? d1.toString() : "undefined",
      },
      "*",
    );
  };

  let bucket = window.location.href;
  const pos = bucket.lastIndexOf("/");
  if (pos > 0 && pos < bucket.length - 1) {
    bucket = bucket.substring(pos + 1);
  }

  const originalError = console.error;
  console.error = function (d1) {
    originalError.apply(console, arguments);
    if (!defined(d1)) {
      window.parent.postMessage(
        {
          type: "consoleError",
          error: "undefined",
        },
        "*",
      );
      return;
    }

    // Look for d1.stack, "bucket.html:line:char"
    let lineNumber = -1;
    const errorMsg = d1.toString();
    if (typeof d1.stack === "string") {
      const stack = d1.stack;
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
              lineNumber = parseInt(
                stack.substring(lineStart + 1, lineEnd1),
                10,
              );
            } catch (ex) {}
            /*eslint-enable no-empty*/
          }
        }
      }
    }

    if (lineNumber >= 0) {
      window.parent.postMessage(
        {
          type: "consoleError",
          error: errorMsg,
          lineNumber: lineNumber,
        },
        "*",
      );
    } else {
      window.parent.postMessage(
        {
          type: "consoleError",
          error: errorMsg,
        },
        "*",
      );
    }
  };

  window.onerror = function (errorMsg, url, lineNumber) {
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
        } catch (ex) {}
        /*eslint-enable no-empty*/
      }
      window.parent.postMessage(
        {
          type: "consoleError",
          error: errorMsg,
          url: url,
          lineNumber: lineNumber,
        },
        "*",
      );
    } else {
      window.parent.postMessage(
        {
          type: "consoleError",
          error: errorMsg,
          url: url,
        },
        "*",
      );
    }
    originalError.apply(console, [errorMsg]);
    return false;
  };
})();
