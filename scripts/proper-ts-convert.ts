#!/usr/bin/env bun
/**
 * Advanced TypeScript conversion script for CesiumJS
 * Converts JavaScript to proper TypeScript with real type annotations
 */

import { readdir, readFile, writeFile, unlink, stat } from "fs/promises";
import { join, basename, dirname, extname } from "path";
import { Glob } from "bun";

const rootDir = import.meta.dir;
const packagesDir = join(rootDir, "..", "packages");

interface ConversionResult {
  converted: number;
  deleted: number;
  errors: string[];
}

/**
 * Parse JSDoc type to TypeScript type
 */
function parseJSDocType(jsdocType: string): string {
  if (!jsdocType) return "any";

  let type = jsdocType.trim();

  // Handle nullable types
  if (type.startsWith("?")) {
    type = type.slice(1);
    return `${parseJSDocType(type)} | null`;
  }

  // Handle non-nullable types
  if (type.startsWith("!")) {
    type = type.slice(1);
  }

  // Handle array types
  if (type.startsWith("Array.<") || type.startsWith("Array<")) {
    const inner = type.match(/Array[.<](.+)>$/)?.[1];
    if (inner) {
      return `${parseJSDocType(inner)}[]`;
    }
    return "any[]";
  }

  // Handle typed arrays
  const typedArrayMap: Record<string, string> = {
    "Float32Array": "Float32Array",
    "Float64Array": "Float64Array",
    "Int8Array": "Int8Array",
    "Int16Array": "Int16Array",
    "Int32Array": "Int32Array",
    "Uint8Array": "Uint8Array",
    "Uint16Array": "Uint16Array",
    "Uint32Array": "Uint32Array",
    "Uint8ClampedArray": "Uint8ClampedArray",
  };
  if (typedArrayMap[type]) {
    return typedArrayMap[type];
  }

  // Handle union types
  if (type.includes("|")) {
    const parts = type.split("|").map(t => parseJSDocType(t.trim()));
    return parts.join(" | ");
  }

  // Handle common type mappings
  const typeMap: Record<string, string> = {
    "Number": "number",
    "String": "string",
    "Boolean": "boolean",
    "Object": "object",
    "Function": "Function",
    "undefined": "undefined",
    "null": "null",
    "*": "any",
    "number[]": "number[]",
    "string[]": "string[]",
    "boolean[]": "boolean[]",
  };

  if (typeMap[type]) {
    return typeMap[type];
  }

  // Handle object literal types
  if (type.startsWith("{") && type.endsWith("}")) {
    return "Record<string, any>";
  }

  // Keep Cesium types as-is
  return type;
}

/**
 * Extract parameter info from JSDoc
 */
function extractParamInfo(content: string): Map<string, { type: string; optional: boolean; defaultValue?: string }> {
  const params = new Map<string, { type: string; optional: boolean; defaultValue?: string }>();

  // Match @param {type} [name=default] or @param {type} name
  const paramRegex = /@param\s*\{([^}]+)\}\s*(?:\[([^\]=]+)(?:=([^\]]+))?\]|(\S+))/g;
  let match;

  while ((match = paramRegex.exec(content)) !== null) {
    const type = match[1];
    const optionalName = match[2];
    const defaultValue = match[3];
    const requiredName = match[4];

    const name = optionalName || requiredName;
    if (name) {
      params.set(name, {
        type: parseJSDocType(type),
        optional: !!optionalName,
        defaultValue: defaultValue?.trim(),
      });
    }
  }

  return params;
}

/**
 * Extract return type from JSDoc
 */
function extractReturnType(content: string): string {
  const match = content.match(/@returns?\s*\{([^}]+)\}/);
  if (match) {
    return parseJSDocType(match[1]);
  }
  return "void";
}

/**
 * Convert a constructor function to a TypeScript class
 */
