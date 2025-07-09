import { Root } from "@stratakit/foundations";
import { Allotment, AllotmentHandle } from "allotment";
import "allotment/dist/style.css";
import { useEffect, useRef, useState } from "react";
import Bucket from "./Bucket";
import { Button } from "@stratakit/bricks";
import "./TestApp.css";
import classNames from "classnames";
import { GalleryItem } from "./Gallery";
import SandcastleEditor, { SandcastleEditorRef } from "./SandcastleEditor";
import { useLocalStorage } from "./util/useLocalStorage";

const defaultJsCode = `//import * as Cesium from "cesium";

//const viewer = new Cesium.Viewer("cesiumContainer");

console.log("Sandcastle loaded");
document.body.style.background = \`
  no-repeat center/30% url(../images/cesium-logomark.svg),
  linear-gradient(to bottom, lightskyblue, lightgreen)\`;
`;

const defaultHtmlCode = `<style>
  @import url(../templates/bucket.css);
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar"></div>
`;

const GALLERY_BASE = __GALLERY_BASE_URL__;

function Gallery({ loadDemo }: { loadDemo: (item: GalleryItem) => void }) {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  useEffect(() => {
    let ignore = false;
    async function fetchGallery() {
      const req = await fetch(`${GALLERY_BASE}/list.json`);
      const resp = await req.json();

      if (!ignore) {
        setGalleryItems(resp.entries);
        setGalleryLoaded(true);
      }
    }
    fetchGallery();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="gallery-list">
      {!galleryLoaded ? (
        <p>⟳</p>
      ) : (
        galleryItems.map((demo) => (
          <Button onClick={() => loadDemo(demo)} key={demo.id}>
            {demo.title}
          </Button>
        ))
      )}
    </div>
  );
}

function ConsoleMirror({
  logs,
  expanded: consoleExpanded,
  toggleExpanded,
}: {
  logs: string[];
  expanded: boolean;
  toggleExpanded: () => void;
}) {
  return (
    <div
      className={classNames("console-mirror", {
        expanded: consoleExpanded,
      })}
    >
      <div className="console-snapshot" onClick={toggleExpanded}>
        <div className="icon-button">^</div>
        <span onClick={toggleExpanded}>Console</span>
        <div className="badge">1</div>
      </div>
      <div className="logs">
        {logs.map((log, i) => (
          <pre key={i}>
            {i + 1}: {log}
          </pre>
        ))}
      </div>
    </div>
  );
}

export default function TestApp() {
  const [theme, setTheme] = useLocalStorage<"dark" | "light">(
    "sandcastle/theme",
    "dark",
  );
  useEffect(() => {
    // TODO: This should be managed by Stratakit ideally
    document.documentElement.dataset.colorScheme = theme;
  }, [theme]);

  const editorRef = useRef<SandcastleEditorRef>(null);

  const rightSideRef = useRef<AllotmentHandle>(null);
  const rightSideSizes = useRef<number[]>([0, 0]);

  const consoleCollapsedHeight = 26;
  const [consoleExpanded, setConsoleExpanded] = useState(false);
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

  const codeState = {
    committedCode: defaultJsCode,
    committedHtml: defaultHtmlCode,
    runNumber: 0,
  };
  const [jsCode, setJsCode] = useState(defaultJsCode);

  function highlightLine(lineNumber: number) {
    console.log("highlight line", lineNumber);
  }

  const [leftPanel, setLeftPanel] = useState<"editor" | "gallery">("gallery");

  return (
    <Root colorScheme={theme} density="dense" className="sandcastle-root">
      <header className="header">
        <div className="logo">
          <img
            src={
              theme === "dark"
                ? "./images/Cesium_Logo_overlay.png"
                : "./images/Cesium_Logo_Color_Overlay.png"
            }
            style={{ width: "118px" }}
          />
        </div>
        <div className="metadata">New Sandcastle</div>
        <Button tone="accent">Share</Button>
        <div className="flex-spacer"></div>
        <div className="version">Cesium 1.131</div>
      </header>
      <div className="application-bar">
        <Button
          onClick={() => setLeftPanel("editor")}
          tone={leftPanel === "editor" ? "accent" : "neutral"}
        >
          Code
        </Button>
        <Button
          onClick={() => setLeftPanel("gallery")}
          tone={leftPanel === "gallery" ? "accent" : "neutral"}
        >
          Gallery
        </Button>
        <div className="flex-spacer"></div>
        <Button
          onClick={() =>
            theme === "dark" ? setTheme("light") : setTheme("dark")
          }
        >
          Theme
        </Button>
        <Button>Settings</Button>
      </div>
      <Allotment>
        <Allotment.Pane minSize={400} className="left-panel">
          {leftPanel === "editor" && (
            <>
              {/* <SandcastleEditorSimple theme={theme} code={jsCode} /> */}
              <SandcastleEditor
                ref={editorRef}
                darkTheme={theme === "dark"}
                onJsChange={(value: string = "") => setJsCode(value)}
                onHtmlChange={(value: string = "") =>
                  console.log("change html", value)
                }
                onRun={() => console.log("run")}
                js={jsCode}
                html={defaultHtmlCode}
              />
            </>
          )}
          {leftPanel === "gallery" && (
            <Gallery
              loadDemo={(item) => {
                console.log("load demo", item);
                setJsCode(`// ${item.title}\n// ${item.description}`);
                setLeftPanel("editor");
              }}
            />
          )}
        </Allotment.Pane>
        <Allotment.Pane className="right-panel">
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
              } else if (
                consoleSize > consoleCollapsedHeight &&
                !consoleExpanded
              ) {
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
            <Allotment.Pane minSize={100}>
              <Bucket
                code={codeState.committedCode}
                html={codeState.committedHtml}
                runNumber={codeState.runNumber}
                highlightLine={(lineNumber) => highlightLine(lineNumber)}
              ></Bucket>
            </Allotment.Pane>
            <Allotment.Pane
              preferredSize={consoleCollapsedHeight}
              minSize={consoleCollapsedHeight}
            >
              <ConsoleMirror
                logs={[
                  "Lorem ipsum dolor sit amet consectetur, adipisicing elit.",
                  "Sed optio officiis molestiae libero soluta harum porro dolor totam error rem!",
                  "Libero maiores quidem illo eveniet dolor voluptas magnam rem repellat?",
                ]}
                expanded={consoleExpanded}
                toggleExpanded={toggleExpanded}
              />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
      </Allotment>
    </Root>
  );
}
