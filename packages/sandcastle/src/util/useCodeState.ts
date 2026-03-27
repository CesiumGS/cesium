import { useReducer } from "react";

export type SandcastleAction =
  | { type: "reset"; defaultToken?: string }
  | { type: "resetDirty" }
  | { type: "setCode"; code: string }
  | { type: "setHtml"; html: string }
  | { type: "runSandcastle" }
  | { type: "setAndRun"; code?: string; html?: string };

export const defaultJsCode = `import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
`;
export const defaultHtmlCode = `<style>
  @import url(../templates/bucket.css);
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar"></div>
`;

type CodeState = {
  code: string;
  html: string;
  committedCode: string;
  committedHtml: string;
  runNumber: number;
  dirty: boolean;
};

export function useCodeState(): [
  CodeState,
  React.ActionDispatch<[action: SandcastleAction]>,
] {
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
        if (action.defaultToken) {
          console.log("load with token:", action.defaultToken);
          // TODO: this is a pretty hacky way to insert this but it "works" for now
          const codeWithToken = defaultJsCode.replace(
            "const viewer",
            `// This is your default ion access token\nCesium.Ion.defaultAccessToken = "${action.defaultToken}";\n\nconst viewer`,
          );
          return {
            ...initialState,
            code: codeWithToken,
            committedCode: codeWithToken,
          };
        }
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

  return [codeState, dispatch];
}
