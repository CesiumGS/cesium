// @ts-check

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, posix, sep } from "node:path";
import { format, resolveConfig } from "prettier";

/**
 * The keywords of the glTF JSON schemas that this generator reads.
 *
 * @typedef {object} SchemaKeywords
 * @property {string} [$ref]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [gltf_detailedDescription]
 * @property {string[]} [gltf_enumNames]
 * @property {string | string[]} [type]
 * @property {Record<string, SchemaKeywords>} [properties]
 * @property {string[]} [required]
 * @property {SchemaKeywords | boolean} [additionalProperties]
 * @property {SchemaKeywords[]} [allOf]
 * @property {SchemaKeywords[]} [anyOf]
 * @property {SchemaKeywords[]} [oneOf]
 * @property {unknown[]} [enum]
 * @property {unknown} [const]
 * @property {SchemaKeywords} [items]
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {unknown} [default]
 */

/**
 * The schemas of one generated file.
 *
 * @typedef {object} SchemaSet
 * @property {string} rootName The name of the root interface and namespace.
 * @property {string} modulePath Path in `SchemaTypes`, without an extension.
 * @property {Map<string, SchemaKeywords>} schemas Keyed by path in the schema directory.
 * @property {Map<string, SchemaKeywords>} [baseline] The glTF 2.0 schemas, to mark glTF 2.1 additions.
 * @property {string} [extensionName]
 * @property {SchemaSet} [core] The core schemas an extension's references resolve against.
 * @property {Map<string, Attachment[]>} extensionsByFile Each object's extensions, keyed by its schema's path.
 * @property {Set<SchemaSet>} imports The schema sets the generated file refers to.
 */

/**
 * A schema found by a reference, in the schema set that holds it.
 *
 * @typedef {object} SchemaTarget
 * @property {SchemaSet} schemaSet
 * @property {string} fileName
 * @property {SchemaKeywords} schema
 */

/**
 * An extension that an object can have in its `extensions`.
 *
 * @typedef {object} Attachment
 * @property {string} name
 * @property {SchemaTarget} target The extension's schema for that object.
 * @property {boolean} isGltf21 Whether the extension needs glTF 2.1.
 */

/**
 * @typedef {object} TypeNode
 * @property {string} [interfaceCode]
 * @property {Map<string, TypeNode>} children
 */

/**
 * @typedef {object} EnumValue
 * @property {unknown} value
 * @property {string} [description]
 */

/**
 * @typedef {object} SchemaSource
 * @property {string} repository
 * @property {string} commit
 * @property {string} schemaDirectory
 */

/**
 * @typedef {object} ExtensionSource
 * @property {string} repository
 * @property {string} commit
 * @property {string} schemaDirectory
 * @property {string[]} core
 * @property {Record<string, string[]>} extends
 */

const packageDirectory = join(import.meta.dirname, "..");
const schemasDirectory = join(packageDirectory, "Build/Schemas");
const outputDirectory = join(packageDirectory, "SchemaTypes");
const propertySchema = "glTFProperty.schema.json";

/** @type {{core: Record<string, SchemaSource>, extensions: Record<string, ExtensionSource | {core: string[]}>}} */
const sources = JSON.parse(
  readFileSync(join(import.meta.dirname, "gltfSchemaSources.json"), "utf8"),
);

const gltf1 = createSchemaSet("Gltf1", "Gltf1", "1.0");
const gltf2 = createSchemaSet("Gltf2", "Gltf2", "2.1");
gltf2.baseline = loadSchemas("2.0");

/** @type {Map<string, SchemaSet>} */
const extensionSets = new Map();
for (const [name, source] of Object.entries(sources.extensions)) {
  if (!("schemaDirectory" in source)) {
    continue;
  }
  let rootName = name;
  if (/^\d/.test(name)) {
    rootName = `_${name}`;
  }
  const extensionSet = createSchemaSet(
    rootName,
    `Extensions/${name}`,
    `Extensions/${name}`,
  );
  extensionSet.extensionName = name;
  extensionSet.core = gltf2;
  if (source.core.every((version) => version === "1.0")) {
    extensionSet.core = gltf1;
  }
  extensionSets.set(name, extensionSet);
}
attachExtensions();

