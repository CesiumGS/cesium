import { Editor, Monaco, OnChange } from "@monaco-editor/react";
import { editor, KeyCode, KeyMod, languages, Range } from "monaco-editor";
import { RefObject, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@itwin/itwinui-react/bricks";
import * as prettier from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as htmlPlugin from "prettier/plugins/html";

const TYPES_URL = `${__PAGE_BASE_URL__}Source/Cesium.d.ts`;
const SANDCASTLE_TYPES_URL = `templates/Sandcastle.d.ts`;

export type SandcastleEditorRef = {
  formatCode(): void;
};

function SandcastleEditor({
  darkTheme,
  js,
  html,
  onJsChange,
  onHtmlChange,
  onRun: onRunSandcastle,
  ref,
}: {
  darkTheme: boolean;
  js: string;
  html: string;
  onJsChange: OnChange;
  onHtmlChange: OnChange;
  onRun: () => void;
  ref: RefObject<SandcastleEditorRef | null>;
}) {
  const [activeTab, setActiveTab] = useState<"js" | "html">("js");

  const internalEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  useImperativeHandle(ref, () => {
    return {
      formatCode() {
        internalEditorRef.current
          ?.getAction("editor.action.formatDocument")
          ?.run();
      },
    };
  }, []);

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    internalEditorRef.current = editor;

    monaco.editor.addCommand({
      id: "run-sandcastle",
      run: () => {
        onRunSandcastle();
      },
    });

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

    setSnippets(monaco);
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

  function createDependencyProposals(range: Range): languages.CompletionItem[] {
    // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor)
    return [
      {
        label: "scbutton",
        kind: languages.CompletionItemKind.Function,
        documentation: "Create a Sandcastle button",
        insertText: `Sandcastle.addToolbarButton(\${1:"New Button"}, function () {
    \${0:// your code here}
  });`,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
      },
      {
        label: "sctoggle",
        kind: languages.CompletionItemKind.Function,
        documentation: "Create a Sandcastle toggle button",
        insertText: `let \${2:toggleValue} = \${3:true};
  Sandcastle.addToggleButton(\${1:"Toggle"}, \${2:toggleValue}, function (checked) {
    \${2:toggleValue} = checked;$0
  });`,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
      },
      {
        label: "scmenu",
        kind: languages.CompletionItemKind.Function,
        documentation: "Create a Sandcastle select menu",
        insertText: `const \${1:options} = [
    {
      text: \${2:"Option 1"},
      onselect: function () {
        \${0:// your code here, the first option is always run at load}
      },
    },
  ];
  Sandcastle.addToolbarMenu(\${1:options});`,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
      },
      {
        label: "scmenuitem",
        kind: languages.CompletionItemKind.Function,
        documentation: "Create a Sandcastle select menu item",
        insertText: `{
    text: \${1:"New Option"},
    onselect: function () {
      \${0:// your code here, the first option is always run at load}
    },
  },`,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
      },
    ];
  }

  function setSnippets(monaco: Monaco) {
    monaco.languages.registerCompletionItemProvider("javascript", {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = new Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        );
        return {
          suggestions: createDependencyProposals(range),
        };
      },
    });
  }

  return (
    <div className="editor-container">
      <div className="tabs">
        <Button
          disabled={activeTab === "js"}
          onClick={() => setActiveTab("js")}
        >
          Javascript
        </Button>
        <Button
          disabled={activeTab === "html"}
          onClick={() => setActiveTab("html")}
        >
          HTML/CSS
        </Button>
      </div>
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
          minimap: { size: "fill" },
          placeholder: "// Select a demo from the gallery to load.",
          renderWhitespace: "trailing",
          tabSize: 2,
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
  );
}

export default SandcastleEditor;
