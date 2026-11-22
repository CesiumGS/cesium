import {
  autocompletion,
  type Completion as CmCompletion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import {
  forceLinting,
  lintGutter,
  linter,
  type Diagnostic as CmDiagnostic,
} from "@codemirror/lint";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { oneDark, oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { highlightCode } from "@lezer/highlight";
import {
  EditorView,
  hoverTooltip,
  keymap,
  showTooltip,
  type Tooltip,
} from "@codemirror/view";
import { basicSetup } from "codemirror";
import type {
  Diagnostic,
  Position,
  SlangLanguageServer,
} from "./languageServer.ts";
import { slang } from "./slangLanguage.ts";

/**
 * The playground's code editor: CodeMirror 6 (what Shadertoy's editor
 * builds on, version 5 there) with Slang highlighting (slangLanguage.ts)
 * and the Slang language server (languageServer.ts): diagnostics as you
 * type, completion, hover and signature help. Compile errors from the
 * compiler (`setCompileErrors`) show as diagnostics too.
 */
export interface SlangEditor {
  readonly view: EditorView;
  text(): string;
  setText(text: string): void;
  /**
   * The compiler's errors (Slang's output, parsed for `/user.slang` lines),
   * marked in the editor; returned by line, for a list beside it.
   */
  setCompileErrors(
    message: string | undefined,
    /** The text that was compiled (default: the document now). */
    source?: string,
  ): Array<{ line: number; message: string }>;
  /** Moves the cursor to a line (from 1) and scrolls it into view. */
  goTo(line: number): void;
  destroy(): void;
}

/** LSP CompletionItemKind → CodeMirror's completion type (its icon). */
const KINDS: Record<number, string> = {
  2: "method",
  3: "function",
  4: "function",
  5: "property",
  6: "variable",
  7: "class",
  8: "interface",
  9: "namespace",
  10: "property",
  13: "enum",
  14: "keyword",
  20: "enum",
  21: "constant",
  22: "class",
  25: "type",
};

export function createSlangEditor(
  parent: HTMLElement,
  options: {
    text: string;
    server: SlangLanguageServer | undefined;
    onChange: (text: string) => void;
    /** Mod-Enter / Mod-S: compile now. */
    onCompile: () => void;
    /** Show the contract (`import cesium;`) at a line, from 1. */
    onShowContract?: (line: number) => void;
  },
): SlangEditor {
  const { server } = options;
  /**
   * The compiler's last errors, by line and column (from 1), and the text
   * they are about: shown only while the document is that text, since an
   * edit moves lines under them (the next compile reports again).
   */
  let compileErrors: Array<{ line: number; column: number; message: string }> =
    [];
  let compiledText: string | undefined;
  // Tells the linter the compiler's errors changed (it otherwise reruns
  // only on edits; `forceLinting` runs only a lint already pending).
  const compileErrorsChanged = StateEffect.define<null>();

  const toPos = (state: EditorState, offset: number): Position => {
    const line = state.doc.lineAt(offset);
    return { line: line.number - 1, character: offset - line.from };
  };
  const toOffset = (state: EditorState, p: Position): number => {
    const line = state.doc.line(
      Math.min(Math.max(p.line + 1, 1), state.doc.lines),
    );
    return Math.min(line.from + p.character, line.to);
  };
  const severity = (s: number): CmDiagnostic["severity"] =>
    s === 1 ? "error" : s === 2 ? "warning" : "info";

  // Diagnostics: the language server's as you type, and the compiler's
  // after each compile where it found something the server didn't.
  const lint = linter(
    async (view) => {
      const state = view.state;
      let fromServer: CmDiagnostic[] = [];
      if (server) {
        try {
          await server.setText(state.doc.toString());
          fromServer = (await server.diagnostics()).map((d: Diagnostic) => {
            const from = toOffset(state, d.range.start);
            const to = Math.max(toOffset(state, d.range.end), from);
            return {
              from,
              to,
              severity: severity(d.severity),
              message: d.message,
              source: "Slang",
            };
          });
        } catch {
          // The server unavailable: the compiler's errors still show.
        }
      }
      const lines = new Set(
        fromServer.map((d) => state.doc.lineAt(d.from).number),
      );
      const extra: CmDiagnostic[] =
        compiledText === state.doc.toString()
          ? compileErrors
              .filter((e) => e.line <= state.doc.lines && !lines.has(e.line))
              .map((e) => {
                const at = state.doc.line(e.line);
                return {
                  from: Math.min(at.from + e.column - 1, at.to),
                  to: at.to,
                  severity: "error",
                  message: e.message,
                  source: "slangc",
                };
              })
          : [];
      return [...fromServer, ...extra];
    },
    {
      delay: 250,
      needsRefresh: (update) =>
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(compileErrorsChanged)),
        ),
    },
  );

  // Completion from the server, after a word, `.` or `::`.
  const complete = async (context: CompletionContext) => {
    if (!server) {
      return null;
    }
    const word = context.matchBefore(/[\w]*/);
    const before = context.state.sliceDoc(
      Math.max(0, context.pos - 1),
      context.pos,
    );
    const trigger = before === "." ? "." : before === ":" ? ":" : undefined;
    if (!context.explicit && !trigger && (!word || word.from === word.to)) {
      return null;
    }
    // The worker answers in order: no need to wait for the text first.
    void server.setText(context.state.doc.toString());
    const items = await server.completion(
      toPos(context.state, context.pos),
      trigger,
    );
    if (context.aborted) {
      return null;
    }
    return {
      from: word ? word.from : context.pos,
      options: items.map((c): CmCompletion => ({
        label: c.label,
        type: KINDS[c.kind] ?? "text",
        ...(c.detail ? { detail: c.detail } : {}),
        ...(c.documentation ? { info: c.documentation } : {}),
      })),
      validFor: /^\w*$/,
    };
  };

  // Hover: the server's markdown, shown as text.
  const hover = hoverTooltip(async (view, pos) => {
    if (!server) {
      return null;
    }
    const result = await server.hover(toPos(view.state, pos));
    if (!result?.value) {
      return null;
    }
    return {
      pos: toOffset(view.state, result.range.start),
      end: toOffset(view.state, result.range.end),
      above: true,
      create: () => ({ dom: hoverDom(result.value) }),
    };
  });

  // The server's hover markdown: a fenced signature, the doc comment, and
  // "Defined in <file>(<line>)". As in VS Code, the hover is the signature
  // (highlighted) and its docs; where it's defined is go to definition's
  // (Mod-click, F12). Only the contract's symbols say where they're from,
  // with a link into the Contract reference.
  const hoverDom = (markdown: string): HTMLElement => {
    const dom = document.createElement("div");
    dom.className = "slang-hover";
    const code = /```\w*\n([\s\S]*?)```/.exec(markdown);
    let rest = code ? markdown.replace(code[0], "") : markdown;
    const defined = /Defined in ([^\s(]+)\((\d+)\)/.exec(rest);
    rest = (defined ? rest.replace(defined[0], "") : rest).trim();
    if (code) {
      dom.append(highlighted((code[1] ?? "").trim(), "slang-hover-signature"));
    }
    if (rest) {
      dom.append(
        Object.assign(document.createElement("div"), {
          className: "slang-hover-doc",
          textContent: rest,
        }),
      );
    }
    if (defined && /(^|\/)cesium\.slang$/.test(defined[1] ?? "")) {
      const line = Number(defined[2]);
      const where = Object.assign(document.createElement("div"), {
        className: "slang-hover-where",
        textContent: "From import cesium · ",
      });
      const link = Object.assign(document.createElement("a"), {
        href: "#",
        textContent: "show in the contract",
      });
      link.onclick = (e) => {
        e.preventDefault();
        options.onShowContract?.(line);
      };
      where.append(link);
      dom.append(where);
    }
    return dom;
  };

  // Go to definition: Mod-click or F12. In the user's shader, the cursor
  // moves there; in the contract, the Contract reference opens at it.
  const goToDefinition = async (view: EditorView, pos: number) => {
    if (!server) {
      return;
    }
    void server.setText(view.state.doc.toString());
    const [found] = await server.definition(toPos(view.state, pos));
    if (found?.file === "user") {
      const at = toOffset(view.state, found.range.start);
      view.dispatch({
        selection: { anchor: at },
        effects: EditorView.scrollIntoView(at, { y: "center" }),
      });
      view.focus();
    } else if (found?.file === "cesium") {
      options.onShowContract?.(found.range.start.line + 1);
    }
  };
  const definitions = [
    keymap.of([
      {
        key: "F12",
        run: (view) => {
          void goToDefinition(view, view.state.selection.main.head);
          return true;
        },
      },
    ]),
    EditorView.domEventHandlers({
      mousedown: (event, view) => {
        if (!(event.metaKey || event.ctrlKey) || event.button !== 0) {
          return false;
        }
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) {
          return false;
        }
        event.preventDefault();
        void goToDefinition(view, pos);
        return true;
      },
    }),
  ];

  // Signature help: after `(` or `,`, the call's signature with the
  // current parameter in bold, until `)` or the cursor leaves.
  const setSignature = StateEffect.define<Tooltip | null>();
  const signatureField = StateField.define<Tooltip | null>({
    create: () => null,
    update(value, tr) {
      for (const e of tr.effects) {
        if (e.is(setSignature)) {
          return e.value;
        }
      }
      return tr.docChanged || tr.selection
        ? value && tr.docChanged
          ? value
          : null
        : value;
    },
    provide: (f) => showTooltip.from(f),
  });
  const signatureHelp = EditorView.updateListener.of((update) => {
    if (!server || !update.docChanged) {
      return;
    }
    const state = update.state;
    const pos = state.selection.main.head;
    const typed = state.sliceDoc(Math.max(0, pos - 1), pos);
    if (typed === ")") {
      update.view.dispatch({ effects: setSignature.of(null) });
      return;
    }
    if (typed !== "(" && typed !== ",") {
      return;
    }
    void server
      .setText(state.doc.toString())
      .then(() => server.signature(toPos(state, pos)))
      .then((help) => {
        const signature = help?.signatures[help.activeSignature];
        if (!signature) {
          update.view.dispatch({ effects: setSignature.of(null) });
          return;
        }
        const [a, b] = signature.parameters[help.activeParameter] ?? [0, 0];
        update.view.dispatch({
          effects: setSignature.of({
            pos,
            above: true,
            create: () => {
              const dom = document.createElement("div");
              dom.className = "slang-hover";
              const label = signature.label;
              dom.append(
                label.slice(0, a),
                Object.assign(document.createElement("b"), {
                  textContent: label.slice(a, b),
                }),
                label.slice(b),
              );
              return { dom };
            },
          }),
        });
      });
  });

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.text,
      extensions: [
        basicSetup,
        slang,
        indentUnit.of("  "),
        EditorState.tabSize.of(2),
        oneDark,
        keymap.of([
          indentWithTab,
          {
            key: "Mod-Enter",
            run: () => {
              options.onCompile();
              return true;
            },
          },
          {
            key: "Mod-s",
            preventDefault: true,
            run: () => {
              options.onCompile();
              return true;
            },
          },
        ]),
        slang.data.of({ autocomplete: complete }),
        autocompletion({ activateOnTyping: true }),
        lint,
        lintGutter(),
        hover,
        signatureField,
        signatureHelp,
        definitions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            options.onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px" },
          ".cm-scroller": {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: "1.5",
          },
          ".slang-hover": {
            padding: "4px 8px",
            maxWidth: "480px",
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "11px",
          },
          ".slang-hover-signature": { whiteSpace: "pre-wrap" },
          ".slang-hover-doc": {
            marginTop: "4px",
            fontFamily: "system-ui, sans-serif",
            whiteSpace: "pre-wrap",
          },
          ".slang-hover-where": {
            marginTop: "4px",
            opacity: "0.7",
            fontFamily: "system-ui, sans-serif",
          },
          ".slang-hover-where a": { color: "#61afef" },
        }),
      ],
    }),
  });
  if (server) {
    void server.ready
      .then(() => server.setText(view.state.doc.toString()))
      .then(() => forceLinting(view));
  }

  return {
    view,
    text: () => view.state.doc.toString(),
    setText(text) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    },
    setCompileErrors(message, source) {
      compileErrors = [];
      compiledText = source ?? view.state.doc.toString();
      const byLine: Array<{ line: number; message: string }> = [];
      const state = view.state;
      for (const m of (message ?? "").matchAll(
        /\/user\.slang:(\d+):(\d+)[^\n]*\n?(?:[\s\S]*?\^+\s*([^\n]*))?/g,
      )) {
        const line = Math.min(Math.max(Number(m[1]), 1), state.doc.lines);
        const text = (m[3] || message || "").trim();
        compileErrors.push({
          line,
          column: Math.max(Number(m[2]), 1),
          message: text,
        });
        byLine.push({ line, message: text });
      }
      view.dispatch({ effects: compileErrorsChanged.of(null) });
      forceLinting(view);
      return byLine;
    },
    goTo(line) {
      const at = view.state.doc.line(
        Math.min(Math.max(line, 1), view.state.doc.lines),
      );
      view.dispatch({
        selection: { anchor: at.from, head: at.to },
        effects: EditorView.scrollIntoView(at.from, { y: "center" }),
      });
      view.focus();
    },
    destroy() {
      view.destroy();
    },
  };
}

