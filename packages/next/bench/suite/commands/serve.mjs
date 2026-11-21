// Dyno's and the handbook's dev servers (CS-390, CS-721).
//
// `npm run dyno` (`main` below): Dyno on the first free port from 5200 to
// 5299, in the foreground, with its URL printed. It never stops or reuses a
// server someone else started: a port is free only when nothing listens on
// it, on IPv4 or IPv6 loopback. Every Dyno reads the same results store, so
// a link's path works in any of them.
//
// `dyno serve start|stop|status|logs` (CS-721): the same servers, detached,
// each with a record in the servers folder (DYNO_SERVERS, by default
// ~/.cesium-bench/servers): `<id>.json` (what it is, whose, where), `<id>.pid`
// and `<id>.log`. A worktree's servers take a free port from the same range,
// one per worktree and server (`start` again says where the running one
// is). The owner's servers keep their ports, 5190 for Dyno and 5199 for the
// handbook, and their ids `dyno` and `handbook`, the files the owner's own
// start and stop by hand use: `--owner`, from the main checkout only.
//
// `stop` stops only a server with a record, and only after checking the
// process listening on its port is the one the record started (or its
// child). `start` refuses a port anything else listens on.
import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { DynoError } from "./dispatch.mjs";

export const PORTS = { from: 5200, to: 5299 };

/** packages/next. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The servers dyno starts: the owner's port, and how to start one. */
export const SERVERS = {
  dyno: { owner: 5190, label: "Dyno" },
  handbook: { owner: 5199, label: "the handbook" },
};

/** The ports that are the owner's, never a worktree's. */
const OWNER_PORTS = new Set(Object.values(SERVERS).map((s) => s.owner));

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

/** Whether nothing listens on the port, on either loopback address. */
export const portFree = async (port) =>
  (await canListen(port, "127.0.0.1")) && (await canListen(port, "::1"));

/**
 * The first port in the range that is free on both loopback addresses (a
 * server on `localhost` may have taken either). `taken` lets tests say
 * which ports are busy without opening sockets.
 */
export async function freePort({
  from = PORTS.from,
  to = PORTS.to,
  free = portFree,
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

/** The servers folder. */
export const serversDirectory = (env = process.env) =>
  env.DYNO_SERVERS ?? join(homedir(), ".cesium-bench", "servers");

/** Whether a process with this id is running. */
export function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/**
 * This checkout: its top folder, and whether it is a linked worktree (an
 * executor's) rather than the main checkout.
 */
export function checkout(root = ROOT) {
  const top = git(["rev-parse", "--show-toplevel"], root);
  const gitDir = resolve(root, git(["rev-parse", "--git-dir"], root));
  const common = resolve(root, git(["rev-parse", "--git-common-dir"], root));
  return { worktree: top, linked: gitDir !== common };
}

/** Every record in the servers folder, with the owner's bare pidfiles. */
export function readRecords(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  const files = readdirSync(directory);
  const records = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      records.push(JSON.parse(readFileSync(join(directory, file), "utf8")));
    } catch {
      // A half-written record: its server says so on the next start.
    }
  }
  // The owner's servers started by hand have only `<name>.pid`.
  for (const [name, server] of Object.entries(SERVERS)) {
    if (files.includes(`${name}.pid`) && !records.some((r) => r.id === name)) {
      const pid = Number(
        readFileSync(join(directory, `${name}.pid`), "utf8").trim(),
      );
      records.push({
        id: name,
        name,
        port: server.owner,
        pid,
        owner: true,
        group: false,
        log: join(directory, `${name}.log`),
      });
    }
  }
  return records;
}

/** Whether something answers HTTP on the port (any status). */
export function answers(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = request(
      { host: "127.0.0.1", port, path: "/", timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve(true);
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end();
  });
}

/** The processes listening on a TCP port (lsof), or undefined if lsof can't say. */
function listeners(port) {
  try {
    const out = execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out.split(/\s+/).filter(Boolean).map(Number);
  } catch (error) {
    // lsof exits 1 when nothing listens.
    return error.status === 1 ? [] : undefined;
  }
}

/** Each process's parent (ps), for walking a server's process tree. */
function parents() {
  const out = execFileSync("ps", ["-A", "-o", "pid=,ppid="], {
    encoding: "utf8",
  });
  const map = new Map();
  for (const line of out.trim().split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    map.set(pid, ppid);
  }
  return map;
}

/** Whether `pid` is `root` or descends from it. */
function descends(pid, root, map) {
  for (let p = pid, n = 0; p && n < 64; p = map.get(p), n++) {
    if (p === root) {
      return true;
    }
  }
  return false;
}

/**
 * Whether the record's process is the one listening on its port: true,
 * false, or undefined when this machine can't tell (no lsof).
 */
export function ownsPort(record) {
  if (process.platform === "win32") {
    return undefined;
  }
  const pids = listeners(record.port);
  if (pids === undefined) {
    return undefined;
  }
  const map = parents();
  return pids.some((pid) => descends(pid, record.pid, map));
}

