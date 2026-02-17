import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useGalleryItemStore } from "../Gallery/GalleryItemStore";
import { Bucket, BucketPlaceholder } from "../Bucket";
import { Root } from "@stratakit/foundations";
import {
  ConsoleMessage,
  ConsoleMessageType,
  ConsoleMirror,
} from "../ConsoleMirror";
import { Allotment } from "allotment";

import "allotment/dist/style.css";
import "./AppStandalone.css";
import {
  ViewerConsoleStack,
  ViewerConsoleStackRef,
} from "../ViewerConsoleStack";
import { usePageTitle } from "../util/usePageTitle";
import {
  defaultHtmlCode,
  defaultJsCode,
  useCodeState,
} from "../util/useCodeState";

function AppStandalone() {
  const galleryItemStore = useGalleryItemStore();
  const loadFromUrl = galleryItemStore.useLoadFromUrl();
  const [initialized, setInitialized] = useState(false);
  const [isLoadPending, startLoadPending] = useTransition();

  const { setPageTitle } = usePageTitle();

  const [codeState, dispatch] = useCodeState();

  const rightSideRef = useRef<ViewerConsoleStackRef>(null);
  const consoleCollapsedHeight = 33;
  const [consoleExpanded, setConsoleExpanded] = useState(false);
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
            setPageTitle(title);
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
      load();
    };
    window.addEventListener("popstate", stateLoad);
    return () => window.removeEventListener("popstate", stateLoad);
  }, [
    initialized,
    isLoadPending,
    loadFromUrl,
    appendConsole,
    dispatch,
    setPageTitle,
  ]);

  return (
    <Root
      id="root"
      className="sandcastle-root"
      density="dense"
      colorScheme="dark"
      synchronizeColorScheme
    >
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
              highlightLine={() => {
                /* We don't have an editor to even highlight */
              }}
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
    </Root>
  );
}

export default AppStandalone;
