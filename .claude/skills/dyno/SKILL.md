---
name: dyno
description: Use before measuring, checking images, running the Lab's parity suites, starting a Dyno or handbook server, or starting heavy work (tests, builds) in Cesium 2.0. Covers the dyno command (status, data status, measure, result, suite, lab, serve), which suite a change needs, which instrument answers which question, how to read a verdict, and what never goes in a public pull request.
---

# dyno

`dyno` is Dyno's command line: the benchmark suite, the Lab's harnesses, Dyno's and the handbook's servers, setup's data, and measurements a program starts and watches. `dyno --help` lists the commands and `dyno <command> --help` says what each takes. Run it as `npx @cesium/dyno <command>`, from the repository root or from any folder below it (the bin is the private workspace package `tools/dyno`, named `@cesium/dyno`, which runs `bench/dyno.mjs`; the root declares it, and `pnpm install` links it). `node bench/dyno.mjs <command>` and `npm run dyno:cli -- <command>` at the repository root do the same. Always keep the scope: `dyno` is also the name of an unrelated public npm package, and `npx` given the bare name downloads and runs it wherever the workspace link is missing (a fresh clone, an older worktree, a checkout where `pnpm install` hasn't run), with no prompt when there is no terminal (agents, CI). Only Cesium can publish under `@cesium`, so `npx @cesium/dyno` can't reach an outside package: with the link missing it fails, and `pnpm install` at the root fixes that. The old `node bench/suite/cli.mjs` and `node bench/run.mjs` still work and say the new command.

For a program: every command takes `--json` and prints one object with `api_version`, `command` and `ok`. Exit codes: 0 ok, 1 a problem found or the run failed, 2 usage, 3 not built yet (the item is named), 4 refused (out-of-date data, a busy machine, a held port). Nothing prompts; anything unclear fails with exit 2.

## Before heavy work

The machine is shared. A measurement taken while tests or builds run measures them.

- Run `dyno status --json` before a full test suite, a build or a measurement. `state` is `busy` (a measurement runs), `waiting-for-quiet` (one is queued behind other work) or `quiet`. While it is `busy` or `waiting-for-quiet`, start no heavy work and let what runs finish.
- `dyno data status` says which of setup's datasets are out of date and the command that fixes each (`npm run setup`, `npm run sky -- build`). Measuring is refused while any is out of date.

## Which suite a change needs

