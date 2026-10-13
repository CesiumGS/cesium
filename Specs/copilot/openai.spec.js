import process from "node:process";
import { Buffer } from "node:buffer";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// Compile the production TypeScript without adding a test-only runtime.
const { outputFiles } = await build({
  stdin: {
    contents: `export * from "./packages/sandcastle/src/copilot/ai/clients/OpenAIClient";
      export * from "./packages/sandcastle/src/copilot/ai/clients/AIClientFactory";
      export * from "./packages/sandcastle/src/copilot/ai/clients/ApiKeyManager";`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const saved = new Map();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  },
});
const {
  OpenAIClient,
  getOpenAIReasoningEfforts,
  resolveOpenAIReasoningEffort,
  buildOpenAIHistory,
  AIClientFactory,
  ApiKeyManager,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
);
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  saved.clear();
});
const context = { javascript: "const x = 1;", html: "<div></div>" };
const tools = [
  {
    name: "apply_diff",
    description: "Edit a file",
    input_schema: {
      type: "object",
      properties: { diff: { type: "string" } },
      required: ["diff"],
    },
  },
];
const textOutput = [
  {
    type: "message",
    id: "msg_1",
    role: "assistant",
    status: "completed",
    phase: "final_answer",
    content: [{ type: "output_text", text: "Done", annotations: [] }],
  },
];
const call = {
  type: "function_call",
  id: "fc_1",
  call_id: "call_1",
  name: "apply_diff",
  arguments: '{"diff":"patch"}',
  status: "completed",
};
const reasoning = {
  type: "reasoning",
  id: "rs_1",
  summary: [],
  encrypted_content: "opaque-reasoning",
};
const terminal = (output = textOutput) => ({
  type: "response.completed",
  response: {
    status: "completed",
    output,
    usage: {
      input_tokens: 30,
      output_tokens: 15,
      input_tokens_details: { cached_tokens: 10 },
      output_tokens_details: { reasoning_tokens: 5 },
    },
  },
});
function stream(events, { fragmented = false } = {}) {
  const bytes = new TextEncoder().encode(
    events
      .map(
        (event) =>
          `event: ${event.type}\r\ndata: ${JSON.stringify(event)}\r\n\r\n`,
      )
      .join(""),
  );
  return new Response(
    new ReadableStream({
      start(controller) {
        if (fragmented) {
          for (const byte of bytes) {
            controller.enqueue(new Uint8Array([byte]));
          }
        } else {
          controller.enqueue(bytes);
        }
        controller.close();
      },
    }),
    { status: 200 },
  );
}
async function collect(iterator) {
  const chunks = [];
  for await (const c of iterator) {
    chunks.push(c);
  }
  return chunks;
}

for (const model of ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"]) {
  for (const effort of getOpenAIReasoningEfforts(model)) {
    test(`${model} sends ${effort} reasoning through Responses API`, async () => {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        assert.equal(init.headers.Authorization, "Bearer test-key");
        const body = JSON.parse(init.body);
        assert.equal(body.model, model);
        assert.equal(body.reasoning.effort, effort);
        assert.equal(body.store, false);
        assert.equal(body.parallel_tool_calls, false);
        assert.equal(body.tools[0].type, "function");
        assert.equal(body.tools[0].strict, false);
        assert.equal("temperature" in body, false);
        assert.match(
          body.input.at(-1).content[1].image_url,
          /^data:image\/png;base64,/,
        );
        return stream([terminal()]);
      };
      const result = await collect(
        new OpenAIClient("test-key", model, {
          reasoningEffort: effort,
        }).generateWithContext(
          "Edit",
          context,
          undefined,
          tools,
          [],
          [{ mimeType: "image/png", base64Data: "AA==" }],
        ),
      );
      assert.equal(
        result.some((c) => c.type === "error"),
        false,
      );
      assert.equal(result.find((c) => c.type === "usage").thoughtTokens, 5);
    });
  }
}

test("fragmented CRLF frames preserve Unicode, text, and reasoning", async () => {
  globalThis.fetch = async () =>
    stream(
      [
        { type: "response.reasoning_summary_text.delta", delta: "Check…" },
        { type: "response.output_text.delta", delta: "Hello 🌍" },
        terminal(),
      ],
      { fragmented: true },
    );
  const result = await collect(
    new OpenAIClient("test").generateWithContext("Hello", context),
  );
  assert.equal(result.find((c) => c.type === "text").text, "Hello 🌍");
  assert.equal(result.find((c) => c.type === "reasoning").reasoning, "Check…");
});

