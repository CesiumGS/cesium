import defined from "./defined.js";

export default function has3DTilesExtension(json, extensionName) {
  return (
    defined(json) &&
    defined(json.extensions) &&
    defined(json.extensions[extensionName])
  );
}
