import { useEffect, useRef, useState } from "react";
import "./App.css";

import Editor, { Monaco } from "@monaco-editor/react";
import { editor, KeyCode } from "monaco-editor";
import Gallery, { GalleryItem } from "./Gallery.js";
import { Button, Root } from "@itwin/itwinui-react/bricks";
import {
  decodeBase64Data,
  embedInSandcastleTemplate,
  makeCompressedBase64String,
} from "./Helpers.ts";

const local = {
  docTypes: [],
  headers: "<html><head></head><body>",
  bucketName: "starter bucket",
  emptyBucket: "",
};

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

function activateBucketScripts(
  bucketDoc: Document,
  bucketFrame: HTMLIFrameElement,
  jsEditor: editor.IStandaloneCodeEditor,
  htmlEditor: editor.IStandaloneCodeEditor,
) {
  console.log("activateBucketScripts");
  const headNodes = bucketDoc.head.childNodes;
  let node;
  const nodes: HTMLScriptElement[] = [];
  let i, len;
  for (i = 0, len = headNodes.length; i < len; ++i) {
    node = headNodes[i];
    // header is included in blank frame.
    if (
      node instanceof HTMLScriptElement &&
      node.src.indexOf("Sandcastle-header.js") < 0 &&
      node.src.indexOf("Cesium.js") < 0
    ) {
      nodes.push(node);
    }
  }

  for (i = 0, len = nodes.length; i < len; ++i) {
    bucketDoc.head.removeChild(nodes[i]);
  }

  // Apply user HTML to bucket.
  const htmlElement = bucketDoc.createElement("div");
  htmlElement.innerHTML = htmlEditor.getValue();
  bucketDoc.body.appendChild(htmlElement);

  const onScriptTagError = function () {
    if (bucketFrame.contentDocument === bucketDoc) {
      // @ts-expect-error this has type any because it's from anywhere inside the bucket
      appendConsole("consoleError", `Error loading ${this.src}`, true);
      appendConsole(
        "consoleError",
        "Make sure Cesium is built, see the Contributor's Guide for details.",
        true,
      );
    }
  };

  console.log("nodes", nodes);

  // Load each script after the previous one has loaded.
  const loadScript = function () {
    if (bucketFrame.contentDocument !== bucketDoc) {
      // A newer reload has happened, abort this.
      return;
    }
    if (nodes.length > 0) {
      while (nodes.length > 0) {
        node = nodes.shift();
        if (!node) {
          continue;
        }
        const scriptElement = bucketDoc.createElement("script");
        let hasSrc = false;
        for (let j = 0, numAttrs = node.attributes.length; j < numAttrs; ++j) {
          const name = node.attributes[j].name;
          const val = node.attributes[j].value;
          scriptElement.setAttribute(name, val);
          if (name === "src" && val) {
            hasSrc = true;
          }
        }
        scriptElement.innerHTML = node.innerHTML;
        if (hasSrc) {
          scriptElement.onload = loadScript;
          scriptElement.onerror = onScriptTagError;
          bucketDoc.head.appendChild(scriptElement);
        } else {
          bucketDoc.head.appendChild(scriptElement);
          loadScript();
        }
      }
    } else {
      // Apply user JS to bucket
      const element = bucketDoc.createElement("script");
      element.type = "module";

      // Firefox line numbers are zero-based, not one-based.
      const isFirefox = navigator.userAgent.indexOf("Firefox/") >= 0;

      element.textContent = embedInSandcastleTemplate(
        jsEditor.getValue(),
        isFirefox,
      );
      bucketDoc.body.appendChild(element);
    }
  };

  loadScript();
}

function appendConsole(
  type: "consoleError" | "",
  message: string,
  focusPanel: boolean,
) {
  // TODO:
  if (type === "consoleError") {
    console.error(message);
    return;
  }
  console.log(message);
  if (focusPanel) {
    // TODO:
  }
}

// let bucketWaiting = false;