/** `code` highlighted as Slang, in the editor's colors (One Dark). */
function highlighted(code: string, className: string): HTMLElement {
  const dom = document.createElement("div");
  dom.className = className;
  highlightCode(
    code,
    slang.parser.parse(code),
    oneDarkHighlightStyle,
    (text, classes) => {
      dom.append(
        classes
          ? Object.assign(document.createElement("span"), {
              className: classes,
              textContent: text,
            })
          : text,
      );
    },
    () => dom.append("\n"),
  );
  return dom;
}

/**
 * The contract reference: the `cesium` module the user's shader imports,
 * read-only and highlighted (Shadertoy's "Shader Inputs", for a module).
 * `show(line)` scrolls to a line and selects it.
 */
export function createContractView(
  parent: HTMLElement,
  text: string,
): { show(line: number): void; destroy(): void } {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [
        basicSetup,
        slang,
        oneDark,
        EditorState.readOnly.of(true),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px" },
          ".cm-scroller": {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: "1.5",
          },
        }),
      ],
    }),
  });
  return {
    show(line) {
      const at = view.state.doc.line(
        Math.min(Math.max(line, 1), view.state.doc.lines),
      );
      view.dispatch({
        selection: { anchor: at.from, head: at.to },
        effects: EditorView.scrollIntoView(at.from, {
          y: "start",
          yMargin: 24,
        }),
      });
    },
    destroy() {
      view.destroy();
    },
  };
}