/** The record's status: alive, answering, whose. */
async function describeRecord(record, here) {
  const running = alive(record.pid);
  return {
    id: record.id,
    name: record.name,
    port: record.port,
    url: `http://127.0.0.1:${record.port}/`,
    pid: record.pid,
    owner: Boolean(record.owner),
    mine: !record.owner && record.worktree === here,
    alive: running,
    answering: running ? await answers(record.port) : false,
    ...(record.worktree ? { worktree: record.worktree } : {}),
    ...(record.started ? { started: record.started } : {}),
    log: record.log,
  };
}

/** The command that starts a server on a port, in packages/next. */
export function serverCommand(name, port, root = ROOT) {
  if (name === "dyno") {
    const vite = join(
      dirname(createRequire(import.meta.url).resolve("vite/package.json")),
      "bin",
      "vite.js",
    );
    return {
      file: process.execPath,
      args: [
        vite,
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      cwd: root,
    };
  }
  // The handbook: its data, then its dev server (`npm run handbook:dev`).
  return {
    file: process.platform === "win32" ? "npm.cmd" : "npm",
    args: [
      "run",
      "handbook:dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    cwd: root,
    shell: process.platform === "win32",
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The last lines of a log, with anything shaped like a token hidden. */
export function tail(file, lines = 40) {
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line, i, all) => i < all.length - 1 || line)
    .slice(-lines)
    .map((line) =>
      line.replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, "<token hidden>"),
    );
}

/**
 * Starts a server detached. `options`: `name` (dyno or handbook), `port`,
 * `owner`, `wait` (seconds until it must answer), `directory`, `root`, and
 * `command` (tests: what to run instead of Vite, given the port).
 */
export async function startServer({
  name,
  port: asked,
  owner = false,
  wait = 90,
  directory = serversDirectory(),
  root = ROOT,
  command = serverCommand,
  here = checkout(root),
}) {
  const server = SERVERS[name];
  if (owner && here.linked) {
    throw new DynoError(
      "refused",
      `--owner starts the owner's ${server.label} on ${server.owner}, from the main checkout only; this is a linked worktree (${here.worktree}). Leave off --owner for a server of your own.`,
    );
  }
  if (owner && asked !== undefined && asked !== server.owner) {
    throw new DynoError(
      "usage",
      `--owner is port ${server.owner}; leave off --port`,
    );
  }
  if (!owner && asked !== undefined && OWNER_PORTS.has(asked)) {
    throw new DynoError(
      "refused",
      `port ${asked} is the owner's; take any other (or none: dyno picks one from ${PORTS.from} to ${PORTS.to})`,
    );
  }
  const records = readRecords(directory);
  const live = records.filter((r) => alive(r.pid));
  const id = owner ? name : undefined;
  // One per worktree and server: the running one is the answer.
  const existing = live.find((r) =>
    owner
      ? r.id === name
      : !r.owner &&
        r.name === name &&
        r.worktree === here.worktree &&
        (asked === undefined || r.port === asked),
  );
  if (existing) {
    return {
      started: false,
      already_running: true,
      server: await describeRecord(existing, here.worktree),
    };
  }
  let port = owner ? server.owner : asked;
  if (port === undefined) {
    port = await freePort();
  } else if (!(await portFree(port))) {
    const holder = live.find((r) => r.port === port);
    throw new DynoError(
      "refused",
      `port ${port} is held by ${
        holder
          ? `${holder.owner ? "the owner's" : "another worktree's"} ${holder.name} (pid ${holder.pid}${holder.worktree ? `, ${holder.worktree}` : ""})`
          : "a process dyno didn't start"
      }; dyno never stops or reuses it. Pick another port, or none.`,
      { port, ...(holder ? { holder: holder.id } : {}) },
    );
  }
  mkdirSync(directory, { recursive: true });
  const recordId = id ?? `${name}-${port}`;
  const log = join(directory, `${recordId}.log`);
  const how = command(name, port, root);
  const fd = openSync(log, "a");
  let child;
  try {
    child = spawn(how.file, how.args, {
      cwd: how.cwd,
      detached: true,
      stdio: ["ignore", fd, fd],
      shell: how.shell ?? false,
      env: process.env,
    });
  } finally {
    closeSync(fd);
  }
  let exited;
  child.on("exit", (code, signal) => {
    exited = { code, signal };
  });
  child.unref();
  const record = {
    id: recordId,
    name,
    port,
    pid: child.pid,
    group: process.platform !== "win32",
    owner,
    worktree: here.worktree,
    root,
    started: new Date().toISOString(),
    command: [how.file, ...how.args].join(" "),
    log,
  };
  writeFileSync(
    join(directory, `${recordId}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  writeFileSync(join(directory, `${recordId}.pid`), `${child.pid}\n`);
  const deadline = Date.now() + wait * 1000;
  while (!(await answers(port))) {
    if (exited) {
      removeRecord(directory, recordId);
      throw new DynoError(
        "problem",
        `${server.label} exited before it answered (${exited.signal ?? `code ${exited.code}`}); its log, ${log}, ends:\n${tail(log, 12).join("\n")}`,
      );
    }
    if (Date.now() > deadline) {
      throw new DynoError(
        "problem",
        `${server.label} didn't answer on ${port} within ${wait} s; it is still running (pid ${child.pid}): dyno serve logs ${name}${owner ? " --owner" : ""}, or dyno serve stop ${name}`,
      );
    }
    await sleep(250);
  }
  return {
    started: true,
    already_running: false,
    server: await describeRecord(record, here.worktree),
  };
}

