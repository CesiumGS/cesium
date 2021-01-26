import defined from "./defined.js";

export default function hasExtension(json, extensionName) {
  return (
    defined(json) &&
    defined(json.extensions) &&
    defined(json.extensions[extensionName])
  );
}
