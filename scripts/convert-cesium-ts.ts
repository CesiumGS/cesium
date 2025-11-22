#!/usr/bin/env bun
/**
 * Robust CesiumJS JavaScript to TypeScript converter
 * Handles all common CesiumJS patterns in a single pass
 */

import { readFile, writeFile, unlink, stat } from "fs/promises";
import { join, basename, dirname } from "path";
import { Glob } from "bun";

const rootDir = join(import.meta.dir, "..");
const packagesDir = join(rootDir, "packages");

interface ConvertResult {
  converted: number;
  skipped: number;
  errors: string[];
}

/**
 * Main conversion function for a single file
 */
async function convertFile(jsPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const content = await readFile(jsPath, "utf-8");
    const fileName = basename(jsPath, ".js");
    const tsPath = jsPath.replace(/\.js$/, ".ts");

    // Skip shader files
    if (jsPath.includes("/Shaders/")) {
      return { success: false, error: "shader" };
    }

    let result = content;

    // Check if this file has a class-like constructor function
    const hasConstructorFunction = new RegExp(`^function\\s+${fileName}\\s*\\(`, "m").test(content);

    if (hasConstructorFunction) {
      result = convertClassFile(content, fileName);
    } else {
      // Convert other patterns (enums, utility functions, etc.)
      result = convertNonClassFile(content, fileName);
    }

    // Write the TypeScript file
    await writeFile(tsPath, result, "utf-8");

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Convert a file containing a constructor function to a TypeScript class
 */
function convertClassFile(content: string, className: string): string {
  let result = content;

  // Step 1: Extract all pieces
  const constructorMatch = result.match(
    new RegExp(`(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?function\\s+${className}\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`, "m")
  );

  if (!constructorMatch) {
    return convertNonClassFile(content, className);
  }

  const fullConstructor = constructorMatch[0];
  const constructorParams = constructorMatch[1];
  const constructorBody = constructorMatch[2];

  // Extract JSDoc from constructor
  const constructorJsDoc = fullConstructor.match(/\/\*\*([\s\S]*?)\*\//)?.[0] || "";

  // Step 2: Extract Object.defineProperties
  const definePropsMatches: Array<{ full: string; props: string }> = [];
  const definePropsRegex = new RegExp(
    `Object\\.defineProperties\\s*\\(\\s*${className}\\.prototype\\s*,\\s*\\{([\\s\\S]*?)\\n\\}\\s*\\);?`,
    "gm"
  );
  let match: RegExpExecArray | null;
  while ((match = definePropsRegex.exec(result)) !== null) {
    definePropsMatches.push({ full: match[0], props: match[1] });
  }

  // Step 3: Extract prototype methods
  const protoMethods: Array<{ full: string; name: string; params: string; body: string; jsDoc: string }> = [];
  const protoMethodRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?${className}\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\};?`,
    "gm"
  );
  while ((match = protoMethodRegex.exec(result)) !== null) {
    const jsDocMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);
    protoMethods.push({
      full: match[0],
      name: match[1],
      params: match[2],
      body: match[3],
      jsDoc: jsDocMatch ? jsDocMatch[0] : "",
    });
  }

  // Step 4: Extract static methods
  const staticMethods: Array<{ full: string; name: string; params: string; body: string; jsDoc: string }> = [];
  const staticMethodRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?${className}\\.(\\w+)\\s*=\\s*function\\s*(?:\\w+)?\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\};?`,
    "gm"
  );
  while ((match = staticMethodRegex.exec(result)) !== null) {
    if (match[1] === "prototype") continue;
    const jsDocMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);
    staticMethods.push({
      full: match[0],
      name: match[1],
      params: match[2],
      body: match[3],
      jsDoc: jsDocMatch ? jsDocMatch[0] : "",
    });
  }

  // Step 5: Extract static properties
  const staticProps: Array<{ full: string; name: string; value: string }> = [];
  const staticPropRegex = new RegExp(
    `${className}\\.(\\w+)\\s*=\\s*([^;]+);`,
    "gm"
  );
  while ((match = staticPropRegex.exec(result)) !== null) {
    const propName = match[1];
    if (propName === "prototype" || staticMethods.some(m => m.name === propName)) continue;
    staticProps.push({
      full: match[0],
      name: match[1],
      value: match[2].trim(),
    });
  }

  // Step 6: Build the class
  const classLines: string[] = [];

  // Add JSDoc
  if (constructorJsDoc) {
    classLines.push(constructorJsDoc);
  }

  // Class declaration
  classLines.push(`export class ${className} {`);

  // Instance properties from constructor body (this.x = ...)
  const instanceProps = new Set<string>();
  const propAssignments = constructorBody.match(/this\.(\w+)\s*=/g) || [];
  for (const p of propAssignments) {
    const propName = p.match(/this\.(\w+)/)?.[1];
    if (propName) instanceProps.add(propName);
  }

  // Add instance property declarations
  for (const prop of instanceProps) {
    classLines.push(`  ${prop}: any;`);
  }

  if (instanceProps.size > 0) {
    classLines.push("");
  }

  // Static properties
  for (const prop of staticProps) {
    const value = prop.value;
    const isReadonly = /^(Object\.freeze|new |true|false|\d|"|')/.test(value);
    classLines.push(`  static ${isReadonly ? "readonly " : ""}${prop.name} = ${value};`);
  }

  if (staticProps.length > 0) {
    classLines.push("");
  }

  // Constructor
  classLines.push(`  constructor(${constructorParams}) {${constructorBody}`);
  classLines.push("  }");

  // Getters/Setters from Object.defineProperties
  for (const defProps of definePropsMatches) {
    const getters = parseDefineProperties(defProps.props);
    if (getters) {
      classLines.push("");
      classLines.push(getters);
    }
  }

  // Instance methods
  for (const method of protoMethods) {
    classLines.push("");
    if (method.jsDoc) {
      classLines.push("  " + method.jsDoc.replace(/\n/g, "\n  "));
    }
    classLines.push(`  ${method.name}(${method.params}): any {${method.body}`);
    classLines.push("  }");
  }

  // Static methods
  for (const method of staticMethods) {
    classLines.push("");
    if (method.jsDoc) {
      classLines.push("  " + method.jsDoc.replace(/\n/g, "\n  "));
    }
    classLines.push(`  static ${method.name}(${method.params}): any {${method.body}`);
    classLines.push("  }");
  }

  classLines.push("}");
  classLines.push("");

  // Step 7: Build the file from scratch - start with imports only
  // Find all imports
  const importRegex = /^import\s+.*?(?:from\s+["'][^"']+["'])?;?\s*$/gm;
  const imports: string[] = [];
  let importMatch;
  while ((importMatch = importRegex.exec(content)) !== null) {
    imports.push(importMatch[0]);
  }

  // Build the final result
  result = imports.join("\n") + "\n\n" + classLines.join("\n");

  // Ensure export default
  if (!result.includes(`export default ${className}`)) {
    result += `\nexport default ${className};\n`;
  }

  return result;
}

