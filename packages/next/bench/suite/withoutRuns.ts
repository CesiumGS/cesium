/**
 * Paths that work without benchmark runs; the shell shows the guided first
 * run for the others. The catalog's scenes are static, so Scenes lists them
 * (with its own "No runs yet" note) on a fresh machine.
 */
const WITHOUT_RUNS =
  /^\/(explorer|viewer|images|examples|scenes|start|lab)(\/|$)/;

/** Whether the view at `path` renders on a machine with no runs. */
export const worksWithoutRuns = (path: string): boolean =>
  WITHOUT_RUNS.test(path);
