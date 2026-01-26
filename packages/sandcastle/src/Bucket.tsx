import { useCallback, useEffect, useRef, useState } from "react";
import { embedInSandcastleTemplate } from "./Helpers";
import "./Bucket.css";
import { ConsoleMessageType } from "./ConsoleMirror";
import { IframeBridge } from "./util/IframeBridge";

type SandcastleMessage =
  | { type: "reload" }
  | { type: "bucketReady" }
  | { type: "consoleClear" }
  | { type: "consoleLog"; log: string }
  | { type: "consoleWarn"; warn: string }
  | { type: "consoleError"; error: string; lineNumber?: number; url?: string }
  | { type: "highlight"; highlight: number };

export type MessageToBucket =
  | { type: "reload" }
  | { type: "runCode"; code: string; html: string };

const INNER_ORIGIN = __INNER_ORIGIN__;
const bucketUrl = `${__INNER_ORIGIN__}/templates/bucket.html`;

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
  resetConsole: (options?: { showMessage?: boolean | undefined }) => void;
}) {
  const bucket = useRef<HTMLIFrameElement>(null);
  const iframeBridge =
    useRef<IframeBridge<MessageToBucket, SandcastleMessage>>(null);
  const lastRunNumber = useRef<number>(Number.NEGATIVE_INFINITY);

  const activateBucketScripts = useCallback(
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
      const htmlElement = bucketDoc.createElement("div");
      htmlElement.innerHTML = html;
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
    },
    [appendConsole],
  );

  const [bucketReady, setBucketReady] = useState(false);

  useEffect(() => {
    if (
      bucketReady &&
      runNumber !== lastRunNumber.current &&
      iframeBridge.current
    ) {
      // When we want to run sandcastle code we just need to reload the bucket
      // it sends a message when loaded which triggers the message handler below
      // to load the actual code
      iframeBridge.current.sendMessage({
        type: "reload",
      });
    }
    lastRunNumber.current = runNumber;
  }, [bucketReady, code, html, runNumber]);

  useEffect(() => {
    const messageHandler = function (e: MessageEvent<SandcastleMessage>) {
      if (!iframeBridge.current) {
        return;
      }
      const data = e.data;

      // The iframe (bucket.html) sends this message on load.
      // This triggers the code to be injected into the iframe.
      if (data.type === "reload") {
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
      } else if (data.type === "bucketReady") {
        setBucketReady(true);
        // Firefox line numbers are zero-based, not one-based.
        const isFirefox = navigator.userAgent.indexOf("Firefox/") >= 0;

        resetConsole();
        iframeBridge.current.sendMessage({
          type: "runCode",
          code: embedInSandcastleTemplate(code, isFirefox),
          html,
        });
      } else if (data.type === "consoleClear") {
        resetConsole({ showMessage: true });
      } else if (data.type === "consoleLog") {
        // Console log messages from the iframe display in Sandcastle.
        appendConsole("log", data.log);
      } else if (data.type === "consoleError") {
        // Console error messages from the iframe display in Sandcastle
        let errorMsg = data.error;
        const lineNumber = data.lineNumber;
        if (lineNumber) {
          errorMsg += ` (on line ${lineNumber}`;

          if (data.url) {
            errorMsg += ` of ${data.url}`;
          }
          errorMsg += ")";
        }
        appendConsole("error", errorMsg);
      } else if (data.type === "consoleWarn") {
        // Console warning messages from the iframe display in Sandcastle.
        appendConsole("warn", data.warn);
      } else if (data.type === "highlight") {
        // Hovering objects in the embedded Cesium window.
        highlightLine(data.highlight);
      }
    };

    if (!iframeBridge.current) {
      return;
    }
    iframeBridge.current.addEventListener(messageHandler);
    return () => iframeBridge.current?.removeEventListener();
  }, [
    code,
    html,
    highlightLine,
    resetConsole,
    appendConsole,
    activateBucketScripts,
  ]);

  return (
    <div className="bucket-container">
      <iframe
        ref={(iframe) => {
          bucket.current = iframe;
          if (
            iframe?.contentWindow &&
            (!iframeBridge.current ||
              iframeBridge.current.targetWindow !== iframe?.contentWindow)
          ) {
            iframeBridge.current = new IframeBridge(
              INNER_ORIGIN,
              iframe.contentWindow,
              "App",
            );
            console.log("bridge created", iframeBridge.current);
          }
        }}
        id="bucketFrame"
        src={bucketUrl}
        className="fullFrame"
        sandbox="allow-scripts allow-same-origin"
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