/**
 * Parse Object.defineProperties and return TypeScript getters/setters
 */
function parseDefineProperties(propsBody: string): string {
  const lines: string[] = [];

  // Match property definitions more carefully
  // Pattern: propName: { get: function() { ... }, set: function(val) { ... } }
  const propRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?(\w+)\s*:\s*\{/g;

  let propMatch;
  while ((propMatch = propRegex.exec(propsBody)) !== null) {
    const jsDoc = propMatch[1] ? `  /**${propMatch[1]}*/\n` : "";
    const propName = propMatch[2];

    // Find the matching closing brace for this property
    let braceCount = 1;
    let endIdx = propMatch.index + propMatch[0].length;
    while (braceCount > 0 && endIdx < propsBody.length) {
      if (propsBody[endIdx] === '{') braceCount++;
      if (propsBody[endIdx] === '}') braceCount--;
      endIdx++;
    }

    const propContent = propsBody.slice(propMatch.index + propMatch[0].length, endIdx - 1);

    // Handle DeveloperError pattern
    if (propContent.includes("DeveloperError.throwInstantiationError")) {
      lines.push(`${jsDoc}  get ${propName}(): any {`);
      lines.push(`    throw new DeveloperError("This type should not be instantiated directly.");`);
      lines.push("  }");
      continue;
    }

    // Extract getter: get: function() { return ... }
    const getterMatch = propContent.match(/get\s*:\s*function\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/);
    if (getterMatch) {
      const body = getterMatch[1].trim();
      lines.push(`${jsDoc}  get ${propName}(): any {`);
      lines.push(`    ${body}`);
      lines.push("  }");
    }

    // Extract setter: set: function(val) { ... }
    const setterMatch = propContent.match(/set\s*:\s*function\s*\((\w+)\)\s*\{([\s\S]*?)\n\s*\}/);
    if (setterMatch) {
      const param = setterMatch[1];
      const body = setterMatch[2].trim();
      lines.push(`  set ${propName}(${param}: any) {`);
      lines.push(`    ${body}`);
      lines.push("  }");
    }
  }

  return lines.join("\n");
}

/**
 * Convert non-class files (enums, utilities, etc.)
 */
function convertNonClassFile(content: string, fileName: string): string {
  let result = content;

  // Convert Object.freeze enums to const assertions
  result = result.replace(
    /const\s+(\w+)\s*=\s*Object\.freeze\(\{([^}]+)\}\);?/g,
    (match, name, body) => {
      return `const ${name} = Object.freeze({${body}} as const);\nexport type ${name} = typeof ${name}[keyof typeof ${name}];`;
    }
  );

  // Add export default if needed
  if (!result.includes("export default") && !result.includes("export {")) {
    const mainExport = result.match(new RegExp(`(?:const|function|class)\\s+${fileName}\\b`))?.[0];
    if (mainExport) {
      result += `\nexport default ${fileName};\n`;
    }
  }

  return result;
}

