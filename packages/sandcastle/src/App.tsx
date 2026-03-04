import {
  MouseEventHandler,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import "./App.css";

import { Anchor, Button, Divider, Text, Tooltip } from "@stratakit/bricks";
import { Icon, Root } from "@stratakit/foundations";
import { makeCompressedBase64String } from "./Helpers.ts";
import { getBaseUrl } from "./util/getBaseUrl.ts";

import {
  StoreContext,
  useGalleryItemStore,
  type GalleryItem,
} from "./Gallery/GalleryItemStore.ts";
import Gallery from "./Gallery/Gallery.js";

import { Bucket, BucketPlaceholder } from "./Bucket.tsx";
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
import { SandcastlePopover } from "./SandcastlePopover.tsx";
import { urlSpecifiesSandcastle } from "./Gallery/loadFromUrl.ts";
import {
  ViewerConsoleStack,
  ViewerConsoleStackRef,
} from "./ViewerConsoleStack.tsx";
import { usePageTitle } from "./util/usePageTitle.ts";
import {
  defaultHtmlCode,
  defaultJsCode,
  useCodeState,
} from "./util/useCodeState.ts";

const cesiumVersion = __CESIUM_VERSION__;
const versionString = __COMMIT_SHA__
  ? `Commit: ${__COMMIT_SHA__.replaceAll(/['"]/g, "").substring(0, 7)} - ${cesiumVersion}`
  : cesiumVersion;

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

function App() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const rightSideRef = useRef<ViewerConsoleStackRef>(null);
  const consoleCollapsedHeight = 33;
  const [consoleExpanded, setConsoleExpanded] = useState(false);

  const isStartingWithCode = useMemo(() => urlSpecifiesSandcastle(), []);
  const startOnEditor =
    isStartingWithCode || settings.defaultPanel === "editor";
  const [leftPanel, setLeftPanel] = useState<LeftPanel>(
    startOnEditor ? "editor" : "gallery",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [sandcastleTitle, setSandcastleTitle] = useState("New Sandcastle");
  const [description, setDescription] = useState("");
  const { setPageTitle, setIsDirty } = usePageTitle();

  const [codeState, dispatch] = useCodeState();

  useEffect(() => {
    setIsDirty(codeState.dirty);
  }, [setIsDirty, codeState.dirty]);

  useEffect(() => {
    setPageTitle(sandcastleTitle);
  }, [setPageTitle, sandcastleTitle]);

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

  const resetConsole = useCallback(
    ({ showMessage = false } = {}) => {
      if (codeState.runNumber > 0) {
        // the console should only be cleared by the Bucket when the viewer page
        // has actually reloaded and stopped sending console statements
        // otherwise some could bleed into the "next run"
        if (showMessage) {
          setConsoleMessages([
            {
              id: crypto.randomUUID(),
              type: "special",
              message: "Console was cleared",
            },
          ]);
        } else {
          setConsoleMessages([]);
        }
      }
    },
    [codeState.runNumber],
  );

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

    setSandcastleTitle("New Sandcastle");
    setDescription("");
  }

  function openStandalone() {
    const searchParams = new URLSearchParams(window.location.search);

    const standaloneUrl = `${getBaseUrl().replace("index.html", "")}standalone.html`;

    const url = new URL(standaloneUrl);
    const currentId = searchParams.get("id");
    if (currentId && !codeState.dirty) {
      url.searchParams.set("id", currentId);
    } else {
      const base64String = makeCompressedBase64String({
        code: codeState.code,
        html: codeState.html,
      });
      url.hash = `c=${base64String}`;
    }

    window.open(url, "_blank");
    window.focus();
  }

  // Starts fetching data
  const galleryItemStore = useGalleryItemStore();

  const [initialized, setInitialized] = useState(false);
  const [isLoadPending, startLoadPending] = useTransition();
  const { useLoadFromUrl } = galleryItemStore;
  const loadFromUrl = useLoadFromUrl();
  useEffect(() => {
    const load = () =>
      startLoadPending(async () => {
        try {
          if (isLoadPending || !loadFromUrl) {
            return;
          }
          const data = await loadFromUrl();
          if (!data) {
            return;
          }

          const { code, html, title } = data;

          startLoadPending(() => {
            if (isLoadPending) {
              return;
            }
            setSandcastleTitle(title);
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

    if (!initialized && loadFromUrl) {
      setInitialized(true);
      load();
    }

    // Listen to browser forward/back navigation and try to load from URL
    // this is necessary because of the pushState used for faster gallery loading
    const stateLoad = () => {
      if (!confirmLeave()) {
        return false;
      }

      load();
    };
    window.addEventListener("popstate", stateLoad);
    return () => window.removeEventListener("popstate", stateLoad);
  }, [
    initialized,
    isLoadPending,
    loadFromUrl,
    confirmLeave,
    appendConsole,
    dispatch,
  ]);

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
        }

        setSandcastleTitle(title);
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
    [confirmLeave, appendConsole, dispatch],
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
        <MetadataPopover title={sandcastleTitle} description={description} />
        <SharePopover code={codeState.code} html={codeState.html} />
        <Divider aria-orientation="vertical" />
        <Button onClick={() => openStandalone()}>
          Standalone <Icon href={windowPopout} />
        </Button>
        <div className="flex-spacer"></div>
        <SandcastlePopover
          disclosure={
            <Text variant="body-md" className="metadata">
              Feedback & Issues
            </Text>
          }
          autoFocus={false}
        >
          <p>
            Help us continue to improve Sandcastle. Report a problem or share
            your thoughts in{" "}
            <Anchor
              href="https://github.com/CesiumGS/cesium/issues/12857"
              target="_blank"
            >
              this issue
            </Anchor>
          </p>
        </SandcastlePopover>
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
          <Icon href={`${image}#icon-large`} size="large" />
        </AppBarButton>
        <AppBarButton
          onClick={() => setLeftPanel("editor")}
          active={leftPanel === "editor"}
          label="Editor"
        >
          <Icon href={`${script}#icon-large`} size="large" />
        </AppBarButton>
        <Divider />
        <AppBarButton
          onClick={() => {
            resetSandcastle();
            setLeftPanel("editor");
          }}
          label="New Sandcastle"
        >
          <Icon href={`${add}#icon-large`} size="large" />
        </AppBarButton>
        <AppBarButton
          label="Documentation"
          onClick={openDocsPage}
          onAuxClick={openDocsPage}
        >
          <Icon href={`${documentation}#icon-large`} size="large" />
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
          <Icon
            href={`${settings.theme === "dark" ? moon : sun}#icon-large`}
            size="large"
          />
        </AppBarButton>
        <AppBarButton
          label="Settings"
          onClick={() => {
            setSettingsOpen(true);
          }}
        >
          <Icon href={`${settingsIcon}#icon-large`} size="large" />
        </AppBarButton>
        <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
      </div>
      <Allotment defaultSizes={[40, 60]} className="content">
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
              js={
                !initialized || isLoadPending ? "// Loading..." : codeState.code
              }
              html={
                !initialized || isLoadPending
                  ? "<!-- Loading... -->"
                  : codeState.html
              }
              setJs={(newCode) => dispatch({ type: "setCode", code: newCode })}
              readOnly={!initialized}
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
          <ViewerConsoleStack
            ref={rightSideRef}
            consoleCollapsedHeight={consoleCollapsedHeight}
            consoleExpanded={consoleExpanded}
            setConsoleExpanded={setConsoleExpanded}
          >
            <Allotment.Pane minSize={200}>
              {!initialized || isLoadPending ? (
                <BucketPlaceholder />
              ) : (
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
                resetConsole={resetConsole}
              />
            </Allotment.Pane>
          </ViewerConsoleStack>
        </Allotment.Pane>
      </Allotment>
    </Root>
  );
}

export default App;