rmSync(join(outputDirectory, "Extensions"), { recursive: true, force: true });
mkdirSync(join(outputDirectory, "Extensions"), { recursive: true });
await writeSchemaSet(gltf1, [sources.core["1.0"]]);
await writeSchemaSet(gltf2, [sources.core["2.0"], sources.core["2.1"]]);
let indexCode = `${getHeader([])}export type * from "./Gltf1.js";\nexport type * from "./Gltf2.js";\n`;
for (const [name, extensionSet] of extensionSets) {
  const source = /** @type {ExtensionSource} */ (sources.extensions[name]);
  await writeSchemaSet(extensionSet, [source]);
  indexCode += `export type * from "./${extensionSet.modulePath}.js";\n`;
}
await writeTypeScript("index.ts", indexCode);

/**
 * @param {string} rootName
 * @param {string} modulePath
 * @param {string} directory The schema directory, in `Build/Schemas`.
 * @returns {SchemaSet}
 */
function createSchemaSet(rootName, modulePath, directory) {
  /** @type {Map<string, Attachment[]>} */
  const extensionsByFile = new Map();
  // Every core object inherits the extensions of glTFProperty.
  if (!directory.startsWith("Extensions/")) {
    extensionsByFile.set(propertySchema, []);
  }
  return {
    rootName: rootName,
    modulePath: modulePath,
    schemas: loadSchemas(directory),
    extensionsByFile: extensionsByFile,
    imports: new Set(),
  };
}

/**
 * Loads the schemas in a directory and its subdirectories.
 *
 * @param {string} directory The schema directory, in `Build/Schemas`.
 * @returns {Map<string, SchemaKeywords>}
 */
function loadSchemas(directory) {
  const fullDirectory = join(schemasDirectory, directory);
  const fileNames = readdirSync(fullDirectory, {
    recursive: true,
    encoding: "utf8",
  })
    .filter((fileName) => fileName.endsWith(".schema.json"))
    .map((fileName) => fileName.split(sep).join("/"))
    .sort();
  /** @type {Map<string, SchemaKeywords>} */
  const schemas = new Map();
  for (const fileName of fileNames) {
    schemas.set(
      fileName,
      JSON.parse(readFileSync(join(fullDirectory, fileName), "utf8")),
    );
  }
  return schemas;
}

/**
 * Records the objects that each extension in `gltfSchemaSources.json` extends.
 */
function attachExtensions() {
  for (const [name, extensionSet] of extensionSets) {
    const source = /** @type {ExtensionSource} */ (sources.extensions[name]);
    const isGltf21 = source.core.includes("2.1");
    for (const [fileName, objects] of Object.entries(source.extends)) {
      const target = {
        schemaSet: extensionSet,
        fileName: fileName,
        schema: getSchema(extensionSet, fileName),
      };
      for (const object of objects) {
        for (const owner of getExtendedObjects(source, object)) {
          let attachments = owner.schemaSet.extensionsByFile.get(
            owner.fileName,
          );
          if (attachments === undefined) {
            attachments = [];
            owner.schemaSet.extensionsByFile.set(owner.fileName, attachments);
          }
          attachments.push({ name: name, target: target, isGltf21: isGltf21 });
        }
      }
    }
  }
}

/**
 * Returns the objects that an `extends` entry names: a core object, `*` for
 * any object, or `<NAME>/<object>` for an object of another extension.
 *
 * @param {ExtensionSource} source
 * @param {string} object
 * @returns {{schemaSet: SchemaSet, fileName: string}[]}
 */
function getExtendedObjects(source, object) {
  if (object.includes("/")) {
    const [extensionName, objectName] = object.split("/");
    const extensionSet = /** @type {SchemaSet} */ (
      extensionSets.get(extensionName)
    );
    return [{ schemaSet: extensionSet, fileName: `${objectName}.schema.json` }];
  }

  let fileName = `${object}.schema.json`;
  if (object === "*") {
    fileName = propertySchema;
  }
  return source.core.map((version) => {
    let coreSet = gltf2;
    if (version === "1.0") {
      coreSet = gltf1;
    }
    return { schemaSet: coreSet, fileName: fileName };
  });
}

