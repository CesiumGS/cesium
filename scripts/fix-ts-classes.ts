#!/usr/bin/env bun
/**
 * Fix TypeScript class files that have incomplete conversions
 */

import { readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { Glob } from "bun";

const rootDir = join(import.meta.dir, "..");
const packagesDir = join(rootDir, "packages");

async function fixFile(filePath: string): Promise<boolean> {
  let content = await readFile(filePath, "utf-8");
  const fileName = basename(filePath, ".ts");
  let modified = false;

  // Fix pattern: Object.defineProperties inside class body
  // This happens when class was created but defineProperties wasn't moved out
  const definePropsInsideClass = new RegExp(
    `(export class ${fileName}[^{]*\\{[^}]*\\}\\s*\\n\\s*)Object\\.defineProperties\\s*\\(\\s*${fileName}\\.prototype\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\);?`,
    "m"
  );

  let match = content.match(definePropsInsideClass);
  if (match) {
    const classDecl = match[1];
    const propsBody = match[2];

    // Parse property definitions and convert to class getters/setters
    const getters = parsePropertyDefinitions(propsBody);

    // Remove the Object.defineProperties from content
    content = content.replace(match[0], classDecl.slice(0, -1) + getters + "\n}\n");
    modified = true;
  }

  // Fix pattern: Object.defineProperties after class (outside)
  const definePropsOutsideClass = new RegExp(
    `Object\\.defineProperties\\s*\\(\\s*${fileName}\\.prototype\\s*,\\s*\\{([\\s\\S]*?)\\n\\}\\s*\\);?`,
    "gm"
  );

  const propsMatches = [...content.matchAll(definePropsOutsideClass)];
  for (const propMatch of propsMatches) {
    const propsBody = propMatch[1];
    const getters = parsePropertyDefinitions(propsBody);

    // Find the class and add getters
    const classRegex = new RegExp(`(export class ${fileName}[^{]*\\{)([\\s\\S]*?)(\\n\\})`, "m");
    const classMatch = content.match(classRegex);
    if (classMatch) {
      content = content.replace(classRegex, `$1$2${getters}$3`);
      content = content.replace(propMatch[0], "");
      modified = true;
    }
  }

  // Fix pattern: ClassName.prototype.method = function outside class
  const protoMethodRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?${fileName}\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\};?`,
    "gm"
  );

  const methodMatches = [...content.matchAll(protoMethodRegex)];
  for (const methodMatch of methodMatches) {
    const methodName = methodMatch[1];
    const params = methodMatch[2];
    const body = methodMatch[3];

    // Extract JSDoc if present
    const jsDocMatch = methodMatch[0].match(/\/\*\*([\s\S]*?)\*\//);
    const jsDoc = jsDocMatch ? `  /**${jsDocMatch[1]}*/\n` : "";

    const method = `${jsDoc}  ${methodName}(${params}): any {${body}\n  }\n`;

    // Find the class and add method
    const classRegex = new RegExp(`(export class ${fileName}[^{]*\\{)([\\s\\S]*?)(\\n\\})`, "m");
    const classMatch = content.match(classRegex);
    if (classMatch) {
      content = content.replace(classRegex, `$1$2\n${method}$3`);
      content = content.replace(methodMatch[0], "");
      modified = true;
    }
  }

  // Fix pattern: ClassName.staticMethod = function outside class
  const staticMethodRegex = new RegExp(
    `(?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?${fileName}\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\};?`,
    "gm"
  );

  const staticMatches = [...content.matchAll(staticMethodRegex)];
  for (const staticMatch of staticMatches) {
    const methodName = staticMatch[1];
    if (methodName === "prototype") continue;

    const params = staticMatch[2];
    const body = staticMatch[3];

    const jsDocMatch = staticMatch[0].match(/\/\*\*([\s\S]*?)\*\//);
    const jsDoc = jsDocMatch ? `  /**${jsDocMatch[1]}*/\n` : "";

    const method = `${jsDoc}  static ${methodName}(${params}): any {${body}\n  }\n`;

    const classRegex = new RegExp(`(export class ${fileName}[^{]*\\{)([\\s\\S]*?)(\\n\\})`, "m");
    const classMatch = content.match(classRegex);
    if (classMatch) {
      content = content.replace(classRegex, `$1$2\n${method}$3`);
      content = content.replace(staticMatch[0], "");
      modified = true;
    }
  }

  // Fix pattern: ClassName.CONSTANT = value (static properties)
  const staticPropRegex = new RegExp(
    `${fileName}\\.(\\w+)\\s*=\\s*([^;]+);`,
    "gm"
  );

  const staticPropMatches = [...content.matchAll(staticPropRegex)];
  for (const propMatch of staticPropMatches) {
    const propName = propMatch[1];
    if (propName === "prototype") continue;

    const value = propMatch[2].trim();

    // Check if this looks like a constant (all caps) or a simple value
    if (/^[A-Z_]+$/.test(propName) || /^(new |Object\.freeze|true|false|\d)/.test(value)) {
      const prop = `  static readonly ${propName} = ${value};\n`;

      const classRegex = new RegExp(`(export class ${fileName}\\s*\\{)`, "m");
      const classMatch = content.match(classRegex);
      if (classMatch) {
        content = content.replace(classRegex, `$1\n${prop}`);
        content = content.replace(propMatch[0], "");
        modified = true;
      }
    }
  }

  // Clean up empty lines and fix closing brace issues
  content = content.replace(/\n{3,}/g, "\n\n");
  content = content.replace(/\}\s*\)\s*;?\s*$/gm, "}\n");

  if (modified) {
    await writeFile(filePath, content, "utf-8");
    return true;
  }

  return false;
}

function parsePropertyDefinitions(propsBody: string): string {
  const props: string[] = [];

  // Match property definitions like: propName: { get: function() {...} }
  const propRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(\w+)\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;

  let match;
  while ((match = propRegex.exec(propsBody)) !== null) {
    const propName = match[1];
    const propDef = match[2];

    // Extract JSDoc
    const jsDocMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);
    const jsDoc = jsDocMatch ? `  /**${jsDocMatch[1]}*/\n` : "";

    // Extract getter
    const getterMatch = propDef.match(/get\s*:\s*(?:function\s*)?\(?\)?\s*(?:=>)?\s*\{?([\s\S]*?)\}?(?:,|$)/);
    const setterMatch = propDef.match(/set\s*:\s*(?:function\s*)?\((\w*)\)\s*(?:=>)?\s*\{?([\s\S]*?)\}?(?:,|$)/);

    // Handle DeveloperError.throwInstantiationError pattern
    if (propDef.includes("DeveloperError.throwInstantiationError")) {
      props.push(`${jsDoc}  get ${propName}(): any {\n    throw DeveloperError.throwInstantiationError();\n  }\n`);
    } else if (getterMatch) {
      let getterBody = getterMatch[1].trim();
      if (getterBody.startsWith("return")) {
        props.push(`${jsDoc}  get ${propName}(): any {\n    ${getterBody}\n  }\n`);
      } else if (!getterBody.includes("{")) {
        props.push(`${jsDoc}  get ${propName}(): any {\n    return ${getterBody};\n  }\n`);
      } else {
        props.push(`${jsDoc}  get ${propName}(): any {${getterBody}}\n`);
      }
    }

    if (setterMatch) {
      const param = setterMatch[1] || "value";
      const setterBody = setterMatch[2].trim();
      props.push(`  set ${propName}(${param}: any) {\n    ${setterBody}\n  }\n`);
    }
  }

  return props.length > 0 ? "\n" + props.join("\n") : "";
}

async function main(): Promise<void> {
  console.log("Fixing TypeScript class files...\n");

  const glob = new Glob("**/*.ts");
  let fixed = 0;
  let checked = 0;

  for (const dir of ["engine/Source", "widgets/Source"]) {
    const sourceDir = join(packagesDir, dir);

    for await (const file of glob.scan(sourceDir)) {
      const filePath = join(sourceDir, file);
      checked++;

      try {
        if (await fixFile(filePath)) {
          fixed++;
        }
      } catch (error) {
        console.error(`Error fixing ${file}:`, error);
      }

      if (checked % 100 === 0) {
        process.stdout.write(`\rChecked ${checked} files, fixed ${fixed}...`);
      }
    }
  }

  console.log(`\n\nFixed ${fixed} files out of ${checked} checked.`);
}

if (import.meta.main) {
  main().catch(console.error);
}
