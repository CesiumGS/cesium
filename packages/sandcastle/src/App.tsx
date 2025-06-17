import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as prettier from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as htmlPlugin from "prettier/plugins/html";
import "./App.css";

import Editor, { Monaco } from "@monaco-editor/react";
import { editor, KeyCode } from "monaco-editor";
import Gallery, { GalleryItem } from "./Gallery.js";
import { Button, Root } from "@itwin/itwinui-react/bricks";
import { decodeBase64Data, makeCompressedBase64String } from "./Helpers.ts";
import Bucket from "./Bucket.tsx";

const defaultJsCode = `import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
`;
const defaultHtmlCode = `<style>
  @import url(../templates/bucket.css);
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar"></div>
`;

function getBaseUrl() {
  // omits query string and hash
  return `${location.protocol}//${location.host}${location.pathname}`;
}

const TYPES_URL = `${__PAGE_BASE_URL__}Source/Cesium.d.ts`;
const SANDCASTLE_TYPES_URL = `templates/Sandcastle.d.ts`;
const GALLERY_BASE = __GALLERY_BASE_URL__;

function App() {
  const [activeTab, setActiveTab] = useState<"js" | "html">("js");
  const [darkTheme, setDarkTheme] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  type SandcastleAction =
    | { type: "reset" }
    | { type: "setCode"; code: string }
    | { type: "setHtml"; html: string }
    | { type: "runSandcastle" }
    | { type: "setAndRun"; code?: string; html?: string };
  type CodeState = {
    code: string;
    html: string;
    committedCode: string;
    committedHtml: string;
    runNumber: number;
  };

  const initialState: CodeState = {
    code: defaultJsCode,
    html: defaultHtmlCode,
    committedCode: defaultJsCode,
    committedHtml: defaultHtmlCode,
    runNumber: 0,
  };

  const [codeState, dispatch] = useReducer(function reducer(
    state: CodeState,
    action: SandcastleAction,
  ): CodeState {
    switch (action.type) {
      case "reset": {
        return { ...initialState };
      }
      case "setCode": {
        return {
          ...state,
          code: action.code,
        };
      }
      case "setHtml": {
        return {
          ...state,
          html: action.html,
        };
      }
      case "runSandcastle": {
        return {
          ...state,
          committedCode: state.code,
          committedHtml: state.html,
          runNumber: state.runNumber + 1,
        };
      }
      case "setAndRun": {
        return {
          code: action.code ?? state.code,
          html: action.html ?? state.html,
          committedCode: action.code ?? state.code,
          committedHtml: action.html ?? state.html,
          runNumber: state.runNumber + 1,
        };
      }
    }
  }, initialState);

  const [legacyIdMap, setLegacyIdMap] = useState<Record<string, string>>({});
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  function runSandcastle() {
    dispatch({ type: "runSandcastle" });
  }

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    editorRef.current = editor;

    monaco.editor.addCommand({
      id: "run-cesium",
      run: () => {
        dispatch({ type: "runSandcastle" });
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
      // Set up our custom run command
      { keybinding: KeyCode.F8, command: "run-cesium" },
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

    setTypes(monaco);
  }

  function handleChange(value: string = "") {
    if (activeTab === "js") {
      dispatch({ type: "setCode", code: value });
    } else {
      dispatch({ type: "setHtml", html: value });
    }
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

  function highlightLine(lineNumber: number) {
    console.log("would highlight line", lineNumber, "but not implemented yet");
  }

  function formatJs() {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }

  function nextHighestVariableName(code: string, name: string) {
    const otherDeclarations = [
      ...code.matchAll(new RegExp(`(const|let|var)\\s+${name}\\d*\\s=`, "g")),
    ].length;
    const variableName = `${name}${otherDeclarations + 1}`;
    return variableName;
  }

  function appendCode(snippet: string, run = false) {
    let spacerNewline = "\n";
    if (codeState.code.endsWith("\n")) {
      spacerNewline = "";
    }
    const newCode = `${codeState.code}${spacerNewline}\n${snippet.trim()}\n`;
    dispatch({
      type: run ? "setAndRun" : "setCode",
      code: newCode,
    });
  }

  function addButton() {
    appendCode(
      `
Sandcastle.addToolbarButton("New Button", function () {
  // your code here
});`,
      false,
    );
  }

  function addToggle() {
    const variableName = nextHighestVariableName(codeState.code, "toggleValue");

    appendCode(
      `
let ${variableName} = true;
Sandcastle.addToggleButton("Toggle", ${variableName}, function (checked) {
  ${variableName} = checked;
});`,
      false,
    );
  }

  function addMenu() {
    const variableName = nextHighestVariableName(codeState.code, "options");

    appendCode(
      `
const ${variableName} = [
  {
    text: "Option 1",
    onselect: function () {
      // your code here, the first option is always run at load
    },
  },
];
Sandcastle.addToolbarMenu(${variableName});`,
      false,
    );
  }

  function resetSandcastle() {
    dispatch({ type: "reset" });

    window.history.pushState({}, "", getBaseUrl());
  }

  function share() {
    const base64String = makeCompressedBase64String({
      code: codeState.code,
      html: codeState.html,
    });

    const shareUrl = `${getBaseUrl()}#c=${base64String}`;
    window.history.replaceState({}, "", shareUrl);
  }

  function openStandalone() {
    let baseHref = getBaseUrl();
    const pos = baseHref.lastIndexOf("/");
    baseHref = `${baseHref.substring(0, pos)}/gallery/`;

    const base64String = makeCompressedBase64String({
      code: codeState.code,
      html: codeState.html,
      baseHref,
    });

    let url = getBaseUrl();
    url =
      `${url.replace("index.html", "")}standalone.html` + `#c=${base64String}`;

    window.open(url, "_blank");
    window.focus();
  }

  const loadGalleryItem = useCallback(
    async function loadGalleryItem(galleryId: string) {
      const galleryItem = galleryItems.find((item) => item.id === galleryId);
      if (!galleryItem) {
        console.error("Unable to find gallery item with id:", galleryId);
        return;
      }

      const itemBaseUrl = `${GALLERY_BASE}/${galleryItem.id}`;

      const codeReq = fetch(`${itemBaseUrl}/main.js`);
      const htmlReq = fetch(`${itemBaseUrl}/index.html`);

      const code = await (await codeReq).text();
      const html = await (await htmlReq).text();

      dispatch({
        type: "setAndRun",
        code: code,
        html: html,
      });
    },
    [galleryItems],
  );

  useEffect(() => {
    let ignore = false;
    async function fetchGallery() {
      const req = await fetch(`${GALLERY_BASE}/list.json`);
      const resp = await req.json();

      if (!ignore) {
        setGalleryItems(resp.entries);
        setLegacyIdMap(resp.legacyIdMap);
        setGalleryLoaded(true);
      }
    }
    fetchGallery();
    return () => {
      ignore = true;
    };
  }, []);

  const loadFromUrl = useCallback(
    function loadFromUrl() {
      if (galleryLoaded) {
        const searchParams = new URLSearchParams(window.location.search);

        if (window.location.hash.indexOf("#c=") === 0) {
          const base64String = window.location.hash.substr(3);
          const data = decodeBase64Data(base64String);

          dispatch({
            type: "setAndRun",
            code: data.code,
            html: data.html,
          });
        } else if (searchParams.has("src")) {
          const legacyId = searchParams.get("src");
          if (!legacyId) {
            return;
          }
          const galleryId = legacyIdMap[legacyId];
          if (!galleryId) {
            console.warn("Unable to map legacy id to new id");
            return;
          }
          window.history.replaceState(
            {},
            "",
            `${getBaseUrl()}?id=${galleryId}`,
          );
          loadGalleryItem(galleryId);
        } else if (searchParams.has("id")) {
          const galleryId = searchParams.get("id");
          if (!galleryId) {
            return;
          }
          loadGalleryItem(galleryId);
        }
      }
    },
    [galleryLoaded, legacyIdMap, loadGalleryItem],
  );

  useEffect(() => loadFromUrl(), [galleryLoaded, galleryItems, loadFromUrl]);
  useEffect(() => {
    // Listen to browser forward/back navigation and try to load from URL
    // this is necessary because of the pushState used for faster gallery loading
    function pushStateListener() {
      loadFromUrl();
    }
    window.addEventListener("popstate", pushStateListener);
    return () => window.removeEventListener("popstate", pushStateListener);
  }, [loadFromUrl]);

  return (
    <Root colorScheme={darkTheme ? "dark" : "light"} density="dense" id="root">
      <div className="toolbar">
        <Button onClick={() => resetSandcastle()}>New</Button>
        <Button onClick={() => runSandcastle()}>Run (F8)</Button>
        <Button onClick={() => formatJs()}>Format</Button>
        <Button onClick={() => addButton()}>Add button</Button>
        <Button onClick={() => addToggle()}>Add toggle</Button>
        <Button onClick={() => addMenu()}>Add menu</Button>
        <Button onClick={() => share()}>Share</Button>
        <Button onClick={() => openStandalone()}>Standalone</Button>
        <div className="spacer"></div>
        <Button onClick={() => setDarkTheme(!darkTheme)}>Swap Theme</Button>
      </div>
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
          value={activeTab === "js" ? codeState.code : codeState.html}
          defaultValue={defaultJsCode}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          onChange={handleChange}
        />
      </div>
      <div className="viewer-bucket">
        <Bucket
          code={codeState.committedCode}
          html={codeState.committedHtml}
          runNumber={codeState.runNumber}
          highlightLine={(lineNumber) => highlightLine(lineNumber)}
        />
      </div>
      <div className="gallery">
        <Gallery
          demos={galleryItems}
          loadDemo={(item) => {
            // Load the gallery item every time it's clicked
            loadGalleryItem(item.id);

            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.has("id") && searchParams.get("id") !== item.id) {
              // only push state if it's not the current url to prevent duplicated in history
              window.history.pushState({}, "", `${getBaseUrl()}?id=${item.id}`);
            }
          }}
        />
      </div>
    </Root>
  );
}

export default App;
