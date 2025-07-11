import {
  ReactElement,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from "react";
import { Allotment, AllotmentHandle } from "allotment";
import "allotment/dist/style.css";
import "./App.css";

import { Button, Divider } from "@stratakit/bricks";
import { Icon, Root } from "@stratakit/foundations";
import { decodeBase64Data, makeCompressedBase64String } from "./Helpers.ts";
import Gallery, { GalleryItem } from "./Gallery.js";
import Bucket from "./Bucket.tsx";
import SandcastleEditor, { SandcastleEditorRef } from "./SandcastleEditor.tsx";
import { addIcon } from "./icons.ts";
import {
  ConsoleMessage,
  ConsoleMessageType,
  ConsoleMirror,
} from "./ConsoleMirror.tsx";
import { useLocalStorage } from "./util/useLocalStorage.ts";

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

const GALLERY_BASE = __GALLERY_BASE_URL__;

type RightSideRef = {
  toggleExpanded: () => void;
};

function RightSideAllotment({
  ref,
  children,
  consoleCollapsedHeight,
  consoleExpanded,
  setConsoleExpanded,
}: {
  ref: RefObject<RightSideRef | null>;
  children: ReactElement<typeof Allotment.Pane>[];
  consoleCollapsedHeight: number;
  consoleExpanded: boolean;
  setConsoleExpanded: (expanded: boolean) => void;
}) {
  const rightSideRef = useRef<AllotmentHandle>(null);
  const rightSideSizes = useRef<number[]>([0, 0]);

  useImperativeHandle(ref, () => {
    return {
      toggleExpanded: () => toggleExpanded(),
    };
  });

  const [previousConsoleHeight, setPreviousConsoleHeight] = useState<
    number | undefined
  >(undefined);

  function toggleExpanded() {
    console.log(rightSideRef?.current);
    const [top, bottom] = rightSideSizes.current;
    const totalHeight = top + bottom;
    console.log("current sizes", rightSideSizes.current, totalHeight);
    if (!consoleExpanded) {
      const targetHeight = previousConsoleHeight ?? 200;
      rightSideRef.current?.resize([totalHeight - targetHeight, targetHeight]);
    } else {
      setPreviousConsoleHeight(bottom);
      rightSideRef.current?.resize([
        totalHeight - consoleCollapsedHeight,
        consoleCollapsedHeight,
      ]);
    }
    setConsoleExpanded(!consoleExpanded);
  }

  return (
    <Allotment
      vertical
      ref={rightSideRef}
      onChange={(sizes) => {
        if (previousConsoleHeight) {
          // Unset this because we just dragged
          setPreviousConsoleHeight(undefined);
        }
        console.log("change", sizes);
        rightSideSizes.current = sizes;
      }}
      onDragEnd={(sizes) => {
        const [, consoleSize] = sizes;
        if (consoleSize <= consoleCollapsedHeight && consoleExpanded) {
          setConsoleExpanded(false);
        } else if (consoleSize > consoleCollapsedHeight && !consoleExpanded) {
          setConsoleExpanded(true);
        }
      }}
      onReset={() => {
        const [top, bottom] = rightSideSizes.current;
        const totalHeight = top + bottom;
        rightSideRef.current?.resize([
          totalHeight - consoleCollapsedHeight,
          consoleCollapsedHeight,
        ]);
        setConsoleExpanded(false);
      }}
    >
      {children}
    </Allotment>
  );
}

export type SandcastleAction =
  | { type: "reset" }
  | { type: "setCode"; code: string }
  | { type: "setHtml"; html: string }
  | { type: "runSandcastle" }
  | { type: "setAndRun"; code?: string; html?: string };

function App() {
  const [theme, setTheme] = useLocalStorage<"dark" | "light">(
    "sandcastle/theme",
    "dark",
  );
  const editorRef = useRef<SandcastleEditorRef>(null);
  const rightSideRef = useRef<RightSideRef>(null);
  const consoleCollapsedHeight = 26;
  const [consoleExpanded, setConsoleExpanded] = useState(false);

  const cesiumVersion = __CESIUM_VERSION__;
  const versionString = __COMMIT_SHA__ ? `Commit: ${__COMMIT_SHA__}` : "";

  const [leftPanel, setLeftPanel] = useState<"editor" | "gallery">("gallery");
  const [title, setTitle] = useState("New Sandcastle");

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

  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  function appendConsole(type: ConsoleMessageType, message: string) {
    setConsoleMessages((prevConsoleMessages) => [
      ...prevConsoleMessages,
      { type, message, id: crypto.randomUUID() },
    ]);
    if (!consoleExpanded && type !== "log") {
      rightSideRef.current?.toggleExpanded();
    }
  }

  function runSandcastle() {
    setConsoleMessages([]);
    dispatch({ type: "runSandcastle" });
  }

  function highlightLine(lineNumber: number) {
    console.log("would highlight line", lineNumber, "but not implemented yet");
  }

  function formatJs() {
    editorRef.current?.formatCode();
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

    setTitle("New Sandcastle");
    setConsoleMessages([]);
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
      setTitle(galleryItem.title);
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
          setLeftPanel("editor");
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
          setLeftPanel("editor");
        } else if (searchParams.has("id")) {
          const galleryId = searchParams.get("id");
          if (!galleryId) {
            return;
          }
          loadGalleryItem(galleryId);
          setLeftPanel("editor");
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
    <Root
      id="root"
      className="sandcastle-root"
      density="dense"
      colorScheme={theme}
      synchronizeColorScheme
    >
      <header className="header">
        <a className="logo" href="/">
          <img
            src={
              theme === "dark"
                ? "./images/Cesium_Logo_overlay.png"
                : "./images/Cesium_Logo_Color_Overlay.png"
            }
            style={{ width: "118px" }}
          />
        </a>
        <div className="metadata">{title}</div>
        <Button tone="accent" onClick={() => share()}>
          Share
        </Button>
        <Divider aria-orientation="vertical" />
        <Button
          disabled={leftPanel !== "editor"}
          onClick={() => runSandcastle()}
        >
          Run (F8)
        </Button>
        <Button disabled={leftPanel !== "editor"} onClick={() => formatJs()}>
          Format
        </Button>
        <Button disabled={leftPanel !== "editor"} onClick={() => addButton()}>
          Add button
        </Button>
        <Button disabled={leftPanel !== "editor"} onClick={() => addToggle()}>
          Add toggle
        </Button>
        <Button disabled={leftPanel !== "editor"} onClick={() => addMenu()}>
          Add menu
        </Button>
        <Button onClick={() => openStandalone()}>Standalone</Button>
        <div className="flex-spacer"></div>
        <div className="version">
          {versionString && <pre>{versionString.substring(0, 7)} - </pre>}
          <pre>{cesiumVersion}</pre>
        </div>
      </header>
      <div className="application-bar">
        <Button
          onClick={() => setLeftPanel("gallery")}
          tone={leftPanel === "gallery" ? "accent" : "neutral"}
        >
          Gallery
        </Button>
        <Button
          onClick={() => setLeftPanel("editor")}
          tone={leftPanel === "editor" ? "accent" : "neutral"}
        >
          Code
        </Button>
        <Divider />
        <Button
          onClick={() => {
            resetSandcastle();
            setLeftPanel("editor");
          }}
        >
          <Icon href={addIcon} /> New
        </Button>
        <div className="flex-spacer"></div>
        <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          Theme
        </Button>
        <Button>Settings</Button>
      </div>
      <Allotment>
        <Allotment.Pane minSize={400} className="left-panel">
          {leftPanel === "editor" && (
            <SandcastleEditor
              ref={editorRef}
              darkTheme={theme === "dark"}
              onJsChange={(value: string = "") =>
                dispatch({ type: "setCode", code: value })
              }
              onHtmlChange={(value: string = "") =>
                dispatch({ type: "setHtml", html: value })
              }
              onRun={() => runSandcastle()}
              js={codeState.code}
              html={codeState.html}
            />
          )}
          {leftPanel === "gallery" && (
            <Gallery
              demos={galleryItems}
              loadDemo={(item) => {
                // Load the gallery item every time it's clicked
                loadGalleryItem(item.id);

                const searchParams = new URLSearchParams(
                  window.location.search,
                );
                if (
                  !searchParams.has("id") ||
                  (searchParams.has("id") && searchParams.get("id") !== item.id)
                ) {
                  // only push state if it's not the current url to prevent duplicated in history
                  window.history.pushState(
                    {},
                    "",
                    `${getBaseUrl()}?id=${item.id}`,
                  );
                }
                setLeftPanel("editor");
              }}
            />
          )}
        </Allotment.Pane>
        <Allotment.Pane className="right-panel">
          <RightSideAllotment
            ref={rightSideRef}
            consoleCollapsedHeight={consoleCollapsedHeight}
            consoleExpanded={consoleExpanded}
            setConsoleExpanded={setConsoleExpanded}
          >
            <Allotment.Pane minSize={200}>
              <Bucket
                code={codeState.committedCode}
                html={codeState.committedHtml}
                runNumber={codeState.runNumber}
                highlightLine={(lineNumber) => highlightLine(lineNumber)}
                appendConsole={appendConsole}
              />
            </Allotment.Pane>
            <Allotment.Pane
              preferredSize={consoleCollapsedHeight}
              minSize={consoleCollapsedHeight}
            >
              <ConsoleMirror
                logs={consoleMessages}
                expanded={consoleExpanded}
                toggleExpanded={() => rightSideRef.current?.toggleExpanded()}
              />
            </Allotment.Pane>
          </RightSideAllotment>
        </Allotment.Pane>
      </Allotment>
    </Root>
  );
}

export default App;
