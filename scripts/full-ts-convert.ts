#!/usr/bin/env bun
/**
 * Comprehensive TypeScript conversion script for CesiumJS
 * Converts JavaScript files to TypeScript with proper type annotations
 */

import { readdir, readFile, writeFile, unlink, stat } from "fs/promises";
import { join, basename, dirname, relative } from "path";
import { Glob } from "bun";

const rootDir = join(import.meta.dir, "..");
const packagesDir = join(rootDir, "packages");

// Type mappings from JSDoc to TypeScript
const TYPE_MAP: Record<string, string> = {
  "Number": "number",
  "String": "string",
  "Boolean": "boolean",
  "Object": "object",
  "Array": "any[]",
  "Function": "(...args: any[]) => any",
  "undefined": "undefined",
  "null": "null",
  "void": "void",
  "any": "any",
  "*": "any",
  "Promise": "Promise<any>",
  "HTMLCanvasElement": "HTMLCanvasElement",
  "HTMLImageElement": "HTMLImageElement",
  "HTMLVideoElement": "HTMLVideoElement",
  "ImageData": "ImageData",
  "ArrayBuffer": "ArrayBuffer",
  "Uint8Array": "Uint8Array",
  "Uint16Array": "Uint16Array",
  "Uint32Array": "Uint32Array",
  "Int8Array": "Int8Array",
  "Int16Array": "Int16Array",
  "Int32Array": "Int32Array",
  "Float32Array": "Float32Array",
  "Float64Array": "Float64Array",
  "TypedArray": "ArrayBufferView",
  "DataView": "DataView",
  "Blob": "Blob",
  "Document": "Document",
  "Element": "Element",
  "Event": "Event",
  "Error": "Error",
  "RegExp": "RegExp",
  "Date": "Date",
  "Map": "Map<any, any>",
  "Set": "Set<any>",
  "WeakMap": "WeakMap<object, any>",
  "WeakSet": "WeakSet<object>",
};

interface JSDocParam {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
  description?: string;
}

interface JSDocInfo {
  params: JSDocParam[];
  returns?: string;
  description?: string;
  isPrivate: boolean;
  isReadonly: boolean;
  isConstructor: boolean;
  typedef?: string;
  extends?: string;
}

function parseJSDocType(typeStr: string): string {
  if (!typeStr) return "any";

  // Handle union types
  if (typeStr.includes("|")) {
    return typeStr.split("|").map(t => parseJSDocType(t.trim())).join(" | ");
  }

  // Handle array types
  const arrayMatch = typeStr.match(/^Array\.?<(.+)>$/);
  if (arrayMatch) {
    return `${parseJSDocType(arrayMatch[1])}[]`;
  }

  // Handle Object.<K, V> types
  const objectMatch = typeStr.match(/^Object\.?<(.+),\s*(.+)>$/);
  if (objectMatch) {
    return `Record<${parseJSDocType(objectMatch[1])}, ${parseJSDocType(objectMatch[2])}>`;
  }

  // Handle Promise types
  const promiseMatch = typeStr.match(/^Promise\.?<(.+)>$/);
  if (promiseMatch) {
    return `Promise<${parseJSDocType(promiseMatch[1])}>`;
  }

  // Handle nullable types
  if (typeStr.startsWith("?")) {
    return `${parseJSDocType(typeStr.slice(1))} | null`;
  }

  // Handle non-nullable types
  if (typeStr.startsWith("!")) {
    return parseJSDocType(typeStr.slice(1));
  }

  // Handle function types
  const funcMatch = typeStr.match(/^function\s*\(([^)]*)\)\s*(?::\s*(.+))?$/i);
  if (funcMatch) {
    const params = funcMatch[1] || "";
    const returnType = funcMatch[2] ? parseJSDocType(funcMatch[2]) : "void";
    return `(${params || "...args: any[]"}) => ${returnType}`;
  }

  // Direct type mapping
  if (TYPE_MAP[typeStr]) {
    return TYPE_MAP[typeStr];
  }

  // Keep Cesium types as-is
  return typeStr;
}

