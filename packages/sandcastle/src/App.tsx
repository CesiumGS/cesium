import {
  MouseEventHandler,
  ReactElement,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { Allotment, AllotmentHandle } from "allotment";
import "allotment/dist/style.css";
import "./App.css";

import { Button, Divider, Tooltip } from "@stratakit/bricks";
import { Icon, Root } from "@stratakit/foundations";
import { makeCompressedBase64String } from "./Helpers.ts";
import { getBaseUrl } from "./util/getBaseUrl.ts";
import { loadFromUrl } from "./util/loadFromUrl.ts";

import {
  StoreContext,
  useGalleryItemStore,
  type GalleryItem,
} from "./Gallery/GalleryItemStore.ts";
import Gallery from "./Gallery/Gallery.js";

import Bucket from "./Bucket.tsx";
import SandcastleEditor from "./SandcastleEditor.tsx";
import {
  add,
  image,
  moon,
  script,
  settings as settingsIcon,
  sun,
  windowPopout,
  documentation,
} from "./icons.ts";
import {
  ConsoleMessage,
  ConsoleMessageType,
  ConsoleMirror,
} from "./ConsoleMirror.tsx";
import { SettingsModal } from "./SettingsModal.tsx";
import { LeftPanel, SettingsContext } from "./SettingsContext.ts";
import { MetadataPopover } from "./MetadataPopover.tsx";
import { SharePopover } from "./SharePopover.tsx";

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

const cesiumVersion = __CESIUM_VERSION__;
const versionString = __COMMIT_SHA__
  ? `Commit: ${__COMMIT_SHA__.substring(0, 7)} - ${cesiumVersion}`
  : cesiumVersion;

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
    const [top, bottom] = rightSideSizes.current;
    const totalHeight = top + bottom;
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
      defaultSizes={[100, 0]}
      onChange={(sizes) => {
        if (previousConsoleHeight) {
          // Unset this because we just dragged
          setPreviousConsoleHeight(undefined);
        }
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

function AppBarButton({
  children,
  onClick,
  active = false,
  label,
  onAuxClick,
}: {
  children: ReactNode;
  onClick: MouseEventHandler;
  active?: boolean;
  label: string;
  onAuxClick?: MouseEventHandler;
}) {
  if (active) {
    return (
      <Tooltip content={label} type="label" placement="right">
        <Button tone="accent" onClick={onClick} onAuxClick={onAuxClick}>
          {children}
        </Button>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={label} type="label" placement="right">
      <Button variant="ghost" onClick={onClick} onAuxClick={onAuxClick}>
        {children}
      </Button>
    </Tooltip>
  );
}

export type SandcastleAction =
  | { type: "reset" }
  | { type: "resetDirty" }
  | { type: "setCode"; code: string }
  | { type: "setHtml"; html: string }
  | { type: "runSandcastle" }
  | { type: "setAndRun"; code?: string; html?: string };

function App() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const rightSideRef = useRef<RightSideRef>(null);
  const consoleCollapsedHeight = 26;
  const [consoleExpanded, setConsoleExpanded] = useState(false);

  const isStartingWithCode = !!(window.location.search || window.location.hash);
  const startOnEditor =
    isStartingWithCode || settings.defaultPanel === "editor";
  const [leftPanel, setLeftPanel] = useState<LeftPanel>(
    startOnEditor ? "editor" : "gallery",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [title, setTitle] = useState("New Sandcastle");
  const [description, setDescription] = useState("");

  type CodeState = {
    code: string;
    html: string;
    committedCode: string;
    committedHtml: string;
    runNumber: number;
    dirty: boolean;
  };

  const initialState: CodeState = {
    code: defaultJsCode,
    html: defaultHtmlCode,
    committedCode: defaultJsCode,
    committedHtml: defaultHtmlCode,
    runNumber: 0,
    dirty: false,
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
          dirty: true,
        };
      }
      case "setHtml": {
        return {
          ...state,
          html: action.html,
          dirty: true,
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
          dirty: false,
        };
      }
      case "resetDirty": {
        return {
          ...state,
          dirty: false,
        };
      }
    }
  }, initialState);

  useEffect(() => {
    const host = window.location.host;
    let envString = "";
    if (host.includes("localhost") && host !== "localhost:8080") {
      // this helps differentiate tabs for local sandcastle development or other testing
      envString = `${host.replace("localhost:", "")} `;
    }

    const dirtyIndicator = codeState.dirty ? "*" : "";
    if (title === "" || title === "New Sandcastle") {
      // No need to clutter the window/tab with a name if not viewing a named gallery demo
      document.title = `${envString}Sandcastle${dirtyIndicator} | CesiumJS`;
    } else {
      document.title = `${envString}${title}${dirtyIndicator} | Sandcastle | CesiumJS`;
    }
  }, [title, codeState.dirty]);

  const confirmLeave = useCallback(() => {
    if (!codeState.dirty) {
      return true;
    }

    /* eslint-disable-next-line no-alert */
    return window.confirm(
      "You have unsaved changes. Are you sure you want to navigate away from this demo?",
    );
  }, [codeState.dirty]);

  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const appendConsole = useCallback(
    function appendConsole(type: ConsoleMessageType, message: string) {
      setConsoleMessages((prevConsoleMessages) => [
        ...prevConsoleMessages,
        { type, message, id: crypto.randomUUID() },
      ]);
      if (!consoleExpanded && type !== "log") {
        rightSideRef.current?.toggleExpanded();
      }
    },
    [consoleExpanded],
  );

  const resetConsole = useCallback(() => {
    if (codeState.runNumber > 0) {
      // the console should only be cleared by the Bucket when the viewer page
      // has actually reloaded and stopped sending console statements
      // otherwise some could bleed into the "next run"
      setConsoleMessages([]);
    }
  }, [codeState.runNumber]);

  function runSandcastle() {
    dispatch({ type: "runSandcastle" });
  }

  function highlightLine(lineNumber: number) {
    console.log("would highlight line", lineNumber, "but not implemented yet");
  }

  function resetSandcastle() {
    if (!confirmLeave()) {
      return;
    }
    dispatch({ type: "reset" });

    window.history.pushState({}, "", getBaseUrl());

    setTitle("New Sandcastle");
    setDescription("");
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

  const galleryItemStore = useGalleryItemStore();
  const { fetchItems, items } = galleryItemStore;
  useEffect(fetchItems, []);

  const isGalleryLoaded = useDeferredValue(items.length > 0);
  const [isLoadPending, startLoadPending] = useTransition();
  const load = () =>
    startLoadPending(async () => {
      if (!isGalleryLoaded || isLoadPending) {
        return;
      }

      try {
        const data = await loadFromUrl(galleryItemStore);
        if (!data) {
          return;
        }

        const { code, html, title } = data;

        startLoadPending(() => {
          setTitle(title);
          dispatch({
            type: "setAndRun",
            code: code ?? defaultJsCode,
            html: html ?? defaultHtmlCode,
          });
        });
      } catch (error) {
        const message = (error as Error)?.message;
        appendConsole("error", message);
        console.error(message);
      }
    });
  useEffect(load, [isGalleryLoaded]);

  useEffect(() => {
    // Listen to browser forward/back navigation and try to load from URL
    // this is necessary because of the pushState used for faster gallery loading
    const stateLoad = () => confirmLeave() && load();
    window.addEventListener("popstate", stateLoad);
    return () => window.removeEventListener("popstate", stateLoad);
  }, []);

  useEffect(() => {
    // if the code has been edited listen for navigation away and warn
    if (codeState.dirty) {
      function beforeUnloadListener(e: BeforeUnloadEvent) {
        e.preventDefault();
        return ""; // modern browsers ignore the contents of this string
      }
      window.addEventListener("beforeunload", beforeUnloadListener);
      return () =>
        window.removeEventListener("beforeunload", beforeUnloadListener);
    }
  }, [codeState.dirty]);

  function openDocsPage() {
    const docsUrl = "https://cesium.com/learn/cesiumjs/ref-doc/index.html";
    window.open(docsUrl, "_blank")?.focus();
  }

  const onRunCode = useCallback(
    async ({ id, title, getJsCode, getHtmlCode }: GalleryItem) => {
      if (!confirmLeave()) {
        return;
      }

      try {
        const [code, html] = await Promise.all([getJsCode(), getHtmlCode()]);
        const searchParams = new URLSearchParams(window.location.search);
        if (
          !searchParams.has("id") ||
          (searchParams.has("id") && searchParams.get("id") !== id)
        ) {
          // only push state if it's not the current url to prevent duplicated in history
          window.history.pushState({}, "", `${getBaseUrl()}?id=${id}`);
          if (
            !searchParams.has("id") ||
            (searchParams.has("id") && searchParams.get("id") !== id)
          ) {
            // only push state if it's not the current url to prevent duplicated in history
            window.history.pushState({}, "", `${getBaseUrl()}?id=${id}`);
          }
        }

        setTitle(title);
        dispatch({
          type: "setAndRun",
          code: code ?? defaultJsCode,
          html: html ?? defaultJsCode,
        });
      } catch (error) {
        const message = (error as Error)?.message;
        appendConsole("error", message);
        console.error(message);
      }
    },
    [confirmLeave],
  );

  const onOpenCode = useCallback(() => {
    setLeftPanel("editor");
  }, []);

  return (
    <Root
      id="root"
      className="sandcastle-root"
      density="dense"
      colorScheme={settings.theme}
      synchronizeColorScheme
    >
      <header className="header">
        <a className="logo" href={getBaseUrl()}>
          <img
            src={
              settings.theme === "dark"
                ? "./images/Cesium_Logo_overlay.png"
                : "./images/Cesium_Logo_Color_Overlay.png"
            }
            style={{ width: "118px" }}
          />
        </a>
        <MetadataPopover title={title} description={description} />
        <SharePopover code={codeState.code} html={codeState.html} />
        <Divider aria-orientation="vertical" />
        <Button onClick={() => openStandalone()}>
          Standalone <Icon href={windowPopout} />
        </Button>
        <div className="flex-spacer"></div>
        <div className="version">
          {versionString && <pre>{versionString}</pre>}
        </div>
      </header>
      <div className="application-bar">
        <AppBarButton
          onClick={() => setLeftPanel("gallery")}
          active={leftPanel === "gallery"}
          label="Gallery"
        >
          <Icon href={image} size="large" />
        </AppBarButton>
        <AppBarButton
          onClick={() => setLeftPanel("editor")}
          active={leftPanel === "editor"}
          label="Editor"
        >
          <Icon href={script} size="large" />
        </AppBarButton>
        <Divider />
        <AppBarButton
          onClick={() => {
            resetSandcastle();
            setLeftPanel("editor");
          }}
          label="New Sandcastle"
        >
          <Icon href={add} size="large" />
        </AppBarButton>
        <AppBarButton
          label="Documentation"
          onClick={openDocsPage}
          onAuxClick={openDocsPage}
        >
          <Icon href={documentation} size="large" />
        </AppBarButton>
        <div className="flex-spacer"></div>
        <Divider />
        <AppBarButton
          onClick={() =>
            updateSettings({
              theme: settings.theme === "dark" ? "light" : "dark",
            })
          }
          label="Toggle theme"
        >
          <Icon href={settings.theme === "dark" ? moon : sun} size="large" />
        </AppBarButton>
        <AppBarButton
          label="Settings"
          onClick={() => {
            setSettingsOpen(true);
          }}
        >
          <Icon href={settingsIcon} size="large" />
        </AppBarButton>
        <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
      </div>
      <Allotment defaultSizes={[40, 60]}>
        <Allotment.Pane minSize={400} className="left-panel">
          {leftPanel === "editor" && (
            <SandcastleEditor
              darkTheme={settings.theme === "dark"}
              onJsChange={(value: string = "") =>
                dispatch({ type: "setCode", code: value })
              }
              onHtmlChange={(value: string = "") =>
                dispatch({ type: "setHtml", html: value })
              }
              onRun={() => runSandcastle()}
              js={codeState.code}
              html={codeState.html}
              setJs={(newCode) => dispatch({ type: "setCode", code: newCode })}
            />
          )}
          <StoreContext value={galleryItemStore}>
            <Gallery
              hidden={leftPanel !== "gallery"}
              onRunCode={onRunCode}
              onOpenCode={onOpenCode}
            />
          </StoreContext>
        </Allotment.Pane>
        <Allotment.Pane className="right-panel">
          <RightSideAllotment
            ref={rightSideRef}
            consoleCollapsedHeight={consoleCollapsedHeight}
            consoleExpanded={consoleExpanded}
            setConsoleExpanded={setConsoleExpanded}
          >
            <Allotment.Pane minSize={200}>
              {!isLoadPending && (
                <Bucket
                  code={codeState.committedCode}
                  html={codeState.committedHtml}
                  runNumber={codeState.runNumber}
                  highlightLine={(lineNumber) => highlightLine(lineNumber)}
                  appendConsole={appendConsole}
                  resetConsole={resetConsole}
                />
              )}
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
