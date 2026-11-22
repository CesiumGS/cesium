// The old entry point for the Lab's harnesses: it runs `dyno lab [suite ...]`
// (suite/commands/lab.mjs) and says so. Kept until the repository's docs,
// items and skills say `dyno` (CS-721).
//
//   node bench/run.mjs [suite ...]
import process from "node:process";
import { main } from "./suite/commands/lab.mjs";

const names = process.argv.slice(2);
console.error(
  `run.mjs is now \`dyno lab${names.length ? ` ${names.join(" ")}` : ""}\` (node bench/dyno.mjs lab --help)`,
);
await main(names);