test("tool continuation replays encrypted reasoning, call id, results, and tools", async () => {
  let turn = 0;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    if (turn++ === 0) {
      return stream([terminal([reasoning, call])]);
    }
    assert.deepEqual(body.input.slice(-3), [
      reasoning,
      call,
      {
        type: "function_call_output",
        call_id: "call_1",
        output: "applied",
      },
    ]);
    assert.equal(body.tools[0].name, "apply_diff");
    assert.equal(body.reasoning.effort, "max");
    return stream([terminal()]);
  };
  const client = new OpenAIClient("test", "gpt-6-astra", {
    reasoningEffort: "max",
  });
  const first = await collect(
    client.generateWithContext("Edit", context, undefined, tools),
  );
  const tool = first.find((c) => c.type === "tool_call").toolCall;
  assert.deepEqual(tool, {
    id: "call_1",
    name: "apply_diff",
    input: { diff: "patch" },
  });
  const next = await collect(
    client.submitToolResult(
      tool,
      { tool_call_id: tool.id, status: "success", output: "applied" },
      "System",
      [],
      tools,
    ),
  );
  assert.equal(
    next.some((c) => c.type === "error"),
    false,
  );
  assert.equal(turn, 2);
});

for (const [name, events] of [
  [
    "incomplete response",
    [
      {
        type: "response.incomplete",
        response: {
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output: [call],
        },
      },
    ],
  ],
  [
    "failed response",
    [
      {
        type: "response.failed",
        response: { status: "failed", error: { message: "failed" } },
      },
    ],
  ],
  ["error event", [{ type: "error", message: "failed" }]],
  [
    "truncated stream",
    [{ type: "response.output_text.delta", delta: "Partial" }],
  ],
  ["invalid tool JSON", [terminal([{ ...call, arguments: "{" }])]],
  ["non-object tool input", [terminal([{ ...call, arguments: "[]" }])]],
  ["multiple tool calls", [terminal([call, { ...call, call_id: "call_2" }])]],
]) {
  test(`${name} reports an error without executing a tool`, async () => {
    globalThis.fetch = async () => stream(events);
    const chunks = await collect(
      new OpenAIClient("test").generateWithContext(
        "Edit",
        context,
        undefined,
        tools,
      ),
    );
    assert.ok(chunks.some((c) => c.type === "error"));
    assert.equal(
      chunks.some((c) => c.type === "tool_call"),
      false,
    );
  });
}

test("API errors surface to the user", async () => {
  globalThis.fetch = async () =>
    Response.json({ error: { message: "Incorrect API key" } }, { status: 401 });
  const chunks = await collect(
    new OpenAIClient("test").generateWithContext("Hello", context),
  );
  assert.equal(chunks[0].error, "Incorrect API key");
});

test("stop cancels an active stream", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) =>
    new Response(
      new ReadableStream({
        start(streamController) {
          init.signal.addEventListener("abort", () =>
            streamController.error(new DOMException("Aborted", "AbortError")),
          );
          queueMicrotask(() => controller.abort());
        },
      }),
    );
  const chunks = await collect(
    new OpenAIClient("test").generateWithContext(
      "Hello",
      context,
      undefined,
      undefined,
      [],
      undefined,
      controller.signal,
    ),
  );
  assert.equal(chunks[0].error, "Request stopped by user");
});

test("history preserves tool-only messages and assistant phase; omits unanswered calls", () => {
  const messages = [
    {
      role: "assistant",
      content: "",
      openAIOutput: [reasoning, call],
      toolCalls: [
        {
          toolCall: { id: "call_1", name: "apply_diff", input: {} },
          result: { status: "success", output: "applied" },
        },
      ],
    },
    { role: "assistant", content: "Done", openAIOutput: textOutput },
  ];
  const history = buildOpenAIHistory(messages);
  assert.equal(history[0].encrypted_content, "opaque-reasoning");
  assert.equal(history[2].type, "function_call_output");
  assert.equal(history[3].phase, "final_answer");
  assert.equal(
    buildOpenAIHistory([
      { role: "assistant", content: "", openAIOutput: [call] },
    ]).length,
    0,
  );
});

test("credentials enable exactly three direct OpenAI entries, never Vertex routes", () => {
  assert.equal(AIClientFactory.getAvailableModelEntries().length, 0);
  ApiKeyManager.saveOpenAIApiKey(" test-key ");
  assert.equal(ApiKeyManager.getOpenAIApiKey(), "test-key");
  assert.equal(ApiKeyManager.hasAnyCredentials(), true);
  const entries = AIClientFactory.getAvailableModelEntries();
  assert.equal(entries.length, 3);
  assert.ok(
    entries.every(
      (entry) => entry.provider === "openai" && entry.route === "direct",
    ),
  );
  assert.deepEqual(AIClientFactory.getDefaultModelSelection(), {
    model: "gpt-6.1-sol",
    route: "direct",
  });
  for (const entry of entries) {
    assert.equal(AIClientFactory.canUseModelRoute(entry.id, "vertex"), false);
    assert.equal(
      AIClientFactory.isVertexRegionSupported(entry.id, "global"),
      false,
    );
    assert.ok(
      AIClientFactory.createClientForRoute({
        model: entry.id,
        route: "direct",
      }) instanceof OpenAIClient,
    );
  }
  ApiKeyManager.clearOpenAIApiKey();
  assert.equal(AIClientFactory.getAvailableModelEntries().length, 0);
});

