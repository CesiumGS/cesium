import { useEffect, useRef, useState } from "react";
import "./App.css";

import Editor, { Monaco } from "@monaco-editor/react";
import { editor, KeyCode } from "monaco-editor";
import pako from "pako";
import Gallery, { GalleryDemo } from "./Gallery.js";
import gallery_demos from "./gallery-index.ts";
import { Button, Root } from "@itwin/itwinui-react/bricks";

const local = {
  docTypes: [],
  headers: "<html><head></head><body>",
  bucketName: "starter bucket",
  emptyBucket: "",
};

const defaultJsCode = 'const viewer = new Cesium.Viewer("cesiumContainer");\n';
const defaultHtmlCode = `<style>
  @import url(bucket.css);
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar"></div>
`;

function embedInSandcastleTemplate(code: string, addExtraLine: boolean) {
  console.log("embedSandcastle");
  return `window.startup = async function (Cesium, Sandcastle) {
  'use strict';
  //Sandcastle_Begin
  ${addExtraLine ? "\n" : ""}${code}
  //Sandcastle_End
  Sandcastle.finishedLoading();
  };
  if (typeof Cesium !== 'undefined' && typeof Sandcastle !== 'undefined') {
      window.startupCalled = true;
    window.startup(Cesium, Sandcastle).catch((error) => {
        "use strict";
      console.error(error);
    });
}
`;
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

type SandcastleSaveData = {
  code: string;
  html: string;
  baseHref?: string;
};

function makeCompressedBase64String(data: [code: string, html: string]) {
  // data stored in the hash as:
  // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
  let jsonString = JSON.stringify(data);
  // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
  jsonString = jsonString.slice(2, 2 + jsonString.length - 4);
  const pakoString = pako.deflate(jsonString, {
    raw: true,
    level: 9,
  });
  let base64String = btoa(
    // TODO: not 100% sure why I have to do this conversion manually anymore but it works
    // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
    String.fromCharCode(...new Uint8Array(pakoString)),
  );
  base64String = base64String.replace(/=+$/, ""); // remove padding

  return base64String;
}

function decodeBase64Data(base64String: string): SandcastleSaveData {
  // data stored in the hash as:
  // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
  // restore padding
  while (base64String.length % 4 !== 0) {
    base64String += "=";
  }
  // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
  const dataArray = new Uint8Array(
    atob(base64String)
      .split("")
      .map(function (c) {
        return c.charCodeAt(0);
      }),
  );
  let jsonString = pako.inflate(dataArray, {
    raw: true,
    to: "string",
  });
  // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
  jsonString = `["${jsonString}"]`;
  const json = JSON.parse(jsonString);
  // index 0 is code, index 1 is html
  const code = json[0];
  const html = json[1];
  const baseHref = json[2];
  return {
    code: code,
    html: html,
    baseHref: baseHref,
  };
}

function App() {
  const jsEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const htmlEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const bucket = useRef<HTMLIFrameElement>(null);

  function loadFromUrl() {
    // TODO: I don't think this is the "correct" way to do on mount/load logic but it's working
    if (
      window.location.hash.indexOf("#c=") === 0 &&
      jsEditorRef.current &&
      htmlEditorRef.current
    ) {
      const base64String = window.location.hash.substr(3);
      const data = decodeBase64Data(base64String);

      jsEditorRef.current.setValue(data.code);
      htmlEditorRef.current.setValue(data.html);
      // applyLoadedDemo(code, html);
      console.log("loadFromUrl", data);
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
    const sandcastleTypes = await (await fetch(SANDCASTLE_TYPES_URL)).text();

    const typesSource = [
      cesiumTypes,
      sandcastleTypes,
      "var Cesium: typeof import('cesium');",
      "var Sandcastle: typeof import('Sandcastle').default;",
    ].join("\n");
    const typesUri = "ts:filename/types.d.ts";

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      typesSource,
      typesUri,
    );

    monaco.editor.createModel(
      typesSource,
      "typescript",
      monaco.Uri.parse(typesUri),
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

    const base64String = makeCompressedBase64String([code, html]);

    // const shareUrl = `${getBaseUrl()}#c=${base64String}`;
    const shareUrl = `#c=${base64String}`;
    window.history.replaceState({}, "", shareUrl);
  }

  function loadDemo(demo: GalleryDemo) {
    // do stuff
    setCode(demo.js ?? defaultJsCode, demo.html ?? defaultHtmlCode);

    // format to account for any bad template strings, not ideal but better than not doing it
    formatJs();

    // TODO: this is not the right way to save these, should be able to reference by name but this works for the demo
    share();
  }

  const [darkTheme, setDarkTheme] = useState(false);

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
        <Gallery demos={gallery_demos} loadDemo={(demo) => loadDemo(demo)} />
      </div>
    </Root>
  );
}

export default App;
