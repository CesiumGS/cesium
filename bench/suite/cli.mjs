// The old entry point for the benchmark suite: it runs `dyno suite <command>`
// (commands/suite.mjs) and says so. Kept until the repository's docs, items
// and skills say `dyno` (CS-721).
//
//   node bench/suite/cli.mjs <command> [options]
import process from "node:process";
import { main } from "./commands/suite.mjs";

const argv = process.argv.slice(2);
console.error(
  `cli.mjs is now \`dyno suite ${argv[0] ?? "list"}\` (node bench/dyno.mjs suite --help)`,
);
try {
  const result = await main(argv, {
    as: ["node", "bench/suite/cli.mjs"],
  });
  process.exitCode = result.exitCode ?? 0;
} catch (error) {
  // As before: one plain line for a refused or malformed command, exit 1.
  console.error(`cli.mjs: ${error.message}`);
  process.exitCode = 1;
}