- **Rendering** (shaders, passes, materials, lighting, tiles): the Lab's parity suites, `dyno lab parity` and the ones for what you touched (`models`, `globe`, `imagery`, `translucency`, `customShader`, `tracks`, `heights`, `tileset`, `lod`, `selection`), and the image checks, `dyno suite images`. Compare against the previous commit as well as a base commit. Explain any pixel difference before accepting it: Metal's compiler can reorder a float sum when a kernel changes.
- **Performance**: `dyno measure start suite --changed --tier quick` while developing (the scenes of the areas your files fall in), `--tier standard` before a commit that changes performance. Say what the run is meant to move: `--primary cpuP50 --guardrails settleMs,bytes --hypothesis "…"`.
- **Startup**: `dyno suite coldstart --port <your leased port>` (a page's first frame against its budget). Its dev server listens on 4101 unless `--port` says otherwise, and dyno doesn't pick a free port for it the way `serve` does: 4101 can be another executor's leased port, so a scripted run always passes `--port`.
- **Allocation per tick**: `dyno lab alloc`.
- **A shader's or a pass's cost**: `dyno lab shaderCost`, `translucencyCost`, `observerCost`.
- **The sky and the atmosphere**: `dyno lab sky`, `atmosphere`, `ibl`, `observer`.
- **History**: `dyno suite alerts` (change points across runs, with their triage) and `dyno suite compare <old.json> [new.json]`.

`dyno lab --commit <rev>` serves a commit from a snapshot worktree under `.bench/`, so you can keep working while it runs, and the comparison against it is real: the snapshot runs the commit's own workspace packages (`@cesium/*`, linked in `.bench/<sha>/node_modules`), never your worktree's. Before CS-919 it ran the worktree's, so a `--commit` comparison made before that fix showed no difference whatever changed. Since the move to pnpm (CS-1091), the snapshot installs its own tree: `pnpm install --frozen-lockfile --ignore-scripts --prefer-offline` inside the snapshot, once per lockfile, from the shared store in a few seconds, with the pinned 1.x (`cesium-1x`) among its packages; no 1.x build step and no `CESIUM_BUILD_DIR`. A commit from before the move, with `package-lock.json`, installs its own with `npm ci --ignore-scripts`. pnpm links each workspace package's siblings into that package's own `node_modules`, so the worktree's folders can't be shared. A failed install stops the run. Nothing a snapshot run does writes outside `.bench/` and the results store. Pass your leased port: `--port <n>`.

## Measuring

- Measure only through dyno: `dyno measure start <suite|images|coldstart|lab> [its options] --caller <you>` queues a measurement until the machine is quiet and returns a handle at once. Follow it with `dyno measure status <handle>`, or read its completion record, a line in `~/.cesium-bench/dyno/events.jsonl`. Nothing runs when it ends. `dyno suite run` runs one at once, in the foreground, under the same run lock.
- One measurement at a time per machine: the run lock queues a second one and says whose it waited for.
- No ad-hoc timing. Cite run ids (`dyno result list`) under `bench_runs` in your report.
- `--fake` gives a simulated target with deterministic results, for tests of code that calls dyno. It never touches the GPU.

## Reading a verdict

`dyno result show <run-id>` gives the run's identity, validity and verdict:

- `verdict` is `pass`, `marginal` or `fail`. The primary metric `improved`, `regressed` or made `no clear change` (a geometric mean of candidate-to-baseline ratios across scenes, with how many scenes got better and worse). A guardrail is `broken` in the scenes listed.
- `validity` counts runs that were valid, had warnings (the machine was busy, the GPU throttled or didn't cool) or were invalid. A verdict from runs with warnings is a reason to measure again on a quiet machine, not a result.
- Agreement between two runs is precision, not accuracy: two runs that agree can share the same error.

## What never goes in a public pull request

Measured values (milliseconds, bytes, frame times), machine configurations and traces stay in the results store: they carry machine details. `dyno result show` leaves values out unless you pass `--values`; never paste what `--values` prints. Write the verdict in words ("no clear change in CPU frame time across the four core scenes") and give the run id to the owner.

## Servers

- `dyno serve start dyno` (or `handbook`) starts your own server, detached, on a free port from 5200 to 5299, one per worktree: run it again and it says where the running one is. `dyno serve status`, `logs` and `stop` follow it. `--port <n>` takes your leased port; a port anything else listens on is refused.
- 5190 (Dyno) and 5199 (the handbook) are the owner's. `--owner` starts or stops them, only from the main checkout, and only when the owner asks. To look at them, open a browser tab of your own.

## Machine-wide locks

Heavy work takes a hitld lock that every project on this machine shares, so two projects' suites and GPU runs don't pile up and fail each other's timing tests. The names are the same in every project's `policy.json`: `gpu`, `cpu-heavy`, `benchmark` and `merge-queue` (the last is per repository).

- `cpu-heavy`: a full suite, `test:data`, a build, an install, `checkBundle`, a check across the whole repository.
- `gpu`: `dyno lab`, and any browser run that creates a WebGPU or WebGL device.
- Both: `cpu-heavy` first, then `gpu`; release in reverse.
- No lock: focused tests, one package's type check, lint on changed files, and Dyno measurements, which queue for quiet on their own. Lock takers wait while `dyno status` says `busy` or `waiting-for-quiet`.
- Lock each step, not a chain. Pass `--pid` so a dead job's lock goes stale, and a TTL longer than the step. Never break a lock; `npx hitld env status` shows its holder.

Run the lock, the step and the unlock in one command, for example:

```sh
npx hitld env lock --resource cpu-heavy --dispatch "$ID" --wait --pid $$ --ttl-seconds 5400 >/dev/null &&
  { trap 'npx hitld env unlock --resource cpu-heavy --dispatch "$ID" >/dev/null' EXIT; npm test; }
```

Where an orchestrator gives you a gate script, `gate && step` in one command does the same.
