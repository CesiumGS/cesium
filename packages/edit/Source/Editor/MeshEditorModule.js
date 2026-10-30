// @ts-check

import { RuntimeError, defined } from "@cesium/core";
import { FeatureDetection, buildModuleUrl } from "@cesium/engine";
import init, { topologyOverlayShaders } from "@cesium/mesh-editor";

/** @import { TopologyOverlayShaders } from "@cesium/mesh-editor"; */

/**
 * The loaded mesh editor wasm module. The page has one instance and one
 * memory, shared by every mesh editor. Get it with {@link MeshEditorModule.load}.
 *
 * @private
 */
class MeshEditorModule {
  /** @type {Promise<MeshEditorModule> | undefined} */
  static #loadPromise;

  /** @type {WebAssembly.Memory} */
  #memory;

  /** @type {TopologyOverlayShaders} */
  #shaders;

  /**
   * Use {@link MeshEditorModule.load} instead.
   *
   * @param {WebAssembly.Memory} memory The wasm memory.
   * @param {TopologyOverlayShaders} shaders The topology overlay shaders.
   */
  constructor(memory, shaders) {
    this.#memory = memory;
    this.#shaders = shaders;
  }

  /**
   * The wasm memory. Views into its buffer are invalidated by any call into
   * wasm, so create them right before use.
   *
   * @type {WebAssembly.Memory}
   * @readonly
   */
  get memory() {
    return this.#memory;
  }

  /**
   * The topology overlay shaders and their uniform names, read once at load.
   *
   * @type {TopologyOverlayShaders}
   * @readonly
   */
  get shaders() {
    return this.#shaders;
  }

  /**
   * Loads and instantiates the wasm module from ThirdParty/mesh-editor_bg.wasm,
   * resolved with buildModuleUrl. Every call returns the same promise. If
   * loading fails, the promise rejects and the next call tries again.
   *
   * @returns {Promise<MeshEditorModule>} The loaded module.
   * @exception {RuntimeError} WebAssembly is not supported.
   */
  static load() {
    if (defined(MeshEditorModule.#loadPromise)) {
      return MeshEditorModule.#loadPromise;
    }

    MeshEditorModule.#loadPromise = MeshEditorModule.#instantiate().catch(
      (error) => {
        MeshEditorModule.#loadPromise = undefined;
        throw error;
      },
    );

    return MeshEditorModule.#loadPromise;
  }

  /**
   * @returns {Promise<MeshEditorModule>}
   * @ignore
   */
  static async #instantiate() {
    if (!FeatureDetection.supportsWebAssembly()) {
      throw new RuntimeError(
        "This browser does not support WebAssembly, which mesh editing requires.",
      );
    }

    // Pass the URL explicitly. The default resolves against import.meta.url,
    // which doesn't point at the module in bundled builds.
    const { memory } = await init({
      module_or_path: buildModuleUrl("ThirdParty/mesh-editor_bg.wasm"),
    });

    return new MeshEditorModule(memory, topologyOverlayShaders());
  }
}

export default MeshEditorModule;
