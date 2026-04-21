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
import "./copilot/ThinkingBlock.css";

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
import type * as monaco from "monaco-editor";
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
  aiSparkle,
} from "./icons.ts";
import {
  ChatPanel,
  ConsoleChatAction,
  ErrorBoundary,
  DiffReviewPanel,
  DiffApplier,
  DiffMatcher,
  useInlineChanges,
  type ApplyResult,
  type CodeContext,
  type DiffBlock,
  type DiffError,
  type ExecutionResult,
} from "./copilot";
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

type PendingChatDraft = {
  id: string;
  text: string;
};

function formatConsoleMessageForChat(log: ConsoleMessage) {
  const labels: Record<ConsoleMessageType, string> = {
    log: "Console output",
    warn: "Console warning",
    error: "Console error",
    special: "Console message",
  };

  return `${labels[log.type]}:\n${log.message}`;
}

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
        <Button
          tone="accent"
          onClick={onClick}
          onAuxClick={onAuxClick}
          aria-label={label}
        >
          {children}
        </Button>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={label} type="label" placement="right">
      <Button
        variant="ghost"
        onClick={onClick}
        onAuxClick={onAuxClick}
        aria-label={label}
      >
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
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [pendingChatDraft, setPendingChatDraft] =
    useState<PendingChatDraft | null>(null);
  const [activeTab, setActiveTab] = useState<"js" | "html">("js");
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const autoRunTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const activeWorkerRef = useRef<Worker | null>(null);
  const diffApplierRef = useRef<DiffApplier | null>(null);
  useEffect(
    () => () => {
      clearTimeout(autoRunTimeoutRef.current);
      activeWorkerRef.current?.terminate();
    },
    [],
  );

  const [sandcastleTitle, setSandcastleTitle] = useState("New Sandcastle");
  const [description, setDescription] = useState("");
  const { setPageTitle, setIsDirty } = usePageTitle();

  const [codeState, dispatch] = useCodeState();

  const {
    api: inlineChangesApi,
    widget: inlineChangesWidget,
    changes: inlineChanges,
  } = useInlineChanges({
    editor,
    js: codeState.code,
    html: codeState.html,
    setJs: (code) => dispatch({ type: "setCode", code }),
    onHtmlChange: (code) => dispatch({ type: "setHtml", html: code }),
    activeTab,
    setActiveTab,
  });

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

  type RunCollection = {
    resolve: (
      errors: Array<{ message: string; type: "error" | "warn" }>,
    ) => void;
    collected: Array<{ message: string; type: "error" | "warn" }>;
    timeoutId: ReturnType<typeof setTimeout>;
  };

  const runCollectionRef = useRef<RunCollection | null>(null);

  const finishCollection = useCallback(() => {
    const current = runCollectionRef.current;
    if (!current) {
      return;
    }
    clearTimeout(current.timeoutId);
    runCollectionRef.current = null;
    current.resolve(current.collected);
  }, []);

  const handleRunComplete = useCallback(() => {
    finishCollection();
  }, [finishCollection]);

  const awaitNextRunErrors = useCallback((): Promise<
    Array<{ message: string; type: "error" | "warn" }>
  > => {
    // If a previous collection is still pending (e.g. user kicked off a new run
    // before the previous runComplete arrived), resolve it empty so callers
    // don't hang. The overtaking caller gets a fresh window.
    if (runCollectionRef.current) {
      const stale = runCollectionRef.current;
      clearTimeout(stale.timeoutId);
      runCollectionRef.current = null;
      stale.resolve([]);
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        const current = runCollectionRef.current;
        if (!current) {
          return;
        }
        runCollectionRef.current = null;
        current.resolve(current.collected);
      }, 2500);

      runCollectionRef.current = {
        resolve,
        collected: [],
        timeoutId,
      };
    });
  }, []);

  const appendConsole = useCallback(
    function appendConsole(type: ConsoleMessageType, message: string) {
      setConsoleMessages((prevConsoleMessages) => [
        ...prevConsoleMessages,
        { type, message, id: crypto.randomUUID() },
      ]);
      if (!consoleExpanded && type !== "log") {
        rightSideRef.current?.toggleExpanded();
      }
      // Feed the active run-error collection window, if any.
      const collection = runCollectionRef.current;
      if (collection && (type === "error" || type === "warn")) {
        collection.collected.push({ type, message });
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

  const handleSendConsoleLineToChat = useCallback((log: ConsoleMessage) => {
    setPendingChatDraft({
      id: crypto.randomUUID(),
      text: formatConsoleMessageForChat(log),
    });
    setChatPanelOpen(true);
  }, []);

  const handlePendingChatDraftConsumed = useCallback((draftId: string) => {
    setPendingChatDraft((currentDraft) =>
      currentDraft?.id === draftId ? null : currentDraft,
    );
  }, []);

  function runSandcastle() {
    dispatch({ type: "runSandcastle" });
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
  const loadFromUrlRef = useRef(loadFromUrl);
  useEffect(() => {
    loadFromUrlRef.current = loadFromUrl;
  });
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
      setInitialized(Boolean(loadFromUrlRef.current));
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
          html: html ?? defaultHtmlCode,
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

  const handleApplyAiCode = useCallback(
    (javascript?: string, html?: string, autoRun: boolean = true) => {
      setConsoleMessages([]);

      if (javascript) {
        dispatch({ type: "setCode", code: javascript });
        inlineChangesApi.applyAiEdit(javascript, "javascript");
      }
      if (html) {
        dispatch({ type: "setHtml", html });
        inlineChangesApi.applyAiEdit(html, "html");
      }
      // Auto-run after applying AI changes, suppressed during tool chain
      // execution so intermediate edits don't trigger broken preview states.
      if (autoRun) {
        clearTimeout(autoRunTimeoutRef.current);
        autoRunTimeoutRef.current = setTimeout(
          () => dispatch({ type: "runSandcastle" }),
          500,
        );
      }
    },
    [dispatch, inlineChangesApi],
  );

  const handleApplyAiDiff = useCallback(
    async (
      diffs: DiffBlock[],
      language: "javascript" | "html",
    ): Promise<ExecutionResult> => {
      const startTime = Date.now();

      setConsoleMessages([]);

      if (diffs.length > 3) {
        appendConsole("log", `⏳ Processing ${diffs.length} changes...`);
      }

      const currentCode =
        language === "javascript" ? codeState.code : codeState.html;

      let result;

      if (typeof Worker !== "undefined" && diffs.length > 5) {
        try {
          // Terminate any worker still in flight from a previous apply, without
          // this, two rapid applies would leak workers and the first one's
          // onmessage could fire against already-replaced code.
          activeWorkerRef.current?.terminate();

          const worker = new Worker(
            new URL("./copilot/ai/workers/diffWorker.ts", import.meta.url),
            { type: "module" },
          );
          activeWorkerRef.current = worker;

          result = await new Promise<ApplyResult>((resolve, reject) => {
            const timeout = setTimeout(() => {
              worker.terminate();
              activeWorkerRef.current = null;
              reject(new Error("Worker timeout after 30 seconds"));
            }, 30000);

            worker.onmessage = (e) => {
              clearTimeout(timeout);
              if (e.data.type === "result") {
                resolve(e.data.result);
              } else if (e.data.type === "error") {
                reject(new Error(e.data.error));
              }
              worker.terminate();
              activeWorkerRef.current = null;
            };

            worker.onerror = (error) => {
              clearTimeout(timeout);
              worker.terminate();
              activeWorkerRef.current = null;
              reject(error);
            };

            worker.postMessage({
              type: "applyDiffs",
              sourceCode: currentCode,
              diffs,
              options: {},
            });
          });
        } catch {
          if (!diffApplierRef.current) {
            diffApplierRef.current = new DiffApplier(new DiffMatcher());
          }
          result = await diffApplierRef.current.applyDiffsWithProgress(
            currentCode,
            diffs,
          );
        }
      } else {
        if (!diffApplierRef.current) {
          diffApplierRef.current = new DiffApplier(new DiffMatcher());
        }
        result = await diffApplierRef.current.applyDiffsWithProgress(
          currentCode,
          diffs,
        );
      }

      if (result.success && result.modifiedCode) {
        if (language === "javascript") {
          dispatch({ type: "setCode", code: result.modifiedCode });
          inlineChangesApi.applyAiEdit(result.modifiedCode, "javascript");
        } else {
          dispatch({ type: "setHtml", html: result.modifiedCode });
          inlineChangesApi.applyAiEdit(result.modifiedCode, "html");
        }

        const summary = `Applied ${result.appliedDiffs.length} change${result.appliedDiffs.length === 1 ? "" : "s"} successfully`;
        appendConsole("log", summary);

        // Kick off the run AND start collecting errors for this run window.
        const collectionPromise = awaitNextRunErrors();
        clearTimeout(autoRunTimeoutRef.current);
        autoRunTimeoutRef.current = setTimeout(
          () => dispatch({ type: "runSandcastle" }),
          500,
        );

        const runErrors = await collectionPromise;
        const onlyErrors = runErrors.filter((e) => e.type === "error");

        const executionTime = Date.now() - startTime;
        return {
          success: onlyErrors.length === 0,
          diffErrors: [],
          consoleErrors: onlyErrors,
          appliedCount: result.appliedDiffs.length,
          timestamp: Date.now(),
          executionTimeMs: executionTime,
        };
      }
      const failedCount = result.errors.length;
      const totalCount = diffs.length;
      const errorMessage = `Failed to apply ${failedCount} of ${totalCount} diff${totalCount === 1 ? "" : "s"}`;

      appendConsole("error", errorMessage);

      const errorMessages = result.errors.map(
        (error: DiffError) => error.message,
      );

      result.errors.forEach((error: DiffError, idx: number) => {
        appendConsole("error", `  ${idx + 1}. ${error.message}`);
        if (error.context) {
          appendConsole("error", `     Context: ${error.context}`);
        }
      });

      // If some diffs were applied successfully, still update the code
      let onlyErrors: Array<{ message: string; type: "error" | "warn" }> = [];
      if (result.appliedDiffs.length > 0 && result.modifiedCode) {
        appendConsole(
          "log",
          `Successfully applied ${result.appliedDiffs.length} change${result.appliedDiffs.length === 1 ? "" : "s"}`,
        );

        if (language === "javascript") {
          dispatch({ type: "setCode", code: result.modifiedCode });
          inlineChangesApi.applyAiEdit(result.modifiedCode, "javascript");
        } else {
          dispatch({ type: "setHtml", html: result.modifiedCode });
          inlineChangesApi.applyAiEdit(result.modifiedCode, "html");
        }

        // Kick off the run AND start collecting errors for this run window.
        const collectionPromise = awaitNextRunErrors();
        clearTimeout(autoRunTimeoutRef.current);
        autoRunTimeoutRef.current = setTimeout(
          () => dispatch({ type: "runSandcastle" }),
          500,
        );
        const runErrors = await collectionPromise;
        onlyErrors = runErrors.filter((e) => e.type === "error");
      }

      if (result.validation) {
        if (result.validation.conflicts.length > 0) {
          appendConsole(
            "warn",
            `Detected ${result.validation.conflicts.length} conflict${result.validation.conflicts.length === 1 ? "" : "s"}`,
          );
        }
        if (result.validation.unmatchedDiffs.length > 0) {
          appendConsole(
            "warn",
            `Could not match ${result.validation.unmatchedDiffs.length} diff${result.validation.unmatchedDiffs.length === 1 ? "" : "s"}`,
          );
        }
      }

      const executionTime = Date.now() - startTime;
      return {
        success: false,
        diffErrors: errorMessages,
        consoleErrors: onlyErrors,
        appliedCount: result.appliedDiffs.length,
        timestamp: Date.now(),
        executionTimeMs: executionTime,
      };
    },
    [
      codeState.code,
      codeState.html,
      appendConsole,
      dispatch,
      awaitNextRunErrors,
      inlineChangesApi,
    ],
  );

  const handleRunAndCollectErrors =
    useCallback(async (): Promise<ExecutionResult> => {
      const startTime = Date.now();

      const collectionPromise = awaitNextRunErrors();
      clearTimeout(autoRunTimeoutRef.current);
      dispatch({ type: "runSandcastle" });

      const runErrors = await collectionPromise;
      const onlyErrors = runErrors.filter((e) => e.type === "error");

      return {
        success: onlyErrors.length === 0,
        diffErrors: [],
        consoleErrors: onlyErrors,
        appliedCount: 0,
        timestamp: Date.now(),
        executionTimeMs: Date.now() - startTime,
      };
    }, [awaitNextRunErrors, dispatch]);

  const codeContext: CodeContext = useMemo(
    () => ({
      javascript: codeState.code,
      html: codeState.html,
      consoleMessages: consoleMessages
        .filter((msg) => msg.type !== "special")
        .map((msg) => ({
          type: msg.type as "log" | "warn" | "error",
          message: msg.message,
        })),
    }),
    [codeState.code, codeState.html, consoleMessages],
  );

  const handleClearConsole = useCallback(() => setConsoleMessages([]), []);

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
                ? "./images/Cesium_Logo_Color_Overlay_Light.png"
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
        <AppBarButton
          label="Cesium Copilot"
          onClick={() => setChatPanelOpen(!chatPanelOpen)}
          active={chatPanelOpen}
        >
          <Icon href={aiSparkle} size="large" />
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
        <Allotment.Pane minSize={0} maxSize={800} className="left-panel">
          {leftPanel === "editor" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <DiffReviewPanel
                diffs={inlineChanges.map((change) => ({
                  id: change.id,
                  diff: change.diff,
                  language: change.language,
                  originalCode: change.diff.search,
                  modifiedCode: change.diff.replace,
                  messageId: "", // Not needed for this use case
                }))}
                onAccept={(diffId) =>
                  inlineChangesApi.acceptInlineChange(diffId)
                }
                onReject={(diffId) =>
                  inlineChangesApi.rejectInlineChange(diffId)
                }
                onClose={() => inlineChangesApi.clearInlineChanges()}
              />
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
                  !initialized || isLoadPending
                    ? "// Loading..."
                    : codeState.code
                }
                html={
                  !initialized || isLoadPending
                    ? "<!-- Loading... -->"
                    : codeState.html
                }
                setJs={(newCode) =>
                  dispatch({ type: "setCode", code: newCode })
                }
                readOnly={!initialized}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
                onEditorMount={setEditor}
              />
              {inlineChangesWidget}
            </div>
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
                  highlightLine={() => {}}
                  appendConsole={appendConsole}
                  resetConsole={resetConsole}
                  onRunComplete={handleRunComplete}
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
                renderLogAction={(log, index) => (
                  <ConsoleChatAction
                    log={log}
                    index={index}
                    onSend={handleSendConsoleLineToChat}
                  />
                )}
              />
            </Allotment.Pane>
          </ViewerConsoleStack>
        </Allotment.Pane>
        {chatPanelOpen && (
          <Allotment.Pane
            minSize={250}
            maxSize={800}
            preferredSize={450}
            className="chat-panel-pane"
          >
            <ErrorBoundary>
              <ChatPanel
                onClose={() => setChatPanelOpen(false)}
                codeContext={codeContext}
                onApplyCode={handleApplyAiCode}
                onApplyDiff={handleApplyAiDiff}
                currentCode={codeContext}
                onClearConsole={handleClearConsole}
                pendingDraft={pendingChatDraft}
                onPendingDraftConsumed={handlePendingChatDraftConsumed}
                onRunAndCollectErrors={handleRunAndCollectErrors}
              />
            </ErrorBoundary>
          </Allotment.Pane>
        )}
      </Allotment>
    </Root>
  );
}

export default App;
