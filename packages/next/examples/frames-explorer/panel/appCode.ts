// The app code a scenario shows under its answer, "How these frames are
// defined" (Task 7b): the lines of the example's own source that create one
// joint frame through the public Frame API, read from the file itself (the
// `#region joint-frame` markers in scenarios/jointChain.ts) and rendered as
// text, so the panel never shows code the app doesn't run.
import jointChainSource from "../scenarios/jointChain.ts?raw";
import type { ScenarioId } from "../scenarios/spec.ts";

/** The lines between `// #region <name>` and `// #endregion <name>` in `source`, dedented. */
export function sourceRegion(source: string, name: string): string {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.trim() === `// #region ${name}`);
  const end = lines.findIndex((l) => l.trim() === `// #endregion ${name}`);
  if (start < 0 || end <= start) {
    throw new Error(`appCode: no region "${name}" in the source`);
  }
  const body = lines.slice(start + 1, end);
  const indent = Math.min(
    ...body
      .filter((l) => l.trim() !== "")
      .map((l) => l.length - l.trimStart().length),
  );
  return body.map((l) => l.slice(indent)).join("\n");
}

/** A scenario's app code: what it is, the file it comes from, and the lines. */
export interface AppCode {
  summary: string;
  file: string;
  code: string;
}

/** The scenarios that show app code, by id. */
export const APP_CODE: Readonly<Partial<Record<ScenarioId, AppCode>>> = {
  "robot-arm": {
    summary:
      "Each joint is a frame your app builds with the public Frame API: its parent, a function that writes the child-to-parent matrix, no cache (the angle is state beyond the instant) and the accuracy its spec sheet states. The library composes those accuracies to the tool.",
    file: "examples/frames-explorer/scenarios/jointChain.ts",
    code: sourceRegion(jointChainSource, "joint-frame"),
  },
};