test("reasoning preferences normalize unsupported values", () => {
  assert.equal(resolveOpenAIReasoningEffort("gpt-6-luna", "none"), "none");
  assert.equal(resolveOpenAIReasoningEffort("gpt-6-astra", "none"), "medium");
  assert.equal(resolveOpenAIReasoningEffort("gpt-6.1-sol", "ultra"), "medium");
});

test("nested billing errors in streaming responses keep the provider message", async () => {
  globalThis.fetch = async () =>
    stream([
      {
        type: "error",
        error: {
          code: "credit_balance_exhausted",
          message: "You have no credits remaining.",
        },
      },
    ]);
  const chunks = await collect(
    new OpenAIClient("test").generateWithContext("Hello", context),
  );
  assert.equal(chunks[0].error, "You have no credits remaining.");
});

test("reasoning menus expose every documented API effort", () => {
  const reasoning = ["low", "medium", "high", "xhigh", "max"];
  assert.deepEqual(getOpenAIReasoningEfforts("gpt-6-luna"), [
    "none",
    ...reasoning,
  ]);
  assert.deepEqual(getOpenAIReasoningEfforts("gpt-6.1-sol"), reasoning);
  assert.deepEqual(getOpenAIReasoningEfforts("gpt-6-astra"), reasoning);
});

test("unanswered calls discard their required reasoning together", () => {
  assert.deepEqual(
    buildOpenAIHistory([
      { role: "assistant", content: "", openAIOutput: [reasoning, call] },
    ]),
    [],
  );
  assert.deepEqual(
    buildOpenAIHistory([
      {
        role: "assistant",
        content: "I tried to edit.",
        openAIOutput: [reasoning, call],
      },
    ]),
    [{ role: "assistant", content: "I tried to edit." }],
  );
});

test("a fresh client rejects tool continuation instead of replaying foreign history", async () => {
  globalThis.fetch = async () => {
    assert.fail("Must not send an invalid continuation");
  };
  const chunks = await collect(
    new OpenAIClient("test").submitToolResult(
      { id: "call_1", name: "apply_diff", input: {} },
      { status: "success", output: "OK" },
      "System",
      [{ role: "assistant", content: [{ type: "tool_use" }] }],
      tools,
    ),
  );
  assert.match(chunks[0].error, /No matching OpenAI tool call/);
});

test("reasoning summary parts are separated", async () => {
  globalThis.fetch = async () =>
    stream([
      { type: "response.reasoning_summary_part.added", summary_index: 0 },
      { type: "response.reasoning_summary_text.delta", delta: "First." },
      { type: "response.reasoning_summary_part.added", summary_index: 1 },
      { type: "response.reasoning_summary_text.delta", delta: "Second." },
      terminal(),
    ]);
  const chunks = await collect(
    new OpenAIClient("test").generateWithContext("Hello", context),
  );
  assert.equal(
    chunks
      .filter((c) => c.type === "reasoning")
      .map((c) => c.reasoning)
      .join(""),
    "First.\n\nSecond.",
  );
});

test("key-removal failure is returned for user-visible feedback", () => {
  const remove = globalThis.sessionStorage.removeItem;
  globalThis.sessionStorage.removeItem = () => {
    throw new Error("Storage unavailable");
  };
  try {
    assert.equal(ApiKeyManager.clearOpenAIApiKey(), false);
  } finally {
    globalThis.sessionStorage.removeItem = remove;
  }
});

test("summary separation also works when a new reasoning item resets the part index", async () => {
  globalThis.fetch = async () =>
    stream([
      {
        type: "response.reasoning_summary_part.added",
        summary_index: 0,
        item_id: "rs_1",
      },
      { type: "response.reasoning_summary_text.delta", delta: "First." },
      {
        type: "response.reasoning_summary_part.added",
        summary_index: 0,
        item_id: "rs_2",
      },
      { type: "response.reasoning_summary_text.delta", delta: "Second." },
      terminal(),
    ]);
  const chunks = await collect(
    new OpenAIClient("test").generateWithContext("Hello", context),
  );
  assert.equal(
    chunks
      .filter((c) => c.type === "reasoning")
      .map((c) => c.reasoning)
      .join(""),
    "First.\n\nSecond.",
  );
});