function extractJSDoc(comment: string): JSDocInfo {
  const info: JSDocInfo = {
    params: [],
    isPrivate: false,
    isReadonly: false,
    isConstructor: false,
  };

  // Check for @private
  if (/@private/.test(comment)) {
    info.isPrivate = true;
  }

  // Check for @readonly
  if (/@readonly/.test(comment)) {
    info.isReadonly = true;
  }

  // Check for @constructor
  if (/@constructor/.test(comment) || /@class/.test(comment)) {
    info.isConstructor = true;
  }

  // Extract @param tags
  const paramRegex = /@param\s+\{([^}]+)\}\s+(?:\[)?(\w+)(?:=([^\]]+)\])?(?:\s+-?\s*(.*))?/g;
  let match;
  while ((match = paramRegex.exec(comment)) !== null) {
    info.params.push({
      type: parseJSDocType(match[1].trim()),
      name: match[2].trim(),
      optional: match[0].includes("[") || match[3] !== undefined,
      defaultValue: match[3]?.trim(),
      description: match[4]?.trim(),
    });
  }

  // Extract @returns
  const returnsMatch = comment.match(/@returns?\s+\{([^}]+)\}/);
  if (returnsMatch) {
    info.returns = parseJSDocType(returnsMatch[1].trim());
  }

  // Extract @typedef
  const typedefMatch = comment.match(/@typedef\s+\{([^}]+)\}\s+(\w+)/);
  if (typedefMatch) {
    info.typedef = typedefMatch[2];
  }

  // Extract @extends
  const extendsMatch = comment.match(/@extends\s+(\w+)/);
  if (extendsMatch) {
    info.extends = extendsMatch[1];
  }

  return info;
}

function convertConstructorToClass(content: string, className: string): string {
  // Find the constructor function
  const constructorRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?function\\s+${className}\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m"
  );

  const constructorMatch = content.match(constructorRegex);
  if (!constructorMatch) {
    return content;
  }

  const fullMatch = constructorMatch[0];
  const params = constructorMatch[1];
  const body = constructorMatch[2];

  // Extract JSDoc if present
  const jsDocMatch = fullMatch.match(/\/\*\*([\s\S]*?)\*\//);
  let jsDoc = "";
  let paramTypes: Map<string, string> = new Map();

  if (jsDocMatch) {
    const info = extractJSDoc(jsDocMatch[1]);
    for (const param of info.params) {
      paramTypes.set(param.name, param.type + (param.optional ? " | undefined" : ""));
    }
    jsDoc = jsDocMatch[0] + "\n";
  }

  // Convert parameters to TypeScript
  const tsParams = params.split(",").map(p => {
    const name = p.trim();
    if (!name) return "";
    const type = paramTypes.get(name) || "any";
    return `${name}: ${type}`;
  }).filter(p => p).join(", ");

  // Find instance properties from this.x assignments
  const propAssignments = body.match(/this\.(\w+)\s*=/g) || [];
  const props = [...new Set(propAssignments.map(p => p.match(/this\.(\w+)/)?.[1]).filter(Boolean))];

  // Generate property declarations
  const propDeclarations = props.map(prop => `  ${prop}: any;`).join("\n");

  // Convert body - replace this.x = to just assignment
  let classBody = body;

  // Build the class
  let classCode = `${jsDoc}export class ${className} {\n`;
  if (propDeclarations) {
    classCode += `${propDeclarations}\n\n`;
  }
  classCode += `  constructor(${tsParams}) {${classBody}\n  }\n`;

  // Find and convert static methods: ClassName.methodName = function
  const staticMethodRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?${className}\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\};?`,
    "gm"
  );

  const staticMethods: string[] = [];
  let methodMatch;
  const methodsToRemove: string[] = [];

  // First pass - collect static methods
  while ((methodMatch = staticMethodRegex.exec(content)) !== null) {
    const methodFullMatch = methodMatch[0];
    const methodName = methodMatch[1];
    const methodParams = methodMatch[2];
    const methodBody = methodMatch[3];

    methodsToRemove.push(methodFullMatch);

    // Extract JSDoc for method
    const methodJsDocMatch = methodFullMatch.match(/\/\*\*([\s\S]*?)\*\//);
    let methodJsDoc = "";
    let methodParamTypes: Map<string, string> = new Map();
    let returnType = "any";

    if (methodJsDocMatch) {
      const info = extractJSDoc(methodJsDocMatch[1]);
      for (const param of info.params) {
        methodParamTypes.set(param.name, param.type);
      }
      if (info.returns) {
        returnType = info.returns;
      }
      methodJsDoc = "  " + methodJsDocMatch[0].replace(/\n/g, "\n  ") + "\n";
    }

    // Convert method params
    const tsMethodParams = methodParams.split(",").map(p => {
      const name = p.trim();
      if (!name) return "";
      const type = methodParamTypes.get(name) || "any";
      return `${name}: ${type}`;
    }).filter(p => p).join(", ");

    staticMethods.push(
      `${methodJsDoc}  static ${methodName}(${tsMethodParams}): ${returnType} {${methodBody}\n  }\n`
    );
  }

  // Find and convert prototype methods
  const protoMethodRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?${className}\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\};?`,
    "gm"
  );

  const instanceMethods: string[] = [];

  while ((methodMatch = protoMethodRegex.exec(content)) !== null) {
    const methodFullMatch = methodMatch[0];
    const methodName = methodMatch[1];
    const methodParams = methodMatch[2];
    const methodBody = methodMatch[3];

    methodsToRemove.push(methodFullMatch);

    // Extract JSDoc
    const methodJsDocMatch = methodFullMatch.match(/\/\*\*([\s\S]*?)\*\//);
    let methodJsDoc = "";
    let methodParamTypes: Map<string, string> = new Map();
    let returnType = "any";

    if (methodJsDocMatch) {
      const info = extractJSDoc(methodJsDocMatch[1]);
      for (const param of info.params) {
        methodParamTypes.set(param.name, param.type);
      }
      if (info.returns) {
        returnType = info.returns;
      }
      methodJsDoc = "  " + methodJsDocMatch[0].replace(/\n/g, "\n  ") + "\n";
    }

    const tsMethodParams = methodParams.split(",").map(p => {
      const name = p.trim();
      if (!name) return "";
      const type = methodParamTypes.get(name) || "any";
      return `${name}: ${type}`;
    }).filter(p => p).join(", ");

    instanceMethods.push(
      `${methodJsDoc}  ${methodName}(${tsMethodParams}): ${returnType} {${methodBody}\n  }\n`
    );
  }

  // Add methods to class
  if (staticMethods.length > 0) {
    classCode += "\n" + staticMethods.join("\n");
  }
  if (instanceMethods.length > 0) {
    classCode += "\n" + instanceMethods.join("\n");
  }

  classCode += "}\n";

  // Replace constructor with class
  let result = content.replace(constructorRegex, classCode);

  // Remove the methods that were moved into the class
  for (const method of methodsToRemove) {
    result = result.replace(method, "");
  }

  // Clean up empty lines
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

function convertFreeFunction(content: string): string {
  // Convert standalone exported functions
  const funcRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;

  return content.replace(funcRegex, (match, jsDoc, funcName, params) => {
    let paramTypes: Map<string, string> = new Map();
    let returnType = "any";

    if (jsDoc) {
      const info = extractJSDoc(jsDoc);
      for (const param of info.params) {
        paramTypes.set(param.name, param.type);
      }
      if (info.returns) {
        returnType = info.returns;
      }
    }

    const tsParams = params.split(",").map((p: string) => {
      const name = p.trim();
      if (!name) return "";
      const type = paramTypes.get(name) || "any";
      return `${name}: ${type}`;
    }).filter((p: string) => p).join(", ");

    const jsDocStr = jsDoc ? `/**${jsDoc}*/\n` : "";
    return `${jsDocStr}function ${funcName}(${tsParams}): ${returnType} {`;
  });
}

function addTypeAnnotationsToVariables(content: string): string {
  // Add type annotations to const/let declarations where possible

  // Handle Object.freeze enums
  content = content.replace(
    /const\s+(\w+)\s*=\s*Object\.freeze\(\{([^}]+)\}\)/g,
    (match, name, props) => {
      return `const ${name} = Object.freeze({${props}} as const)`;
    }
  );

  return content;
}

