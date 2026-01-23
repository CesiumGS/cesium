import {
  originalLog,
  originalWarn,
  wrapConsoleFunctions,
} from "../src/util/ConsoleWrapper.js";
import { IframeBridge } from "../src/util/IframeBridge";
import DOMPurify from "dompurify";

/* eslint-disable-next-line no-undef */
const OUTER_ORIGIN = __OUTER_ORIGIN__;

/**
 * Apply and run sandcastle code to the page
 *
 * @param {string} code the JS code to run
 * @param {string} html any HTML to add to the page, will be sanitized first
 */
function loadSandcastle(code, html) {
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
  div.innerHTML = sanitized;
  document.body.append(div);

  const script = document.createElement("script");
  script.type = "module";
  script.textContent = code;
  document.body.append(script);

  document.body.dataset.sandcastleLoaded = "yes";
}

function initPage() {
  const bridge = new IframeBridge(OUTER_ORIGIN, window.parent);

  wrapConsoleFunctions(bridge);

  bridge.addEventListener((e) => {
    originalLog("Bucket received message", e);
    if (e.data.type === "reload") {
      window.location.reload();
    } else if (e.data.type === "runCode") {
      loadSandcastle(e.data.code, e.data.html);
    }
  });

  // TODO: likely want some sort of versioning for the handshake so the app and bucket
  // can agree to speak the same "language"/protocol
  bridge.sendMessage({ type: "bucketReady" });
}

window.addEventListener("load", () => {
  initPage();
});
