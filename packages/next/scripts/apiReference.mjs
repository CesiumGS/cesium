// The API reference's data: every symbol the package's entry points export,
// read with the TypeScript compiler API from the same entry files as
// `api/surface.txt` (scripts/surfaceMap.mjs), so the two always agree on what
// the public API is.
//
//   node scripts/apiReference.mjs [--out <file>] [--strict]
//
// It writes handbook/generated/reference.json (not committed) and prints each
// group's count, the symbols that no rule in scripts/apiGroups.mjs places, and
// any rule that places nothing. `--strict` exits 1 if either list isn't empty.
// `npm run handbook:data` runs it too.
//
// Per symbol: its kind (as in the surface map), tier, entry point, group, source
// path and line, docs (`d`, `dep`, `ex`, `tags`), and by kind:
//
//   tp      type parameters
//   ext     extends, impl implements: `{ t: text, id?: the exported symbol }`
//   extBy   exported symbols that extend this one, implBy those that implement it
//   ctors   constructor signatures (`priv` if the constructor isn't public)
//   members public members: `{ n, k: prop|method|accessor, t, sigs, o, ro, st, d,
//           dep, from, fromId }`. A member inherited from another exported symbol
//           is only its name and where it's from; the detail is on that symbol.
//   sigs    call signatures: `{ tp, p: [{ n, t, o, rest, def, d }], r, rd, d }`
//   type    a type alias's type, or a constant's type
//   value   a constant's value, when it's short and literal
//   enum    enum members
//   ns      the ids of a namespace's members
//
// Members marked `@internal` and private or protected members are left out.
// The output has no dates, and is sorted, so it only changes when the API does.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { ENTRIES, GROUPS, OVERRIDES, RULES, UNMAPPED } from "./apiGroups.mjs";
import {
  compilerOptions,
  kindsOf,
  packageEntries,
  tierOf,
} from "./surfaceMap.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FORMAT = ts.TypeFormatFlags.NoTruncation;
const NOT_PUBLIC = ts.ModifierFlags.Private | ts.ModifierFlags.Protected;
// Tags that become fields of their own, or that the tier already says.
const HANDLED_TAGS = new Set([
  "internal",
  "param",
  "returns",
  "return",
  "template",
  "stable",
  "experimental",
  "deprecated",
  "example",
]);

const oneLine = (text) => text.replace(/\s+/g, " ").trim();
const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const nameCompare = (a, b) =>
  compare(a.toLowerCase(), b.toLowerCase()) || compare(a, b);

/** The id used in links and in the API map: `Name`, or `entry:Name`. */
export const referenceId = (entry, name) =>
  entry === "." ? name : `${entry}:${name}`;

/**
 * The group of a symbol, from the overrides and then the rules, or undefined.
 * `used` collects the rules and overrides that matched.
 */
export function groupOf(entry, name, file, used = new Set()) {
  const id = referenceId(entry, name);
  for (const key of [id, name]) {
    if (Object.hasOwn(OVERRIDES, key)) {
      used.add(`override ${key}`);
      return OVERRIDES[key];
    }
  }
  for (const rule of RULES) {
    const hit = rule.from.endsWith("/")
      ? file.startsWith(rule.from)
      : file === rule.from;
    if (rule.entry === entry && hit) {
      used.add(`rule ${rule.entry} ${rule.from}`);
      return rule.group;
    }
  }
  return undefined;
}

/**
 * Reads the reference from the entry points.
 * @param {{ root?: string, entries?: Record<string, string> }} [options]
 */
