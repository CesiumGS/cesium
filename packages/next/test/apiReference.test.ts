// The API reference (scripts/apiReference.mjs) must cover the whole public API
// and place every symbol in a group, so a new export can't go missing or
// land nowhere without this failing.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildReference,
  groupOf,
  referenceId,
} from "../scripts/apiReference.mjs";
import { ENTRIES, GROUPS, OVERRIDES, RULES } from "../scripts/apiGroups.mjs";
import {
  Linker,
  declarationText,
  parseDoc,
  parseInline,
  parseRoute,
  primaryKind,
  routeHash,
  searchSymbols,
  signatureText,
  summaryOf,
  tokenizeTypes,
  type Reference,
} from "../handbook/src/reference.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = buildReference({ root });
const reference: Reference = built.reference;
const { report } = built;

const surface = readFileSync(join(root, "api/surface.txt"), "utf8")
  .split("\n")
  .slice(1)
  .filter((line) => line.length > 0)
  .map((line) => {
    const [entry, name, kind, tier] = line.split("\t") as [
      string,
      string,
      string,
      string,
    ];
    return { entry, name, kind, tier };
  });

describe("the API reference's coverage", () => {
  it("has every export of api/surface.txt, with its kind and tier", () => {
    const byId = new Map(reference.symbols.map((s) => [s.id, s]));
    const wrong: string[] = [];
    for (const { entry, name, kind, tier } of surface) {
      const symbol = byId.get(referenceId(entry, name));
      if (!symbol) {
        wrong.push(`${entry} ${name}: missing`);
      } else if (symbol.kind !== kind || symbol.tier !== tier) {
        wrong.push(
          `${entry} ${name}: surface says ${kind}/${tier}, reference ${symbol.kind}/${symbol.tier}`,
        );
      }
    }
    expect(wrong).toEqual([]);
  });

  it("lists each symbol once, from a known entry point", () => {
    const ids = reference.symbols.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const entries = new Set(ENTRIES.map((e) => e.id));
    for (const symbol of reference.symbols) {
      expect(entries.has(symbol.entry), symbol.id).toBe(true);
    }
  });

  it("puts every symbol in a group of its own entry point", () => {
    expect(report.unmapped).toEqual([]);
    const groups = new Map(GROUPS.map((g) => [g.id, g]));
    for (const symbol of reference.symbols) {
      const group = groups.get(symbol.group);
      expect(group, `${symbol.id} has no group`).toBeDefined();
      expect(group?.entry, symbol.id).toBe(symbol.entry);
    }
  });

  it("has no rule, override or group that places nothing", () => {
    expect(report.unusedRules).toEqual([]);
    expect(report.emptyGroups).toEqual([]);
    for (const group of GROUPS) {
      expect(
        ENTRIES.some((e) => e.id === group.entry),
        group.id,
      ).toBe(true);
    }
    for (const rule of RULES) {
      expect(
        GROUPS.some((g) => g.id === rule.group && g.entry === rule.entry),
        `${rule.from} -> ${rule.group}`,
      ).toBe(true);
    }
    for (const group of Object.values(OVERRIDES)) {
      expect(GROUPS.some((g) => g.id === group)).toBe(true);
    }
  });

  it("counts match the symbols", () => {
    const total = reference.groups.reduce((n, g) => n + g.count, 0);
    expect(total).toBe(reference.symbols.length);
    for (const group of reference.groups) {
      expect(reference.symbols.filter((s) => s.group === group.id).length).toBe(
        group.count,
      );
    }
  });

  it("leaves a symbol that no rule places unmapped, never in a catch-all", () => {
    expect(groupOf(".", "Nothing", "src/nowhere/file.ts")).toBeUndefined();
    expect(groupOf(".", "World", "src/scene/World.ts")).toBe("core.world");
    expect(groupOf("frames", "Precision", "src/frames/catalog.ts")).toBe(
      "frames.accuracy",
    );
  });

  it("is the same twice", () => {
    const again = JSON.stringify(buildReference({ root }).reference);
    expect(again === JSON.stringify(reference)).toBe(true);
  }, 60_000);
});

describe("the API reference's content", () => {
  const find = (id: string) => reference.symbols.find((s) => s.id === id)!;

  it("reads parameters, return types and values", () => {
    const add = find("vec3.add");
    expect(add.sigs?.[0]?.p.map((p) => p.n)).toEqual(["out", "a", "b"]);
    expect(add.sigs?.[0]?.r).toBe("Vec3");
    expect(find("MAX_ANCHORS").value).toBe("32");
  });

  it("reads class hierarchies both ways", () => {
    expect(find("frames:Frame").extBy).toContain("frames:SmoothFrame");
    expect(find("frames:SmoothFrame").ext?.map((h) => h.id)).toContain(
      "frames:Frame",
    );
    expect(find("RenderTarget").implBy).toEqual(
      expect.arrayContaining(["CanvasTarget", "OffscreenTarget"]),
    );
  });

  it("marks a member inherited from another exported symbol, with no detail", () => {
    const inherited = reference.symbols.flatMap((s) =>
      (s.members ?? []).filter((m) => m.fromId),
    );
    expect(inherited.length).toBeGreaterThan(0);
    for (const member of inherited) {
      expect(member.sigs).toBeUndefined();
      expect(member.d).toBeUndefined();
    }
  });

  it("leaves out private members", () => {
    for (const symbol of reference.symbols) {
      for (const member of symbol.members ?? []) {
        expect(member.n.startsWith("#"), `${symbol.id}.${member.n}`).toBe(
          false,
        );
      }
    }
  });
});

