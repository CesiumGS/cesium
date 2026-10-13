import { test, expect } from "./test.js";

const reasoningItem = {
  type: "reasoning",
  id: "rs_test",
  summary: [],
  encrypted_content: "test-reasoning",
};
function response(output, text = "") {
  const events = text
    ? [{ type: "response.output_text.delta", delta: text }]
    : [];
  events.push({
    type: "response.completed",
    response: {
      status: "completed",
      output,
      usage: {
        input_tokens: 25,
        output_tokens: 12,
        output_tokens_details: { reasoning_tokens: 3 },
      },
    },
  });
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}
function message(text) {
  return {
    type: "message",
    id: "msg_test",
    role: "assistant",
    status: "completed",
    phase: "final_answer",
    content: [{ type: "output_text", text, annotations: [] }],
  };
}
async function openCopilot(page) {
  // These tests exercise Copilot and the real editor. Stub only the viewer's
  // ready/completion messages so unrelated WebGL rendering cannot stall them.
  await page.route("**/templates/bucket.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><script>
      const origin = new URL(document.referrer).origin;
      const send = (type) => parent.postMessage({ id: "sandcastle-bridge", message: { type } }, origin);
      addEventListener("message", (event) => {
        if (event.source !== parent || event.origin !== origin || event.data?.id !== "sandcastle-bridge") return;
        if (event.data.message.type === "reload") send("bucketReady");
        if (event.data.message.type === "runCode") send("runComplete");
      });
      send("bucketReady");
    </script>`,
    }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("sandcastle_openai_api_key", "test-key");
  });
  await page.goto("/Apps/Sandcastle2/");
  await page
    .getByRole("button", { name: "Cesium Copilot", exact: true })
    .click();
  await page.getByRole("switch", { name: "Toggle Auto-fix errors" }).uncheck();
}
async function send(page, text) {
  await page.getByRole("textbox", { name: "Chat message input" }).fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Chat message input" }),
  ).toBeEnabled({ timeout: 15000 });
}

test("reasoning effort changes apply to the next message on the same model", async ({
  page,
}) => {
  const requests = [];
  await page.route("https://api.openai.com/v1/responses", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "text/event-stream",
      body: response([message("OK")], "OK"),
    });
  });
  await openCopilot(page);
  await send(page, "Reply OK.");
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].reasoning.effort).toBe("medium");
  await page
    .getByRole("button", { name: "Reasoning: Medium", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Max", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await send(page, "Reply OK again.");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].model).toBe(requests[0].model);
  expect(requests[1].reasoning.effort).toBe("max");
});

test("two code-edit continuations replay native history on a later user turn", async ({
  page,
}) => {
  const requests = [];
  await page.route("https://api.openai.com/v1/responses", async (route) => {
    requests.push(route.request().postDataJSON());
    const index = requests.length;
    const output =
      index <= 2
        ? [
            { ...reasoningItem, id: `rs_${index}` },
            {
              type: "function_call",
              id: `fc_${index}`,
              call_id: `call_${index}`,
              name: "apply_diff",
              status: "completed",
              arguments: JSON.stringify({
                file: "javascript",
                search: index === 1 ? "" : "const value = 1;",
                replace: `const value = ${index};`,
              }),
            },
          ]
        : [message("Done")];
    await route.fulfill({
      contentType: "text/event-stream",
      body: response(output, index > 2 ? "Done" : ""),
    });
  });
  await openCopilot(page);
  await send(page, "Apply two code edits.");
  await expect.poll(() => requests.length).toBe(3);
  await send(page, "Confirm the edits.");
  await expect.poll(() => requests.length).toBe(4);
  const history = requests[3].input;
  const toolOutputs = history.filter(
    (item) => item.type === "function_call_output",
  );
  expect(toolOutputs).toHaveLength(2);
  expect(JSON.parse(toolOutputs[0].output)).toMatchObject({
    file: "javascript",
    modifiedCode: "const value = 1;",
  });
  expect(JSON.parse(toolOutputs[1].output)).toMatchObject({
    file: "javascript",
    modifiedCode: "const value = 2;",
  });
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  await expect(
    page
      .locator(".monaco-editor .view-lines")
      .filter({ hasText: /const\s+value\s*=\s*2;/ })
      .first(),
  ).toBeVisible({ timeout: 15000 });

  expect(history.map((item) => item.type ?? item.role)).toEqual([
    "user",
    "reasoning",
    "function_call",
    "function_call_output",
    "reasoning",
    "function_call",
    "function_call_output",
    "message",
    "user",
  ]);
  expect(
    history
      .filter((item) => item.type === "function_call_output")
      .map((item) => item.call_id),
  ).toEqual(["call_1", "call_2"]);
  expect(history.find((item) => item.type === "message").phase).toBe(
    "final_answer",
  );
  expect(
    history
      .filter((item) => item.type === "reasoning")
      .every((item) => item.encrypted_content === "test-reasoning"),
  ).toBe(true);
});
