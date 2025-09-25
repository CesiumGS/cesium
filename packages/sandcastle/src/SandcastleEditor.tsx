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

function fontLigaturesValue(fontLigaturesBool: boolean): boolean | string {
  // Due to what seems like a bug in Monaco on some systems like Windows + Chrome
  // the text highlighting and selection is offset from the actual values.
  // This issue thread shows that setting the ligatures to an empty string resolves
  // the issue. https://github.com/microsoft/monaco-editor/issues/3217#issuecomment-1511978166
  // Testing has shown that `true` renders fine however.
  return fontLigaturesBool ? fontLigaturesBool : "";
}

export type SandcastleEditorRef = {
  formatCode(): void;
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
}: {
  ref?: RefObject<SandcastleEditorRef | null>;
  darkTheme: boolean;
  js: string;
  html: string;
  onJsChange: OnChange;
  onHtmlChange: OnChange;
  onRun: () => void;
  setJs: (newCode: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"js" | "html">("js");
  const internalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);

  const {
    settings: { fontFamily, fontSize, fontLigatures },
  } = useContext(SettingsContext);
  useEffect(() => {
    internalEditorRef.current?.updateOptions({
      fontFamily: availableFonts[fontFamily]?.cssValue ?? "Droid Sans Mono",
    });
  }, [fontFamily]);
  useEffect(() => {
    internalEditorRef.current?.updateOptions({
      fontLigatures: fontLigaturesValue(fontLigatures),
    });
  }, [fontLigatures]);
  useEffect(() => {
    internalEditorRef.current?.updateOptions({
      fontSize: fontSize,
    });
  }, [fontSize]);

  useImperativeHandle(ref, () => {
    return {
      formatCode() {
        formatEditor();
      },
    };
  }, []);

  function formatEditor() {
    internalEditorRef.current?.getAction("editor.action.formatDocument")?.run();
  }

  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    internalEditorRef.current = editor;

    monaco.editor.addCommand({
      id: "run-sandcastle",
      run: () => {
        onRunSandcastle();
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
    // TODO: remove this!
    // @ts-expect-error just testing
    window.monaco = monaco;
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

  return (
    <div className="editor-container">
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
            fontLigatures: fontLigaturesValue(fontLigatures),
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
