import { test, expect } from "./test.js";

const credentialKeys = [
  "sandcastle_gemini_api_key",
  "sandcastle_anthropic_api_key",
  "sandcastle_vertex_service_account",
  "sandcastle_vertex_region",
];
const modelStorageKey = "cesium-copilot-last-model-selection";
const settingsStorageKey = "sandcastle/copilot-settings";
const dummyKey = "sk-ant-dummy-reset-regression-key";
const imageData =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=";

test.beforeEach(async ({ page }) => {
  // Never send dummy credentials to a provider or load external analytics.
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return host === "localhost" || host === "127.0.0.1"
      ? route.continue()
      : route.abort();
  });
  await page.addInitScript(
    ({ credentialKeys, modelStorageKey, settingsStorageKey, dummyKey }) => {
      if (
        window !== window.top ||
        sessionStorage.getItem("reset-test-seeded")
      ) {
        return;
      }
      sessionStorage.setItem("reset-test-seeded", "true");
      const values = [
        "AI_dummy_reset_regression_key_1234567890",
        dummyKey,
        JSON.stringify({
          type: "service_account",
          project_id: "reset-test",
          client_email: "reset@example.invalid",
          private_key: "-----BEGIN PRIVATE KEY-----\nDUMMY-NOT-A-KEY",
        }),
        "us-central1",
      ];
      credentialKeys.forEach((key, i) =>
        sessionStorage.setItem(key, values[i]),
      );
      const model = JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        route: "direct",
      });
      localStorage.setItem(modelStorageKey, model);
      sessionStorage.setItem(modelStorageKey, model);
      sessionStorage.setItem(
        settingsStorageKey,
        JSON.stringify({
          customPromptAddendum: "Reset this custom prompt",
          extendedThinking: { enabled: false, budget: 1234 },
          autoFixEnabled: false,
        }),
      );
      localStorage.setItem("unrelated-local", "keep-local");
      sessionStorage.setItem("unrelated-session", "keep-session");
    },
    { credentialKeys, modelStorageKey, settingsStorageKey, dummyKey },
  );
  await page.goto("/Apps/Sandcastle2/");
  await page
    .getByText("Gallery loading...", { exact: true })
    .waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Cesium Copilot", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Chat message input" }),
  ).toBeEnabled();
});

async function resetData(page) {
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset All Data", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, Reset Everything" }).click();
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
}

async function expectCleared(page) {
  const stored = await page.evaluate(
    ({ credentialKeys, modelStorageKey, settingsStorageKey }) => ({
      credentials: credentialKeys.map((key) => sessionStorage.getItem(key)),
      localModel: localStorage.getItem(modelStorageKey),
      legacyModel: sessionStorage.getItem(modelStorageKey),
      settings: JSON.parse(sessionStorage.getItem(settingsStorageKey)),
      unrelatedLocal: localStorage.getItem("unrelated-local"),
      unrelatedSession: sessionStorage.getItem("unrelated-session"),
    }),
    { credentialKeys, modelStorageKey, settingsStorageKey },
  );
  const { settings, ...otherStorage } = stored;
  expect(otherStorage).toEqual({
    credentials: [null, null, null, null],
    localModel: null,
    legacyModel: null,
    unrelatedLocal: "keep-local",
    unrelatedSession: "keep-session",
  });
  // A repeated reset may remove the already-default stored value without a
  // state change. Missing settings and persisted defaults are both valid.
  if (settings !== null) {
    expect(settings).toEqual({
      customPromptAddendum: "",
      extendedThinking: { enabled: true, budget: 2048 },
      autoFixEnabled: true,
    });
  }
  await expect(
    page.getByRole("switch", { name: "Toggle Extended Thinking" }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Toggle Auto-fix errors" }),
  ).toBeChecked();
  const input = page.getByRole("textbox", { name: "Chat message input" });
  await expect(input).toBeDisabled();
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Select Model", exact: true }),
  ).toBeVisible();
}