/**
 * @param {SchemaSource[]} schemaSources
 * @returns {string}
 */
function getHeader(schemaSources) {
  const lines = [];
  if (schemaSources.length > 0) {
    lines.push("// Generated from the glTF JSON schemas at:");
    for (const { repository, commit, schemaDirectory } of schemaSources) {
      lines.push(
        `//   https://github.com/${repository}/tree/${commit}/${schemaDirectory}`,
      );
    }
  }
  lines.push(
    "// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.",
  );
  return `${lines.join("\n")}\n\n`;
}

/**
 * Writes a schema set's types, with imports of the schema sets they use.
 *
 * @param {SchemaSet} schemaSet
 * @param {SchemaSource[]} schemaSources
 */
async function writeSchemaSet(schemaSet, schemaSources) {
  const types = generateTypes(schemaSet);
  const imported = [...schemaSet.imports].sort((left, right) =>
    left.modulePath.localeCompare(right.modulePath, "en"),
  );
  let imports = "";
  for (const { rootName, modulePath } of imported) {
    let path = posix.relative(posix.dirname(schemaSet.modulePath), modulePath);
    if (!path.startsWith(".")) {
      path = `./${path}`;
    }
    imports += `import type { ${rootName} } from "${path}.js";\n`;
  }
  await writeTypeScript(
    `${schemaSet.modulePath}.ts`,
    `${getHeader(schemaSources)}${imports}\n${types}`,
  );
}

/**
 * @param {string} fileName
 * @param {string} code
 */
async function writeTypeScript(fileName, code) {
  const path = join(outputDirectory, fileName);
  const options = await resolveConfig(path);
  const formatted = await format(code, { ...options, filepath: path });
  writeFileSync(
    path,
    await wrapDocComments(formatted, options?.printWidth ?? 80),
  );
}

/**
 * Wraps doc comments to the print width; prettier leaves comments as they are.
 *
 * @param {string} code
 * @param {number} width
 * @returns {Promise<string>}
 */
async function wrapDocComments(code, width) {
  const lines = code.split("\n");
  const output = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    output.push(line);
    index++;
    if (line.trim() !== "/**") {
      continue;
    }

    const bodyStart = index;
    while (lines[index].trim() !== "*/") {
      index++;
    }
    const prefix = lines[index].replace("*/", "* ");
    const text = lines
      .slice(bodyStart, index)
      .map((bodyLine) => bodyLine.slice(prefix.length))
      .join("\n");
    const wrapped = await format(text, {
      parser: "markdown",
      proseWrap: "always",
      printWidth: width - prefix.length,
    });
    for (const wrappedLine of wrapped.trimEnd().split("\n")) {
      output.push(`${prefix}${wrappedLine}`.trimEnd());
    }
  }
  return output.join("\n");
}

/**
 * Generates the root interface and namespace of a schema set.
 *
 * @param {SchemaSet} schemaSet
 * @returns {string}
 */
