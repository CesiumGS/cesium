import { Editor, Monaco, OnChange, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
  RefObject,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as prettier from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as htmlPlugin from "prettier/plugins/html";
import { DropdownMenu, Tabs } from "@stratakit/structures";
import "./SandcastleEditor.css";
import { Button, Kbd, Tooltip } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { play, textAlignLeft } from "./icons";
import { setupSandcastleSnippets } from "./setupSandcastleSnippets";
import { InlineChangeWidget } from "./InlineChangeWidget";
import type { InlineChange, DiffBlock } from "./AI/types";
import { DiffApplier } from "./AI/DiffApplier";

import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { availableFonts, SettingsContext } from "./SettingsContext";

// this setup is needed for Vite to properly build/load the workers
// see the readme https://github.com/suren-atoyan/monaco-react#loader-config
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new JsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new CssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new HtmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new TsWorker();
    }
    return new EditorWorker();
  },
};

// This ensures we bundle monaco and load locally instead of from the CDN. This allows
// Sandcastle to work fully "offline" on a local network or in an environment without
// open network access
loader.config({ monaco });

const TYPES_URL = `${__PAGE_BASE_URL__}Source/Cesium.d.ts`;
const SANDCASTLE_TYPES_URL = `templates/Sandcastle.d.ts`;

export type SandcastleEditorRef = {
  formatCode(): void;
  applyAiEdit(code?: string, language?: "javascript" | "html"): void;
  queueInlineChange(
    diff: import("./AI/types").DiffBlock,
    language: "javascript" | "html",
    startLine: number,
    endLine: number,
  ): void;
  clearInlineChanges(): void;
  getInlineChanges(): InlineChange[];
  acceptInlineChange(changeId: string): void;
  rejectInlineChange(changeId: string): void;
};

