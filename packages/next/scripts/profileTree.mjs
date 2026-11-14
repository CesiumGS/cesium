// Inclusive (total) time by function from a raw CPU profile (PROFILE_OUT of
// `scripts/profilePage.mjs`): `node scripts/profileTree.mjs <file.cpuprofile>
// [pattern…]`. Each pattern is a regular expression on "name  file"; a
// function counts once per sample however deep it recurses. With no
// pattern, the 40 functions with the most total time.
import { readFileSync } from "node:fs";

const [file, ...patterns] = process.argv.slice(2);
if (!file) {
  console.error(
    "usage: node scripts/profileTree.mjs <file.cpuprofile> [pattern…]",
  );
  process.exit(2);
}
const profile = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) {
  for (const c of n.children ?? []) {
    parent.set(c, n.id);
  }
}
const label = (n) => {
  const f = n.callFrame;
  const where = (f.url || "(native)")
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\?.*$/, "");
  return `${f.functionName || "(anonymous)"}  ${where}`;
};
const total = profile.samples.length;
const ms = (profile.endTime - profile.startTime) / 1000 / total;
const hits = new Map();
for (const id of profile.samples) {
  hits.set(id, (hits.get(id) ?? 0) + 1);
}
const inclusive = new Map();
for (const [id, n] of hits) {
  const seen = new Set();
  for (let at = id; at !== undefined; at = parent.get(at)) {
    const name = label(byId.get(at));
    if (!seen.has(name)) {
      seen.add(name);
      inclusive.set(name, (inclusive.get(name) ?? 0) + n);
    }
  }
}
const rows = [...inclusive]
  .filter(([name]) =>
    patterns.length === 0
      ? !name.startsWith("(root)")
      : patterns.some((p) => new RegExp(p).test(name)),
  )
  .sort((a, b) => b[1] - a[1])
  .slice(0, patterns.length === 0 ? 40 : 200);
for (const [name, n] of rows) {
  console.log(`${(n * ms).toFixed(0).padStart(7)} ms  ${name}`);
}