async function editorCode(page) {
  // Monaco reuses line nodes; DOM order can differ from displayed code order.
  return page
    .locator(".monaco-editor .view-lines")
    .first()
    .evaluate((editor) =>
      Array.from(editor.querySelectorAll(".view-line"))
        .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
        .map((line) => line.textContent)
        .join("\n"),
    );
}

async function editCode(page) {
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  await page.locator(".monaco-editor textarea.inputarea").first().focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("\n// UNSAVED_RESET_TEST");
  await expect(
    page.locator(".monaco-editor .view-lines").first(),
  ).toContainText("UNSAVED_RESET_TEST");
  return editorCode(page);
}

async function pasteImage(page) {
  await page
    .getByRole("textbox", { name: "Chat message input" })
    .evaluate((input, data) => {
      const clipboardData = new DataTransfer();
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      clipboardData.items.add(
        new File([bytes], "reset-test.png", { type: "image/png" }),
      );
      input.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData, bubbles: true }),
      );
    }, imageData);
}

// Ignore abort in the mock transport so late buffered output still reaches the
// application. The reset must cancel the request AND reject its late effects.
async function mockResponse(page, immediateTool = false) {
  await page.evaluate((immediateTool) => {
    const realFetch = window.fetch.bind(window);
    const encoder = new TextEncoder();
    const packet = (event) =>
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    const requests = [];
    window.resetTestRequests = requests;
    window.fetch = (input, init) => {
      if (String(input) !== "https://api.anthropic.com/v1/messages") {
        return realFetch(input, init);
      }
      const request = { signal: init.signal, finished: false };
      requests.push(request);
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(
            packet({
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            }),
          );
          controller.enqueue(
            packet({
              type: "content_block_delta",
              index: 0,
              delta: {
                type: "text_delta",
                text: "Pending reset test response",
              },
            }),
          );
          request.release = (replace = "// LATE_RESET_EDIT\n") => {
            controller.enqueue(
              packet({ type: "content_block_stop", index: 0 }),
            );
            controller.enqueue(
              packet({
                type: "content_block_start",
                index: 1,
                content_block: {
                  type: "tool_use",
                  id: `tool-${requests.length}`,
                  name: "apply_diff",
                  input: {},
                },
              }),
            );
            controller.enqueue(
              packet({
                type: "content_block_delta",
                index: 1,
                delta: {
                  type: "input_json_delta",
                  partial_json: JSON.stringify({
                    file: "javascript",
                    search: "",
                    replace,
                  }),
                },
              }),
            );
            controller.enqueue(
              packet({ type: "content_block_stop", index: 1 }),
            );
            controller.close();
          };
          if (immediateTool && requests.length === 1) {
            request.release("// BEFORE_RESET_EDIT\n");
          }
        },
      });
      // A deterministic completion signal avoids sleeps when asserting that
      // late output has been consumed without editing code or sending retries.
      const getReader = body.getReader.bind(body);
      body.getReader = (...args) => {
        const reader = getReader(...args);
        const releaseLock = reader.releaseLock.bind(reader);
        reader.releaseLock = () => {
          request.finished = true;
          releaseLock();
        };
        return reader;
      };
      return Promise.resolve(
        new Response(body, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    };
  }, immediateTool);
}

async function sendMessage(page) {
  await page
    .getByRole("textbox", { name: "Chat message input" })
    .fill("Add a comment for the local reset test.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
}

test("cancelling confirmation preserves credentials, settings and draft", async ({
  page,
}) => {
  const input = page.getByRole("textbox", { name: "Chat message input" });
  await input.fill("Keep this draft");
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset All Data", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("Keep this draft");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("sandcastle_anthropic_api_key"),
    ),
  ).toBe(dummyKey);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("sandcastle/copilot-settings"))
          .customPromptAddendum,
    ),
  ).toBe("Reset this custom prompt");
});

