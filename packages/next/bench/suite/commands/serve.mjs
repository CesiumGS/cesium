// `npm run dyno` (CS-390; plan, section 5, "Ports"): Dyno on the first free
// port from 5200 to 5299, with its URL printed. It never stops or reuses a
// server someone else started: a port is free only when nothing listens on
// it, on IPv4 or IPv6 loopback. Every Dyno reads the same results store, so
// a link's path works in any of them.
//
// 5190 stays the owner's: `npm run dyno:serve` starts Dyno there exactly
// (`--strictPort`: it fails rather than move), the way `handbook:serve`
// does for the handbook.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const PORTS = { from: 5200, to: 5299 };

/** Whether nothing listens on this loopback address and port. */
export function canListen(port, host) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", (error) => {
      // This stack has no such address (no IPv6 loopback): nothing to clash with.
      resolve(error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL");
    });
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen({ port, host, exclusive: true });
  });
}

/**
 * The first port in the range that is free on both loopback addresses (a
 * server on `localhost` may have taken either). `taken` lets tests say
 * which ports are busy without opening sockets.
 */
export async function freePort({
  from = PORTS.from,
  to = PORTS.to,
  free = async (port) =>
    (await canListen(port, "127.0.0.1")) && (await canListen(port, "::1")),
} = {}) {
  for (let port = from; port <= to; port++) {
    if (await free(port)) {
      return port;
    }
  }
  throw new Error(
    `no free port from ${from} to ${to}: stop one of your own Dyno servers`,
  );
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const port = await freePort();
  const vite = join(
    dirname(createRequire(import.meta.url).resolve("vite/package.json")),
    "bin",
    "vite.js",
  );
  console.log(
    `Dyno: http://127.0.0.1:${port}/ (this server is yours; 5190 is the owner's, \`npm run dyno:serve\`)`,
  );
  const child = spawn(
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: root, stdio: "inherit" },
  );
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
