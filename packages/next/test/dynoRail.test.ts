import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  GROUPS,
  destinationForKey,
  destinationOf,
  movedTo,
} from "../bench/suite/rail.ts";

const suite = new URL("../bench/suite/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, suite), "utf8");

describe("Dyno's rail, grouped by what people come to do", () => {
  it("orders the groups attention first, then results, looking, experimenting", () => {
    expect(GROUPS.map((g) => g.map((d) => d.label))).toEqual([
      ["Work", "Overview", "Alerts", "Images"],
      ["Trends", "Runs", "Scenes"],
      ["Explorer", "Viewer", "Examples"],
      ["Analysis", "Lab"],
    ]);
  });

  it("keeps every existing shortcut letter, each used once", () => {
    const keys = DESTINATIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [key, label] of [
      ["o", "Overview"],
      ["t", "Trends"],
      ["r", "Runs"],
      ["a", "Alerts"],
      ["s", "Scenes"],
      ["e", "Explorer"],
      ["v", "Viewer"],
      ["i", "Images"],
      ["x", "Examples"],
      ["l", "Lab"],
      ["n", "Analysis"],
      ["w", "Work"],
    ]) {
      expect(destinationForKey(key!)?.label).toBe(label);
    }
  });

  it("highlights the right rail item for every page", () => {
    const highlighted: Array<[string, string | undefined]> = [
      ["/work", "Work"],
      ["/overview", "Overview"],
      ["/alerts", "Alerts"],
      ["/images", "Images"],
      ["/trends", "Trends"],
      ["/runs", "Runs"],
      ["/runs/2026-11-14T22-07-21-329Z.json", "Runs"],
      ["/compare", "Runs"],
      ["/scenes", "Scenes"],
      ["/scenes/osm-philadelphia", "Scenes"],
      ["/explorer", "Explorer"],
      ["/viewer", "Viewer"],
      ["/examples", "Examples"],
      ["/examples/frames-explorer", "Examples"],
      ["/analysis", "Analysis"],
      ["/lab", "Lab"],
      ["/lab/precision", "Lab"],
      // The footer's page, and paths that only look like a rail item's.
      ["/start", undefined],
      ["/scenesx", undefined],
      ["/", undefined],
    ];
    for (const [path, label] of highlighted) {
      expect(destinationOf(path)?.label, path).toBe(label);
    }
  });

  it("gives every rail item a route", () => {
    const paths = new Set(
      [...read("routes.tsx").matchAll(/path: "([^"]+)"/g)].map((m) => m[1]),
    );
    for (const d of DESTINATIONS) {
      expect(paths.has(d.to), d.to).toBe(true);
    }
  });

  it("sends old Machines links to the Overview's machines section", () => {
    expect(movedTo("/analysis", { tab: "machines" })).toEqual({
      to: "/overview",
      hash: "machines",
    });
    expect(movedTo("/analysis", { sweep: "run.json" })).toBeUndefined();
    expect(movedTo("/overview", { tab: "machines" })).toBeUndefined();
  });

  it("matches DESIGN.md's information architecture table", () => {
    const design = read("DESIGN.md");
    const table = design.slice(
      design.indexOf("| Group "),
      design.indexOf("\n\n", design.indexOf("| Group ")),
    );
    let group = "";
    const rows = table
      .split("\n")
      .slice(2)
      .map((line) => line.split("|").map((c) => c.trim()))
      .map(([, g, item, key, route]) => {
        group = g || group;
        return { group, item, key, route };
      })
      .filter((r) => r.group !== "Footer");
    expect(
      rows.map((r) => [r.group, r.item, r.key, r.route!.split("`")[1]]),
    ).toEqual(DESTINATIONS.map((d) => [d.group, d.label, d.key, d.to]));
  });
});
