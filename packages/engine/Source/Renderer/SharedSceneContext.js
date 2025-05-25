import clone from "../Core/clone.js";
import Context from "./Context";

function SharedSceneContext(options) {
  const contextOptions = clone(options?.contextOptions);
  const canvas = document.createElement("canvas");
  this._context = new Context(canvas, contextOptions);
}
export default SharedSceneContext;
