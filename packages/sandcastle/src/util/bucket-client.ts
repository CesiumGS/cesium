/**
 * This is the minimal JS that runs on the Viewer's bucket.html page
 * This code handles reaching out to the surrounding app to request code to run.
 */

import { originalWarn, wrapConsoleFunctions } from "./ConsoleWrapper";
import { BridgeToApp, IframeBridge } from "./IframeBridge";
import DOMPurify from "dompurify";

declare global {
  interface Window {
    // This is set by the bucket-client.js init() function
    SANDCASTLE_OUTER_ORIGIN: string;
  }
}

const OUTER_ORIGIN = __OUTER_ORIGIN__;

/**
 * Apply and run sandcastle code to the page
 *
 * @param code the JS code to run
 * @param html any HTML to add to the page, will be sanitized first
 */
function loadSandcastle(code: string, html: string) {
  if (document.body.dataset.sandcastleLoaded === "yes") {
    originalWarn(
      "A Sandcastle was already loaded on this page and conflicts could occur. Aborting",
    );
    return;
  }

  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ["style"],
    FORCE_BODY: true,
  });

  const div = document.createElement("div");
  // Stylesheet imports are weirdly broken in Firefox 140+. This is a hacky workaround
  // confirmed still broken on v147
  // https://github.com/CesiumGS/cesium/issues/12700
  div.innerHTML = sanitized.replace(/@import/, "@import ");
  document.body.appendChild(div);

  const script = document.createElement("script");
  script.type = "module";
  script.textContent = code;
  document.body.appendChild(script);

  document.body.dataset.sandcastleLoaded = "yes";
}

function initPage() {
  // We set this so that the Sandcastle helper functions know where to send messages for the `highlight` message
  window.SANDCASTLE_OUTER_ORIGIN = OUTER_ORIGIN;

  const bridge: BridgeToApp = new IframeBridge(OUTER_ORIGIN, window.parent);

  wrapConsoleFunctions(bridge);

  bridge.addEventListener((message) => {
    if (message.type === "reload") {
      window.location.reload();
    } else if (message.type === "runCode") {
      loadSandcastle(message.code, message.html);
    }
  });

  bridge.sendMessage({ type: "bucketReady" });
}

window.addEventListener("load", () => {
  initPage();
});
