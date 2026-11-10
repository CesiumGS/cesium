// @ts-check

import { Check, DeveloperError } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import EditorToolbarViewModel from "./EditorToolbarViewModel.js";

/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import { EditorToolbarOptions, EditorToolbarToolEntry } from "./EditorToolbarViewModel.js"; */

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
 * @type {Object<string, {path: string, width: number, height: number}>}
 * @ignore
 */
const modeIcons = {
  none: { path: objectIconPath, width: 64, height: 64 },
  edit: { path: wireframePath, width: 64, height: 64 },
};

/**
 * The component icons: a dimmed cube, and the highlighted components drawn
 * over it.
 * @type {Object<string, {cube: string, highlight: string}>}
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
 * @type {Object<string, {path: string, width: number, height: number}>}
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
 * Buttons for choosing a {@link MeshEditor}'s mode and active tool.
 * Requires <code>EditorToolbar.css</code>.
 *
 * @alias EditorToolbar
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Element|string} container The element or ID that hosts the toolbar.
 * @param {MeshEditor} editor The editor to control.
 * @param {EditorToolbarOptions} [options] The tool entries.
 */
class EditorToolbar {
  /** @type {Element} */
  #container;

  /** @type {EditorToolbarViewModel} */
  #viewModel;

  /** @type {HTMLDivElement} */
  #wrapper;

  /** @type {Array<function(): void>} */
  #removeOutsideClickListeners = [];

  /**
   * @param {Element|string} container The element or ID that hosts the toolbar.
   * @param {MeshEditor} editor The editor to control.
   * @param {EditorToolbarOptions} [options] The tool entries.
   */
  constructor(container, editor, options) {
    this.#container = this.#getHostDomElement(container);
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#viewModel = new EditorToolbarViewModel(editor, options);
    this.#createToolbar();
    try {
      this.#applyViewModelBindings();
    } catch (error) {
      this.destroy();
      throw error;
    }
    this.#listenForOutsideClicks();
  }

  /** @type {Element} */
  get container() {
    return this.#container;
  }

  /** @type {EditorToolbarViewModel} */
  get viewModel() {
    return this.#viewModel;
  }

  /**
   * @param {Element|string} container
   * @returns {Element}
   * @ignore
   */
  #getHostDomElement(container) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("container", container);
    //>>includeEnd('debug');