describe("the API reference's page logic", () => {
  const symbols = reference.symbols;
  const linker = new Linker(
    symbols,
    reference.entries.map((e) => e.id),
  );

  it("links names to exported symbols, preferring the entry point being read", () => {
    expect(linker.resolve("World", "frames")).toBe("World");
    expect(linker.resolve("Frame", ".")).toBe("frames:Frame");
    expect(linker.resolve("NotAThing", ".")).toBeUndefined();
    const pick = symbols.filter((s) => s.name === "PickCamera");
    if (pick.length > 1) {
      expect(linker.resolve("PickCamera", "proj")).toBe("proj:PickCamera");
    }
  });

  it("splits type text into links and plain runs", () => {
    const text = "(world: World, label?: string) => Promise<Engine>";
    const tokens = tokenizeTypes(text, (name) => linker.resolve(name, "."));
    expect(tokens.filter((t) => t.id).map((t) => t.id)).toEqual([
      "World",
      "Engine",
    ]);
    expect(tokens.map((t) => t.text).join("")).toBe(text);
    // A property name isn't a type, and a string literal isn't a name.
    const keyed = tokenizeTypes('{ World: World; kind: "World" }', (name) =>
      linker.resolve(name, "."),
    );
    expect(keyed.filter((t) => t.id)).toHaveLength(1);
  });

  it("breaks a long signature one parameter to a line", () => {
    const signature = {
      p: [
        { n: "firstArgument", t: "SomeLongTypeName" },
        { n: "secondArgument", t: "AnotherLongTypeName", o: 1 as const },
        { n: "thirdArgument", t: "YetAnotherLongTypeName" },
      ],
      r: "void",
    };
    expect(signatureText("function run", signature).split("\n")).toEqual([
      "function run(",
      "  firstArgument: SomeLongTypeName,",
      "  secondArgument?: AnotherLongTypeName,",
      "  thirdArgument: YetAnotherLongTypeName,",
      "): void",
    ]);
    expect(
      signatureText("f", { p: [{ n: "a", t: "number" }], r: "string" }),
    ).toBe("f(a: number): string");
  });

  it("writes a declaration for every symbol", () => {
    for (const symbol of symbols) {
      expect(declarationText(symbol).length, symbol.id).toBeGreaterThan(0);
    }
  });

  it("reads doc text as paragraphs, lists, code and links", () => {
    expect(
      parseDoc("One\ntwo.\n\n- a\n- b\n  more\n\n```ts\nx();\n```\nEnd."),
    ).toEqual([
      { kind: "p", text: "One two." },
      { kind: "ul", items: ["a", "b more"] },
      { kind: "code", text: "x();" },
      { kind: "p", text: "End." },
    ]);
    expect(
      parseInline("Use `Engine` or {@link World the world}, {@link View}."),
    ).toEqual([
      { kind: "text", text: "Use " },
      { kind: "code", text: "Engine" },
      { kind: "text", text: " or " },
      { kind: "link", text: "the world", target: "World" },
      { kind: "text", text: ", " },
      { kind: "link", text: "View", target: "View" },
      { kind: "text", text: "." },
    ]);
    expect(summaryOf("First `one`. Second.\n\nOther.")).toBe("First one.");
  });

  it("searches names, then members, and filters by kind", () => {
    const none = new Set<string>();
    const names = searchSymbols(symbols, { query: "engine", kinds: none });
    expect(names[0]?.symbol.name.toLowerCase()).toBe("engine");
    const members = searchSymbols(symbols, { query: "setSun", kinds: none });
    expect(members.length).toBeGreaterThan(0);
    expect(members.every((m) => m.via !== undefined)).toBe(true);
    const classes = searchSymbols(symbols, {
      query: "",
      kinds: new Set(["class"]),
    });
    expect(classes.every((m) => primaryKind(m.symbol) === "class")).toBe(true);
    const group = searchSymbols(symbols, {
      query: "",
      kinds: none,
      group: "core.brep",
    });
    expect(group.length).toBeGreaterThan(0);
    expect(group.every((m) => m.symbol.group === "core.brep")).toBe(true);
  });

  it("round-trips the route in the hash", () => {
    for (const route of [
      { view: "all" },
      { view: "group", id: "core.world" },
      { view: "symbol", id: "frames:Frame" },
      { view: "symbol", id: "vec3.add" },
    ] as const) {
      expect(parseRoute(routeHash(route))).toEqual(route);
    }
    expect(parseRoute("#/frames")).toEqual({ view: "all" });
  });
});