function SandcastleEditor({
  ref,
  darkTheme,
  js,
  html,
  onJsChange,
  onHtmlChange,
  onRun: onRunSandcastle,
  setJs,
  onQueueInlineChange,
}: {
  ref?: RefObject<SandcastleEditorRef | null>;
  darkTheme: boolean;
  js: string;
  html: string;
  onJsChange: OnChange;
  onHtmlChange: OnChange;
  onRun: () => void;
  setJs: (newCode: string) => void;
  onQueueInlineChange?: (changes: InlineChange[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"js" | "html">("js");
  const internalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Inline change management
  const [inlineChanges, setInlineChanges] = useState<InlineChange[]>([]);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const decorationsRef = useRef<string[]>([]);

  const {
    settings: { fontFamily, fontSize, fontLigatures },
  } = useContext(SettingsContext);
  const documentRef = useRef(document);
  useEffect(() => {
    const cssName = availableFonts[fontFamily]?.cssValue ?? "Droid Sans Mono";
    const fontFace = [...documentRef.current.fonts].find(
      (font) => font.family === cssName && font.weight === "400",
    );
    if (fontFace?.status !== "loaded") {
      // Monaco needs to check the size of the font for things like cursor position
      // and variable highlighting. If it does this check before the font has loaded
      // it will get the wrong size and may be horribly offset especially with ligatures
      // https://github.com/microsoft/monaco-editor/issues/392
      documentRef.current.fonts.load(`1rem ${cssName}`).then(() => {
        internalEditorRef.current?.updateOptions({
          fontFamily: cssName,
        });
        monaco.editor.remeasureFonts();
      });
    } else {
      internalEditorRef.current?.updateOptions({
        fontFamily: cssName,
      });
    }
  }, [fontFamily]);
  useEffect(() => {
    internalEditorRef.current?.updateOptions({
      fontLigatures: fontLigatures,
    });
  }, [fontLigatures]);
  useEffect(() => {
    internalEditorRef.current?.updateOptions({
      fontSize: fontSize,
    });
  }, [fontSize]);

  // Update Monaco decorations when inline changes change
  useEffect(() => {
    const editor = internalEditorRef.current;
    if (!editor || inlineChanges.length === 0) {
      // Clear decorations if no changes
      if (decorationsRef.current.length > 0) {
        decorationsRef.current =
          editor?.deltaDecorations(decorationsRef.current, []) || [];
      }
      return;
    }

    // Filter changes for the current active tab
    const relevantChanges = inlineChanges.filter((change) => {
      return (
        (activeTab === "js" && change.language === "javascript") ||
        (activeTab === "html" && change.language === "html")
      );
    });

    // Create decorations for each change
    const newDecorations: monaco.editor.IModelDeltaDecoration[] =
      relevantChanges.map((change) => ({
        range: new monaco.Range(change.startLine, 1, change.endLine, 1),
        options: {
          isWholeLine: true,
          className: "inline-change-decoration",
          glyphMarginClassName: "inline-change-decoration-glyph",
          linesDecorationsClassName: "inline-change-decoration-glyph",
        },
      }));

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
  }, [inlineChanges, activeTab]);

  function formatEditor() {
    internalEditorRef.current?.getAction("editor.action.formatDocument")?.run();
  }

  // Queue a new inline change from the AI
  const queueInlineChange = (
    diff: DiffBlock,
    language: "javascript" | "html",
    startLine: number,
    endLine: number,
  ) => {
    const newChange: InlineChange = {
      id: crypto.randomUUID(),
      diff,
      language,
      startLine,
      endLine,
      timestamp: Date.now(),
      source: "Copilot",
    };

    setInlineChanges((prev) => [...prev, newChange]);

    // Switch to the appropriate tab
    if (language === "javascript" && activeTab !== "js") {
      setActiveTab("js");
    } else if (language === "html" && activeTab !== "html") {
      setActiveTab("html");
    }
  };

  // Accept a change and apply it
  const acceptInlineChange = (changeId: string) => {
    const change = inlineChanges.find((c) => c.id === changeId);
    if (!change) {
      return;
    }

    // Apply the diff
    const applier = new DiffApplier();
    const sourceCode = change.language === "javascript" ? js : html;
    const result = applier.applyDiffs(sourceCode, [change.diff], {
      strict: false,
    });

    if (result.success && result.modifiedCode) {
      if (change.language === "javascript") {
        setJs(result.modifiedCode);
      } else {
        onHtmlChange(
          result.modifiedCode,
          {} as monaco.editor.IModelContentChangedEvent,
        );
      }
    }

    // Remove this change from the queue
    setInlineChanges((prev) => prev.filter((c) => c.id !== changeId));

    // Adjust current index if needed
    setCurrentChangeIndex((prevIndex) => {
      const newLength = inlineChanges.length - 1;
      if (newLength === 0) {
        return 0;
      }
      return Math.min(prevIndex, newLength - 1);
    });
  };

  // Reject a change and remove it
  const rejectInlineChange = (changeId: string) => {
    setInlineChanges((prev) => prev.filter((c) => c.id !== changeId));

    // Adjust current index if needed
    setCurrentChangeIndex((prevIndex) => {
      const newLength = inlineChanges.length - 1;
      if (newLength === 0) {
        return 0;
      }
      return Math.min(prevIndex, newLength - 1);
    });
  };

  // Clear all inline changes
  const clearInlineChanges = () => {
    setInlineChanges([]);
    setCurrentChangeIndex(0);
  };

  // Notify parent component when inline changes are queued
  useEffect(() => {
    onQueueInlineChange?.(inlineChanges);
  }, [inlineChanges, onQueueInlineChange]);

  useImperativeHandle(ref, () => {
    return {
      formatCode() {
        formatEditor();
      },
      applyAiEdit(code?: string, language?: "javascript" | "html") {
        if (!code) {
          return;
        }

        if (language === "javascript") {
          // Replace entire JS code
          setJs(code);
          // Switch to JS tab if not already there
          setActiveTab("js");
        } else if (language === "html") {
          // For now, we'll just replace the entire HTML
          // In the future, could be more sophisticated with partial updates
          onHtmlChange(code, {} as monaco.editor.IModelContentChangedEvent);
          setActiveTab("html");
        }
      },
      queueInlineChange,
      clearInlineChanges,
      getInlineChanges: () => inlineChanges,
      acceptInlineChange,
      rejectInlineChange,
    };
  }, [
    setJs,
    onHtmlChange,
    setActiveTab,
    inlineChanges,
    queueInlineChange,
    acceptInlineChange,
    rejectInlineChange,
  ]);

  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    internalEditorRef.current = editor;
    setEditorInstance(editor);

    // Add run sandcastle command
    monaco.editor.addCommand({
      id: "run-sandcastle",
      run: () => {
        onRunSandcastle();
      },
    });

    // Add inline change commands
    monaco.editor.addCommand({
      id: "accept-inline-change",
      run: () => {
        if (inlineChanges.length > 0 && inlineChanges[currentChangeIndex]) {
          acceptInlineChange(inlineChanges[currentChangeIndex].id);
        }
      },
    });

    monaco.editor.addCommand({
      id: "reject-inline-change",
      run: () => {
        if (inlineChanges.length > 0 && inlineChanges[currentChangeIndex]) {
          rejectInlineChange(inlineChanges[currentChangeIndex].id);
        }
      },
    });

    const { KeyCode, KeyMod } = monaco;

    monaco.editor.addKeybindingRules([
      // Remove some default keybindings that get in the way
      // https://github.com/microsoft/monaco-editor/issues/102
      // disable show command center
      { keybinding: KeyCode.F1, command: null },
      // disable show error command
      { keybinding: KeyCode.F8, command: null },
      // disable toggle debugger breakpoint
      { keybinding: KeyCode.F9, command: null },
      // disable go to definition to allow opening dev console
      { keybinding: KeyCode.F12, command: null },
    ]);

    monaco.editor.addKeybindingRules([
      // Set up our custom run command
      { keybinding: KeyCode.F8, command: "run-sandcastle" },
      { keybinding: KeyMod.CtrlCmd | KeyCode.KeyS, command: "run-sandcastle" },
      { keybinding: KeyMod.Alt | KeyCode.Enter, command: "run-sandcastle" },
      // Inline change keyboard shortcuts
      {
        keybinding: KeyMod.CtrlCmd | KeyCode.KeyY,
        command: "accept-inline-change",
      },
      {
        keybinding: KeyMod.CtrlCmd | KeyCode.KeyN,
        command: "reject-inline-change",
      },
    ]);
  }

  function handleEditorWillMount(monaco: Monaco) {
    // here is the monaco instance
    // do something before editor is mounted

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
    });

    monaco.languages.registerDocumentFormattingEditProvider("javascript", {
      async provideDocumentFormattingEdits(model) {
        const formatted = await prettier.format(model.getValue(), {
          parser: "babel",
          // need to force type because the estree plugin has no type https://github.com/prettier/prettier/issues/16501
          plugins: [babelPlugin, estreePlugin as prettier.Plugin],
        });

        return [{ range: model.getFullModelRange(), text: formatted }];
      },
    });

    monaco.languages.html.htmlDefaults.setModeConfiguration({
      ...monaco.languages.html.htmlDefaults,
      // we have to disable the defaults for html for our custom prettier formatter to be run
      documentFormattingEdits: false,
      documentRangeFormattingEdits: false,
    });
    monaco.languages.registerDocumentFormattingEditProvider("html", {
      async provideDocumentFormattingEdits(model) {
        const formatted = await prettier.format(model.getValue(), {
          parser: "html",
          plugins: [htmlPlugin],
        });

        return [{ range: model.getFullModelRange(), text: formatted }];
      },
    });

    setupSandcastleSnippets(monaco);
    setTypes(monaco);
  }

  async function setTypes(monaco: Monaco) {
    // https://microsoft.github.io/monaco-editor/playground.html?source=v0.52.2#example-extending-language-services-configure-javascript-defaults

    const cesiumTypes = await (await fetch(TYPES_URL)).text();
    // define a "global" variable so types work even with out the import statement
    const cesiumTypesWithGlobal = `${cesiumTypes}\nvar Cesium: typeof import('cesium');`;
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      cesiumTypesWithGlobal,
      "ts:cesium.d.ts",
    );

    const sandcastleTypes = await (await fetch(SANDCASTLE_TYPES_URL)).text();
    // surround in a module so the import statement works nicely
    // also define a "global" so types show even if you don't have the import
    const sandcastleModuleTypes = `declare module 'Sandcastle' {
        ${sandcastleTypes}
      }
        var Sandcastle: typeof import('Sandcastle').default;`;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      sandcastleModuleTypes,
      "ts:sandcastle.d.ts",
    );
  }

  function nextHighestVariableName(code: string, name: string) {
    const otherDeclarations = [
      ...code.matchAll(new RegExp(`(const|let|var)\\s+${name}\\d*\\s=`, "g")),
    ].length;
    const variableName = `${name}${otherDeclarations + 1}`;
    return variableName;
  }

  function appendCode(snippet: string) {
    let spacerNewline = "\n";
    if (js.endsWith("\n")) {
      spacerNewline = "";
    }
    const newCode = `${js}${spacerNewline}\n${snippet.trim()}\n`;
    setJs(newCode);
  }

  function addButton() {
    appendCode(`
Sandcastle.addToolbarButton("New Button", function () {
  // your code here
});`);
  }

  function addToggle() {
    const variableName = nextHighestVariableName(js, "toggleValue");

    appendCode(`
let ${variableName} = true;
Sandcastle.addToggleButton("Toggle", ${variableName}, function (checked) {
  ${variableName} = checked;
});`);
  }

  function addMenu() {
    const variableName = nextHighestVariableName(js, "options");

    appendCode(`
const ${variableName} = [
  {
    text: "Option 1",
    onselect: function () {
      // your code here, the first option is always run at load
    },
  },
];
Sandcastle.addToolbarMenu(${variableName});`);
  }

  // Filter changes for current tab
  const currentTabChanges = inlineChanges.filter((change) => {
    return (
      (activeTab === "js" && change.language === "javascript") ||
      (activeTab === "html" && change.language === "html")
    );
  });

  return (
    <div className="editor-container">
      <InlineChangeWidget
        editor={editorInstance}
        changes={currentTabChanges}
        currentChangeIndex={currentChangeIndex}
        onNavigate={setCurrentChangeIndex}
        onAccept={acceptInlineChange}
        onReject={rejectInlineChange}
      />
      <div className="header">
        <Tabs.Root>
          <Tabs.TabList tone="accent">
            <Tabs.Tab id="js" onClick={() => setActiveTab("js")}>
              Javascript
            </Tabs.Tab>
            <Tabs.Tab id="html" onClick={() => setActiveTab("html")}>
              HTML/CSS
            </Tabs.Tab>
          </Tabs.TabList>
        </Tabs.Root>
        <div className="flex-spacer"></div>
        <div className="editor-actions">
          <Tooltip content="Format" placement="bottom">
            <Button
              onClick={() => formatEditor()}
              variant="ghost"
              className="icon-button"
            >
              <Icon href={textAlignLeft} />
            </Button>
          </Tooltip>
          <DropdownMenu.Root>
            <DropdownMenu.Button disabled={activeTab !== "js"}>
              Insert
            </DropdownMenu.Button>
            <DropdownMenu.Content>
              <DropdownMenu.Item label="Button" onClick={() => addButton()} />
              <DropdownMenu.Item label="Toggle" onClick={() => addToggle()} />
              <DropdownMenu.Item label="Menu" onClick={() => addMenu()} />
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <Tooltip content="Run Sandcastle" placement="bottom">
            <Button tone="accent" onClick={() => onRunSandcastle()}>
              <Icon href={play} /> Run <Kbd variant="solid">F8</Kbd>
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="editor-wrapper">
        <Editor
          theme={darkTheme ? "vs-dark" : "light"}
          options={{
            automaticLayout: true,
            bracketPairColorization: {
              enabled: false,
            },
            guides: {
              bracketPairs: "active",
            },
            minimap: {
              // This can lag pretty bad with the resizing panel, disable instead
              enabled: false,
            },
            placeholder: "// Select a demo from the gallery to load.",
            renderWhitespace: "trailing",
            tabSize: 2,
            fontFamily:
              availableFonts[fontFamily]?.cssValue ?? "Droid Sans Mono",
            fontSize: fontSize,
            fontLigatures: fontLigatures,
          }}
          path={activeTab === "js" ? "script.js" : "index.html"}
          language={activeTab === "js" ? "javascript" : "html"}
          value={activeTab === "js" ? js : html}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          onChange={(...args) => {
            if (activeTab === "js") {
              onJsChange(...args);
            } else {
              onHtmlChange(...args);
            }
          }}
        />
      </div>
    </div>
  );
}

export default SandcastleEditor;
