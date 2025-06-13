import { useEffect, useRef } from "react";
import { embedInSandcastleTemplate } from "./Helpers";

// TODO: I don't think this will correctly track calls between state?
// I need to figure what this is even here for and whether we need it still...
const local = {
  docTypes: [],
  headers: "<html><head></head><body>",
  bucketName: "starter bucket",
  emptyBucket: "",
};

function activateBucketScripts(
  bucketDoc: Document,
  bucketFrame: HTMLIFrameElement,
  code: string,
  html: string,
) {
  console.log("activateBucketScripts");
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
      appendConsole("consoleError", `Error loading ${this.src}`, true);
      appendConsole(
        "consoleError",
        "Make sure Cesium is built, see the Contributor's Guide for details.",
        true,
      );
    }
  };

  console.log("nodes", nodes);

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
        for (let j = 0, numAttrs = node.attributes.length; j < numAttrs; ++j) {
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

function appendConsole(
  type: "consoleError" | "",
  message: string,
  focusPanel: boolean,
) {
  // TODO:
  if (type === "consoleError") {
    console.error(message);
    return;
  }
  console.log(message);
  if (focusPanel) {
    // TODO:
  }
}

// let bucketWaiting = false;

function applyBucket(
  bucketFrame: HTMLIFrameElement,
  code: string,
  html: string,
) {
  console.log("applyBucket");
  if (
    // local.emptyBucket &&
    // local.bucketName &&
    // typeof bucketTypes[local.bucketName] === "string"
    // eslint-disable-next-line no-constant-condition
    true
  ) {
    // bucketWaiting = false;
    const bucketDoc = bucketFrame.contentDocument;
    if (!bucketDoc) {
      console.warn(
        "tried to applyBucket before the bucket content document existed",
      );
      return;
    }
    if (
      local.headers.substring(0, local.emptyBucket.length) !== local.emptyBucket
    ) {
      appendConsole(
        "consoleError",
        `Error, first part of ${local.bucketName} must match first part of bucket.html exactly.`,
        true,
      );
    } else {
      const bodyAttributes = local.headers.match(/<body([^>]*?)>/)?.[1] ?? "";
      const attributeRegex = /([-a-z_]+)\s*="([^"]*?)"/gi;
      //group 1 attribute name, group 2 attribute value.  Assumes double-quoted attributes.
      let attributeMatch;
      while ((attributeMatch = attributeRegex.exec(bodyAttributes)) !== null) {
        const attributeName = attributeMatch[1];
        const attributeValue = attributeMatch[2];
        if (attributeName === "class") {
          bucketDoc.body.className = attributeValue;
        } else {
          bucketDoc.body.setAttribute(attributeName, attributeValue);
        }
      }

      const pos = local.headers.indexOf("</head>");
      const extraHeaders = local.headers.substring(
        local.emptyBucket.length,
        pos,
      );
      bucketDoc.head.innerHTML += extraHeaders;
      activateBucketScripts(bucketDoc, bucketFrame, code, html);
    }
  } else {
    // bucketWaiting = true;
  }
}

function Bucket({
  code,
  html,
  runNumber,
}: {
  /** The JS code for the Sandcastle */
  code: string;
  /** The HTML code for the sandcastle */
  html: string;
  /** If this value changes the bucket will reload which allows us to force a re-run even if the JS/HTML hasn't changed */
  runNumber: number;
}) {
  const bucket = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    console.log("Viewer updated", runNumber, { code, html });
    if (bucket.current && bucket.current.contentWindow) {
      bucket.current.contentWindow.location.reload();
    }
  }, [code, html, runNumber]);

  useEffect(() => {
    const messageHandler = function (e: MessageEvent) {
      // The iframe (bucket.html) sends this message on load.
      // This triggers the code to be injected into the iframe.
      if (e.data === "reload") {
        console.log("message reload");
        if (!local.bucketName || !bucket.current) {
          // Reload fired, bucket not specified yet.
          return;
        }
        const bucketDoc = bucket.current.contentDocument;
        if (!bucketDoc) {
          // TODO: this whole handler probably needs to be set up better for things like this
          console.warn("bucket not set up yet");
          return;
        }
        // if (!jsEditorRef.current || !htmlEditorRef.current) {
        //   console.warn("editors not set up yet");
        //   return;
        // }
        if (bucketDoc.body.getAttribute("data-sandcastle-loaded") !== "yes") {
          bucketDoc.body.setAttribute("data-sandcastle-loaded", "yes");
          // logOutput.innerHTML = "";
          // numberOfNewConsoleMessages = 0;
          // registry.byId("logContainer").set("title", "Console");
          // This happens after a Run (F8) reloads bucket.html, to inject the editor code
          // into the iframe, causing the demo to run there.
          applyBucket(bucket.current, code, html);
          // if (docError) {
          //   appendConsole(
          //     "consoleError",
          //     'Documentation not available.  Please run the "build-docs" build script to generate Cesium documentation.',
          //     true,
          //   );
          //   // showGallery();
          // }
          // if (galleryError) {
          //   appendConsole(
          //     "consoleError",
          //     "Error loading gallery, please run the build script.",
          //     true,
          //   );
          // }
          // if (deferredLoadError) {
          //   appendConsole(
          //     "consoleLog",
          //     `Unable to load demo named ${queryObject.src.replace(
          //       ".html",
          //       "",
          //     )}. Redirecting to HelloWorld.\n`,
          //     true,
          //   );
          // }
        }
      }
    };
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [code, html]);

  return (
    <>
      <iframe
        ref={bucket}
        id="bucketFrame"
        src="templates/bucket.html"
        className="fullFrame"
        allowFullScreen
      ></iframe>
      {/* <div className="debug">
        <pre>{code}</pre>
        <pre>{html}</pre>
      </div> */}
    </>
  );
}

export default Bucket;