function generateTypes(schemaSet) {
  /** @type {TypeNode} */
  const root = { children: new Map() };
  for (const [fileName, schema] of schemaSet.schemas) {
    if (!hasInterface(schema)) {
      continue;
    }
    const nameParts = getNameParts(schemaSet, fileName);
    let node = root;
    for (const part of nameParts) {
      let child = node.children.get(part);
      if (child === undefined) {
        child = { children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    }
    node.interfaceCode = generateInterface(
      schemaSet,
      fileName,
      schema,
      nameParts.at(-1) ?? schemaSet.rootName,
      nameParts.length === 0,
    );
    if (schemaSet.extensionsByFile.has(fileName)) {
      node.children.set("Extensions", {
        interfaceCode: generateExtensions(schemaSet, fileName, schema),
        children: new Map(),
      });
    }
  }
  return generateNode(schemaSet.rootName, root, true);
}

/**
 * @param {string} name
 * @param {TypeNode} node
 * @param {boolean} isRoot
 * @returns {string}
 */
function generateNode(name, node, isRoot) {
  let code = node.interfaceCode ?? "";
  if (node.children.size > 0) {
    if (isRoot) {
      code += "/** @internal */\n";
    }
    code += `export namespace ${name} {\n`;
    for (const [childName, child] of node.children) {
      code += generateNode(childName, child, false);
    }
    code += "}\n";
  }
  return code;
}

/**
 * @param {SchemaSet} schemaSet
 * @param {string} fileName
 * @param {SchemaKeywords} schema
 * @param {string} name
 * @param {boolean} isRoot
 * @returns {string}
 */
function generateInterface(schemaSet, fileName, schema, name, isRoot) {
  const docLines = getDescriptionLines(schema);
  if (schemaSet.baseline !== undefined && !schemaSet.baseline.has(fileName)) {
    appendGltf21Marker(docLines);
  }
  if (isRoot) {
    docLines.push("@internal");
  }

  let heritage = "";
  const reference = getReference(schema);
  if (reference !== undefined) {
    const base = resolveReference(schemaSet, reference);
    heritage = ` extends ${getTypeName(schemaSet, base)}`;
  }

  let extensionsType;
  if (schemaSet.extensionsByFile.has(fileName)) {
    const self = { schemaSet: schemaSet, fileName: fileName, schema: schema };
    extensionsType = `${getTypeName(schemaSet, self)}.Extensions`;
  }
  return `${formatDoc(docLines)}export interface ${name}${heritage} {\n${generateProperties(schemaSet, schema, fileName, extensionsType)}}\n`;
}

/**
 * Generates an object's `Extensions` interface, which accepts any other
 * extension unless it extends another `Extensions` interface.
 *
 * @param {SchemaSet} schemaSet
 * @param {string} fileName
 * @param {SchemaKeywords} schema
 * @returns {string}
 */
function generateExtensions(schemaSet, fileName, schema) {
  const baseName = getBaseExtensionsName(schemaSet, schema);
  let heritage = "";
  if (baseName !== undefined) {
    heritage = ` extends ${baseName}`;
  }

  const attachments = [
    ...(schemaSet.extensionsByFile.get(fileName) ?? []),
  ].sort((left, right) => left.name.localeCompare(right.name, "en"));
  let code = `export interface Extensions${heritage} {\n`;
  for (const { name, target, isGltf21 } of attachments) {
    const docLines = getDescriptionLines(target.schema);
    if (isGltf21) {
      appendGltf21Marker(docLines);
    }
    const type = getTypeName(schemaSet, target);
    code += `${formatDoc(docLines)}${formatPropertyName(name)}?: ${type};\n`;
  }
  if (baseName === undefined) {
    code += "[name: string]: unknown;\n";
  }
  return `${code}}\n`;
}

/**
 * Returns the `Extensions` interface of the nearest base object that has one.
 *
 * @param {SchemaSet} schemaSet
 * @param {SchemaKeywords} schema
 * @returns {string | undefined}
 */
function getBaseExtensionsName(schemaSet, schema) {
  let lookupSet = schemaSet;
  let reference = getReference(schema);
  while (reference !== undefined) {
    const base = resolveReference(lookupSet, reference);
    if (base.schemaSet.extensionsByFile.has(base.fileName)) {
      return `${getTypeName(schemaSet, base)}.Extensions`;
    }
    lookupSet = base.schemaSet;
    reference = getReference(base.schema);
  }
  return undefined;
}

/**
 * Generates an object schema's properties, skipping empty ones, which only
 * mark inherited properties.
 *
 * @param {SchemaSet} schemaSet
 * @param {SchemaKeywords} schema
 * @param {string} [fileName] The schema's file name, if it isn't an inline object schema.
 * @param {string} [extensionsType] The type of `extensions`, if the object has its own `Extensions`.
 * @returns {string}
 */
function generateProperties(schemaSet, schema, fileName, extensionsType) {
  const required = schema.required ?? [];
  let baselineProperties;
  if (schemaSet.baseline !== undefined && fileName !== undefined) {
    baselineProperties = schemaSet.baseline.get(fileName)?.properties;
  }

  let code = "";
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (Object.keys(property).length === 0) {
      continue;
    }
    if (name === "extensions" && extensionsType !== undefined) {
      continue;
    }
    const baselineProperty = baselineProperties?.[name];
    const docLines = getPropertyDocLines(schemaSet, property);
    if (baselineProperties !== undefined && baselineProperty === undefined) {
      appendGltf21Marker(docLines);
    }
    docLines.push(...getEnumDocLines(property, baselineProperty));
    if (property.default !== undefined) {
      docLines.push(`@default ${JSON.stringify(property.default)}`);
    }

    let optional = "?";
    if (required.includes(name)) {
      optional = "";
    }
    code += `${formatDoc(docLines)}${formatPropertyName(name)}${optional}: ${resolveType(schemaSet, property)};\n`;
  }

  if (extensionsType !== undefined) {
    const coreSet = schemaSet.core ?? schemaSet;
    const coreProperties = getSchema(coreSet, propertySchema).properties ?? {};
    const docLines = getPropertyDocLines(coreSet, coreProperties.extensions);
    code += `${formatDoc(docLines)}extensions?: ${extensionsType};\n`;
  }
  return code;
}

/**
 * Returns a property's description, or else that of the schema it refers to.
 *
 * @param {SchemaSet} schemaSet
 * @param {SchemaKeywords} property
 * @returns {string[]}
 */
function getPropertyDocLines(schemaSet, property) {
  const docLines = getDescriptionLines(property);
  const reference = getReference(property);
  if (docLines.length === 0 && reference !== undefined) {
    return getDescriptionLines(resolveReference(schemaSet, reference).schema);
  }
  return docLines;
}

/**
 * Resolves a schema's TypeScript type, inlining referenced schemas that have
 * no interface.
 *
 * @param {SchemaSet} schemaSet
 * @param {SchemaKeywords} schema
 * @returns {string}
 */
function resolveType(schemaSet, schema) {
  const reference = getReference(schema);
  if (reference !== undefined) {
    const target = resolveReference(schemaSet, reference);
    let referenceType;
    if (hasInterface(target.schema)) {
      referenceType = getTypeName(schemaSet, target);
    } else {
      referenceType = resolveType(schemaSet, target.schema);
    }
    if (schema.properties !== undefined) {
      return `${referenceType} & {\n${generateProperties(schemaSet, schema)}}`;
    }
    return referenceType;
  }

  const enumValues = getEnumValues(schema);
  if (enumValues !== undefined) {
    // The member of an enum's anyOf without a const accepts other values.
    const fallback = schema.anyOf?.find((member) => !("const" in member));
    if (fallback !== undefined) {
      return resolveType(schemaSet, fallback);
    }
    return enumValues
      .map((enumValue) => JSON.stringify(enumValue.value))
      .join(" | ");
  }

  const alternatives = schema.anyOf ?? schema.oneOf;
  if (alternatives !== undefined) {
    return alternatives
      .map((alternative) => resolveType(schemaSet, alternative))
      .join(" | ");
  }

  if (Array.isArray(schema.type)) {
    return schema.type
      .map((type) => resolveType(schemaSet, { type: type }))
      .join(" | ");
  }

  switch (schema.type) {
    case "integer":
    case "number":
      return "number";
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "array":
      return resolveArrayType(schemaSet, schema);
    case "object":
      return resolveObjectType(schemaSet, schema);
    default:
      return "unknown";
  }
}

/**
 * Resolves an array schema's type, as a tuple if its length is fixed at 4 or
 * less and its items aren't enum-valued.
 *
 * @param {SchemaSet} schemaSet
 * @param {SchemaKeywords} schema
 * @returns {string}
 */
function resolveArrayType(schemaSet, schema) {
  const items = schema.items;
  if (items === undefined) {
    return "unknown[]";
  }
  const itemType = resolveType(schemaSet, items);
  const length = schema.minItems;
  if (
    length !== undefined &&
    length === schema.maxItems &&
    length <= 4 &&
    getEnumValues(items) === undefined
  ) {
    return `[${Array(length).fill(itemType).join(", ")}]`;
  }
  return `${wrapUnion(itemType)}[]`;
}

/**
 * @param {SchemaSet} schemaSet
 * @param {SchemaKeywords} schema
 * @returns {string}
 */
function resolveObjectType(schemaSet, schema) {
  if (hasInterface(schema)) {
    return `{\n${generateProperties(schemaSet, schema)}}`;
  }
  const additionalProperties = schema.additionalProperties;
  if (typeof additionalProperties === "object") {
    return `Record<string, ${resolveType(schemaSet, additionalProperties)}>`;
  }
  return "object";
}

/**
 * @param {SchemaKeywords} schema
 * @returns {boolean}
 */
function hasInterface(schema) {
  return (
    schema.properties !== undefined && Object.keys(schema.properties).length > 0
  );
}

/**
 * @param {SchemaSet} schemaSet
 * @param {string} fileName
 * @returns {SchemaKeywords}
 */
function getSchema(schemaSet, fileName) {
  const schema = schemaSet.schemas.get(fileName);
  if (schema === undefined) {
    throw new Error(`${schemaSet.rootName}: unknown schema ${fileName}`);
  }
  return schema;
}

/**
 * Finds the schema a reference names. An extension's reference to a schema it
 * lacks names a core schema, by its name or the end of its name:
 * `textureInfo.schema.json` names `material.textureInfo.schema.json`.
 *
 * @param {SchemaSet} schemaSet
 * @param {string} reference
 * @returns {SchemaTarget}
 */
function resolveReference(schemaSet, reference) {
  const [path, pointer] = reference.split("#");
  // A schema in a subdirectory refers to the schemas above it with `../`.
  const fileName = path.replace(/^(\.\.\/)+/, "");
  let target = {
    schemaSet: schemaSet,
    fileName: fileName,
    schema: schemaSet.schemas.get(fileName),
  };
  const core = schemaSet.core;
  if (target.schema === undefined && core !== undefined) {
    let coreFileName = fileName;
    if (!core.schemas.has(fileName)) {
      const matches = [...core.schemas.keys()].filter((name) =>
        name.endsWith(`.${fileName}`),
      );
      if (matches.length !== 1) {
        throw new Error(
          `${schemaSet.rootName}: ${reference} matches ${matches.length} core schemas`,
        );
      }
      coreFileName = matches[0];
    }
    target = {
      schemaSet: core,
      fileName: coreFileName,
      schema: core.schemas.get(coreFileName),
    };
  }

  let schema = target.schema;
  if (schema === undefined) {
    throw new Error(`${schemaSet.rootName}: unknown schema ${reference}`);
  }
  for (const key of (pointer ?? "").split("/")) {
    if (key !== "") {
      schema = /** @type {Record<string, SchemaKeywords>} */ (schema)[key];
    }
  }
  return {
    schemaSet: target.schemaSet,
    fileName: target.fileName,
    schema: schema,
  };
}

/**
 * Returns the parts of a schema's type name, from the parts of its file name:
 * `material.textureInfo.schema.json` gives `["Material", "TextureInfo"]`, and
 * `glTF.EXT_structural_metadata.schema.json` gives `["Gltf"]`.
 *
 * @param {SchemaSet} schemaSet
 * @param {string} fileName
 * @returns {string[]}
 */
function getNameParts(schemaSet, fileName) {
  let parts = fileName.replace(/\.schema\.json$/, "").split(/[./]/);
  if (schemaSet.extensionName === undefined) {
    parts[0] = parts[0].replace(/^glTF/, "");
    if (parts[0] === "") {
      parts.shift();
    }
  } else {
    parts = parts.filter((part) => part !== schemaSet.extensionName);
  }
  return parts.map((part) => {
    if (part === "glTF" || part === "gltf") {
      return "Gltf";
    }
    return part[0].toUpperCase() + part.slice(1);
  });
}

/**
 * Returns the qualified name of a schema's interface, recording the import it
 * needs.
 *
 * @param {SchemaSet} schemaSet The schema set of the file that uses the name.
 * @param {SchemaTarget} target
 * @returns {string}
 */
function getTypeName(schemaSet, target) {
  if (target.schemaSet !== schemaSet) {
    schemaSet.imports.add(target.schemaSet);
  }
  return [
    target.schemaSet.rootName,
    ...getNameParts(target.schemaSet, target.fileName),
  ].join(".");
}

/**
 * Returns a schema's `$ref`, directly or through `allOf`.
 *
 * @param {SchemaKeywords} schema
 * @returns {string | undefined}
 */
function getReference(schema) {
  return schema.$ref ?? schema.allOf?.[0].$ref;
}

/**
 * Returns the values of an enum-valued schema: the `const` members of its
 * `anyOf`, or its `enum` values described by `gltf_enumNames`.
 *
 * @param {SchemaKeywords} schema
 * @returns {EnumValue[] | undefined}
 */
function getEnumValues(schema) {
  if (schema.anyOf?.some((member) => "const" in member)) {
    return schema.anyOf
      .filter((member) => "const" in member)
      .map((member) => ({
        value: member.const,
        description: member.description ?? member.title,
      }));
  }
  if (schema.enum !== undefined) {
    return schema.enum.map((value, index) => ({
      value: value,
      description: schema.gltf_enumNames?.[index],
    }));
  }
  return undefined;
}

/**
 * @param {SchemaKeywords} schema
 * @returns {string[]}
 */
function getDescriptionLines(schema) {
  const description = schema.gltf_detailedDescription ?? schema.description;
  if (description === undefined) {
    return [];
  }
  return [description];
}

/**
 * @param {string[]} docLines
 */
function appendGltf21Marker(docLines) {
  if (docLines.length === 0) {
    docLines.push("(glTF 2.1)");
  } else {
    docLines[docLines.length - 1] += " (glTF 2.1)";
  }
}

/**
 * Lists the allowed values of an enum property or of its array items,
 * marking those absent from glTF 2.0.
 *
 * @param {SchemaKeywords} property
 * @param {SchemaKeywords} [baselineProperty]
 * @returns {string[]}
 */
function getEnumDocLines(property, baselineProperty) {
  let enumSchema = property;
  let baselineEnumSchema = baselineProperty;
  let heading = "Allowed values:";
  if (property.type === "array" && property.items !== undefined) {
    enumSchema = property.items;
    baselineEnumSchema = baselineProperty?.items;
    heading = "Allowed values for each element:";
  }
  const enumValues = getEnumValues(enumSchema);
  if (enumValues === undefined) {
    return [];
  }
  let baselineValues;
  if (baselineEnumSchema !== undefined) {
    baselineValues = (getEnumValues(baselineEnumSchema) ?? []).map(
      (enumValue) => enumValue.value,
    );
  }

  const lines = ["", heading];
  for (const { value, description } of enumValues) {
    let line = `- \`${JSON.stringify(value)}\``;
    if (description !== undefined) {
      line += `: ${description}`;
    }
    if (baselineValues !== undefined && !baselineValues.includes(value)) {
      line += " (glTF 2.1)";
    }
    lines.push(line);
  }
  return lines;
}

/**
 * @param {string[]} lines
 * @returns {string}
 */
function formatDoc(lines) {
  if (lines.length === 0) {
    return "";
  }
  // A blank line keeps markdown wrapping from joining tags to the description.
  let docLines = lines;
  const tagStart = lines.findIndex((line) => line.startsWith("@"));
  if (tagStart > 0) {
    docLines = [...lines.slice(0, tagStart), "", ...lines.slice(tagStart)];
  }
  const body = docLines.map((line) => ` * ${line}`.trimEnd()).join("\n");
  return `/**\n${body}\n */\n`;
}

/**
 * @param {string} name
 * @returns {string}
 */
function formatPropertyName(name) {
  if (/^[A-Za-z_$][\w$]*$/.test(name)) {
    return name;
  }
  return JSON.stringify(name);
}

/**
 * @param {string} type
 * @returns {string}
 */
function wrapUnion(type) {
  if (type.includes(" | ") || type.includes(" & ")) {
    return `(${type})`;
  }
  return type;
}