export function buildReference({ root = defaultRoot, entries } = {}) {
  const files = entries ?? packageEntries(root);
  const program = ts.createProgram(
    Object.values(files).map((file) => resolve(root, file)),
    compilerOptions(root),
  );
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({ removeComments: true });
  const print = (node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
  const text = (node, max = 600) => clip(oneLine(print(node)), max);

  // Pass 1: every export, with namespaces' members as `ns.member`.
  const exportsList = [];
  const walk = (entry, prefix, moduleSymbol, seen) => {
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported;
      const name = `${prefix}${exported.name}`;
      if (!symbol.declarations?.length) {
        throw new Error(
          `apiReference: ${referenceId(entry, name)} resolves to no declaration`,
        );
      }
      const kinds = kindsOf(symbol, name);
      exportsList.push({
        entry,
        name,
        parent: prefix ? prefix.slice(0, -1) : undefined,
        symbol,
        kinds,
      });
      if (kinds.includes("namespace") && !seen.has(symbol)) {
        walk(entry, `${name}.`, symbol, new Set(seen).add(symbol));
      }
    }
  };
  for (const [entry, file] of Object.entries(files)) {
    const source = program.getSourceFile(resolve(root, file));
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
      throw new Error(`apiReference: no module at ${file}`);
    }
    walk(entry, "", moduleSymbol, new Set([moduleSymbol]));
  }

  // A symbol's exported id, preferring the entry point being read.
  const idsBySymbol = new Map();
  for (const item of exportsList) {
    if (!idsBySymbol.has(item.symbol)) {
      idsBySymbol.set(item.symbol, new Map());
    }
    const byEntry = idsBySymbol.get(item.symbol);
    if (!byEntry.has(item.entry)) {
      byEntry.set(item.entry, referenceId(item.entry, item.name));
    }
  }
  const idOf = (symbol, entry) => {
    const resolved =
      symbol && symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    const byEntry = resolved && idsBySymbol.get(resolved);
    return byEntry && (byEntry.get(entry) ?? byEntry.values().next().value);
  };

  const fileOf = (declaration) =>
    relative(root, declaration.getSourceFile().fileName).split(sep).join("/");
  const lineOf = (declaration) => {
    const source = declaration.getSourceFile();
    return (
      source.getLineAndCharacterOfPosition(declaration.getStart(source)).line +
      1
    );
  };
  const isInternal = (declaration) =>
    ts.getJSDocTags(declaration).some((tag) => tag.tagName.text === "internal");
  const isOutside = (declaration) => {
    const source = declaration.getSourceFile();
    return (
      program.isSourceFileDefaultLibrary(source) ||
      source.fileName.includes("node_modules")
    );
  };

  const display = (parts) => ts.displayPartsToString(parts ?? []);
  const exampleText = (value) =>
    value
      .trim()
      .replace(/^```[\w-]*\n/, "")
      .replace(/\n```$/, "");

  /** The docs of a symbol or signature: `d`, `dep`, `ex`, `tags`, `rd`, and per-parameter text. */
  const docsOf = (thing) => {
    const out = {};
    const comment = display(thing.getDocumentationComment(checker)).trim();
    if (comment) {
      out.d = comment;
    }
    const params = new Map();
    for (const tag of thing.getJsDocTags(checker)) {
      const value = display(tag.text).trim();
      if (tag.name === "deprecated") {
        out.dep = value;
      } else if (tag.name === "example") {
        (out.ex ??= []).push(exampleText(value));
      } else if (tag.name === "param") {
        const [first, ...rest] = tag.text ?? [];
        if (first?.kind === "parameterName") {
          params.set(first.text, display(rest).trim());
        }
      } else if (tag.name === "returns" || tag.name === "return") {
        out.rd = value;
      } else if (!HANDLED_TAGS.has(tag.name)) {
        (out.tags ??= []).push([tag.name, value]);
      }
    }
    return { out, params };
  };

  const typeParameters = (declaration) =>
    declaration?.typeParameters?.length
      ? declaration.typeParameters.map((node) => text(node, 200))
      : undefined;

  /** One signature: type parameters, parameters, return type and its docs. */
  const signatureOf = (signature, { isConstructor = false } = {}) => {
    const declaration = signature.getDeclaration();
    const out = {};
    const tp = typeParameters(declaration);
    if (tp) {
      out.tp = tp;
    }
    const { out: docs, params } = docsOf(signature);
    out.p = [];
    if (declaration && declaration.parameters) {
      for (const node of declaration.parameters) {
        const name = ts.isIdentifier(node.name)
          ? node.name.text
          : clip(oneLine(print(node.name)), 60);
        if (name === "this") {
          continue;
        }
        const p = {
          n: name,
          t: node.type
            ? text(node.type)
            : clip(
                checker.typeToString(
                  checker.getTypeAtLocation(node),
                  node,
                  FORMAT,
                ),
                600,
              ),
        };
        if (node.questionToken || node.initializer) {
          p.o = 1;
        }
        if (node.dotDotDotToken) {
          p.rest = 1;
        }
        if (node.initializer) {
          p.def = clip(oneLine(print(node.initializer)), 80);
        }
        if (params.get(name)) {
          p.d = params.get(name);
        }
        out.p.push(p);
      }
    } else {
      for (const parameter of signature.parameters) {
        out.p.push({
          n: parameter.name,
          t: checker.typeToString(
            checker.getTypeOfSymbol(parameter),
            undefined,
            FORMAT,
          ),
          ...(parameter.flags & ts.SymbolFlags.Optional ? { o: 1 } : {}),
        });
      }
    }
    if (!isConstructor) {
      out.r =
        declaration?.type !== undefined
          ? text(declaration.type)
          : clip(
              checker.typeToString(
                signature.getReturnType(),
                declaration,
                FORMAT,
              ),
              600,
            );
    }
    if (docs.rd) {
      out.rd = docs.rd;
    }
    if (docs.dep !== undefined) {
      out.dep = docs.dep;
    }
    out.docs = docs.d;
    return out;
  };

  /** The signatures of a type, with a doc kept only when there are overloads. */
  const signaturesOf = (signatures, shared, options) => {
    const list = signatures.map((signature) => signatureOf(signature, options));
    for (const signature of list) {
      if (list.length > 1 && signature.docs && signature.docs !== shared) {
        signature.d = signature.docs;
      }
      delete signature.docs;
    }
    return list;
  };

  const ownerName = (owner) => {
    let node = owner;
    while (node && !node.name) {
      node = node.parent;
    }
    return node?.name && ts.isIdentifier(node.name) ? node.name.text : "?";
  };

  const isMethod = (declaration) =>
    ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration);

  /** One member of a class, interface or type literal, or undefined to leave it out. */
  const memberOf = (property, own, entry, isStatic) => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const typeOfProperty = () =>
      clip(
        checker.typeToString(
          checker.getTypeOfSymbol(property),
          undefined,
          FORMAT,
        ),
        600,
      );
    if (!declaration) {
      return { n: property.name, k: "prop", t: typeOfProperty() };
    }
    if (
      ts.getCombinedModifierFlags(declaration) & NOT_PUBLIC ||
      (declaration.name && ts.isPrivateIdentifier(declaration.name)) ||
      property.declarations?.every(isInternal)
    ) {
      return undefined;
    }
    // A constructor parameter property belongs to its class.
    const owner = ts.isParameter(declaration)
      ? declaration.parent.parent
      : declaration.parent;
    const inherited = !own.has(owner);
    if (inherited && isOutside(declaration)) {
      return undefined;
    }
    // A unique-symbol key has no stable name in the checker: read it as written.
    const member = {
      n: ts.isComputedPropertyName(declaration.name)
        ? oneLine(print(declaration.name))
        : property.name,
    };
    if (isStatic) {
      member.st = 1;
    }
    if (inherited) {
      const parentSymbol =
        owner.name && checker.getSymbolAtLocation(owner.name);
      member.from = ownerName(owner);
      const fromId = idOf(parentSymbol, entry);
      if (fromId) {
        member.fromId = fromId;
        member.k = isMethod(declaration)
          ? "method"
          : ts.isAccessor(declaration)
            ? "accessor"
            : "prop";
        return member;
      }
    }
    const { out: docs } = docsOf(property);
    if (docs.d) {
      member.d = docs.d;
    }
    if (docs.dep !== undefined) {
      member.dep = docs.dep;
    }
    if (isMethod(declaration)) {
      member.k = "method";
      const signatures = checker.getTypeOfSymbol(property).getCallSignatures();
      member.sigs = signaturesOf(signatures, docs.d);
      return member;
    }
    if (ts.isAccessor(declaration)) {
      member.k = "accessor";
      const getter = property.declarations.find(ts.isGetAccessor);
      member.t = getter?.type ? text(getter.type) : typeOfProperty();
      if (!property.declarations.some(ts.isSetAccessor)) {
        member.ro = 1;
      }
      return member;
    }
    member.k = "prop";
    member.t =
      declaration.type !== undefined
        ? text(declaration.type)
        : typeOfProperty();
    if (declaration.questionToken) {
      member.o = 1;
    }
    if (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Readonly) {
      member.ro = 1;
    }
    return member;
  };

  const membersOf = (type, own, entry, isStatic) => {
    const members = [];
    for (const property of checker.getPropertiesOfType(type)) {
      if (property.name === "prototype" && isStatic) {
        continue;
      }
      const member = memberOf(property, own, entry, isStatic);
      if (member) {
        members.push(member);
      }
    }
    // Own members first, then inherited, each in declaration order.
    return [
      ...members.filter((member) => !member.from),
      ...members.filter((member) => member.from),
    ];
  };

  const typeBody = (node) => {
    const body =
      ts.isUnionTypeNode(node) && node.types.length > 2
        ? node.types.map((member) => `| ${text(member, 400)}`).join("\n")
        : print(node);
    return clip(body, 4000);
  };

  const initializerText = (declaration) => {
    const init = declaration.initializer;
    if (
      init &&
      (ts.isNumericLiteral(init) ||
        ts.isStringLiteralLike(init) ||
        ts.isPrefixUnaryExpression(init) ||
        ts.isArrayLiteralExpression(init) ||
        ts.isBinaryExpression(init) ||
        init.kind === ts.SyntaxKind.TrueKeyword ||
        init.kind === ts.SyntaxKind.FalseKeyword)
    ) {
      const value = oneLine(print(init));
      return value.length <= 100 ? value : undefined;
    }
    return undefined;
  };

  const heritageOf = (declarations, entry) => {
    const ext = [];
    const impl = [];
    for (const declaration of declarations) {
      for (const clause of declaration.heritageClauses ?? []) {
        const target =
          clause.token === ts.SyntaxKind.ImplementsKeyword ? impl : ext;
        for (const node of clause.types) {
          const item = { t: text(node, 300) };
          const id = idOf(checker.getSymbolAtLocation(node.expression), entry);
          if (id) {
            item.id = id;
          }
          if (!target.some((other) => other.t === item.t)) {
            target.push(item);
          }
        }
      }
    }
    return { ext, impl };
  };

  const used = new Set();
  const symbols = [];
  for (const item of exportsList) {
    const { entry, name, symbol, kinds } = item;
    const id = referenceId(entry, name);
    const declarations = symbol.declarations;
    const primary = declarations[0];
    const file = fileOf(primary);
    const record = {
      id,
      name,
      entry,
      kind: kinds.join("+"),
      tier: tierOf(symbol, name),
      src: `${file}:${lineOf(primary)}`,
    };
    if (item.parent) {
      record.parent = item.parent;
    }
    record.group = groupOf(entry, name, file, used) ?? UNMAPPED.id;

    const { out: docs } = docsOf(symbol);
    delete docs.rd;
    Object.assign(record, docs);

    const classes = declarations.filter(ts.isClassDeclaration);
    const interfaces = declarations.filter(ts.isInterfaceDeclaration);
    const alias = declarations.find(ts.isTypeAliasDeclaration);
    const enumeration = declarations.find(ts.isEnumDeclaration);
    const variable = declarations.find(ts.isVariableDeclaration);
    const functions = declarations.filter(ts.isFunctionDeclaration);
    const shapes = [...classes, ...interfaces];

    const tp = typeParameters(shapes[0] ?? alias);
    if (tp) {
      record.tp = tp;
    }
    if (shapes.length > 0) {
      const { ext, impl } = heritageOf(shapes, entry);
      if (ext.length) {
        record.ext = ext;
      }
      if (impl.length) {
        record.impl = impl;
      }
      const declared = checker.getDeclaredTypeOfSymbol(symbol);
      const members = membersOf(declared, new Set(shapes), entry, false);
      if (classes.length > 0) {
        const staticType = checker.getTypeOfSymbol(symbol);
        members.push(...membersOf(staticType, new Set(classes), entry, true));
        const constructors = classes.flatMap((node) =>
          node.members.filter(ts.isConstructorDeclaration),
        );
        if (
          constructors.length > 0 &&
          constructors.every(
            (ctor) => ts.getCombinedModifierFlags(ctor) & NOT_PUBLIC,
          )
        ) {
          record.priv = 1;
        } else {
          record.ctors = signaturesOf(
            staticType.getConstructSignatures(),
            undefined,
            { isConstructor: true },
          );
        }
        if (
          classes.some(
            (node) =>
              ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Abstract,
          )
        ) {
          record.abs = 1;
        }
      }
      const calls = declared.getCallSignatures();
      if (calls.length > 0) {
        record.sigs = signaturesOf(calls, record.d);
      }
      if (members.length > 0) {
        record.members = members;
      }
    }
    if (alias) {
      if (ts.isTypeLiteralNode(alias.type)) {
        record.members = membersOf(
          checker.getDeclaredTypeOfSymbol(symbol),
          new Set([alias.type]),
          entry,
          false,
        );
      } else {
        record.type = typeBody(alias.type);
      }
    }
    if (enumeration) {
      record.enum = enumeration.members.map((member) => {
        const memberSymbol = checker.getSymbolAtLocation(member.name);
        const value = checker.getConstantValue(member);
        const comment = memberSymbol ? docsOf(memberSymbol).out.d : undefined;
        return {
          n: ts.isIdentifier(member.name)
            ? member.name.text
            : text(member.name),
          ...(value !== undefined ? { v: JSON.stringify(value) } : {}),
          ...(comment ? { d: comment } : {}),
        };
      });
    }
    if (variable || functions.length > 0) {
      const type = checker.getTypeOfSymbol(symbol);
      const calls = type.getCallSignatures();
      if (calls.length > 0) {
        record.sigs = signaturesOf(calls, record.d);
      } else if (variable) {
        record.type = variable.type
          ? typeBody(variable.type)
          : clip(checker.typeToString(type, variable, FORMAT), 1500);
        const value = initializerText(variable);
        if (value !== undefined) {
          record.value = value;
        }
      }
    }
    if (kinds.includes("namespace") && !item.parent) {
      record.ns = exportsList
        .filter((other) => other.entry === entry && other.parent === name)
        .map((other) => referenceId(entry, other.name))
        .sort(nameCompare);
    }
    const described =
      shapes.length > 0 ||
      alias ||
      enumeration ||
      variable ||
      functions.length > 0 ||
      record.ns;
    if (!described) {
      throw new Error(
        `apiReference: ${id} is a ${record.kind} the reference can't describe`,
      );
    }
    symbols.push(record);
  }

  // Children: who extends and who implements each exported symbol.
  const byId = new Map(symbols.map((record) => [record.id, record]));
  for (const record of symbols) {
    for (const [list, field] of [
      [record.ext, "extBy"],
      [record.impl, "implBy"],
    ]) {
      for (const { id } of list ?? []) {
        const target = byId.get(id);
        if (target && !(target[field] ??= []).includes(record.id)) {
          target[field].push(record.id);
        }
      }
    }
  }
  for (const record of symbols) {
    record.extBy?.sort(nameCompare);
    record.implBy?.sort(nameCompare);
  }

  // Order: entry point, group, name.
  const entryOrder = new Map(ENTRIES.map((entry, i) => [entry.id, i]));
  const groupOrder = new Map(
    [...GROUPS, UNMAPPED].map((group, i) => [group.id, i]),
  );
  symbols.sort(
    (a, b) =>
      (entryOrder.get(a.entry) ?? 99) - (entryOrder.get(b.entry) ?? 99) ||
      (groupOrder.get(a.group) ?? 99) - (groupOrder.get(b.group) ?? 99) ||
      nameCompare(a.name, b.name),
  );

  const unmapped = symbols
    .filter((record) => record.group === UNMAPPED.id)
    .map((record) => record.id);
  const counts = new Map();
  const entryCounts = new Map();
  for (const record of symbols) {
    counts.set(record.group, (counts.get(record.group) ?? 0) + 1);
    entryCounts.set(record.entry, (entryCounts.get(record.entry) ?? 0) + 1);
  }
  const groups = [...GROUPS, UNMAPPED]
    .filter((group) => counts.has(group.id))
    .map((group) => ({ ...group, count: counts.get(group.id) }));
  const unusedRules = [
    ...RULES.map((rule) => `rule ${rule.entry} ${rule.from}`),
    ...Object.keys(OVERRIDES).map((key) => `override ${key}`),
  ].filter((key) => !used.has(key));
  const emptyGroups = GROUPS.filter((group) => !counts.has(group.id)).map(
    (group) => group.id,
  );

  return {
    reference: {
      entries: ENTRIES.filter((entry) => entryCounts.has(entry.id)).map(
        (entry) => ({ ...entry, count: entryCounts.get(entry.id) }),
      ),
      groups,
      unmapped,
      symbols,
    },
    report: { unmapped, unusedRules, emptyGroups },
  };
}

