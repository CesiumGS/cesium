// dyno's dispatcher (CS-721): finds the command in the table (table.mjs),
// checks its arguments, runs it and prints the result, as a short summary
// for a person or, with --json, one JSON object for a program.
//
// The interface a program reads (hitld's, among others):
//  - every command takes its input as arguments, never prompts, and fails
//    when anything is unclear: an unknown command or option, a missing or
//    extra argument;
//  - with --json, standard output holds exactly one JSON object, with
//    `api_version` (API_VERSION), `command` and `ok`; whatever else a
//    command prints goes to standard error. Adding a field keeps
//    `api_version`; removing, renaming or retyping one raises it;
//  - a failure is { api_version, command, ok: false, error, message }, where
//    `error` is one of the names in EXIT;
//  - the exit code says what happened (EXIT).
import process from "node:process";

/** The version of the JSON every command prints. */
export const API_VERSION = 1;

/** Exit codes, the same in both modes. */
export const EXIT = {
  /** It did what was asked. */
  ok: 0,
  /** It ran and found a problem (out-of-date data, a failed run). */
  problem: 1,
  /** The command line was unclear: unknown command or option, missing argument. */
  usage: 2,
  /** The command is planned, not built yet (its item is named). */
  "not-built": 3,
  /** It was refused: the machine, the data or a port doesn't allow it now. */
  refused: 4,
};

/** What the exit codes mean, for `--help` and `capabilities`. */
export const EXIT_MEANINGS = {
  0: "ok",
  1: "a problem was found, or the run failed",
  2: "usage: an unknown command or option, or a missing argument",
  3: "not built yet: the command is planned (its item is named)",
  4: "refused: out-of-date data, a busy machine or a held port",
};

/** A failure with its kind (a key of EXIT) and, optionally, data for --json. */
export class DynoError extends Error {
  constructor(kind, message, data = {}) {
    super(message);
    this.kind = kind;
    this.data = data;
  }
}

/** Options every command takes. */
export const GLOBAL_OPTIONS = {
  json: { help: "print one JSON object (api_version, command, ok, …)" },
  help: { help: "say what this command does and takes" },
  fake: {
    help: "a simulated target with deterministic results (also DYNO_FAKE=1)",
  },
};

/**
 * Parses `tokens` against a command's options: `--name value` for an option
 * with a `value`, `--name` alone for a flag, `--name [value]` for one with
 * `optional` (it takes the next token unless that is an option). Returns
 * { opts, positional }. Throws a usage DynoError for anything unclear.
 */
export function parseOptions(tokens, spec = {}) {
  const all = { ...GLOBAL_OPTIONS, ...spec };
  const opts = {};
  const positional = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "-h") {
      opts.help = true;
      continue;
    }
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    if (token.includes("=")) {
      throw new DynoError(
        "usage",
        `${token}: write the value after a space (${token.replace("=", " ")})`,
      );
    }
    const name = token.slice(2);
    const option = Object.hasOwn(all, name) ? all[name] : undefined;
    if (!option) {
      throw new DynoError(
        "usage",
        `unknown option --${name} (options: ${Object.keys(all)
          .filter((n) => !all[n].hidden)
          .map((n) => `--${n}`)
          .join(", ")})`,
      );
    }
    if (Object.hasOwn(opts, name) && !option.repeatable) {
      throw new DynoError("usage", `--${name} given twice`);
    }
    const next = tokens[i + 1];
    const nextIsValue = next !== undefined && !next.startsWith("--");
    if (option.repeatable && option.value) {
      // A repeatable option collects its values in order (study verdict --cite).
      if (!nextIsValue) {
        throw new DynoError(
          "usage",
          `--${name} needs a value <${option.value}>`,
        );
      }
      opts[name] = [...(opts[name] ?? []), next];
      i++;
    } else if (option.value && !option.optional) {
      if (!nextIsValue) {
        throw new DynoError(
          "usage",
          `--${name} needs a value <${option.value}>`,
        );
      }
      opts[name] = next;
      i++;
    } else if (option.optional && nextIsValue) {
      opts[name] = next;
      i++;
    } else {
      opts[name] = true;
    }
  }
  return { opts, positional };
}

/**
 * Checks the option names in `tokens` for a command whose own parser reads
 * them (the suite's), without taking its values apart. Returns the tokens
 * without dyno's global options.
 */
