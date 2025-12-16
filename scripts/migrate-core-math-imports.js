/**
 * Script to migrate engine imports to use @cesium/core-math
 *
 * This script finds all .js files in packages/engine that import:
 * - Cartesian2, Cartesian3, Cartesian4
 * - Matrix2, Matrix3, Matrix4
 * - CesiumMath (from Math.js)
 *
 * And updates them to import from @cesium/core-math instead.
 */

import fs from "fs";
import { globbySync } from "globby";

const CORE_MATH_TYPES = [
  "Cartesian2",
  "Cartesian3",
  "Cartesian4",
  "Matrix2",
  "Matrix3",
  "Matrix4",
  "CesiumMath",
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  const foundImports = new Set();

  // Find all core-math imports in the file
  for (const type of CORE_MATH_TYPES) {
    // Match patterns like:
    // import Cartesian3 from "./Cartesian3.js"
    // import Cartesian3 from "../Core/Cartesian3.js"
    // import CesiumMath from "./Math.js"
    const patterns = [
      new RegExp(
        `import\\s+(${type})\\s+from\\s+["'](?:\\.\\.\\/)+(?:Core\\/)?${type === "CesiumMath" ? "Math" : type}\\.js["'];?\\n?`,
        "g",
      ),
      new RegExp(
        `import\\s+(${type})\\s+from\\s+["']\\.\\/(?:Core\\/)?${type === "CesiumMath" ? "Math" : type}\\.js["'];?\\n?`,
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
    const newImport = `import { ${imports.join(", ")} } from "@cesium/core-math";\n`;

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
