import { useEffect, useRef } from "react";
import { embedInSandcastleTemplate } from "./Helpers";
import "./Bucket.css";
import { ConsoleMessageType } from "./ConsoleMirror";
import DOMPurify from "dompurify";

type SandcastleMessage =
  | { type: "reload" }
  | { type: "consoleLog"; log: string }
  | { type: "consoleWarn"; warn: string }
  | { type: "consoleError"; error: string; lineNumber?: number; url?: string }
  | { type: "highlight"; highlight: number };

export function Bucket({
  code,
  html,
  runNumber,
  highlightLine,
  appendConsole,
  resetConsole,
}: {
  /** The JS code for the Sandcastle */
  code: string;
  /** The HTML code for the sandcastle */
  html: string;
  /** If this value changes the bucket will reload which allows us to force a re-run even if the JS/HTML hasn't changed */
  runNumber: number;
  /**
   * Function called when the bucket page requests to highlight a specific line of the code
   * @param lineNumber Line to highlight
   */
  highlightLine: (lineNumber: number) => void;
  appendConsole: (type: ConsoleMessageType, message: string) => void;
  resetConsole: () => void;
}) {
  const bucket = useRef<HTMLIFrameElement>(null);
  const lastRunNumber = useRef<number>(Number.NEGATIVE_INFINITY);

  function activateBucketScripts(
    bucketFrame: HTMLIFrameElement,
    code: string,
    html: string,
  ) {
    const bucketDoc = bucketFrame.contentDocument;
    if (!bucketDoc) {
      return;
    }

    const headNodes = bucketDoc.head.childNodes;
    let node;
    const nodes: HTMLScriptElement[] = [];
    let i, len;
    for (i = 0, len = headNodes.length; i < len; ++i) {
      node = headNodes[i];
      // header is included in blank frame.
      if (
        node instanceof HTMLScriptElement &&
        node.src.indexOf("Sandcastle-header.js") < 0 &&
        node.src.indexOf("Cesium.js") < 0
      ) {
        nodes.push(node);
      }
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
      bucketDoc.head.removeChild(nodes[i]);
    }

    // Apply user HTML to bucket.
    const sanitized = DOMPurify.sanitize(html, {
      ADD_TAGS: ["style"],
      FORCE_BODY: true,
    });
    const htmlElement = bucketDoc.createElement("div");
    htmlElement.innerHTML = sanitized;
    bucketDoc.body.appendChild(htmlElement);

    const onScriptTagError = function () {
      if (bucketFrame.contentDocument === bucketDoc) {
        // @ts-expect-error this has type any because it's from anywhere inside the bucket
        appendConsole("error", `Error loading ${this.src}`);
        appendConsole(
          "error",
          "Make sure Cesium is built, see the Contributor's Guide for details.",
        );
      }
    };

    // Load each script after the previous one has loaded.
    const loadScript = function () {
      if (bucketFrame.contentDocument !== bucketDoc) {
        // A newer reload has happened, abort this.
        return;
      }
      if (nodes.length > 0) {
        while (nodes.length > 0) {
          node = nodes.shift();
          if (!node) {
            continue;
          }
          const scriptElement = bucketDoc.createElement("script");
          let hasSrc = false;
          for (
            let j = 0, numAttrs = node.attributes.length;
            j < numAttrs;
            ++j
          ) {
            const name = node.attributes[j].name;
            const val = node.attributes[j].value;
            scriptElement.setAttribute(name, val);
            if (name === "src" && val) {
              hasSrc = true;
            }
          }
          scriptElement.innerHTML = node.innerHTML;
          if (hasSrc) {
            scriptElement.onload = loadScript;
            scriptElement.onerror = onScriptTagError;
            bucketDoc.head.appendChild(scriptElement);
          } else {
            bucketDoc.head.appendChild(scriptElement);
            loadScript();
          }
        }
      } else {
        // Apply user JS to bucket
        const element = bucketDoc.createElement("script");
        element.type = "module";

        // Firefox line numbers are zero-based, not one-based.
        const isFirefox = navigator.userAgent.indexOf("Firefox/") >= 0;

        element.textContent = embedInSandcastleTemplate(code, isFirefox);
        bucketDoc.body.appendChild(element);
      }
    };

    loadScript();
  }

  useEffect(() => {
    if (
      runNumber !== lastRunNumber.current &&
      bucket.current &&
      bucket.current.contentWindow
    ) {
      // When we want to run sandcastle code we just need to reload the bucket
      // it sends a message when loaded which triggers the message handler below
      // to load the actual code
      bucket.current.contentWindow.location.reload();
    }
    lastRunNumber.current = runNumber;
  }, [code, html, runNumber]);

  function scriptLineToEditorLine(line: number) {
    // editor lines are zero-indexed, plus 3 lines of boilerplate
    return line - 1;
  }

  useEffect(() => {
    const messageHandler = function (e: MessageEvent<SandcastleMessage>) {
      // The iframe (bucket.html) sends this message on load.
      // This triggers the code to be injected into the iframe.
      if (e.data.type === "reload") {
        if (!bucket.current || !bucket.current.contentDocument) {
          // Reload fired, bucket not specified yet.
          return;
        }
        const bucketDoc = bucket.current.contentDocument;
        if (bucketDoc.body.dataset.sandcastleLoaded !== "yes") {
          bucketDoc.body.dataset.sandcastleLoaded = "yes";
          resetConsole();
          // This happens after the bucket.html reloads, to inject the editor code
          // into the iframe, causing the demo to run there.
          activateBucketScripts(bucket.current, code, html);
        }
      } else if (e.data.type === "consoleLog") {
        // Console log messages from the iframe display in Sandcastle.
        appendConsole("log", e.data.log);
      } else if (e.data.type === "consoleError") {
        // Console error messages from the iframe display in Sandcastle
        let errorMsg = e.data.error;
        let lineNumber = e.data.lineNumber;
        if (lineNumber) {
          errorMsg += " (on line ";

          if (e.data.url) {
            errorMsg += `${lineNumber} of ${e.data.url})`;
          } else {
            lineNumber = scriptLineToEditorLine(lineNumber);
            errorMsg += `${lineNumber + 1})`;
          }
        }
        appendConsole("error", errorMsg);
      } else if (e.data.type === "consoleWarn") {
        // Console warning messages from the iframe display in Sandcastle.
        appendConsole("warn", e.data.warn);
      } else if (e.data.type === "highlight") {
        // Hovering objects in the embedded Cesium window.
        highlightLine(e.data.highlight);
      }
    };
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activateBucketScripts is intentionally excluded as it should only run when code/html changes
  }, [code, html, highlightLine, resetConsole, appendConsole]);

  return (
    <div className="bucket-container">
      <iframe
        ref={bucket}
        id="bucketFrame"
        src="templates/bucket.html"
        className="fullFrame"
        allowFullScreen
      ></iframe>
    </div>
  );
}

export function BucketPlaceholder() {
  return (
    <div className="bucket-container">
      <div className="fullFrame">Loading...</div>
    </div>
  );
}