function removeRecord(directory, id) {
  rmSync(join(directory, `${id}.json`), { force: true });
  rmSync(join(directory, `${id}.pid`), { force: true });
}

/** The record `stop` and `logs` mean: the owner's, or this worktree's. */
function pick(records, { name, owner, port, here }) {
  const mine = records.filter((r) =>
    owner
      ? r.id === name
      : !r.owner &&
        r.name === name &&
        r.worktree === here.worktree &&
        (port === undefined || r.port === port),
  );
  if (mine.length > 1) {
    throw new DynoError(
      "usage",
      `this worktree has ${mine.length} ${name} servers (ports ${mine.map((r) => r.port).join(", ")}): say which with --port`,
    );
  }
  return mine[0];
}

/** Stops a server dyno has a record of. Returns what it did. */
export async function stopServer({
  name,
  owner = false,
  port,
  directory = serversDirectory(),
  root = ROOT,
  here = checkout(root),
  graceMs = 10000,
}) {
  if (owner && here.linked) {
    throw new DynoError(
      "refused",
      `--owner stops the owner's ${SERVERS[name].label}, from the main checkout only; this is a linked worktree (${here.worktree})`,
    );
  }
  const record = pick(readRecords(directory), { name, owner, port, here });
  if (!record) {
    return {
      stopped: false,
      reason: `no ${name} server of ${owner ? "the owner's" : "this worktree's"} on record`,
    };
  }
  if (!alive(record.pid)) {
    removeRecord(directory, record.id);
    return {
      stopped: false,
      reason: `pid ${record.pid} had already ended; its record is cleared`,
      id: record.id,
    };
  }
  const owns = ownsPort(record);
  if (owns === false || (owns === undefined && !record.group)) {
    throw new DynoError(
      "refused",
      `the process on port ${record.port} isn't the one pid ${record.pid} started${owns === undefined ? " (or this machine can't tell)" : ""}; stopping nothing`,
    );
  }
  const signal = (sig) => {
    try {
      if (record.group) {
        process.kill(-record.pid, sig);
      } else {
        // Started by hand without its own process group: the whole tree
        // under the launcher, children first.
        const map = parents();
        const tree = [...map.keys()].filter((p) =>
          descends(p, record.pid, map),
        );
        for (const p of tree.reverse()) {
          process.kill(p, sig);
        }
      }
    } catch {
      // Already gone.
    }
  };
  signal("SIGTERM");
  const deadline = Date.now() + graceMs;
  while (alive(record.pid) && Date.now() < deadline) {
    await sleep(100);
  }
  if (alive(record.pid)) {
    signal("SIGKILL");
  }
  removeRecord(directory, record.id);
  return { stopped: true, id: record.id, port: record.port, pid: record.pid };
}

/** Every server on record, with whether it runs and answers. */
export async function serverStatus({
  directory = serversDirectory(),
  root = ROOT,
  here = checkout(root),
} = {}) {
  const records = readRecords(directory);
  const servers = [];
  for (const record of records) {
    servers.push(await describeRecord(record, here.worktree));
  }
  servers.sort((a, b) => a.port - b.port);
  return { directory, worktree: here.worktree, servers };
}

/** A server's log, the last `lines`. */
export function serverLogs({
  name,
  owner = false,
  port,
  lines = 40,
  directory = serversDirectory(),
  root = ROOT,
  here = checkout(root),
}) {
  const record = pick(readRecords(directory), { name, owner, port, here });
  // A server that failed to start leaves its log without a record.
  const log =
    record?.log ??
    (owner
      ? join(directory, `${name}.log`)
      : port !== undefined
        ? join(directory, `${name}-${port}.log`)
        : undefined);
  if (!log || !existsSync(log)) {
    throw new DynoError(
      "problem",
      `no log for ${owner ? "the owner's" : "this worktree's"} ${name} server`,
    );
  }
  return { log, lines: tail(log, lines) };
}

async function main() {
  const port = await freePort();
  const { file, args, cwd } = serverCommand("dyno", port);
  console.log(
    `Dyno: http://127.0.0.1:${port}/ (this server is yours; 5190 is the owner's, \`npm run dyno:serve\`)`,
  );
  const child = spawn(file, args, { cwd, stdio: "inherit" });
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