    if (typeof container !== "string") {
      return container;
    }
    const element = document.getElementById(container);
    if (!element) {
      throw new DeveloperError(
        `Element with id "${container}" does not exist.`,
      );
    }
    return element;
  }

  /**
   * Creates the tool dropdown, the Object/Edit toggle and the component
   * buttons. The tool dropdown comes first, so it doesn't move when the
   * component buttons appear.
   * @ignore
   */
  #createToolbar() {
    const document = this.#container.ownerDocument;
    const wrapper = document.createElement("div");
    wrapper.className = "cesium-editor-toolbar";
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Mesh editor");
    if (this.#viewModel.toolEntries.length > 0) {
      wrapper.appendChild(
        document.createComment(" ko if: viewModel.toolId !== undefined "),
      );
      wrapper.appendChild(this.#createToolDropdown());
      wrapper.appendChild(document.createComment(" /ko "));
    }
    wrapper.appendChild(this.#createModeToggle());
    wrapper.appendChild(this.#createComponentButtons());
    this.#container.appendChild(wrapper);
    this.#wrapper = wrapper;
  }

  /**
   * @param {string} binding The button's Knockout bindings.
   * @param {string} [label] A fixed tooltip and accessible name.
   * @returns {HTMLButtonElement}
   * @ignore
   */
  #createButton(binding, label) {
    const button = this.#container.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "cesium-button cesium-toolbar-button";
    button.setAttribute("data-bind", binding);
    if (label) {
      button.title = label;
      button.setAttribute("aria-label", label);
    }
    return button;
  }

  /**
   * Creates the button that toggles between Object Mode and Edit Mode. It
   * shows the current mode's icon and name.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createModeToggle() {
    const document = this.#container.ownerDocument;
    const group = document.createElement("span");
    group.className = "cesium-editor-toolbar-group cesium-editor-toolbar-mode";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cesium-button cesium-editor-toolbar-mode-button";
    // The button's accessible name comes from the visible mode name.
    button.setAttribute(
      "data-bind",
      `click: function() { viewModel.toggleEditMode(); },
       attr: { title: viewModel.editing
         ? 'Switch to Object Mode' : 'Switch to Edit Mode' }`,
    );

    const icon = document.createElement("span");
    icon.className = "cesium-editor-toolbar-mode-icon";
    icon.setAttribute(
      "data-bind",
      `cesiumSvgPath: { path: viewModel.editing ? icons.edit.path : icons.none.path,
         width: 64, height: 64 }`,
    );
    button.appendChild(icon);

    // Both names share a grid cell, so the button is as wide as the longer one.
    const labels = document.createElement("span");
    labels.className = "cesium-editor-toolbar-mode-labels";
    for (const [name, hidden] of [
      ["Object Mode", "viewModel.editing"],
      ["Edit Mode", "!viewModel.editing"],
    ]) {
      const label = document.createElement("span");
      label.textContent = name;
      label.setAttribute(
        "data-bind",
        `css: { 'cesium-editor-toolbar-mode-label-hidden': ${hidden} }`,
      );
      labels.appendChild(label);
    }
    button.appendChild(labels);

    group.appendChild(button);
    return group;
  }

  /**
   * Creates the Vertex, Edge and Face buttons, shown in Edit Mode. Clicking
   * one selects its mode, and Shift+clicking one adds or removes it.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createComponentButtons() {
    const group = this.#container.ownerDocument.createElement("span");
    group.className =
      "cesium-editor-toolbar-group cesium-editor-toolbar-components";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Components");
    group.setAttribute("data-bind", "visible: viewModel.editing");
    this.#viewModel.componentEntries.forEach((entry, index) => {
      const data = `viewModel.componentEntries[${index}]`;
      const button = this.#createButton(
        `click: function(_, event) {
           if (event.shiftKey) {
             viewModel.toggleComponentEntry(${data});
           } else {
             viewModel.selectModeEntry(${data});
           }
         },
         attr: { 'aria-pressed': String(viewModel.isComponentActive(${data})) },
         css: {
           'cesium-editor-toolbar-active': viewModel.isComponentActive(${data}),
         }`,
        entry.label,
      );
      button.appendChild(this.#createComponentIcon(componentIcons[entry.id]));
      group.appendChild(button);
    });
    return group;
  }

  /**
   * Creates a component icon with a dimmed cube under the highlighted
   * components.
   * @param {{cube: string, highlight: string}} icon
   * @returns {SVGSVGElement}
   * @ignore
   */
  #createComponentIcon(icon) {
    const document = this.#container.ownerDocument;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "cesium-svgPath-svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("aria-hidden", "true");
    for (const [path, className] of [
      [icon.cube, "cesium-editor-toolbar-icon-dimmed"],
      [icon.highlight, undefined],
    ]) {
      const pathElement = document.createElementNS(svgNS, "path");
      pathElement.setAttribute("d", path);
      if (className) {
        pathElement.setAttribute("class", className);
      }
      svg.appendChild(pathElement);
    }
    return svg;
  }

  /**
   * Creates the button showing the active tool and its dropdown of tools.
   * @returns {HTMLSpanElement}
   * @ignore
   */
  #createToolDropdown() {
    const document = this.#container.ownerDocument;
    const dropdownContainer = document.createElement("span");
    dropdownContainer.className =
      "cesium-editor-toolbar-dropdown-container cesium-editor-toolbar-tool";
    dropdownContainer.appendChild(
      this.#createButton(
        `click: function() { viewModel.toggleToolDropDown(); },
         attr: { title: selectedTool().label, 'aria-label': selectedTool().label,
           'aria-expanded': String(viewModel.toolDropDownVisible) },
         css: { 'cesium-editor-toolbar-selected': viewModel.toolDropDownVisible },
         cesiumSvgPath: { path: selectedTool().iconPath,
           width: selectedTool().iconWidth, height: selectedTool().iconHeight }`,
      ),
    );

    const dropdown = document.createElement("div");
    dropdown.className = "cesium-editor-toolbar-dropdown";
    dropdown.setAttribute(
      "data-bind",
      "visible: viewModel.toolDropDownVisible, foreach: toolEntries",
    );
    dropdown.appendChild(
      this.#createButton(
        `click: function() { $parent.viewModel.selectToolEntry($data); },
         attr: { title: label, 'aria-label': label,
           'aria-pressed': String(id === $parent.viewModel.toolId) },
         css: { 'cesium-editor-toolbar-active': id === $parent.viewModel.toolId },
         enable: $parent.viewModel.isToolEnabled($data),
         cesiumSvgPath: { path: iconPath, width: iconWidth, height: iconHeight }`,
      ),
    );
    dropdownContainer.appendChild(dropdown);
    return dropdownContainer;
  }

  /**
   * Applies Knockout bindings to the toolbar.
   * @ignore
   */
  #applyViewModelBindings() {
    const viewModel = this.#viewModel;
    const toolEntries = viewModel.toolEntries.map((entry) =>
      this.#withEntryIcon(entry, toolIcons),
    );

    knockout.applyBindings(
      {
        viewModel,
        icons: modeIcons,
        toolEntries,
        selectedTool: () =>
          toolEntries.find((entry) => entry.id === viewModel.toolId),
      },
      this.#wrapper,
    );
  }

  /**
   * Copies an entry, filling in a default icon and icon size.
   * @param {EditorToolbarToolEntry} entry
   * @param {Object<string, {path: string, width: number, height: number}>} icons The default icons by entry ID.
   * @returns {{id: string, label: string, iconPath: string, iconWidth: number, iconHeight: number}}
   * @ignore
   */
  #withEntryIcon(entry, icons) {
    const icon = Object.hasOwn(icons, entry.id) ? icons[entry.id] : undefined;
    const iconPath = "iconPath" in entry ? entry.iconPath : undefined;
    if (!iconPath && !icon) {
      throw new DeveloperError(
        `An iconPath is required for entry "${entry.id}".`,
      );
    }
    return {
      ...entry,
      iconPath: iconPath ?? icon.path,
      iconWidth:
        ("iconWidth" in entry ? entry.iconWidth : undefined) ??
        icon?.width ??
        64,
      iconHeight:
        ("iconHeight" in entry ? entry.iconHeight : undefined) ??
        icon?.height ??
        64,
    };
  }

  /**
   * Closes the tool dropdown on clicks outside the toolbar.
   * @ignore
   */
  #listenForOutsideClicks() {
    const document = this.#container.ownerDocument;
    const closeDropdowns = /** @param {Event} event */ (event) => {
      const target = event.target;
      if (
        target instanceof document.defaultView.Node &&
        !this.#wrapper.contains(target)
      ) {
        this.#viewModel.toolDropDownVisible = false;
      }
    };
    for (const type of ["pointerdown", "mousedown", "touchstart"]) {
      document.addEventListener(type, closeDropdowns, true);
      this.#removeOutsideClickListeners.push(() => {
        document.removeEventListener(type, closeDropdowns, true);
      });
    }
  }

  /**
   * Removes the toolbar from the DOM and destroys its view model.
   */
  destroy() {
    for (const removeListener of this.#removeOutsideClickListeners) {
      removeListener();
    }
    this.#removeOutsideClickListeners.length = 0;
    knockout.cleanNode(this.#wrapper);
    this.#wrapper.remove();
    this.#viewModel.destroy();
  }
}

export default EditorToolbar;
