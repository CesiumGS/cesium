// @ts-check

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";

/**
 * @typedef {object} JsonSchema
 * @property {string} [$ref]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [gltf_detailedDescription]
 * @property {string[]} [gltf_enumNames]
 * @property {string | string[]} [type]
 * @property {Record<string, JsonSchema>} [properties]
 * @property {string[]} [required]
 * @property {JsonSchema | boolean} [additionalProperties]
 * @property {JsonSchema[]} [allOf]
 * @property {JsonSchema[]} [anyOf]
 * @property {JsonSchema[]} [oneOf]
 * @property {unknown[]} [enum]
 * @property {unknown} [const]
 * @property {JsonSchema} [items]
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {unknown} [default]
 */

/**
 * @typedef {object} SchemaSet
 * @property {string} rootName The name of the root interface and namespace.
 * @property {Map<string, JsonSchema>} schemas The schemas, keyed by file name.
 * @property {Map<string, JsonSchema>} [baseline] The glTF 2.0 schemas, used to mark additions in glTF 2.1.
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

const packageDirectory = join(import.meta.dirname, "..");
const schemasDirectory = join(packageDirectory, "Build/Schemas");
const outputDirectory = join(packageDirectory, "SchemaTypes");

/** @type {{core: Record<string, SchemaSource>}} */
const sources = JSON.parse(
  readFileSync(join(import.meta.dirname, "gltfSchemaSources.json"), "utf8"),
);

/** @type {SchemaSet} */
const gltf1 = { rootName: "Gltf1", schemas: loadSchemas("1.0") };
/** @type {SchemaSet} */
const gltf2 = {
  rootName: "Gltf2",
  schemas: loadSchemas("2.1"),
  baseline: loadSchemas("2.0"),
};

mkdirSync(outputDirectory, { recursive: true });
await writeTypeScript(
  "Gltf1.ts",
  `${getHeader(["1.0"])}${generateTypes(gltf1)}`,
);
await writeTypeScript(
  "Gltf2.ts",
  `${getHeader(["2.0", "2.1"])}${generateTypes(gltf2)}`,
);
await writeTypeScript(
  "index.ts",
  `${getHeader([])}export type * from "./Gltf1.js";\nexport type * from "./Gltf2.js";\n`,
);

/**
 * @param {string} version
 * @returns {Map<string, JsonSchema>}
 */
function loadSchemas(version) {
  const directory = join(schemasDirectory, version);
  const schemas = new Map();
  for (const fileName of readdirSync(directory).sort()) {
    schemas.set(
      fileName,
      JSON.parse(readFileSync(join(directory, fileName), "utf8")),
    );
  }
  return schemas;
}

/**
 * @param {string[]} versions
 * @returns {string}
 */
function getHeader(versions) {
  const lines = [];
  if (versions.length > 0) {
    lines.push("// Generated from the glTF JSON schemas at:");
    for (const version of versions) {
      const { repository, commit, schemaDirectory } = sources.core[version];
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
 * Wraps each multi-line doc comment to the print width by formatting its
 * text as markdown, since prettier leaves TypeScript comments as they are.
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
 * Generates the root interface and its namespace, with an interface for each
 * schema that has properties, nested by the dotted parts of its file name.
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
    const nameParts = getNameParts(fileName);
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
 * @param {JsonSchema} schema
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
    heritage = ` extends ${getQualifiedName(schemaSet, reference)}`;
  }
  return `${formatDoc(docLines)}export interface ${name}${heritage} {\n${generateProperties(schemaSet, schema, fileName)}}\n`;
}

/**
 * Generates the properties of an object schema. A property with an empty
 * schema only marks a property inherited from a base interface, so it's
 * skipped.
 *
 * @param {SchemaSet} schemaSet
 * @param {JsonSchema} schema
 * @param {string} [fileName] The schema's file name, if it isn't an inline object schema.
 * @returns {string}
 */
function generateProperties(schemaSet, schema, fileName) {
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
    const baselineProperty = baselineProperties?.[name];
    let docLines = getDescriptionLines(property);
    const reference = getReference(property);
    if (docLines.length === 0 && reference !== undefined) {
      docLines = getDescriptionLines(getSchema(schemaSet, reference));
    }
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
  return code;
}

/**
 * Resolves the TypeScript type of a schema. A referenced schema with
 * properties is typed by its interface, and any other referenced schema is
 * inlined.
 *
 * @param {SchemaSet} schemaSet
 * @param {JsonSchema} schema
 * @returns {string}
 */
function resolveType(schemaSet, schema) {
  const reference = getReference(schema);
  if (reference !== undefined) {
    const target = getSchema(schemaSet, reference);
    let referenceType;
    if (hasInterface(target)) {
      referenceType = getQualifiedName(schemaSet, reference);
    } else {
      referenceType = resolveType(schemaSet, target);
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
 * Resolves an array schema's type, as a tuple when it has a fixed length of
 * at most 4 and items that aren't enum-valued.
 *
 * @param {SchemaSet} schemaSet
 * @param {JsonSchema} schema
 * @returns {string}
 */
function resolveArrayType(schemaSet, schema) {
  const items = /** @type {JsonSchema} */ (schema.items);
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
 * @param {JsonSchema} schema
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
 * @param {JsonSchema} schema
 * @returns {boolean}
 */
function hasInterface(schema) {
  return (
    schema.properties !== undefined && Object.keys(schema.properties).length > 0
  );
}

/**
 * @param {SchemaSet} schemaSet
 * @param {string} reference
 * @returns {JsonSchema}
 */
function getSchema(schemaSet, reference) {
  const schema = schemaSet.schemas.get(reference);
  if (schema === undefined) {
    throw new Error(`${schemaSet.rootName}: unknown schema ${reference}`);
  }
  return schema;
}

/**
 * Returns the PascalCase dotted parts of a schema file name, without any
 * leading `glTF`, e.g. `accessor.sparse.indices.schema.json` gives
 * `["Accessor", "Sparse", "Indices"]` and `glTF.schema.json` gives `[]`.
 *
 * @param {string} fileName
 * @returns {string[]}
 */
function getNameParts(fileName) {
  const parts = fileName.replace(/\.schema\.json$/, "").split(".");
  parts[0] = parts[0].replace(/^glTF/, "");
  if (parts[0] === "") {
    parts.shift();
  }
  return parts.map((part) => part[0].toUpperCase() + part.slice(1));
}

/**
 * @param {SchemaSet} schemaSet
 * @param {string} fileName
 * @returns {string}
 */
function getQualifiedName(schemaSet, fileName) {
  return [schemaSet.rootName, ...getNameParts(fileName)].join(".");
}

/**
 * Returns the schema a schema refers to through `$ref` or `allOf`: the base
 * of an object schema's interface, or the type of a property schema.
 *
 * @param {JsonSchema} schema
 * @returns {string | undefined}
 */
function getReference(schema) {
  return schema.$ref ?? schema.allOf?.[0].$ref;
}

/**
 * Returns the values of an enum-valued schema: the `const` members of its
 * `anyOf`, or its `enum` values described by `gltf_enumNames`.
 *
 * @param {JsonSchema} schema
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
 * @param {JsonSchema} schema
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
 * Lists each allowed value of an enum-valued property, or of an array
 * property's enum-valued items, with its description, marking values absent
 * from glTF 2.0.
 *
 * @param {JsonSchema} property
 * @param {JsonSchema} [baselineProperty]
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
