import { ProjectBetsView } from "./Projects.tsx";
import type { WorkViewDef } from "./Work.tsx";

/**
 * Mounts the Projects view (CS-748; DESIGN.md, "The Projects view") in
 * the roadmap's row, after Release. It keeps the older view's ID, so it
 * takes that view's place and its links (`roadmap=projects`) keep
 * working; the view itself lives in Projects.tsx.
 */
export const workView: WorkViewDef = {
  id: "projects",
  label: "Projects",
  question:
    "Each project as a bet: where it lands, what is checked, what it holds",
  place: "roadmap",
  order: 30,
  proposals: true,
  Component: ProjectBetsView,
};
