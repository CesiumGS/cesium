import {
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureFresh } from "../scripts/frameData.mjs";
import { LeapSeconds } from "../src/time/leapSeconds.ts";

const GOOD = `#  Value of TAI-UTC in second valid beginning at the 0 hour of the date
#File expires on 28 December 2099
#
41317.0 1 1 1972 10
57754.0 1 1 2017 37
`;
const SOURCE = { file: "Leap_Second.dat", url: "https://example.test/leap" };
const validate = (text: string): void => {
  LeapSeconds.fromIers(text);
};
const log = (): void => {};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "frames-refresh-"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

const stale = (): void => {
  const old = new Date(Date.now() - 30 * 86_400_000);
  utimesSync(join(dir, SOURCE.file), old, old);
};
const stubFetch = (body: string | Error): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (body instanceof Error) {
        throw body;
      }
      return new Response(body, { status: 200 });
    }),
  );
};

describe("ensureFresh", () => {
  it("keeps the good copy when the refresh is a garbage 200", async () => {
    writeFileSync(join(dir, SOURCE.file), GOOD);
    stale();
    stubFetch("<html>Service unavailable</html>");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bytes = await ensureFresh(dir, SOURCE, log, validate);
    expect(bytes.toString("utf8")).toBe(GOOD);
    expect(readFileSync(join(dir, SOURCE.file), "utf8")).toBe(GOOD);
  });

  it("throws, naming the URL, for a garbage 200 with no copy", async () => {
    stubFetch("");
    await expect(ensureFresh(dir, SOURCE, log, validate)).rejects.toThrow(
      SOURCE.url,
    );
  });

  it("keeps the copy on a network error", async () => {
    writeFileSync(join(dir, SOURCE.file), GOOD);
    stale();
    stubFetch(new Error("offline"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bytes = await ensureFresh(dir, SOURCE, log, validate);
    expect(bytes.toString("utf8")).toBe(GOOD);
  });

  it("stores a valid refresh", async () => {
    writeFileSync(join(dir, SOURCE.file), GOOD);
    stale();
    const newer = GOOD.replace("28 December 2099", "28 June 2100");
    stubFetch(newer);
    await ensureFresh(dir, SOURCE, log, validate);
    expect(readFileSync(join(dir, SOURCE.file), "utf8")).toBe(newer);
  });
});