/**
 * Remove JS files that have corresponding TS files
 */
async function removeJsFiles(dir: string): Promise<number> {
  const glob = new Glob("**/*.js");
  let removed = 0;

  for await (const file of glob.scan(dir)) {
    if (file.includes("/Shaders/")) continue;

    const jsPath = join(dir, file);
    const tsPath = jsPath.replace(/\.js$/, ".ts");

    try {
      await stat(tsPath);
      await unlink(jsPath);
      removed++;
    } catch {
      // No TS file exists, keep JS
    }
  }

  return removed;
}

async function processDirectory(dir: string): Promise<ConvertResult> {
  const glob = new Glob("**/*.js");
  const result: ConvertResult = { converted: 0, skipped: 0, errors: [] };

  const files: string[] = [];
  for await (const file of glob.scan(dir)) {
    if (!file.includes("/Shaders/")) {
      files.push(join(dir, file));
    }
  }

  console.log(`  Found ${files.length} JavaScript files to convert`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { success, error } = await convertFile(file);

    if (success) {
      result.converted++;
    } else if (error === "shader") {
      result.skipped++;
    } else {
      result.errors.push(`${basename(file)}: ${error}`);
    }

    if ((i + 1) % 100 === 0 || i === files.length - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${files.length} (${result.converted} converted)`);
    }
  }

  console.log(); // New line after progress

  return result;
}

async function main(): Promise<void> {
  console.log("=== CesiumJS TypeScript Conversion ===\n");

  // Convert engine
  console.log("Converting @cesium/engine...");
  const engineDir = join(packagesDir, "engine", "Source");
  const engineResult = await processDirectory(engineDir);
  console.log(`  Converted: ${engineResult.converted}, Skipped: ${engineResult.skipped}`);

  if (engineResult.errors.length > 0) {
    console.log(`  Errors: ${engineResult.errors.length}`);
    for (const err of engineResult.errors.slice(0, 10)) {
      console.log(`    - ${err}`);
    }
  }

  // Convert widgets
  console.log("\nConverting @cesium/widgets...");
  const widgetsDir = join(packagesDir, "widgets", "Source");
  const widgetsResult = await processDirectory(widgetsDir);
  console.log(`  Converted: ${widgetsResult.converted}, Skipped: ${widgetsResult.skipped}`);

  // Remove JS files
  console.log("\nRemoving JavaScript files...");
  const engineRemoved = await removeJsFiles(engineDir);
  const widgetsRemoved = await removeJsFiles(widgetsDir);
  console.log(`  Removed: ${engineRemoved + widgetsRemoved} files`);

  console.log("\n=== Conversion Complete ===");
  console.log(`Total converted: ${engineResult.converted + widgetsResult.converted}`);
}

if (import.meta.main) {
  main().catch(console.error);
}
