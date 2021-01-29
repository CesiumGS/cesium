import defined from "../Core/defined.js";

// TODO: Move to Scene
export default function has3DTilesExtension(json, extensionName) {
  return (
    defined(json) &&
    defined(json.extensions) &&
    defined(json.extensions[extensionName])
  );
}