function convertConstructorToClass(content: string, className: string): string {
  // Find the constructor function
  const constructorRegex = new RegExp(
    `((?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?)\nfunction\\s+${className}\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m"
  );

  const match = content.match(constructorRegex);
  if (!match) {
    return content;
  }

  const [fullMatch, jsDoc, params, body] = match;

  // Extract parameter types from JSDoc
  const paramInfo = extractParamInfo(jsDoc);

  // Parse parameters
  const paramList = params.split(",").map(p => p.trim()).filter(Boolean);
  const typedParams = paramList.map(param => {
    const info = paramInfo.get(param);
    if (info) {
      const optionalMark = info.optional ? "?" : "";
      const defaultVal = info.defaultValue ? ` = ${info.defaultValue}` : "";
      return `${param}${optionalMark}: ${info.type}${defaultVal}`;
    }
    return `${param}: any`;
  }).join(", ");

  // Extract instance properties from constructor body
  const propertyRegex = /this\.(\w+)\s*=\s*([^;]+);/g;
  const properties: { name: string; value: string }[] = [];
  let propMatch;
  while ((propMatch = propertyRegex.exec(body)) !== null) {
    properties.push({ name: propMatch[1], value: propMatch[2].trim() });
  }

  // Build property declarations
  const propertyDeclarations = properties.map(prop => {
    // Try to infer type from JSDoc or value
    const typeFromDoc = paramInfo.get(prop.name)?.type;
    if (typeFromDoc) {
      return `  ${prop.name}: ${typeFromDoc};`;
    }
    // Infer from default value
    if (prop.value.includes("??")) {
      const defaultVal = prop.value.split("??")[1].trim();
      if (/^\d+\.?\d*$/.test(defaultVal)) return `  ${prop.name}: number;`;
      if (defaultVal === "true" || defaultVal === "false") return `  ${prop.name}: boolean;`;
      if (defaultVal.startsWith('"') || defaultVal.startsWith("'")) return `  ${prop.name}: string;`;
    }
    return `  ${prop.name}: any;`;
  }).join("\n");

  // Build constructor
  const newConstructor = `  constructor(${typedParams}) {\n${body.replace(/^/gm, "  ")}\n  }`;

  // Build class
  const classContent = `${jsDoc}
export class ${className} {
${propertyDeclarations}

${newConstructor}
}`;

  // Replace the old constructor with the new class
  let result = content.replace(fullMatch, classContent);

  // Convert static methods
  const staticMethodRegex = new RegExp(
    `((?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?)${className}\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{`,
    "g"
  );

  result = result.replace(staticMethodRegex, (match, doc, methodName, params) => {
    const methodParamInfo = extractParamInfo(doc);
    const returnType = extractReturnType(doc);

    const typedMethodParams = params.split(",").map((p: string) => {
      const param = p.trim();
      if (!param) return "";
      const info = methodParamInfo.get(param);
      if (info) {
        const opt = info.optional ? "?" : "";
        return `${param}${opt}: ${info.type}`;
      }
      return `${param}: any`;
    }).filter(Boolean).join(", ");

    return `${doc}static ${methodName}(${typedMethodParams}): ${returnType} {`;
  });

  // Convert prototype methods to class methods
  const protoMethodRegex = new RegExp(
    `((?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?)${className}\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{`,
    "g"
  );

  result = result.replace(protoMethodRegex, (match, doc, methodName, params) => {
    const methodParamInfo = extractParamInfo(doc);
    const returnType = extractReturnType(doc);

    const typedMethodParams = params.split(",").map((p: string) => {
      const param = p.trim();
      if (!param) return "";
      const info = methodParamInfo.get(param);
      if (info) {
        const opt = info.optional ? "?" : "";
        return `${param}${opt}: ${info.type}`;
      }
      return `${param}: any`;
    }).filter(Boolean).join(", ");

    return `${doc}${methodName}(${typedMethodParams}): ${returnType} {`;
  });

  return result;
}

/**
 * Add type annotations to function declarations
 */
function addFunctionTypes(content: string): string {
  // Find standalone function declarations with JSDoc
  const funcRegex = /(\/\*\*[\s\S]*?\*\/\s*)\nfunction\s+(\w+)\s*\(([^)]*)\)\s*\{/g;

  return content.replace(funcRegex, (match, jsDoc, funcName, params) => {
    const paramInfo = extractParamInfo(jsDoc);
    const returnType = extractReturnType(jsDoc);

    const typedParams = params.split(",").map((p: string) => {
      const param = p.trim();
      if (!param) return "";
      const info = paramInfo.get(param);
      if (info) {
        const opt = info.optional ? "?" : "";
        const defaultVal = info.defaultValue ? ` = ${info.defaultValue}` : "";
        return `${param}${opt}: ${info.type}${defaultVal}`;
      }
      return `${param}: any`;
    }).filter(Boolean).join(", ");

    return `${jsDoc}\nexport function ${funcName}(${typedParams}): ${returnType} {`;
  });
}

/**
 * Update imports to use .js extension (for ESM compatibility)
 */
function updateImports(content: string): string {
  // Update relative imports
  return content.replace(
    /from\s+["'](\.[^"']+)\.js["']/g,
    'from "$1.js"'
  );
}

/**
 * Remove debug pragmas
 */
function removeDebugPragmas(content: string): string {
  return content
    .replace(/\/\/>>includeStart\([^)]+\)[\s\S]*?\/\/>>includeEnd\([^)]+\)/g, "")
    .replace(/\/\/>>includeStart\([^)]+\)/g, "")
    .replace(/\/\/>>includeEnd\([^)]+\)/g, "");
}

/**
 * Fix common TypeScript issues
 */
function fixTypeScriptIssues(content: string): string {
  let result = content;

  // Fix 'this' in static methods
  result = result.replace(/\bthis\.constructor\b/g, "Object.getPrototypeOf(this).constructor");

  // Add type assertions where needed
  result = result.replace(/as\s+any\s+as\s+(\w+)/g, "as $1");

  return result;
}

/**
 * Convert a single JavaScript file to TypeScript
 */
async function convertFile(jsPath: string): Promise<boolean> {
  const content = await readFile(jsPath, "utf-8");
  const fileName = basename(jsPath, ".js");
  const tsPath = jsPath.replace(/\.js$/, ".ts");

  let tsContent = content;

  // Step 1: Remove debug pragmas
  tsContent = removeDebugPragmas(tsContent);

  // Step 2: Update imports
  tsContent = updateImports(tsContent);

  // Step 3: Try to convert constructor function to class
  tsContent = convertConstructorToClass(tsContent, fileName);

  // Step 4: Add function types
  tsContent = addFunctionTypes(tsContent);

  // Step 5: Fix common issues
  tsContent = fixTypeScriptIssues(tsContent);

  // Step 6: Update default export
  if (tsContent.includes(`export default ${fileName}`)) {
    // Already has correct export
  } else if (tsContent.includes(`export class ${fileName}`)) {
    // Class is already exported, remove old default export if any
    tsContent = tsContent.replace(new RegExp(`export default ${fileName};?\\s*$`), "");
    if (!tsContent.includes(`export default ${fileName}`)) {
      tsContent += `\nexport default ${fileName};\n`;
    }
  }

  await writeFile(tsPath, tsContent, "utf-8");
  return true;
}

/**
 * Main conversion function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetDir = args[0] || join(packagesDir, "engine", "Source");
  const deleteJs = args.includes("--delete-js");

  console.log(`Converting JavaScript to TypeScript in: ${targetDir}`);
  console.log(`Delete JS files: ${deleteJs}\n`);

  const result: ConversionResult = {
    converted: 0,
    deleted: 0,
    errors: [],
  };

  const glob = new Glob("**/*.js");
  const jsFiles: string[] = [];

  for await (const file of glob.scan(targetDir)) {
    // Skip ThirdParty, Workers, and Shaders directories
    if (file.includes("ThirdParty/") || file.includes("Workers/") || file.includes("Shaders/")) {
      continue;
    }
    jsFiles.push(join(targetDir, file));
  }

  console.log(`Found ${jsFiles.length} JavaScript files to convert\n`);

  for (const jsFile of jsFiles) {
    const relativePath = jsFile.replace(targetDir, "");
    try {
      console.log(`Converting: ${relativePath}`);
      await convertFile(jsFile);
      result.converted++;

      if (deleteJs) {
        await unlink(jsFile);
        result.deleted++;
      }
    } catch (error) {
      const errorMsg = `Error converting ${relativePath}: ${error}`;
      result.errors.push(errorMsg);
      console.error(`  ${errorMsg}`);
    }
  }

  console.log("\n=== Conversion Summary ===");
  console.log(`Converted: ${result.converted}`);
  console.log(`Deleted JS: ${result.deleted}`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }
}

main().catch(console.error);