export function checkPassthrough(tokens, spec = {}) {
  const out = [];
  for (const token of tokens) {
    if (!token.startsWith("--")) {
      out.push(token);
      continue;
    }
    if (token.includes("=")) {
      throw new DynoError(
        "usage",
        `${token}: write the value after a space (${token.replace("=", " ")})`,
      );
    }
    const name = token.slice(2);
    if (Object.hasOwn(GLOBAL_OPTIONS, name)) {
      continue;
    }
    if (!Object.hasOwn(spec, name)) {
      throw new DynoError(
        "usage",
        `unknown option --${name} (options: ${Object.keys(spec)
          .filter((n) => !spec[n].hidden)
          .map((n) => `--${n}`)
          .join(", ")})`,
      );
    }
    out.push(token);
  }
  return out;
}

/** The command a path of words names, and the words after it. */
export function findCommand(table, words) {
  let node = { children: table };
  let i = 0;
  while (i < words.length && node.children && !words[i].startsWith("-")) {
    const child = node.children[words[i]];
    if (!child) {
      break;
    }
    node = child;
    i++;
  }
  return { node, path: words.slice(0, i), rest: words.slice(i) };
}

/** The table as data, for `--help --json` and `capabilities`. */
export function describe(table, prefix = []) {
  return Object.entries(table)
    .filter(([, node]) => !node.hidden)
    .map(([name, node]) => ({
      command: [...prefix, name].join(" "),
      summary: node.summary,
      ...(node.children
        ? { subcommands: describe(node.children, [...prefix, name]) }
        : {
            usage: node.usage,
            state: node.planned ? "planned" : "built",
            ...(node.planned
              ? { item: node.planned.startsWith("CS-") ? node.planned : null }
              : {}),
            options: Object.keys(node.options ?? {}),
          }),
    }));
}

/** Help for a command or group, as lines. */
export function helpLines(node, path) {
  const name = ["dyno", ...path].join(" ");
  const lines = [];
  if (node.children) {
    lines.push(`${name}: ${node.summary ?? "Dyno's command line"}`, "");
    lines.push(`Usage: ${name} <command> [options]`);
    lines.push(`       ${name} <command> --help`);
    // The bin is the private workspace package tools/dyno, @cesium/dyno (CS-774, CS-784).
    if (path.length === 0) {
      lines.push(
        "",
        "Run it as `npx @cesium/dyno`, from the repository root or packages/next.",
        "(The scoped name: a missing link then fails instead of downloading the public `dyno` package.)",
      );
    }
    lines.push("");
    lines.push("Commands:");
    const entries = Object.entries(node.children).filter(([, n]) => !n.hidden);
    const width = Math.max(...entries.map(([n]) => n.length)) + 2;
    for (const [child, sub] of entries) {
      const planned = sub.planned
        ? ` (planned${sub.planned.startsWith("CS-") ? `, ${sub.planned}` : ""})`
        : "";
      lines.push(`  ${child.padEnd(width)}${sub.summary}${planned}`);
    }
  } else {
    lines.push(`${name}: ${node.summary}`, "");
    lines.push(`Usage: ${node.usage ?? name}`);
    if (node.planned) {
      lines.push(
        "",
        node.planned.startsWith("CS-")
          ? `Not built yet: ${node.planned} builds it.`
          : `Not built yet: ${node.planned}.`,
      );
    }
    if (node.details) {
      lines.push("", ...node.details);
    }
    const options = Object.entries(node.options ?? {}).filter(
      ([, o]) => !o.hidden,
    );
    if (options.length) {
      lines.push("", "Options:");
      const label = ([n, o]) =>
        `--${n}${o.value ? (o.optional ? ` [${o.value}]` : ` <${o.value}>`) : ""}`;
      const width = Math.max(...options.map((e) => label(e).length)) + 2;
      for (const entry of options) {
        lines.push(`  ${label(entry).padEnd(width)}${entry[1].help ?? ""}`);
      }
    }
  }
  if (path.length === 0) {
    lines.push("", "Every command takes --json, --help and --fake.");
    const codes = Object.entries(EXIT_MEANINGS)
      .map(([code, meaning]) => `${code} ${meaning}`)
      .join("; ");
    lines.push(`Exit codes: ${codes}.`);
  }
  return lines;
}

/**
 * Runs dyno with `argv` (the words after `dyno`). `io` holds `stdout` and
 * `stderr` (functions taking a line), `env` and `table`. Returns the exit
 * code; never exits the process.
 */