/** Writes handbook/generated/reference.json and returns what it found. */
export function writeReference({ root = defaultRoot, out } = {}) {
  const result = buildReference({ root });
  const file = out ?? resolve(root, "handbook/generated/reference.json");
  mkdirSync(dirname(file), { recursive: true });
  const json = `${JSON.stringify(result.reference)}\n`;
  writeFileSync(file, json);
  return { ...result, file, bytes: Buffer.byteLength(json) };
}

/** The lines the generator prints about its result. */
export function describeReference({ reference, report, file, bytes }) {
  const lines = [
    `api reference: ${reference.symbols.length} symbols in ${reference.groups.length} groups, ${(bytes / 1024).toFixed(0)} KB, ${file}`,
  ];
  for (const entry of reference.entries) {
    lines.push(`  ${entry.id} (${entry.import}): ${entry.count}`);
    for (const group of reference.groups.filter((g) => g.entry === entry.id)) {
      lines.push(`    ${group.title}: ${group.count}`);
    }
  }
  if (report.unmapped.length > 0) {
    lines.push(
      `  UNMAPPED (${report.unmapped.length}): ${report.unmapped.join(", ")}`,
      "  Add a rule or an override in scripts/apiGroups.mjs.",
    );
  }
  for (const key of report.unusedRules) {
    lines.push(`  UNUSED in scripts/apiGroups.mjs: ${key}`);
  }
  for (const id of report.emptyGroups) {
    lines.push(`  EMPTY group: ${id}`);
  }
  return lines;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const result = writeReference({
    out: outAt >= 0 ? resolve(args[outAt + 1]) : undefined,
  });
  console.log(describeReference(result).join("\n"));
  const { report } = result;
  if (
    args.includes("--strict") &&
    (report.unmapped.length > 0 ||
      report.unusedRules.length > 0 ||
      report.emptyGroups.length > 0)
  ) {
    process.exit(1);
  }
}