function applyBucket(
  bucketFrame: HTMLIFrameElement,
  jsEditor: editor.IStandaloneCodeEditor,
  htmlEditor: editor.IStandaloneCodeEditor,
) {
  console.log("applyBucket");
  if (
    // local.emptyBucket &&
    // local.bucketName &&
    // typeof bucketTypes[local.bucketName] === "string"
    // eslint-disable-next-line no-constant-condition
    true
  ) {
    // bucketWaiting = false;
    const bucketDoc = bucketFrame.contentDocument;
    if (!bucketDoc) {
      console.warn(
        "tried to applyBucket before the bucket content document existed",
      );
      return;
    }
    if (
      local.headers.substring(0, local.emptyBucket.length) !== local.emptyBucket
    ) {
      appendConsole(
        "consoleError",
        `Error, first part of ${local.bucketName} must match first part of bucket.html exactly.`,
        true,
      );
    } else {
      const bodyAttributes = local.headers.match(/<body([^>]*?)>/)?.[1] ?? "";
      const attributeRegex = /([-a-z_]+)\s*="([^"]*?)"/gi;
      //group 1 attribute name, group 2 attribute value.  Assumes double-quoted attributes.
      let attributeMatch;
      while ((attributeMatch = attributeRegex.exec(bodyAttributes)) !== null) {
        const attributeName = attributeMatch[1];
        const attributeValue = attributeMatch[2];
        if (attributeName === "class") {
          bucketDoc.body.className = attributeValue;
        } else {
          bucketDoc.body.setAttribute(attributeName, attributeValue);
        }
      }

      const pos = local.headers.indexOf("</head>");
      const extraHeaders = local.headers.substring(
        local.emptyBucket.length,
        pos,
      );
      bucketDoc.head.innerHTML += extraHeaders;
      activateBucketScripts(bucketDoc, bucketFrame, jsEditor, htmlEditor);
    }
  } else {
    // bucketWaiting = true;
  }
}

// window.addEventListener(
//   "message",
//   function (e) {
//     let line;
//     // The iframe (bucket.html) sends this message on load.
//     // This triggers the code to be injected into the iframe.
//     if (e.data === "reload") {
//       console.log("message reload");
//       const bucketDoc = bucketFrame.contentDocument;
//       if (!local.bucketName) {
//         // Reload fired, bucket not specified yet.
//         return;
//       }
//       if (bucketDoc.body.getAttribute("data-sandcastle-loaded") !== "yes") {
//         bucketDoc.body.setAttribute("data-sandcastle-loaded", "yes");
//         logOutput.innerHTML = "";
//         numberOfNewConsoleMessages = 0;
//         registry.byId("logContainer").set("title", "Console");
//         // This happens after a Run (F8) reloads bucket.html, to inject the editor code
//         // into the iframe, causing the demo to run there.
//         applyBucket();
//         // if (docError) {
//         //   appendConsole(
//         //     "consoleError",
//         //     'Documentation not available.  Please run the "build-docs" build script to generate Cesium documentation.',
//         //     true,
//         //   );
//         //   // showGallery();
//         // }
//         // if (galleryError) {
//         //   appendConsole(
//         //     "consoleError",
//         //     "Error loading gallery, please run the build script.",
//         //     true,
//         //   );
//         // }
//         // if (deferredLoadError) {
//         //   appendConsole(
//         //     "consoleLog",
//         //     `Unable to load demo named ${queryObject.src.replace(
//         //       ".html",
//         //       "",
//         //     )}. Redirecting to HelloWorld.\n`,
//         //     true,
//         //   );
//         // }
//       }
//       // } else if (defined(e.data.log)) {
//       //   // Console log messages from the iframe display in Sandcastle.
//       //   appendConsole("consoleLog", e.data.log, false);
//       // } else if (defined(e.data.error)) {
//       //   // Console error messages from the iframe display in Sandcastle
//       //   let errorMsg = e.data.error;
//       //   let lineNumber = e.data.lineNumber;
//       //   if (defined(lineNumber)) {
//       //     errorMsg += " (on line ";

