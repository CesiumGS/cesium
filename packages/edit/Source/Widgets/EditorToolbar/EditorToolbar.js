// @ts-check

import EditorToolbarViewModel from "./EditorToolbarViewModel.js";

/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import { EditorToolbarOptions } from "./EditorToolbarViewModel.js"; */

/**
 * A toolbar for choosing a {@link MeshEditor}'s mode and active tool.
 *
 * @alias EditorToolbar
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {Element|string} container The element or ID that hosts the toolbar.
 * @param {MeshEditor} editor The editor to control.
 * @param {EditorToolbarOptions} [options] The dropdown entries.
 */
class EditorToolbar {
  /** @type {Element} */
  #container;

  /** @type {EditorToolbarViewModel} */
  #viewModel;

  /**
   * @param {Element|string} container The element or ID that hosts the toolbar.
   * @param {MeshEditor} editor The editor to control.
   * @param {EditorToolbarOptions} [options] The dropdown entries.
   */
  constructor(container, editor, options) {
    this.#container = this.#getHostDomElement(container);
    this.#viewModel = new EditorToolbarViewModel(editor, options);
    this.#createModeAndToolDropdowns();
    this.#applyViewModelBindings();
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
   * Resolves the host element and validates a supplied element ID.
   * @param {Element|string} container The element or element ID.
   * @returns {Element} The host element.
   * @ignore
   */
  #getHostDomElement(container) {
    throw new Error("EditorToolbar container resolution is not implemented.");
  }

  /**
   * Creates the mode and tool dropdowns with their icons and default icon sizes.
   * @ignore
   */
  #createModeAndToolDropdowns() {}

  /**
   * Binds selected icons, labels, dropdowns, and tool availability.
   * @ignore
   */
  #applyViewModelBindings() {}

  /**
   * Registers the listener that closes dropdowns on outside clicks.
   * @ignore
   */
  #listenForOutsideClicks() {}

  /**
   * Removes bindings, listeners, and DOM elements, and destroys the view model.
   */
  destroy() {}
}

export default EditorToolbar;
