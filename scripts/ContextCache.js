// @ts-check

/** @import {BuildContext, BuildResult} from "esbuild"; */

class ContextCache {
  /** @param {BuildContext} context */
  constructor(context) {
    /** @type {BuildContext} context */
    this.context = context;
    /** @type {Promise<BuildResult|void>} context */
    this.promise = Promise.resolve();
    /** @type {BuildResult|undefined} context */
    this.result = undefined;
  }

  clear() {
    this.result = undefined;
  }

  async rebuild() {
    const promise = (this.promise = this.context.rebuild());
    const result = (this.result = await promise);
    return result;
  }

  isBuilt() {
    return (
      this.result &&
      this.result.outputFiles &&
      this.result.outputFiles.length > 0
    );
  }
}

export default ContextCache;
