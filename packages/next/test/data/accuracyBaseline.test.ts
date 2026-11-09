// Needs the frames data store `npm run setup` fills; `npm run test:data` runs it.
// The composed accuracies today, before 5b's composer: the explorer's views and
// measure's statements. Task 5 replaces this check with a listed set of moves.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accuracyRows, type AccuracyRow } from "./explorerPages.ts";

const BASELINE = new URL(
  "../fixtures/frames/accuracyBaseline.json",
  import.meta.url,
);

describe("the accuracy baseline", () => {
  it(
    "today's composed accuracies equal the baseline (regenerate only at a commit that changes no accuracy)",
    { timeout: 600_000 },
    async () => {
      const rows = await accuracyRows();
      if (process.env.WRITE_ACCURACY_BASELINE === "1") {
        const commit = execSync("git rev-parse --short HEAD").toString().trim();
        writeFileSync(
          BASELINE,
          `${JSON.stringify({ commit, rows }, null, 1)}\n`,
        );
      }
      const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as {
        rows: AccuracyRow[];
      };
      expect(rows.map((r) => r.key)).toEqual(baseline.rows.map((r) => r.key));
      rows.forEach((r, i) => expect(r.meters).toBe(baseline.rows[i]!.meters));
    },
  );
});
