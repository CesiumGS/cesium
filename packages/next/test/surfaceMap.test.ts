import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { surfaceLines } from "../scripts/surfaceMap.mjs";

it("the checked-in surface map matches the entry points (run `npm run surface`)", () => {
  expect(`${surfaceLines().join("\n")}\n`).toBe(
    readFileSync("api/surface.txt", "utf8"),
  );
});
it("lists each export with its entry, kind and tier", () => {
  const lines = surfaceLines();
  expect(lines[0]).toBe("entry\tname\tkind\ttier");
  expect(lines).toContain(".\tEngine\tclass\t-");
  expect(lines).toContain(".\tvec3.add\tfunction\t-");
  expect(lines).toContain("widgets\tViewer\tclass\t-");
});
it("reads tiers from TSDoc tags", () => {
  const lines = surfaceLines({
    entries: { fixture: "test/fixtures/surface/entry.ts" },
  });
  expect(lines).toEqual([
    "entry\tname\tkind\ttier",
    "fixture\tBoth\tconst+type\texperimental",
    "fixture\tExperimental\tinterface\texperimental",
    "fixture\tHidden\tconst\tinternal",
    "fixture\tMode\tenum\t-",
    "fixture\tRenamed\tfunction\tstable",
    "fixture\tStable\tfunction\tstable",
    "fixture\tUntiered\ttype\t-",
    "fixture\tWidget\tclass\tstable",
    "fixture\tns\tnamespace\t-",
    "fixture\tns.member\tconst\t-",
    "fixture\tns.nested\tfunction\texperimental",
    "fixture\tns.original\tfunction\tstable",
  ]);
});
it("throws naming an export whose declarations disagree on the tier", () => {
  expect(() =>
    surfaceLines({ entries: { fixture: "test/fixtures/surface/conflict.ts" } }),
  ).toThrow(/Clash/);
});