function fixImports(content: string): string {
  // Change .js imports to no extension (TypeScript will resolve)
  content = content.replace(/from\s+["']([^"']+)\.js["']/g, 'from "$1.js"');

  // Ensure default imports have proper typing
  return content;
}

function convertEnumPattern(content: string): string {
  // Convert Cesium enum patterns to TypeScript enums
  // Pattern: const EnumName = Object.freeze({ KEY: value, ... })
  const enumRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?const\s+(\w+)\s*=\s*Object\.freeze\(\{([^}]+)\}\);?/g;

  return content.replace(enumRegex, (match, jsDoc, enumName, body) => {
    // Check if it looks like an enum (all caps keys with numeric/string values)
    const entries = body.split(",").map((e: string) => e.trim()).filter((e: string) => e);
    const isEnum = entries.every((e: string) => {
      const [key] = e.split(":").map((s: string) => s.trim());
      return key && /^[A-Z_][A-Z0-9_]*$/.test(key);
    });

    if (!isEnum || entries.length < 2) {
      // Not an enum, keep as const
      return match.replace(/\}\);?$/, "} as const);");
    }

    const jsDocStr = jsDoc ? `/**${jsDoc}*/\n` : "";
    return `${jsDocStr}export const ${enumName} = Object.freeze({${body}} as const);
export type ${enumName} = typeof ${enumName}[keyof typeof ${enumName}];`;
  });
}