//       //     if (e.data.url) {
//       //       errorMsg += `${lineNumber} of ${e.data.url})`;
//       //     } else {
//       //       lineNumber = scriptLineToEditorLine(lineNumber);
//       //       errorMsg += `${lineNumber + 1})`;
//       //       line = jsEditor.setGutterMarker(
//       //         lineNumber,
//       //         "errorGutter",
//       //         makeLineLabel(e.data.error, "errorMarker"),
//       //       );
//       //       jsEditor.addLineClass(line, "text", "errorLine");
//       //       errorLines.push(line);
//       //       scrollToLine(lineNumber);
//       //     }
//       //   }
//       //   appendConsole("consoleError", errorMsg, true);
//       // } else if (defined(e.data.warn)) {
//       //   // Console warning messages from the iframe display in Sandcastle.
//       //   appendConsole("consoleWarn", e.data.warn, true);
//       // } else if (defined(e.data.highlight)) {
//       //   // Hovering objects in the embedded Cesium window.
//       //   highlightLine(e.data.highlight);
//     }
//   },
//   true,
// );

const TYPES_URL = `${__PAGE_BASE_URL__}Source/Cesium.d.ts`;
const SANDCASTLE_TYPES_URL = `templates/Sandcastle.d.ts`;

// function appendCode(code, run = true) {
//   const codeMirror = getJsCodeMirror();
//   codeMirror.setValue(`${codeMirror.getValue()}\n${code}`);
//   if (run) {
//     runCesium();
//   }
// }

// function appendCodeOnce(code, run = true) {
//   const codeMirror = getJsCodeMirror();
//   if (!codeMirror.getValue().includes(code)) {
//     appendCode(code, run);
//   }
// }

// function prependCode(code, run = true) {
//   const codeMirror = getJsCodeMirror();
//   codeMirror.setValue(`${code}\n${codeMirror.getValue()}`);
//   if (run) {
//     runCesium();
//   }
// }

// function prependCodeOnce(code, run = true) {
//   const codeMirror = getJsCodeMirror();
//   if (!codeMirror.getValue().includes(code)) {
//     prependCode(code, run);
//   }
// }

