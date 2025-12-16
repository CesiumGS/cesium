/**
 * Script to migrate engine imports to use @cesium/core-utils
 *
 * This script finds all .js files in packages/engine that import:
 * - Check, defined, DeveloperError, RuntimeError, Frozen
 *
 * And updates them to import from @cesium/core-utils instead.
 */

import fs from "fs";
import { globbySync } from "globby";

const CORE_UTILS_TYPES = [
  "Check",
  "defined",
  "DeveloperError",
  "RuntimeError",
  "Frozen",
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  const foundImports = new Set();

  // Find all core-utils imports in the file
  for (const type of CORE_UTILS_TYPES) {
    // Match patterns like:
    // import Check from "./Check.js"
    // import Check from "../Core/Check.js"
    // import defined from "./defined.js"
    const patterns = [
      new RegExp(
        `import\\s+(${type})\\s+from\\s+["'](?:\\.\\.\\/)+(?:Core\\/)?${type}\\.js["'];?\\n?`,
        "g",
      ),
      new RegExp(
        `import\\s+(${type})\\s+from\\s+["']\\.\\/(?:Core\\/)?${type}\\.js["'];?\\n?`,
        "g",
      ),
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        foundImports.add(type);
        content = content.replace(pattern, "");
        modified = true;
      }
    }
  }

  if (modified && foundImports.size > 0) {
    // Build the new import statement
    const imports = Array.from(foundImports).sort();
    const newImport = `import { ${imports.join(", ")} } from "@cesium/core-utils";\n`;

    // Find where to insert - after existing imports or at the top
    // Look for the first import statement
    const firstImportMatch = content.match(/^import\s+/m);
    if (firstImportMatch) {
      const insertPos = firstImportMatch.index;
      content =
        content.slice(0, insertPos) + newImport + content.slice(insertPos);
    } else {
      // No imports found, add at top (after any comments/docstrings)
      content = newImport + content;
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath} (${imports.join(", ")})`);
    return imports.length;
  }

  return 0;
}

// Find all JS files in engine package
const enginePath = "packages/engine";
const files = globbySync(
  [`${enginePath}/Source/**/*.js`, `${enginePath}/Specs/**/*.js`],
  {
    ignore: ["**/ThirdParty/**", "**/node_modules/**"],
  },
);

console.log(`Found ${files.length} files to scan...`);

let totalUpdated = 0;
let filesUpdated = 0;

for (const file of files) {
  const count = processFile(file);
  if (count > 0) {
    totalUpdated += count;
    filesUpdated++;
  }
}

console.log(
  `\nDone! Updated ${totalUpdated} imports across ${filesUpdated} files.`,
);
