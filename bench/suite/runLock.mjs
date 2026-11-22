// The machine-wide run lock (CS-390; plan, section 5, "One run at a time per
// machine"). Two runs at once share the GPU, and their timings mean nothing,
// so a run that measures in a browser on this machine takes the lock first.
//
//   ~/.cesium-bench/run.lock      BENCH_LOCK names another file (tests)
//
// The file holds { pid, worktree, command, purpose, item, branch, start }
// and is made atomically, so one of two runs started together gets it and
// the other waits. The waiting run prints whose run holds it, and goes on
// when it is released. A lock whose process is gone (a crash, a kill -9) is
// taken over; a lock whose process is alive is never taken, so a pid the
// system has reused for another program keeps a dead lock alive: remove the
// file by hand then (the waiting message names it).
//
// Only runs take it. Dyno's own server, and the pages people look at while
// a run goes on, don't: a run records how busy the GPU was instead.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";

export const defaultLockFile = (env = process.env) =>
  env.BENCH_LOCK || join(homedir(), ".cesium-bench", "run.lock");

/** Whether a process exists (a process of another user still does). */
export function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readHolder(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

/** The line that says whose run holds the lock. */
export function holderLine(holder, file) {
  const since = holder.start
    ? ` since ${new Date(holder.start).toLocaleTimeString()}`
    : "";
  const what = [
    holder.purpose,
    holder.item,
    holder.branch ? `branch ${holder.branch}` : undefined,
    holder.worktree ? `worktree ${holder.worktree}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  return `run lock held by ${holder.command ?? "a run"} (${what || "no details"}; pid ${holder.pid}${since}); lock file ${file}`;
}

/**
 * Takes the lock, waiting for its holder unless `wait` is false (then it
 * throws, with the holder in the message). Returns { release, waitedFor },
 * where `waitedFor` is the holder this run waited for, if any. `release` is
 * safe to call twice; it also runs when the process exits or gets SIGINT or
 * SIGTERM, so a killed run frees the lock.
 *
 * `info`: what to record about this run. `onWait(holder, file)` prints the
 * waiting line, once per holder. `alive` and `pollMs` are for tests.
 */
export async function acquireRunLock({
  file = defaultLockFile(),
  info,
  wait = true,
  onWait = () => {},
  pollMs = 2000,
  alive = processAlive,
  pid = process.pid,
  handlers = true,
} = {}) {
  mkdirSync(dirname(file), { recursive: true });
  const mine = { pid, start: new Date().toISOString(), ...info };
  const token = JSON.stringify(mine);
  let waitedFor;
  let announced;
  for (;;) {
    try {
      writeFileSync(file, token, { flag: "wx" });
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }
    const holder = readHolder(file);
    if (holder === undefined && existsSync(file)) {
      // Half-written by a run starting at this moment: look again. A file
      // that stays unreadable (a crash while writing it) is cleared.
      await sleep(50);
      try {
        if (Date.now() - statSync(file).mtimeMs > 5000) {
          rmSync(file, { force: true });
        }
      } catch {
        // Gone already.
      }
      continue;
    }
    if (holder && !alive(holder.pid)) {
      takeOver(file, holder);
      continue;
    }
    if (!holder) {
      continue; // released between our attempt and our read
    }
    if (!wait) {
      throw new Error(`${holderLine(holder, file)}; --no-wait: not waiting`);
    }
    if (announced !== holder.pid + holder.start) {
      announced = holder.pid + holder.start;
      waitedFor = holder;
      onWait(holder, file);
    }
    await sleep(pollMs);
  }
  let released = false;
  const hooks = [];
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    try {
      if (readFileSync(file, "utf8") === token) {
        rmSync(file, { force: true });
      }
    } catch {
      // Already gone.
    }
    for (const [event, listener] of hooks) {
      process.off(event, listener);
    }
  };
  if (handlers) {
    // Frees the lock, then ends the process unless something else
    // (Playwright closing its browser) listens for the signal and will end
    // it itself.
    const onSignal = (signal) => {
      release();
      if (process.listenerCount(signal) === 0) {
        process.exit(signal === "SIGINT" ? 130 : 143);
      }
    };
    hooks.push(["exit", release], ["SIGINT", onSignal], ["SIGTERM", onSignal]);
    for (const [event, listener] of hooks) {
      process.on(event, listener);
    }
  }
  return { release, waitedFor, file };
}

/**
 * Removes a stale lock without racing another run doing the same: only the
 * run that makes `<file>.takeover` clears it, and only if it still holds
 * the dead process's record.
 */
function takeOver(file, stale) {
  const guard = `${file}.takeover`;
  try {
    writeFileSync(guard, String(process.pid), { flag: "wx" });
  } catch {
    // Someone else is taking over; a guard left by a crash goes after 10 s.
    try {
      if (Date.now() - statSync(guard).mtimeMs > 10000) {
        rmSync(guard, { force: true });
      }
    } catch {
      // Gone already.
    }
    return;
  }
  try {
    const now = readHolder(file);
    if (now && now.pid === stale.pid && now.start === stale.start) {
      rmSync(file, { force: true });
    }
  } finally {
    rmSync(guard, { force: true });
  }
}
