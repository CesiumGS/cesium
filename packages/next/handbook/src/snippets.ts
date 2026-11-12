import type { ApiGroup } from "./apiMap.ts";

/**
 * Compiled files, shown as they are: each `snippets/<id>.next.ts` compiles
 * against the real types (`tsc -p handbook`, and a test), and each
 * `<id>.1x.txt` has its `Cesium.` names checked against 1.x's source. What's
 * above `// ---` and below `// --- end` is there only to make it compile.
 */
const FILES = import.meta.glob("../snippets/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** The part of a compiled file a reader sees. */
export function snippetText(file: string): string {
  const raw = FILES[`../snippets/${file}`] ?? "";
  const start = raw.indexOf("// ---\n");
  const from = start < 0 ? raw : raw.slice(start + "// ---\n".length);
  const end = from.indexOf("// --- end");
  return (end < 0 ? from : from.slice(0, end))
    .replaceAll("../../widgets/index.ts", "./widgets/index.ts")
    .trim();
}

export interface Task {
  id: string;
  title: string;
  group: ApiGroup;
  /** What changed, in a sentence or two. */
  note: string;
  /** No 2.0 side: why, plainly. */
  noNext?: string;
}

export const TASKS: readonly Task[] = [
  {
    id: "viewer",
    title: "Create a viewer with terrain and imagery",
    group: "viewer",
    note: "Creating a viewer is asynchronous, so every app's start-up changes. Terrain is named by an option, with no terrain or imagery objects to make.",
  },
  {
    id: "tileset",
    title: "Load a 3D Tiles tileset from ion",
    group: "tiles",
    note: "One call adds and loads it. There's no primitives collection. The 2.0 zoom moves the camera at once, where 1.x flies.",
  },
  {
    id: "style",
    title: "Style a tileset",
    group: "tiles",
    note: "The expressions read the same. A style is given when the tileset is added, not assigned later, and it runs on the GPU.",
  },
  {
    id: "camera",
    title: "Move the camera to a place",
    group: "scene",
    note: "2.0 has no timed flights yet, so this isn't the same effect: the camera arrives at once.",
  },
  {
    id: "pick",
    title: "Pick a feature under a click",
    group: "picking",
    note: "A pick is a promise, and it returns plain properties, not a live feature. Clicks are ordinary DOM events.",
  },
  {
    id: "height",
    title: "Read the height at a point",
    group: "globe",
    note: "2.0 takes plain radians and returns numbers, and it can hit tilesets as well as terrain. 1.x's call here updates the objects you pass, and reads terrain only.",
  },
  {
    id: "model",
    title: "Add a glTF model",
    group: "models",
    note: "A model is a resource you place, in degrees, and can place again. 2.0's clamp settles once, on the most detailed ground.",
  },
  {
    id: "events",
    title: "Hear about tile loads and errors",
    group: "events",
    note: "2.0 reports a request starting, and has no event yet for a tile finishing or failing. Engine errors of every kind come through one call.",
  },
  {
    id: "views",
    title: "Show one scene in two views",
    group: "viewer",
    note: "1.x needs two viewers, each with its own WebGL context and copy of the content. 2.0 shares one device, world and tile cache.",
  },
  {
    id: "shader",
    title: "Write a custom shader",
    group: "shaders",
    note: "GLSL becomes WGSL or Slang, so 1.x shader text must be rewritten. A shader that fails falls back to the engine's.",
  },
  {
    id: "exaggeration",
    title: "Exaggerate heights",
    group: "scene",
    note: "Exaggeration is a node placed over the content it exaggerates, not a scene setting. The Moon and the camera aren't under it, and picks and measurements still return true heights. A view can hold its own value.",
  },
  {
    id: "clipping",
    title: "Clip content with a plane",
    group: "tiles",
    note: "A clip belongs to the world, not to a tileset, and is named in a reference frame. Views opt in, and a set can leave what it cuts as a translucent ghost.",
  },
  {
    id: "ready",
    title: "Wait until everything has loaded",
    group: "events",
    note: "One promise for a view, where 1.x has an event per tileset. It is provisional.",
  },
  {
    id: "time",
    title: "Set and start the clock",
    group: "time",
    note: "An Instant states its time scale and leap seconds, the clock holds UTC milliseconds, and playing is a mode.",
  },
  {
    id: "points",
    title: "Draw a point on the globe",
    group: "entities",
    note: "2.0 has no Entity API, so this isn't a direct swap: a PointSource is a typed array for many points, updated on the GPU, and what it looks like comes from a vector style.",
  },
  {
    id: "math",
    title: "Add two vectors",
    group: "math",
    note: "Classes give way to typed arrays and functions, and the out parameter comes first.",
  },
  {
    id: "geojson",
    title: "Load GeoJSON",
    group: "entities",
    note: "1.x loads it as entities.",
    noNext:
      "No 2.0 equivalent yet. CZML, KML and GeoJSON are outside the proof of concept (the overall plan, section 1).",
  },
];