function App() {
  const jsEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const htmlEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const bucket = useRef<HTMLIFrameElement>(null);

  const [legacyIdMap, setLegacyIdMap] = useState<Record<string, string>>({});
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  function loadFromUrl() {
    if (!jsEditorRef.current || !htmlEditorRef.current) {
      console.log("loadFromUrl too early", {
        js: !!jsEditorRef.current,
        html: !!htmlEditorRef.current,
        galleryLoaded,
      });
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    // TODO: I don't think this is the "correct" way to do on mount/load logic but it's working
    if (window.location.hash.indexOf("#c=") === 0) {
      const base64String = window.location.hash.substr(3);
      const data = decodeBase64Data(base64String);

      jsEditorRef.current.setValue(data.code);
      htmlEditorRef.current.setValue(data.html);
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
      const galleryItem = galleryItems.find((item) => item.id === galleryId);
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
      const galleryItem = galleryItems.find((item) => item.id === galleryId);
      if (!galleryItem) {
        console.error("Unable to find gallery item with id:", galleryId);
        return;
      }
      loadGalleryItem(galleryItem);
    }
  }

  /**
   * @param {IStandaloneCodeEditor} editor
   */
  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    jsEditorRef.current = editor;

    monaco.editor.addCommand({
      id: "run-cesium",
      run: () => {
        runCode();
      },
    });

    // Remove some default keybindings that get in the way
    // https://github.com/microsoft/monaco-editor/issues/102
    monaco.editor.addKeybindingRules([
      {
        // disable show command center
        keybinding: KeyCode.F1,
        command: null,
      },
      {
        // disable show error command
        keybinding: KeyCode.F8,
        command: null,
      },
      {
        // disable toggle debugger breakpoint
        keybinding: KeyCode.F9,
        command: null,
      },
      {
        // disable go to definition to allow opening dev console
        keybinding: KeyCode.F12,
        command: null,
      },
      {
        keybinding: KeyCode.F8,
        command: "run-cesium",
      },
    ]);

    loadFromUrl();
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

  function runCode() {
    if (!bucket.current || !bucket.current.contentWindow) {
      return;
    }

    // Check for a race condition in some browsers where the iframe hasn't loaded yet.
    if (bucket.current.contentWindow.location.href.indexOf("bucket.html") > 0) {
      bucket.current.contentWindow.location.reload();
    }
    // applyBucket(bucket.current, jsEditorRef.current, htmlEditorRef.current);
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

  useEffect(() => {
    const messageHandler = function (e: MessageEvent) {
      // The iframe (bucket.html) sends this message on load.
      // This triggers the code to be injected into the iframe.
      if (e.data === "reload") {
        console.log("message reload");
        if (!local.bucketName || !bucket.current) {
          // Reload fired, bucket not specified yet.
          return;
        }
        const bucketDoc = bucket.current.contentDocument;
        if (!bucketDoc) {
          // TODO: this whole handler probably needs to be set up better for things like this
          console.warn("bucket not set up yet");
          return;
        }
        if (!jsEditorRef.current || !htmlEditorRef.current) {
          console.warn("editors not set up yet");
          return;
        }
        if (bucketDoc.body.getAttribute("data-sandcastle-loaded") !== "yes") {
          bucketDoc.body.setAttribute("data-sandcastle-loaded", "yes");
          // logOutput.innerHTML = "";
          // numberOfNewConsoleMessages = 0;
          // registry.byId("logContainer").set("title", "Console");
          // This happens after a Run (F8) reloads bucket.html, to inject the editor code
          // into the iframe, causing the demo to run there.
          applyBucket(
            bucket.current,
            jsEditorRef.current,
            htmlEditorRef.current,
          );
          // if (docError) {
          //   appendConsole(
          //     "consoleError",
          //     'Documentation not available.  Please run the "build-docs" build script to generate Cesium documentation.',
          //     true,
          //   );
          //   // showGallery();
          // }
          // if (galleryError) {
          //   appendConsole(
          //     "consoleError",
          //     "Error loading gallery, please run the build script.",
          //     true,
          //   );
          // }
          // if (deferredLoadError) {
          //   appendConsole(
          //     "consoleLog",
          //     `Unable to load demo named ${queryObject.src.replace(
          //       ".html",
          //       "",
          //     )}. Redirecting to HelloWorld.\n`,
          //     true,
          //   );
          // }
        }
      }
    };
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  function formatJs() {
    jsEditorRef.current?.getAction("editor.action.formatDocument")?.run();
  }

  function nextHighestVariableName(name: string) {
    if (!jsEditorRef.current) {
      // can't find next highest if there's no code yet
      return;
    }
    const codeMirror = jsEditorRef.current;
    const code = codeMirror.getValue();
    const otherDeclarations = [
      ...code.matchAll(new RegExp(`(const|let|var)\\s+${name}\\d*\\s=`, "g")),
    ].length;
    const variableName = `${name}${otherDeclarations + 1}`;
    return variableName;
  }

  function appendCode(code: string, run = false) {
    if (!jsEditorRef.current) {
      // can't append if there's no editor
      return;
    }
    jsEditorRef.current.setValue(`${jsEditorRef.current.getValue()}\n${code}`);
    if (run) {
      runCode();
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
    const variableName = nextHighestVariableName("toggleValue");

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
    const variableName = nextHighestVariableName("options");

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

  function setCode(js: string, html: string) {
    if (!jsEditorRef.current || !htmlEditorRef.current) {
      // can't find next highest if there's no code yet
      return;
    }
    jsEditorRef.current.setValue(js);
    htmlEditorRef.current.setValue(html);

    runCode();
  }

  function resetCode() {
    if (!jsEditorRef.current || !htmlEditorRef.current) {
      // can't find next highest if there's no code yet
      return;
    }
    jsEditorRef.current.setValue(defaultJsCode);
    htmlEditorRef.current.setValue(defaultHtmlCode);

    window.history.replaceState({}, "", "/");
    runCode();
  }

  function share() {
    if (!jsEditorRef.current || !htmlEditorRef.current) {
      // can't find next highest if there's no code yet
      return;
    }
    const code = jsEditorRef.current.getValue();
    const html = htmlEditorRef.current.getValue();
    console.log([code, html]);

    const base64String = makeCompressedBase64String({ code, html });

    const shareUrl = `${getBaseUrl()}#c=${base64String}`;
    // const shareUrl = `#c=${base64String}`;
    window.history.replaceState({}, "", shareUrl);
  }

  function openStandalone() {
    if (!jsEditorRef.current || !htmlEditorRef.current) {
      // can't find next highest if there's no code yet
      return;
    }
    const code = jsEditorRef.current.getValue();
    const html = htmlEditorRef.current.getValue();

    let baseHref = getBaseUrl();
    const pos = baseHref.lastIndexOf("/");
    baseHref = `${baseHref.substring(0, pos)}/gallery/`;

    console.log([code, html]);
    const base64String = makeCompressedBase64String({ code, html, baseHref });

    let url = getBaseUrl();
    url =
      `${url.replace("index.html", "")}standalone.html` + `#c=${base64String}`;

    window.open(url, "_blank");
    window.focus();
  }

  const GALLERY_BASE = "/gallery";
  async function loadGalleryItem(galleryItem: GalleryItem) {
    const itemBaseUrl = `${GALLERY_BASE}/${galleryItem.id}`;

    const codeReq = fetch(`${itemBaseUrl}/main.js`);
    const htmlReq = fetch(`${itemBaseUrl}/index.html`);

    const code = await (await codeReq).text();
    const html = await (await htmlReq).text();

    console.log("loaded", { code, html });

    setCode(code, html);

    // format to account for any bad template strings, not ideal but better than not doing it
    formatJs();

    // TODO: this is not the right way to save these, should be able to reference by name but this works for the demo
    share();
  }

  const [darkTheme, setDarkTheme] = useState(false);

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

  useEffect(() => {
    if (galleryLoaded) {
      console.log("gallery loaded, try loading from url");
      loadFromUrl();
    }
  }, [galleryLoaded]);

  return (
    <Root colorScheme={darkTheme ? "dark" : "light"} density="dense" id="root">
      <div className="toolbar">
        <Button onClick={resetCode}>New</Button>
        <Button onClick={runCode}>Run (F8)</Button>
        <Button onClick={formatJs}>Format</Button>
        <Button onClick={addButton}>Add button</Button>
        <Button onClick={addToggle}>Add toggle</Button>
        <Button onClick={addMenu}>Add menu</Button>
        <Button onClick={share}>Share</Button>
        <Button onClick={openStandalone}>Standalone</Button>
        <div className="spacer"></div>
        <Button onClick={() => setDarkTheme(!darkTheme)}>Swap Theme</Button>
      </div>
      <div className="editor-container">
        <Editor
          height="70%"
          defaultLanguage="javascript"
          theme={darkTheme ? "vs-dark" : "light"}
          defaultValue={defaultJsCode}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
        />
        <Editor
          height="30%"
          defaultLanguage="html"
          theme={darkTheme ? "vs-dark" : "light"}
          defaultValue={defaultHtmlCode}
          onMount={(editor) => {
            htmlEditorRef.current = editor;
            loadFromUrl();
          }}
        />
      </div>
      <div className="viewer-bucket">
        <iframe
          ref={bucket}
          id="bucketFrame"
          src="templates/bucket.html"
          className="fullFrame"
          allowFullScreen
        ></iframe>
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
