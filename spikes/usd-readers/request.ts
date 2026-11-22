// Whether a worker message is a request from the harness page (CS-900).
// A dedicated worker's messages have no origin to check; only this page can
// message its own worker, so check the shape. Spike code; not part of
// @cesium/next.

const READERS = ["subset", "lightusd", "openusd"];

/** A plain object (not null, not an array) whose values are all ArrayBuffers. */
export function isRequest(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const r = data as Record<string, unknown>;
  const files = r["files"];
  return (
    READERS.includes(String(r["reader"])) &&
    typeof r["module"] === "string" &&
    r["module"].startsWith("/usd-readers/build/") &&
    typeof r["root"] === "string" &&
    typeof files === "object" &&
    files !== null &&
    !Array.isArray(files) &&
    Object.values(files).every((v) => v instanceof ArrayBuffer)
  );
}