async function convertFile(filePath: string): Promise<boolean> {
  try {
    let content = await readFile(filePath, "utf-8");
    const fileName = basename(filePath, ".js");

    // Skip shader JS files (generated from GLSL)
    if (filePath.includes("/Shaders/")) {
      return false;
    }

    // Skip if already TypeScript
    if (filePath.endsWith(".ts")) {
      return false;
    }

    // Add TypeScript strict mode hints
    let result = content;

    // Convert constructor functions to classes
    // Check if file has a main class (filename matches)
    if (/function\s+/.test(content)) {
      // Check for class-like constructor
      const classConstructorRegex = new RegExp(`function\\s+${fileName}\\s*\\(`);
      if (classConstructorRegex.test(content)) {
        result = convertConstructorToClass(result, fileName);
      }

      // Convert remaining free functions
      result = convertFreeFunction(result);
    }

    // Convert enum patterns
    result = convertEnumPattern(result);

    // Add type annotations
    result = addTypeAnnotationsToVariables(result);

    // Fix imports
    result = fixImports(result);

    // Ensure export default
    if (!result.includes("export default") && !result.includes("export {")) {
      // Check if there's a main export
      if (result.includes(`class ${fileName}`)) {
        result += `\nexport default ${fileName};\n`;
      } else if (result.includes(`const ${fileName}`)) {
        result += `\nexport default ${fileName};\n`;
      } else if (result.includes(`function ${fileName}`)) {
        result += `\nexport default ${fileName};\n`;
      }
    }

    // Write TypeScript file
    const tsPath = filePath.replace(/\.js$/, ".ts");
    await writeFile(tsPath, result, "utf-8");

    return true;
  } catch (error) {
    console.error(`Error converting ${filePath}:`, error);
    return false;
  }
}

async function convertDirectory(dir: string): Promise<{ converted: number; errors: number }> {
  const glob = new Glob("**/*.js");
  let converted = 0;
  let errors = 0;

  const files: string[] = [];
  for await (const file of glob.scan(dir)) {
    // Skip node_modules, Build, and shader files
    if (file.includes("node_modules") || file.includes("Build") || file.includes("/Shaders/")) {
      continue;
    }
    files.push(join(dir, file));
  }

  console.log(`  Found ${files.length} JavaScript files to convert`);

  // Process files in batches
  const batchSize = 50;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(convertFile));

    converted += results.filter(r => r).length;
    errors += results.filter(r => !r).length;

    process.stdout.write(`\r  Converted ${converted}/${files.length} files...`);
  }

  console.log(); // New line after progress

  return { converted, errors };
}

async function removeJsFiles(dir: string): Promise<number> {
  const glob = new Glob("**/*.js");
  let removed = 0;

  const files: string[] = [];
  for await (const file of glob.scan(dir)) {
    // Skip Shaders (they need to stay as .js)
    if (file.includes("/Shaders/")) {
      continue;
    }
    const fullPath = join(dir, file);
    const tsPath = fullPath.replace(/\.js$/, ".ts");

    // Only remove if corresponding .ts file exists
    try {
      await stat(tsPath);
      files.push(fullPath);
    } catch {
      // No .ts file, keep the .js
    }
  }

  console.log(`  Found ${files.length} JavaScript files to remove`);

  for (const file of files) {
    try {
      await unlink(file);
      removed++;
    } catch (error) {
      console.error(`  Failed to remove ${file}`);
    }
  }

  return removed;
}

async function main(): Promise<void> {
  console.log("=== CesiumJS Full TypeScript Conversion ===\n");

  const engineSource = join(packagesDir, "engine", "Source");
  const widgetsSource = join(packagesDir, "widgets", "Source");

  // Convert engine
  console.log("Converting @cesium/engine...");
  const engineResult = await convertDirectory(engineSource);
  console.log(`  Converted: ${engineResult.converted}, Errors: ${engineResult.errors}`);

  // Convert widgets
  console.log("\nConverting @cesium/widgets...");
  const widgetsResult = await convertDirectory(widgetsSource);
  console.log(`  Converted: ${widgetsResult.converted}, Errors: ${widgetsResult.errors}`);

  // Remove JS files
  console.log("\nRemoving JavaScript files...");
  const engineRemoved = await removeJsFiles(engineSource);
  const widgetsRemoved = await removeJsFiles(widgetsSource);
  console.log(`  Removed: ${engineRemoved + widgetsRemoved} files`);

  console.log("\n=== Conversion Complete ===");
  console.log(`Total converted: ${engineResult.converted + widgetsResult.converted}`);
  console.log(`Total removed: ${engineRemoved + widgetsRemoved}`);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
