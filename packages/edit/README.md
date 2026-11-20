# @cesium/edit

[![Build Status](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml/badge.svg)](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml)
[![npm](https://img.shields.io/npm/v/@cesium/edit)](https://www.npmjs.com/package/@cesium/edit)
[![Docs](https://img.shields.io/badge/docs-online-orange.svg)](https://cesium.com/learn/)

![Cesium](https://github.com/CesiumGS/cesium/wiki/logos/Cesium_Logo_Color.jpg)

[CesiumJS](../../README.md) is a JavaScript library for creating 3D globes and 2D maps in a web browser without a plugin. It uses WebGL for hardware-accelerated graphics, and is cross-platform, cross-browser, and tuned for dynamic-data visualization.

`@cesium/edit` is the experimental package scaffold for mesh-editing APIs built on top of `@cesium/engine` and `@cesium/widgets`.

---

[**Examples**](https://sandcastle.cesium.com/) :earth_asia: [**Docs**](https://cesium.com/learn/cesiumjs-learn/) :earth_americas: [**Website**](https://cesium.com/cesiumjs) :earth_africa: [**Forum**](https://community.cesium.com/) :earth_asia: [**User Stories**](https://cesium.com/user-stories/)

---

## Install

`@cesium/edit` is published as ES modules with full typing support.

Install with npm

```sh
npm install @cesium/edit --save
```

Or, install with yarn

```sh
yarn add @cesium/edit
```

## Usage

The APIs in this package are experimental and are expected to evolve as CesiumJS editing workflows expand.

### Editor toolbar

`EditorToolbar` adds an Object Mode/Edit Mode toggle, Vertex, Edge and Face
buttons shown in Edit Mode, and a tool dropdown for an editor. Shift+click a
Vertex, Edge or Face button to combine it with the current mode. It requires
the widgets' stylesheet and its own:

```js
import { EditorToolbar, MeshEditor, SelectTool } from "@cesium/edit";
import "@cesium/widgets/Source/widgets.css";
import "@cesium/edit/Source/Widgets/EditorToolbar/EditorToolbar.css";

const editor = await MeshEditor.addToScene(viewer.scene);
const selectTool = SelectTool.addTo(editor);
editor.activeTool = selectTool;
const toolbar = new EditorToolbar("editorToolbarContainer", editor, {
  tools: [{ id: "select", label: "Select", tool: selectTool }],
});
```

The toolbar doesn't add tools to the editor, so pass the tools it should offer;
without any, it has no tool dropdown. `viewerEditorMixin` adds a select and a translate tool, exposed
as `viewer.editorTools`, and activates the select tool.

The toolbar doesn't handle keys either. To show shortcuts in its tooltips, like
"Vertex (1)", set its view model's `modeShortcuts` and `toolShortcuts`, e.g.
`toolbar.viewModel.toolShortcuts = { select: ["s"] }`. `viewerEditorMixin` sets
them from its key bindings.

## Community

Have questions? Ask them on the [community forum](https://community.cesium.com/).

Interested in contributing? See [CONTRIBUTING.md](../../CONTRIBUTING.md). :heart:

## License

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.html). CesiumJS is free for both commercial and non-commercial use.
