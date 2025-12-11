import { useCallback, useEffect, useRef } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { embedInSandcastleTemplate } from "./Helpers";
import "./Bucket.css";
import { ConsoleMessageType } from "./ConsoleMirror";
import { Button } from "@stratakit/bricks";
import DOMPurify from "dompurify";

type ReactDevToolsMessage = {
  source: "react-devtools-bridge" | "react-devtools-content-script";
};

type SandcastleMessage =
  | { type: "reload" }
  | { type: "consoleClear" }
  | { type: "consoleLog"; log: string }
  | { type: "consoleWarn"; warn: string }
  | { type: "consoleError"; error: string; lineNumber?: number; url?: string }
  | { type: "highlight"; highlight: number };

function InnerBucket({
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
  const lastRunNumber = useRef<number>(Number.NEGATIVE_INFINITY);

  const activateBucketScripts = useCallback(
    function activateBucketScripts(
      bucketFrame: HTMLIFrameElement,
      code: string,
      html: string,
    ) {
      console.log("activateBucketScripts");
      // const bucketDoc = bucketFrame.contentDocument;
      // if (!bucketDoc) {
      //   console.log("activateBucketScripts - no doc");
      //   return;
      // }

      // const headNodes = bucketDoc.head.childNodes;
      // let node;
      // const nodes: HTMLScriptElement[] = [];
      // let i, len;
      // for (i = 0, len = headNodes.length; i < len; ++i) {
      //   node = headNodes[i];
      //   // header is included in blank frame.
      //   if (
      //     node instanceof HTMLScriptElement &&
      //     node.src.indexOf("Sandcastle-header.js") < 0 &&
      //     node.src.indexOf("Cesium.js") < 0
      //   ) {
      //     nodes.push(node);
      //   }
      // }

      // for (i = 0, len = nodes.length; i < len; ++i) {
      //   bucketDoc.head.removeChild(nodes[i]);
      // }

      // // Apply user HTML to bucket.
      // const htmlElement = bucketDoc.createElement("div");
      // htmlElement.innerHTML = html;
      // bucketDoc.body.appendChild(htmlElement);

      // const onScriptTagError = function () {
      //   if (bucketFrame.contentDocument === bucketDoc) {
      //     // @ts-expect-error this has type any because it's from anywhere inside the bucket
      //     appendConsole("error", `Error loading ${this.src}`);
      //     appendConsole(
      //       "error",
      //       "Make sure Cesium is built, see the Contributor's Guide for details.",
      //     );
      //   }
      // };

      // Load each script after the previous one has loaded.
      const loadScript = function () {
        // if (bucketFrame.contentDocument !== bucketDoc) {
        //   // A newer reload has happened, abort this.
        //   return;
        // }
        // if (nodes.length > 0) {
        //   while (nodes.length > 0) {
        //     node = nodes.shift();
        //     if (!node) {
        //       continue;
        //     }
        //     const scriptElement = bucketDoc.createElement("script");
        //     let hasSrc = false;
        //     for (
        //       let j = 0, numAttrs = node.attributes.length;
        //       j < numAttrs;
        //       ++j
        //     ) {
        //       const name = node.attributes[j].name;
        //       const val = node.attributes[j].value;
        //       scriptElement.setAttribute(name, val);
        //       if (name === "src" && val) {
        //         hasSrc = true;
        //       }
        //     }
        //     scriptElement.innerHTML = node.innerHTML;
        //     if (hasSrc) {
        //       scriptElement.onload = loadScript;
        //       scriptElement.onerror = onScriptTagError;
        //       bucketDoc.head.appendChild(scriptElement);
        //     } else {
        //       bucketDoc.head.appendChild(scriptElement);
        //       loadScript();
        //     }
        //   }
        // } else {
        // Apply user JS to bucket
        // const element = bucketDoc.createElement("script");
        // element.type = "module";

        // Firefox line numbers are zero-based, not one-based.
        const isFirefox = navigator.userAgent.indexOf("Firefox/") >= 0;

        // element.textContent = embedInSandcastleTemplate(code, isFirefox);
        // bucketDoc.body.appendChild(element);

        // TODO: this needs more thorough testing to make sure we account for things in all our sandcastles
        // also potentially may want to remove or adjust allowing style tags
        const sanitized = DOMPurify.sanitize(html, {
          ADD_TAGS: ["style"],
          FORCE_BODY: true,
        });
        console.warn({ original: html, sanitized, removed: DOMPurify.removed });

        bucket.current?.contentWindow?.postMessage(
          {
            type: "load",
            code: embedInSandcastleTemplate(code, isFirefox),
            html: sanitized,
          },
          "*",
        );

        // }
      };

      loadScript();
    },
    [appendConsole],
  );

  useEffect(() => {
    console.log("bucket updated", { code, html, runNumber });
    if (
      runNumber !== lastRunNumber.current &&
      bucket.current &&
      bucket.current.contentWindow
    ) {
      // When we want to run sandcastle code we just need to reload the bucket
      // it sends a message when loaded which triggers the message handler below
      // to load the actual code
      console.warn("would reload bucket here");
      // bucket.current.contentWindow.location.reload();
      bucket.current.contentWindow.postMessage({ type: "reload" }, "*");
    }
    lastRunNumber.current = runNumber;
  }, [code, html, runNumber]);

  useEffect(() => {
    const messageHandler = function (
      e: MessageEvent<SandcastleMessage | ReactDevToolsMessage>,
    ) {
      if (e.data.source?.includes("react-devtools")) {
        // ignore all devtools messages
        return;
      }

      console.log("App received message", e);
      // The iframe (bucket.html) sends this message on load.
      // This triggers the code to be injected into the iframe.
      if (e.data.type === "reload") {
        // debugger;
        // if (!bucket.current || !bucket.current.contentDocument) {
        //   // Reload fired, bucket not specified yet.
        //   console.log("not ready yet");
        //   return;
        // }
        // const bucketDoc = bucket.current.contentDocument;
        // if (bucketDoc.body.dataset.sandcastleLoaded !== "yes") {
        // bucketDoc.body.dataset.sandcastleLoaded = "yes";
        resetConsole();
        // This happens after the bucket.html reloads, to inject the editor code
        // into the iframe, causing the demo to run there.
        activateBucketScripts(bucket.current, code, html);
        // }
      } else if (e.data.type === "consoleClear") {
        resetConsole({ showMessage: true });
      } else if (e.data.type === "consoleLog") {
        // Console log messages from the iframe display in Sandcastle.
        appendConsole("log", e.data.log);
      } else if (e.data.type === "consoleError") {
        // Console error messages from the iframe display in Sandcastle
        let errorMsg = e.data.error;
        const lineNumber = e.data.lineNumber;
        if (lineNumber) {
          errorMsg += ` (on line ${lineNumber}`;

          if (e.data.url) {
            errorMsg += ` of ${e.data.url}`;
          }
          errorMsg += ")";
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
        ref={bucket}
        id="bucketFrame"
        src="templates/bucket.html"
        // src="https://sandcastle.cesium.com/templates/bucket.html"
        className="fullFrame"
        allowFullScreen
        // sandbox="allow-same-origin allow-scripts"
        sandbox="allow-scripts"
      ></iframe>
    </div>
  );
}

export function Bucket(props: Parameters<typeof InnerBucket>[0]) {
  function fallbackRender({ error, resetErrorBoundary }: FallbackProps) {
    return (
      <div className="bucket-container">
        <div className="fullFrame">
          <div className="error-message">
            <div className="error-header">The viewer failed to load</div>
            <span>{error?.message}</span>
            <br />
            {/* TODO: this retry should probably not exist or be much more robust */}
            <Button onClick={() => resetErrorBoundary()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <InnerBucket {...props} />
    </ErrorBoundary>
  );
}

export function BucketPlaceholder() {
  return (
    <div className="bucket-container">
      <div className="fullFrame">Loading...</div>
    </div>
  );
}
