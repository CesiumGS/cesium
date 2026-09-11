import path from "node:path";
import { fileURLToPath } from "node:url";

// Define absolute paths for config and ignore files,
// since lint-staged runs each package's markdownlint command
// from that package's own directory, not the repo root.
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const markdownlintConfig = path.join(rootDir, ".markdownlint.json");
const markdownlintIgnore = path.join(rootDir, ".markdownlintignore");

export default {
  "*.{js,cjs,mjs,ts,tsx,css,html}": [
    "eslint --cache --quiet",
    "prettier --write",
  ],
  "*.md": [
    (filenames) =>
      `markdownlint --config ${markdownlintConfig} --ignore-path ${markdownlintIgnore} ${filenames.join(" ")}`,
    "prettier --write",
  ],
};
