class ContextCache {
  constructor(context) {
    this.context = context;
    this.promise = Promise.resolve();
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
