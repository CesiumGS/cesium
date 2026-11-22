/** The CSG sample's styles: a CAD workspace laid over the view (toolbar, feature tree, properties, status bar). */
export const CSS = `
.csg-view {
  --csg-bg: color-mix(in oklab, var(--stratakit-color-bg-page-base, Canvas) 94%, transparent);
  --csg-fg: var(--stratakit-color-text-neutral-primary, CanvasText);
  --csg-muted: var(--stratakit-color-text-neutral-secondary, color-mix(in oklab, CanvasText 65%, transparent));
  --csg-line: var(--stratakit-color-border-neutral-base, color-mix(in oklab, CanvasText 18%, transparent));
  --csg-accent: var(--stratakit-color-bg-accent-base, var(--cesium-ui-accent, AccentColor));
  --csg-on-accent: var(--stratakit-color-text-accent-on-base, #fff);
  --csg-hover: color-mix(in oklab, var(--csg-fg) 9%, transparent);
  --csg-field: var(--stratakit-color-bg-page-depth, color-mix(in oklab, var(--csg-fg) 7%, transparent));
  --csg-radius: var(--stratakit-radius-md, 6px);
  container-type: inline-size;
}
.csg-view:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: -2px; }
.csg-view canvas { transition: opacity 160ms; }
.csg-view[data-loading] canvas { opacity: 0.5; }
.csg-view[data-cursor="grab"] canvas { cursor: grab; }
.csg-view[data-cursor="grabbing"] canvas { cursor: grabbing; }
.csg-view[data-cursor="pointer"] canvas { cursor: pointer; }
.csg-view[data-cursor="ns"] canvas { cursor: ns-resize; }
@media (prefers-reduced-motion: reduce) {
  .csg-view canvas { transition: none; }
  .csg-spinner { animation: none; }
}
/* The page's stage is tall enough for a CAD window. */
.examples-stage:has(.csg-view) { height: max(560px, calc(100vh - 220px)); }

/* The gizmo and the push-pull handle, drawn over the canvas on a 2D canvas of their own. */
.csg-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }

/* The workspace: a grid over the view whose empty cells let the pointer through to it. */
.csg-app {
  position: absolute; inset: 0; z-index: 2; pointer-events: none;
  display: grid; gap: 8px;
  grid-template-columns: var(--csg-left, 268px) minmax(0, 1fr) var(--csg-right, 276px);
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: "bar bar bar" "tree . props" "status status status";
  font: 400 12px/16px var(--cesium-ui-font, system-ui, sans-serif);
  color: var(--csg-fg);
}
.csg-app > * { pointer-events: auto; }
.csg-app[data-left="off"] { --csg-left: 0px; }
.csg-app[data-left="off"] .csg-tree-panel { display: none; }
.csg-app[data-right="off"] { --csg-right: 0px; }
.csg-app[data-right="off"] .csg-props-panel { display: none; }
.csg-app :where(button, input, select) { font: inherit; color: inherit; }
.csg-app :where(h4) { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; color: var(--csg-muted); }

/* The toolbar: groups of icon buttons. */
.csg-toolbar {
  grid-area: bar; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 2px;
  padding: 4px 8px; background: var(--csg-bg); border-bottom: 1px solid var(--csg-line);
  backdrop-filter: blur(10px); position: relative; z-index: 4;
}
.csg-group-title { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--csg-muted); margin: 0 4px 0 6px; }
.csg-divider { width: 1px; align-self: stretch; margin: 3px 6px; background: var(--csg-line); }
.csg-spacer { flex: 1; }
.csg-btn {
  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  min-width: 30px; height: 30px; padding: 0 6px; box-sizing: border-box;
  border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer;
}
.csg-btn:hover:not(:disabled) { background: var(--csg-hover); }
.csg-btn:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: 1px; }
.csg-btn[aria-pressed="true"], .csg-btn[aria-expanded="true"] { background: var(--csg-accent); color: var(--csg-on-accent); }
.csg-btn:disabled { opacity: .35; cursor: default; }
.csg-btn-text { font-weight: 500; }
.csg-btn[data-tip]:hover::after, .csg-btn[data-tip]:focus-visible::after {
  content: attr(data-tip); position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  white-space: nowrap; z-index: 30; padding: 3px 8px; border-radius: 4px; pointer-events: none;
  background: #1f2328; color: #fff; font-size: 11px; font-weight: 400;
}
.csg-toolbar .csg-btn:first-child[data-tip]:hover::after { left: 0; transform: none; }
.csg-segmented {
  display: inline-grid; grid-auto-flow: column; grid-auto-columns: 1fr; padding: 2px; gap: 2px;
  border-radius: var(--csg-radius); background: var(--csg-field); border: 1px solid var(--csg-line);
}
.csg-segmented button {
  border: 0; border-radius: 4px; background: transparent; padding: 4px 8px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.csg-segmented button:hover { background: var(--csg-hover); }
.csg-segmented button[aria-pressed="true"] { background: var(--csg-accent); color: var(--csg-on-accent); }
.csg-segmented button:disabled { opacity: .6; cursor: progress; }

/* Panels: the feature tree on the left and the properties on the right. */
.csg-panel {
  display: flex; flex-direction: column; min-height: 0; max-height: 100%; align-self: start;
  background: var(--csg-bg); border: 1px solid var(--csg-line); border-radius: var(--csg-radius);
  box-shadow: 0 2px 12px rgb(0 0 0 / .18); backdrop-filter: blur(10px); overflow: hidden;
}
.csg-tree-panel { grid-area: tree; margin-left: 8px; }
.csg-props-panel { grid-area: props; margin-right: 8px; }
.csg-panel-head {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px; flex: none;
  border-bottom: 1px solid var(--csg-line);
}
.csg-panel-head h3 { margin: 0; flex: 1; font-size: 12px; font-weight: 600; }
.csg-panel-body { overflow: auto; min-height: 0; padding: 6px; display: flex; flex-direction: column; gap: 8px; }
.csg-hint { margin: 0; padding: 4px 2px; color: var(--csg-muted); }
.csg-hint kbd, .csg-keys kbd {
  display: inline-block; padding: 0 4px; border: 1px solid var(--csg-line); border-bottom-width: 2px; border-radius: 3px;
  font: 600 10px/14px var(--cesium-ui-font, system-ui, sans-serif); background: var(--csg-field);
}
.csg-keys { display: grid; grid-template-columns: auto 1fr; gap: 3px 8px; margin: 0; color: var(--csg-muted); }
.csg-keys dt { text-align: right; }
.csg-keys dd { margin: 0; }

/* The feature tree. */
.csg-tree { display: flex; flex-direction: column; gap: 1px; padding: 4px; outline: none; }
.csg-row {
  position: relative; display: flex; align-items: center; gap: 4px; height: 26px; box-sizing: border-box;
  padding: 0 4px 0 calc(4px + var(--depth, 0) * 14px); border-radius: 4px; cursor: default; user-select: none; touch-action: none;
}
.csg-row:hover { background: var(--csg-hover); }
.csg-row[aria-selected="true"] { background: var(--csg-accent); color: var(--csg-on-accent); }
.csg-row[data-under]:not([aria-selected="true"]) { background: color-mix(in oklab, var(--csg-accent) 16%, transparent); }
.csg-row:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: -2px; }
.csg-row[data-off] .csg-name { opacity: .5; text-decoration: line-through; }
.csg-row[data-dragging] { opacity: .45; }
.csg-row[data-drop="before"]::before, .csg-row[data-drop="after"]::after {
  content: ""; position: absolute; left: calc(4px + var(--depth, 0) * 14px); right: 2px; height: 2px; border-radius: 1px;
  background: var(--csg-accent); box-shadow: 0 0 0 1px var(--csg-bg); z-index: 2;
}
.csg-row[data-drop="before"]::before { top: -2px; }
.csg-row[data-drop="after"]::after { bottom: -2px; }
.csg-row[data-drop="into"] { outline: 2px solid var(--csg-accent); outline-offset: -2px; background: color-mix(in oklab, var(--csg-accent) 20%, transparent); }
.csg-twisty, .csg-mini {
  flex: none; display: inline-grid; place-items: center; width: 16px; height: 18px; padding: 0; border: 0; border-radius: 3px;
  background: transparent; cursor: pointer; color: inherit; opacity: .8;
}
.csg-twisty:hover, .csg-mini:hover { background: var(--csg-hover); opacity: 1; }
.csg-twisty[data-leaf] { visibility: hidden; }
.csg-kind { flex: none; display: inline-grid; place-items: center; width: 16px; }
.csg-swatch { flex: none; width: 8px; height: 8px; border-radius: 2px; border: 1px solid color-mix(in oklab, CanvasText 30%, transparent); }
.csg-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.csg-rename { flex: 1; min-width: 0; padding: 1px 3px; border: 1px solid var(--csg-accent); border-radius: 3px; background: var(--csg-bg); color: var(--csg-fg); }
.csg-badge {
  flex: none; padding: 0 5px; border-radius: 8px; font-size: 10px; line-height: 14px; font-variant-numeric: tabular-nums;
  background: color-mix(in oklab, currentColor 14%, transparent);
}
.csg-badge[data-role="base"] { background: color-mix(in oklab, #2da44e 30%, transparent); }
.csg-badge[data-role="cutter"] { background: color-mix(in oklab, #cf222e 26%, transparent); }
.csg-row .csg-eye { opacity: .55; }
.csg-row:hover .csg-eye, .csg-row[data-off] .csg-eye { opacity: 1; }
.csg-ghost {
  position: fixed; z-index: 50; pointer-events: none; padding: 3px 8px; border-radius: 5px; white-space: nowrap;
  background: var(--csg-accent); color: var(--csg-on-accent); box-shadow: 0 3px 12px rgb(0 0 0 / .3); font-size: 12px;
}
.csg-tip {
  position: fixed; z-index: 50; pointer-events: none; max-width: 260px; padding: 3px 8px; border-radius: 5px;
  background: #1f2328; color: #fff; font-size: 11px;
}
.csg-tip[data-bad] { background: #a40e26; }

/* Properties: compact numeric fields. */
.csg-title { display: flex; align-items: center; gap: 6px; }
.csg-title .csg-kind { width: 18px; }
.csg-title input {
  flex: 1; min-width: 0; padding: 3px 6px; border: 1px solid transparent; border-radius: 4px; background: transparent; font-weight: 600;
}
.csg-title input:hover { border-color: var(--csg-line); }
.csg-title input:focus { border-color: var(--csg-accent); background: var(--csg-field); outline: none; }
.csg-section { display: grid; gap: 3px; }
.csg-props { display: grid; gap: 3px; }
.csg-prop { display: grid; grid-template-columns: 82px minmax(0, 1fr); align-items: center; gap: 6px; }
.csg-scrub { cursor: ew-resize; color: var(--csg-muted); user-select: none; touch-action: none; }
.csg-scrub:hover { color: var(--csg-fg); }
.csg-number { display: flex; align-items: center; gap: 4px; min-width: 0; }
.csg-number input {
  flex: 1; min-width: 0; width: 100%; box-sizing: border-box; height: 24px; padding: 0 6px; text-align: right;
  font-variant-numeric: tabular-nums; background: var(--csg-field); border: 1px solid transparent; border-radius: 4px;
  -moz-appearance: textfield; appearance: textfield;
}
.csg-number input::-webkit-outer-spin-button, .csg-number input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.csg-number input:hover { border-color: var(--csg-line); }
.csg-number input:focus { border-color: var(--csg-accent); outline: none; }
.csg-unit { flex: none; width: 1.4em; color: var(--csg-muted); }
.csg-triple { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
.csg-triple .csg-prop { grid-template-columns: auto minmax(0, 1fr); gap: 3px; }
.csg-triple .csg-unit { display: none; }
.csg-operands { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.csg-operands li { display: flex; align-items: center; gap: 6px; padding: 2px 4px; border-radius: 4px; }
.csg-operands li:hover { background: var(--csg-hover); cursor: pointer; }
.csg-face { display: grid; gap: 4px; padding: 6px; border-radius: 5px; background: var(--csg-field); }
.csg-face b { font-weight: 600; }
.csg-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
.csg-crumbs button { padding: 0 5px; border: 0; border-radius: 3px; background: transparent; cursor: pointer; text-decoration: underline; }
.csg-crumbs button:hover { background: var(--csg-hover); }
.csg-crumb-face { padding: 0 5px; font-weight: 600; }
.csg-note { margin: 0; color: var(--csg-muted); }
.csg-button { padding: 4px 10px; border: 1px solid var(--csg-line); border-radius: 5px; background: var(--csg-field); cursor: pointer; }
.csg-button:hover { background: var(--csg-hover); }
.csg-field { display: grid; grid-template-columns: 6em 1fr 5.5em; align-items: center; gap: 8px; }
.csg-field input[type="range"] { min-width: 0; width: 100%; }
.csg-field .csg-number input { height: 22px; }
.csg-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.csg-toggles label { display: flex; align-items: center; justify-content: space-between; gap: 6px; }

/* Popovers: lighting, STEP, solid details. */
.csg-popover {
  position: absolute; z-index: 10; width: 290px; max-width: calc(100% - 16px); max-height: calc(100% - 60px); overflow: auto;
  display: grid; gap: 6px; padding: 10px; box-sizing: border-box;
  background: var(--stratakit-color-bg-page-base, Canvas);
  border: 1px solid var(--csg-line); border-radius: var(--csg-radius); box-shadow: 0 6px 24px rgb(0 0 0 / .3);
}
.csg-popover[hidden] { display: none; }
.csg-menu { display: grid; gap: 1px; margin: 0 -4px; }
.csg-menu button {
  display: grid; text-align: left; gap: 0; padding: 4px 8px; border: 0; border-radius: 4px; background: transparent; cursor: pointer;
}
.csg-menu button:hover { background: var(--csg-hover); }
.csg-menu small { color: var(--csg-muted); }
.csg-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.csg-table td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--csg-line); }
.csg-table td:last-child { text-align: right; }
.csg-ok { color: var(--stratakit-color-text-positive-base, #1a7f37); }
.csg-bad { color: var(--stratakit-color-text-critical-base, #cf222e); }

/* The status bar: kernel, evaluation, messages. */
.csg-statusbar {
  grid-area: status; display: flex; align-items: center; gap: 10px; min-width: 0; height: 26px; margin: 0 8px 8px 276px; padding: 0 8px;
  background: var(--csg-bg); border: 1px solid var(--csg-line); border-radius: var(--csg-radius); backdrop-filter: blur(10px);
  white-space: nowrap; overflow: hidden;
}
.csg-statusbar [data-bad] { color: var(--stratakit-color-text-critical-base, #cf222e); font-weight: 600; }
.csg-message { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.csg-mode { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--csg-muted); }
.csg-mode b { font-weight: 500; }
.csg-mode b[data-active] { font-weight: 700; color: var(--csg-fg); }
.csg-statusbar .csg-button { padding: 1px 8px; }
.csg-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; background: #8c959f; }
.csg-dot[data-state="busy"] { background: #d4a72c; }
.csg-dot[data-state="ok"] { background: #2da44e; }
.csg-dot[data-state="bad"] { background: #cf222e; }

/* A load or an evaluation in progress: a card over the view that names the stage. */
.csg-loading {
  position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; pointer-events: none;
}
.csg-loading[hidden] { display: none; }
.csg-loading > div {
  display: flex; align-items: center; gap: 10px; max-width: calc(100% - 24px); padding: 10px 16px; border-radius: 8px;
  background: var(--csg-bg); color: var(--csg-fg); border: 1px solid var(--csg-line); box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  backdrop-filter: blur(8px); font: 400 13px/18px var(--cesium-ui-font, system-ui, sans-serif);
}
.csg-spinner {
  flex: none; width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%;
  border: 2px solid color-mix(in oklab, CanvasText 22%, transparent); border-top-color: var(--csg-accent);
  animation: csg-spin 0.8s linear infinite;
}
@keyframes csg-spin { to { transform: rotate(360deg); } }
.csg-spinner.csg-mini { width: 11px; height: 11px; border-width: 2px; }
.csg-spinner[hidden] { display: none; }

/* The view cube: the camera's orientation, and a click turns to a standard view. */
.csg-cube { grid-area: 2 / 2; justify-self: end; align-self: start; position: relative; margin: 12px 12px 0 0; width: 56px; height: 56px; perspective: 240px; z-index: 2; }
.csg-cube-inner { position: absolute; inset: 0; transform-style: preserve-3d; }
.csg-cube-face {
  position: absolute; inset: 0; display: grid; place-items: center; box-sizing: border-box;
  border: 1px solid color-mix(in oklab, CanvasText 35%, transparent); border-radius: 3px; cursor: pointer;
  background: color-mix(in oklab, var(--stratakit-color-bg-page-base, Canvas) 80%, transparent); font-size: 10px; font-weight: 600;
  user-select: none; backface-visibility: hidden;
}
.csg-cube-face:hover { background: var(--csg-accent); color: var(--csg-on-accent); }

/* Narrow views: slimmer panels, and the properties give way to the view. */
@container (max-width: 860px) {
  .csg-app { --csg-left: 220px; --csg-right: 236px; }
  .csg-prop { grid-template-columns: 70px minmax(0, 1fr); }
}
@container (max-width: 640px) {
  .csg-app { --csg-left: 190px; --csg-right: 0px; }
  .csg-props-panel { display: none; }
  .csg-app[data-right="on"] { --csg-right: 220px; }
  .csg-app[data-right="on"] .csg-props-panel { display: flex; }
  .csg-cube { display: none; }
}
`;
