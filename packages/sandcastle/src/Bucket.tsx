import { useEffect, useRef, useState } from "react";
import { embedInSandcastleTemplate } from "./Helpers";
import "./Bucket.css";
import { ConsoleMessageType } from "./ConsoleMirror";
import {
  BridgeToBucket,
  IframeBridge,
  MessageToApp,
} from "./util/IframeBridge";

const INNER_ORIGIN = __INNER_ORIGIN__;
// using pathname lets this adapt to deployed locations like CI
const bucketUrl = `${new URL(`${location.pathname.replace(/[^\/]+.html/, "")}templates/bucket.html`, __INNER_ORIGIN__)}`;

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
  const iframeBridge = useRef<BridgeToBucket>(null);
  const lastRunNumber = useRef<number>(Number.NEGATIVE_INFINITY);
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
    const messageHandler = function (message: MessageToApp) {
      if (!iframeBridge.current) {
        return;
      }

      if (message.type === "bucketReady") {
        // The iframe (bucket.html) sends this message on load.
        // We send the code in response to make sure the page is ready to receive it
        setBucketReady(true);
        // Firefox line numbers are zero-based, not one-based.
        const isFirefox = navigator.userAgent.indexOf("Firefox/") >= 0;

        resetConsole();
        iframeBridge.current.sendMessage({
          type: "runCode",
          code: embedInSandcastleTemplate(code, isFirefox),
          html,
        });
      } else if (message.type === "consoleClear") {
        resetConsole({ showMessage: true });
      } else if (message.type === "consoleLog") {
        // Console log messages from the iframe display in Sandcastle.
        appendConsole("log", message.log);
      } else if (message.type === "consoleError") {
        // Console error messages from the iframe display in Sandcastle
        let errorMsg = message.error;
        const lineNumber = message.lineNumber;
        if (lineNumber) {
          errorMsg += ` (on line ${lineNumber}`;

          if (message.url) {
            errorMsg += ` of ${message.url}`;
          }
          errorMsg += ")";
        }
        appendConsole("error", errorMsg);
      } else if (message.type === "consoleWarn") {
        // Console warning messages from the iframe display in Sandcastle.
        appendConsole("warn", message.warn);
      } else if (message.type === "highlight") {
        // Hovering objects in the embedded Cesium window.
        highlightLine(message.highlight);
      }
    };

    if (!iframeBridge.current) {
      return;
    }
    iframeBridge.current.addEventListener(messageHandler);
    return () => iframeBridge.current?.removeEventListener();
  }, [code, html, highlightLine, resetConsole, appendConsole]);

  return (
    <div className="bucket-container">
      <iframe
        ref={(iframe) => {
          if (
            iframe?.contentWindow &&
            (!iframeBridge.current ||
              iframeBridge.current.targetWindow !== iframe.contentWindow)
          ) {
            iframeBridge.current = new IframeBridge(
              INNER_ORIGIN,
              iframe.contentWindow,
              "App",
            );
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