test("reset preserves unsaved code without navigating and stays reset on reload", async ({
  page,
}) => {
  const codeBefore = await editCode(page);
  await page
    .getByRole("textbox", { name: "Chat message input" })
    .fill("Clear this draft");
  await pasteImage(page);
  await expect(page.getByAltText("reset-test.png")).toBeVisible();
  await page.evaluate(() => {
    window.resetTestDocument = true;
  });
  const dialogs = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await resetData(page);
  await expectCleared(page);
  expect(await page.evaluate(() => window.resetTestDocument)).toBe(true);
  expect(dialogs).toEqual([]);
  expect(await editorCode(page)).toBe(codeBefore);
  await expect(page.getByAltText("reset-test.png")).toHaveCount(0);
  await resetData(page);
  await expectCleared(page);
  page.removeAllListeners("dialog");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page
    .getByRole("button", { name: "Cesium Copilot", exact: true })
    .click();
  await expectCleared(page);
});

test("an image read completing after reset cannot restore an attachment", async ({
  page,
}) => {
  await page.evaluate(() => {
    const read = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (file) {
      window.finishResetTestImage = () => read.call(this, file);
    };
    const NativeImage = window.Image;
    window.Image = class extends NativeImage {
      constructor() {
        super();
        const loaded = () => {
          window.resetTestImageLoaded = true;
        };
        this.addEventListener("load", loaded);
        this.addEventListener("error", loaded);
      }
    };
  });
  await pasteImage(page);
  await page.waitForFunction(() => !!window.finishResetTestImage);
  await resetData(page);
  await page.evaluate(() => window.finishResetTestImage());
  await page.waitForFunction(() => window.resetTestImageLoaded);
  await expect(page.getByAltText("reset-test.png")).toHaveCount(0);
  await expectCleared(page);
});

for (const continuation of [false, true]) {
  test(`reset aborts ${continuation ? "a tool continuation" : "an initial response"} and rejects late edits`, async ({
    page,
  }) => {
    await editCode(page);
    await mockResponse(page, continuation);
    await sendMessage(page);
    const index = continuation ? 1 : 0;
    await page.waitForFunction(
      (count) => window.resetTestRequests.length === count,
      index + 1,
    );
    const codeBefore = await editorCode(page);
    await resetData(page);
    await expectCleared(page);
    expect(
      await page.evaluate(
        (i) => window.resetTestRequests[i].signal.aborted,
        index,
      ),
    ).toBe(true);
    await page.evaluate((i) => window.resetTestRequests[i].release(), index);
    await page.waitForFunction(
      (i) => window.resetTestRequests[i].finished,
      index,
    );
    expect(await editorCode(page)).toBe(codeBefore);
    expect(await page.evaluate(() => window.resetTestRequests.length)).toBe(
      index + 1,
    );
    await expect(
      page.getByText("Pending reset test response", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Stop generating", exact: true }),
    ).toHaveCount(0);
  });
}

test("a late old response cannot clear a new request after credentials are re-entered", async ({
  page,
}) => {
  await mockResponse(page);
  await sendMessage(page);
  await page.waitForFunction(() => window.resetTestRequests.length === 1);
  await resetData(page);
  await page
    .getByRole("button", { name: "Open API key settings", exact: true })
    .click();
  await page.getByPlaceholder("sk-ant-...").fill(dummyKey);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await sendMessage(page);
  await page.waitForFunction(() => window.resetTestRequests.length === 2);
  await page.evaluate(() => window.resetTestRequests[0].release());
  await page.waitForFunction(() => window.resetTestRequests[0].finished);
  await expect(
    page.getByRole("button", { name: "Stop generating", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.resetTestRequests[1].signal.aborted),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Stop generating", exact: true })
    .click();
  expect(
    await page.evaluate(() => window.resetTestRequests[1].signal.aborted),
  ).toBe(true);
  await page.evaluate(() => window.resetTestRequests[1].release());
});
