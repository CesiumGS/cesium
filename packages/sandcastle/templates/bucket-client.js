// @ts-check
import { originalWarn, wrapConsoleFunctions } from "../src/util/ConsoleWrapper";
import { IframeBridge } from "../src/util/IframeBridge";
import DOMPurify from "dompurify";

/** @import {BridgeToApp} from '../src/util/IframeBridge' */

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
  document.body.appendChild(div);

  const script = document.createElement("script");
  script.type = "module";
  script.textContent = code;
  document.body.appendChild(script);

  document.body.dataset.sandcastleLoaded = "yes";
}

function initPage() {
  /** @type {BridgeToApp} */
  const bridge = new IframeBridge(OUTER_ORIGIN, window.parent);

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
