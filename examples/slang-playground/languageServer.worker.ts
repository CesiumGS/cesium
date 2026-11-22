/// <reference lib="webworker" />

/**
 * The Slang language server for the playground's editor, in its own worker:
 * the Slang WebAssembly build's `LanguageServer` (diagnostics without a
 * compile, completion, hover, signature help). The `cesium` module (the
 * custom shader contract) is written to the build's file system and opened
 * beside the user's document, so `import cesium;` resolves and its types
 * complete. Requests are `{ id, op, ... }`; replies `{ id, result }` or
 * `{ id, error }`. Positions are LSP's: lines from 0, UTF-16 columns.
 */

interface Position {
  line: number;
  character: number;
}
interface Range {
  start: Position;
  end: Position;
}
interface EmbindList<T> {
  size(): number;
  get(i: number): T | undefined;
  delete?(): void;
}
interface LanguageServer {
  didOpenTextDocument(uri: string, text: string): void;
  didCloseTextDocument(uri: string): void;
  didChangeTextDocument(uri: string, edits: unknown): void;
  hover(
    uri: string,
    p: Position,
  ): { contents: { kind: string; value: string }; range: Range } | undefined;
  gotoDefinition(
    uri: string,
    p: Position,
  ): EmbindList<{ uri: string; range: Range }> | undefined;
  completion(
    uri: string,
    p: Position,
    context: { triggerKind: number; triggerCharacter: string },
  ):
    | EmbindList<{
        label: string;
        kind: number;
        detail: string;
        documentation?: { kind: string; value: string };
      }>
    | undefined;
  signatureHelp(
    uri: string,
    p: Position,
  ):
    | {
        signatures: EmbindList<{
          label: string;
          documentation: { kind: string; value: string };
          parameters: EmbindList<{ label: [number, number] }>;
        }>;
        activeSignature: number;
        activeParameter: number;
      }
    | undefined;
  getDiagnostics(uri: string):
    | EmbindList<{
        code: string;
        range: Range;
        severity: number;
        message: string;
      }>
    | undefined;
}
interface SlangModule {
  createLanguageServer(): LanguageServer | null;
  FS: { writeFile(path: string, data: string): void };
  TextEditList: new () => {
    push_back(edit: { range: Range; text: string }): void;
    delete(): void;
  };
}

const list = <T>(l: EmbindList<T> | undefined): T[] => {
  const out: T[] = [];
  for (let i = 0; l && i < l.size(); i++) {
    out.push(l.get(i)!);
  }
  l?.delete?.();
  return out;
};

const USER = "file:///user.slang";
let server: Promise<{ ls: LanguageServer; slang: SlangModule }> | undefined;
/** The user's document as the server last had it. */
let current = "";

/**
 * As Slang's own playground drives it (shader-slang/slang-playground):
 * documents live in the build's file system too, where the server loads
 * modules from (`getDiagnostics` reads `/user.slang` there: without it
 * there are none), and edits arrive as `didChangeTextDocument`.
 */
async function start(
  url: string,
  cesium: string,
): Promise<{ ls: LanguageServer; slang: SlangModule }> {
  const factory = (await import(/* @vite-ignore */ url))
    .default as () => Promise<SlangModule>;
  const slang = await factory();
  // `import cesium;` finds the module beside the user's file.
  slang.FS.writeFile("/cesium.slang", cesium);
  slang.FS.writeFile("/user.slang", "");
  const ls = slang.createLanguageServer();
  if (!ls) {
    throw new Error("Slang: no language server in this build.");
  }
  ls.didOpenTextDocument(USER, "");
  ls.didOpenTextDocument("file:///cesium.slang", cesium);
  return { ls, slang };
}

/** Where `text` ends, as an LSP position. */
function end(text: string): Position {
  const lines = text.split("\n");
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

self.onmessage = async (
  event: MessageEvent<{
    id: number;
    op:
      | "start"
      | "text"
      | "diagnostics"
      | "completion"
      | "hover"
      | "signature"
      | "definition";
    url?: string;
    cesium?: string;
    text?: string;
    position?: Position;
    trigger?: string;
  }>,
) => {
  const { id, op } = event.data;
  try {
    if (op === "start") {
      server = start(event.data.url!, event.data.cesium!);
      await server;
      self.postMessage({ id, result: true });
      return;
    }
    const { ls, slang } = await server!;
    let result: unknown;
    switch (op) {
      case "text": {
        // The whole document each time (small shaders): one edit replacing
        // all of it, and the file the server loads modules from.
        const text = event.data.text!;
        if (text !== current) {
          slang.FS.writeFile("/user.slang", text);
          const edits = new slang.TextEditList();
          edits.push_back({
            range: { start: { line: 0, character: 0 }, end: end(current) },
            text,
          });
          ls.didChangeTextDocument(USER, edits);
          edits.delete();
          current = text;
        }
        result = true;
        break;
      }
      case "diagnostics":
        result = list(ls.getDiagnostics(USER)).map((d) => ({
          range: d.range,
          severity: d.severity,
          message: d.message,
          code: d.code,
        }));
        break;
      case "completion":
        result = list(
          ls.completion(USER, event.data.position!, {
            // 1: invoked, 2: by a trigger character.
            triggerKind: event.data.trigger ? 2 : 1,
            triggerCharacter: event.data.trigger ?? "",
          }),
        ).map((c) => ({
          label: c.label,
          kind: c.kind,
          detail: c.detail,
          documentation: c.documentation?.value,
        }));
        break;
      case "hover": {
        const h = ls.hover(USER, event.data.position!);
        result = h ? { value: h.contents.value, range: h.range } : undefined;
        break;
      }
      case "definition":
        result = list(ls.gotoDefinition(USER, event.data.position!)).map(
          (l) => ({ uri: l.uri, range: l.range }),
        );
        break;
      case "signature": {
        const s = ls.signatureHelp(USER, event.data.position!);
        if (s) {
          const signatures = list(s.signatures).map((g) => ({
            label: g.label,
            documentation: g.documentation?.value,
            parameters: list(g.parameters).map((p) => p.label),
          }));
          result = {
            signatures,
            activeSignature: s.activeSignature,
            activeParameter: s.activeParameter,
          };
        }
        break;
      }
    }
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
