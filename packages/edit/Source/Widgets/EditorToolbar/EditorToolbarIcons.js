// @ts-check

/**
 * @typedef {object} EditorToolbarIcon
 * @property {string} path The SVG path, filled with the nonzero rule.
 * @property {number} width The view box width.
 * @property {number} height The view box height.
 * @private
 */

/**
 * @typedef {object} EditorToolbarComponentIcon
 * @property {string} cube The dimmed cube's path, in a 64 by 64 view box.
 * @property {string} highlight The highlighted components' path, drawn over the cube.
 * @private
 */

/** @ignore */
const objectIconPath =
  "M 32 8 L 54 19 L 32 30 L 10 19 Z " +
  "M 9 20 L 31 31 L 31 57 L 9 46 Z " +
  "M 33 31 L 55 20 L 55 46 L 33 57 Z";

// The visible corners of the wireframe cube in the Edit Mode and component
// icons, matching the Object Mode cube's outline.
const cubeTop = [32, 8];
const cubeRight = [55, 19.5];
const cubeRightBottom = [55, 45.5];
const cubeBottom = [32, 57];
const cubeLeftBottom = [9, 45.5];
const cubeLeft = [9, 19.5];
const cubeCenter = [32, 31];

const cubeCorners = [
  cubeTop,
  cubeRight,
  cubeRightBottom,
  cubeBottom,
  cubeLeftBottom,
  cubeLeft,
  cubeCenter,
];

const cubeEdges = [
  [cubeTop, cubeRight],
  [cubeRight, cubeRightBottom],
  [cubeRightBottom, cubeBottom],
  [cubeBottom, cubeLeftBottom],
  [cubeLeftBottom, cubeLeft],
  [cubeLeft, cubeTop],
  [cubeCenter, cubeLeft],
  [cubeCenter, cubeRight],
  [cubeCenter, cubeBottom],
];

/**
 * @param {number} value
 * @returns {number}
 * @ignore
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Creates a polygon path. Icons are filled with the nonzero rule, so every
 * shape winds clockwise to keep overlaps filled.
 * @param {number[][]} points
 * @returns {string}
 * @ignore
 */
function polygonPath(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    area += x0 * y1 - x1 * y0;
  }
  const clockwise = area < 0 ? [...points].reverse() : points;
  return `M ${clockwise.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L ")} Z`;
}

/**
 * Creates a path for a line, as a rectangle.
 * @param {number[]} start
 * @param {number[]} end
 * @param {number} width
 * @returns {string}
 * @ignore
 */
function linePath([x0, y0], [x1, y1], width) {
  const scale = width / 2 / Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) * scale;
  const ny = (x1 - x0) * scale;
  return polygonPath([
    [x0 + nx, y0 + ny],
    [x1 + nx, y1 + ny],
    [x1 - nx, y1 - ny],
    [x0 - nx, y0 - ny],
  ]);
}

/**
 * Creates a clockwise circle path.
 * @param {number[]} center
 * @param {number} radius
 * @returns {string}
 * @ignore
 */
function dotPath([x, y], radius) {
  const r = radius;
  return `M ${x - r} ${y} A ${r} ${r} 0 1 1 ${x + r} ${y} A ${r} ${r} 0 1 1 ${x - r} ${y} Z`;
}

/**
 * Creates a path for the cube's visible edges, with rounded corners.
 * @param {number} width
 * @returns {string}
 * @ignore
 */
function cubeWireframePath(width) {
  return [
    ...cubeEdges.map(([start, end]) => linePath(start, end, width)),
    ...cubeCorners.map((corner) => dotPath(corner, width / 2)),
  ].join(" ");
}

/** @ignore */
const wireframePath = cubeWireframePath(2.5);

/**
 * The Object Mode and Edit Mode icons.
 * @type {Object<string, EditorToolbarIcon>}
 * @ignore
 */
const modeIcons = {
  none: { path: objectIconPath, width: 64, height: 64 },
  edit: { path: wireframePath, width: 64, height: 64 },
};

/**
 * The component icons: a dimmed cube, and the highlighted components drawn
 * over it.
 * @type {Object<string, EditorToolbarComponentIcon>}
 * @ignore
 */
const componentIcons = {
  vertex: {
    cube: wireframePath,
    highlight: cubeCorners.map((corner) => dotPath(corner, 6)).join(" "),
  },
  edge: {
    cube: wireframePath,
    highlight: [
      linePath(cubeCenter, cubeBottom, 9),
      dotPath(cubeCenter, 4.5),
      dotPath(cubeBottom, 4.5),
    ].join(" "),
  },
  face: {
    cube: wireframePath,
    highlight: polygonPath([cubeTop, cubeRight, cubeCenter, cubeLeft]),
  },
};

/**
 * @type {Object<string, EditorToolbarIcon>}
 * @ignore
 */
const toolIcons = {
  select: {
    path: "M 17 12 L 17 52 L 27 43 L 33 56 L 41 52 L 35 39 L 49 39 Z",
    width: 64,
    height: 64,
  },
  translate: {
    path:
      "M 32 6 L 42 18 L 36 18 L 36 28 L 46 28 L 46 22 L 58 32 L 46 42 L 46 36 " +
      "L 36 36 L 36 46 L 42 46 L 32 58 L 22 46 L 28 46 L 28 36 L 18 36 L 18 42 " +
      "L 6 32 L 18 22 L 18 28 L 28 28 L 28 18 L 22 18 Z",
    width: 64,
    height: 64,
  },
};

/**
 * The icons drawn by an {@link EditorToolbar}, by entry ID.
 *
 * @private
 */
const EditorToolbarIcons = Object.freeze({
  /**
   * The Object Mode (<code>none</code>) and Edit Mode (<code>edit</code>) icons.
   * @type {Object<string, EditorToolbarIcon>}
   */
  mode: modeIcons,

  /**
   * The Vertex, Edge and Face icons.
   * @type {Object<string, EditorToolbarComponentIcon>}
   */
  component: componentIcons,

  /**
   * The default icons of tool entries.
   * @type {Object<string, EditorToolbarIcon>}
   */
  tool: toolIcons,
});

export default EditorToolbarIcons;
