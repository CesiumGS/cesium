import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

import Editor, { Monaco } from "@monaco-editor/react";
import { editor, KeyCode } from "monaco-editor";
import Gallery, { GalleryItem } from "./Gallery.js";
import { Button, Root } from "@itwin/itwinui-react/bricks";
import { decodeBase64Data, makeCompressedBase64String } from "./Helpers.ts";
import Bucket from "./Bucket.tsx";

const defaultJsCode = 'const viewer = new Cesium.Viewer("cesiumContainer");\n';
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

function App() {
  const [jsIsActive, setJsIsActive] = useState(true);
  const [darkTheme, setDarkTheme] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  const [jsCode, setJsCode] = useState(defaultJsCode);
  const [htmlCode, setHtmlCode] = useState(defaultHtmlCode);
  const [committedCode, commitCode] = useState(defaultJsCode);
  const [committedHtml, commitHtml] = useState(defaultHtmlCode);
  const [runNumber, setRunNumber] = useState(0);

  const [legacyIdMap, setLegacyIdMap] = useState<Record<string, string>>({});
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  const runSandcastle = useCallback(() => {
    commitCode(jsCode);
    commitHtml(htmlCode);
    setRunNumber((runNumber) => runNumber + 1);
  }, [jsCode, htmlCode]);

  // The monaco command handler needs a reference to a function that's updated/replaced when state
  // changes so that triggering the Run Command (F8) will use the latest version of the code
  const monacoRunner = useRef(() => {});
  useEffect(() => {
    monacoRunner.current = runSandcastle;
  }, [runSandcastle]);

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    editorRef.current = editor;

    monaco.editor.addCommand({
      id: "run-cesium",
      run: () => {
        monacoRunner.current();
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
      // TODO: pick what target we want, probably newer than ES2020 but TS was upset with that
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
    });

    setTypes(monaco);
  }

  function handleChange(value: string = "") {
    if (jsIsActive) {
      setJsCode(value);
    } else {
      setHtmlCode(value);
    }
  }

  async function setTypes(monaco: Monaco) {
    console.log("setTypes");
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
    if (jsCode.endsWith("\n")) {
      spacerNewline = "";
    }
    const newCode = `${jsCode}${spacerNewline}\n${snippet.trim()}\n`;
    setJsCode(newCode);
    if (run) {
      commitCode(newCode);
    }
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
    const variableName = nextHighestVariableName(jsCode, "toggleValue");

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
    const variableName = nextHighestVariableName(jsCode, "options");

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

  function setCodeAndRun(code: string, html: string) {
    setJsCode(code);
    setHtmlCode(html);

    commitCode(code);
    commitHtml(html);
    setRunNumber((runNumber) => runNumber + 1);
  }

  function resetSandcastle() {
    setJsCode(defaultJsCode);
    setHtmlCode(defaultHtmlCode);

    commitCode(defaultJsCode);
    commitHtml(defaultHtmlCode);
    setRunNumber(runNumber + 1);

    window.history.replaceState({}, "", "/");
  }

  function share() {
    const base64String = makeCompressedBase64String({
      code: jsCode,
      html: htmlCode,
    });

    const shareUrl = `${getBaseUrl()}#c=${base64String}`;
    // const shareUrl = `#c=${base64String}`;
    window.history.replaceState({}, "", shareUrl);
  }

  function openStandalone() {
    let baseHref = getBaseUrl();
    const pos = baseHref.lastIndexOf("/");
    baseHref = `${baseHref.substring(0, pos)}/gallery/`;

    const base64String = makeCompressedBase64String({
      code: jsCode,
      html: htmlCode,
      baseHref,
    });

    let url = getBaseUrl();
    url =
      `${url.replace("index.html", "")}standalone.html` + `#c=${base64String}`;

    window.open(url, "_blank");
    window.focus();
  }

  const GALLERY_BASE = "/gallery";
  const loadGalleryItem = useCallback(async function loadGalleryItem(
    galleryItem: GalleryItem,
  ) {
    const itemBaseUrl = `${GALLERY_BASE}/${galleryItem.id}`;

    const codeReq = fetch(`${itemBaseUrl}/main.js`);
    const htmlReq = fetch(`${itemBaseUrl}/index.html`);

    const code = await (await codeReq).text();
    const html = await (await htmlReq).text();

    console.log("loaded", { code, html });

    setCodeAndRun(code, html);

    // format to account for any bad template strings, not ideal but better than not doing it
    // formatJs();

    // TODO: this is not the right way to save these, should be able to reference by name but this works for the demo
    // share();
  }, []);

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

  useEffect(
    function loadFromUrl() {
      if (galleryLoaded) {
        console.log("gallery loaded, try loading from url");

        const searchParams = new URLSearchParams(window.location.search);

        // TODO: I don't think this is the "correct" way to do on mount/load logic but it's working
        if (window.location.hash.indexOf("#c=") === 0) {
          const base64String = window.location.hash.substr(3);
          const data = decodeBase64Data(base64String);

          setCodeAndRun(data.code, data.html);
          // applyLoadedDemo(code, html);
          console.log("loadFromUrl", data);
        } else if (searchParams.has("src")) {
          const legacyId = searchParams.get("src");
          console.log("load legacy", legacyId);
          if (!legacyId) {
            return;
          }
          const galleryId = legacyIdMap[legacyId];
          if (!galleryId) {
            console.log("no mapping");
            return;
          }
          const galleryItem = galleryItems.find(
            (item) => item.id === galleryId,
          );
          if (!galleryItem) {
            console.error("Unable to find gallery item with id:", galleryId);
            return;
          }
          loadGalleryItem(galleryItem);
        } else if (searchParams.has("id")) {
          const galleryId = searchParams.get("id");
          console.log("load id", galleryId);
          // TODO: there's probably a race condition here where the list might not be loaded yet
          // I need to switch this to the more React declarative style
          const galleryItem = galleryItems.find(
            (item) => item.id === galleryId,
          );
          if (!galleryItem) {
            console.error("Unable to find gallery item with id:", galleryId);
            return;
          }
          loadGalleryItem(galleryItem);
        }
      }
    },
    [galleryLoaded, galleryItems, legacyIdMap, loadGalleryItem],
  );

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
          <Button disabled={jsIsActive} onClick={() => setJsIsActive(true)}>
            Javascript
          </Button>
          <Button disabled={!jsIsActive} onClick={() => setJsIsActive(false)}>
            HTML/CSS
          </Button>
        </div>
        <Editor
          height="100%"
          theme={darkTheme ? "vs-dark" : "light"}
          path={jsIsActive ? "script.js" : "index.html"}
          language={jsIsActive ? "javascript" : "html"}
          value={jsIsActive ? jsCode : htmlCode}
          defaultValue={defaultJsCode}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          onChange={handleChange}
        />
      </div>
      <div className="viewer-bucket">
        <Bucket
          code={committedCode}
          html={committedHtml}
          runNumber={runNumber}
        />
      </div>
      <div className="gallery">
        <Gallery
          demos={galleryItems}
          loadDemo={(item) => loadGalleryItem(item)}
        />
      </div>
    </Root>
  );
}

export default App;