export async function dispatch(argv, io) {
  const { table, env = process.env } = io;
  const write = process.stdout.write;
  const stdout =
    io.stdout ?? ((line) => write.call(process.stdout, `${line}\n`));
  const stderr = io.stderr ?? ((line) => process.stderr.write(`${line}\n`));
  const json = argv.includes("--json");
  const words = argv.filter((w) => w !== "--json");
  const { node, path, rest } = findCommand(table, words);
  const command = path.join(" ");
  const print = (object) => stdout(JSON.stringify(object, null, 2));
  const failure = (error) => {
    const kind = error instanceof DynoError ? error.kind : "problem";
    if (json) {
      print({
        api_version: API_VERSION,
        command,
        ok: false,
        error: kind,
        message: error.message,
        ...(error.data ?? {}),
      });
    } else {
      stderr(`dyno${command ? ` ${command}` : ""}: ${error.message}`);
    }
    return EXIT[kind] ?? EXIT.problem;
  };

  const wantsHelp = rest.includes("--help") || rest.includes("-h");
  if (wantsHelp || (node.children && rest.length === 0 && path.length > 0)) {
    if (!wantsHelp && node.children) {
      // A group alone is unclear: say what it holds and fail.
      return failure(
        new DynoError(
          "usage",
          `which one? ${Object.keys(node.children)
            .filter((n) => !node.children[n].hidden)
            .join(", ")} (dyno ${command} --help)`,
        ),
      );
    }
    if (json) {
      print({
        api_version: API_VERSION,
        command,
        ok: true,
        help: node.children
          ? describe(node.children, path)
          : describe({ [path.at(-1)]: node }, path.slice(0, -1))[0],
        exit_codes: EXIT_MEANINGS,
      });
    } else {
      for (const line of helpLines(node, path)) {
        stdout(line);
      }
    }
    return EXIT.ok;
  }
  if (path.length === 0 || node.children) {
    const unknown = rest[0];
    return failure(
      new DynoError(
        "usage",
        unknown && !unknown.startsWith("-")
          ? `unknown command ${[...path, unknown].join(" ")} (dyno${command ? ` ${command}` : ""} --help)`
          : `a command, please (dyno${command ? ` ${command}` : ""} --help)`,
      ),
    );
  }
  if (node.planned) {
    return failure(
      new DynoError(
        "not-built",
        node.planned.startsWith("CS-")
          ? `not built yet: ${node.planned} builds \`dyno ${command}\``
          : `not built yet: ${node.planned}`,
        { item: node.planned.startsWith("CS-") ? node.planned : null },
      ),
    );
  }

  // In JSON mode, standard output is the JSON alone: what the command
  // prints for a person (console.log, progress written to the stream) goes
  // to standard error.
  if (json) {
    process.stdout.write = (...args) => process.stderr.write(...args);
  }
  let result;
  try {
    let ctx;
    if (node.passthrough === "raw") {
      ctx = {
        argv: rest.filter(
          (t) =>
            !Object.hasOwn(GLOBAL_OPTIONS, t.slice(2)) || !t.startsWith("--"),
        ),
      };
    } else if (node.passthrough) {
      ctx = { argv: checkPassthrough(rest, node.options) };
    } else {
      const { opts, positional } = parseOptions(rest, node.options);
      ctx = { opts, args: positional };
      checkArguments(node, positional);
    }
    ctx.json = json;
    ctx.fake = Boolean(
      rest.includes("--fake") ||
      env.DYNO_FAKE === "1" ||
      env.DYNO_FAKE === "true",
    );
    ctx.env = env;
    ctx.say = (line) => (json ? stderr(line) : stdout(line));
    result = (await node.run(ctx)) ?? {};
  } catch (error) {
    return failure(error);
  } finally {
    process.stdout.write = write;
  }
  const { exitCode = EXIT.ok, lines = [], ...data } = result;
  if (json) {
    print({
      api_version: API_VERSION,
      command,
      ok: exitCode === EXIT.ok,
      ...data,
    });
  } else {
    for (const line of lines) {
      stdout(line);
    }
  }
  return exitCode;
}

/** Fails a command given too few or too many positional arguments. */
function checkArguments(node, positional) {
  const spec = node.args ?? [];
  const required = spec.filter((a) => a.required).length;
  const variadic = spec.some((a) => a.variadic);
  if (positional.length < required) {
    throw new DynoError(
      "usage",
      `missing <${spec[positional.length].name}> (${node.usage})`,
    );
  }
  if (!variadic && positional.length > spec.length) {
    throw new DynoError(
      "usage",
      `unexpected argument ${positional[spec.length]} (${node.usage})`,
    );
  }
  spec.forEach((arg, i) => {
    if (arg.choices && positional[i] !== undefined) {
      if (!arg.choices.includes(positional[i])) {
        throw new DynoError(
          "usage",
          `<${arg.name}>: one of ${arg.choices.join(", ")}, not "${positional[i]}"`,
        );
      }
    }
  });
}
