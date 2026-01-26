import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { useGalleryItemStore } from "./Gallery/GalleryItemStore";
import { Bucket, BucketPlaceholder } from "./Bucket";
import { Root } from "@stratakit/foundations";
import { RightSideAllotment, RightSideRef, SandcastleAction } from "./App";
import {
  ConsoleMessage,
  ConsoleMessageType,
  ConsoleMirror,
} from "./ConsoleMirror";
import { Allotment } from "allotment";

import "allotment/dist/style.css";
import "./AppStandalone.css";

// TODO: may not want any default in standalone?
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

function AppStandalone() {
  const [title, setTitle] = useState("New Sandcastle");
  const galleryItemStore = useGalleryItemStore();
  const loadFromUrl = galleryItemStore.useLoadFromUrl();
  const [initialized, setInitialized] = useState(false);
  const [isLoadPending, startLoadPending] = useTransition();

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

  const rightSideRef = useRef<RightSideRef>(null);
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
        // rightSideRef.current?.toggleExpanded();
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
  }, [initialized, isLoadPending, loadFromUrl, appendConsole]);

  return (
    <Root
      id="root"
      className="sandcastle-root"
      density="dense"
      colorScheme="dark"
      synchronizeColorScheme
    >
      <RightSideAllotment
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
      </RightSideAllotment>
    </Root>
  );
}

export default AppStandalone;
