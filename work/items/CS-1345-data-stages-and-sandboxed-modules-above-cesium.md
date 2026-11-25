---
id: CS-1345
title: Data stages and sandboxed modules above Cesium IR, on the GPU where they can run
kind: work
state: planned
created: 2026-11-24
project: CS-10
---

- **Source:** the owner, 2026-11-24, in the chief of staff's session. They asked whether Cesium IR's constant-bounded loops are flexible enough for general data processing in jobs. They asked for this design, and added: "the sandbox thing we should explore too, i want those layers on top of the IR to be GPU executable as much as possible".
- **Builds on:** CS-1136 (the IR stays pure, total and metered; a separate, versioned plan format of typed stages), and `docs/design/styling-runtime.md`, section 12, open points 1 (what the meter counts), 2 (the IR's new ops) and 3 (the plan format's stage kinds).
- **Decider:** owner, for the decisions the design raises.

## The question

Today a Cesium IR program is a graph with no cycles: each equation uses only earlier ones, and branching is `select`. Loops bounded by a constant are planned (CS-1325). That is the right limit for shaders, because a hung shader resets the GPU for every app on the machine. General data processing in jobs needs more: operations over collections whose length is known only at run time, and loops that end on a condition. How do we add that and keep every program safe to run? And how much of it can run on the GPU?

## Three layers to design

1. **The shader core (today's IR).** A graph with no cycles, loops bounded by a constant, and every op defined for every input. Unchanged by this design, except where the meter needs it.
2. **Data stages, a plan-format stage kind.** Operations over finite collections: map, filter, scan, fold, sort, group-by and join. Plus a loop that ends on a condition and declares a maximum trip count. Each operation gets a GPU form first, for example compaction by prefix sum, radix sort, segmented reduction, and a sort-merge or hash join. The conditional loop runs on the GPU as repeated dispatches up to its declared maximum, with the trip count written on the GPU. Each operation also gets a CPU or WebAssembly form, for when the GPU isn't available or isn't worth it. The planner chooses per stage, as CS-1134 does per expression.
3. **Sandboxed modules,** for code the IR can't express. Explore both sides:
   - **GPU:** user compute kernels in WGSL or Slang, with declared buffers and a maximum item count, as styling-runtime.md's `GpuKernel` has. They pass the loop guard and index clamping before they reach the GPU, the rule CS-1029 applies to custom shaders.
   - **CPU:** WebAssembly modules loaded by URL into workers, with a memory cap, a step budget or a deadline, and cancellation.
   - For both: what a module may reach (only host calls it is given, no network unless granted), and how it is stopped.

## Safety, for every layer

- The checking reader stays the only way in. It gains size limits and a cost bound computed before a program runs. That bound is what the meter counts.
- Every op is defined for every input, and every index is clamped.
- The evaluators and emitters are checked against each other on generated well-typed programs and on the conformance vectors (CS-1208).
- Rewrite rules are proved with an SMT solver's floating-point theory. The Rust reader gets model checking and fuzzing. Emitted WGSL is validated with naga in CI.
- On the GPU, every loop is bounded by a constant within one dispatch. Work that needs more trips continues in another dispatch.

## Done when

- A design note, amending `docs/design/styling-runtime.md` (sections 4.2 and 12) and `docs/design/core-ir.md` (the gap order), says:
  - the data stage kind's operations, each with its GPU and CPU forms and its cost;
  - the conditional loop's form and its GPU form across dispatches;
  - what the meter counts, and who enforces a budget;
  - the checking reader's limits;
  - the sandbox layer's GPU and CPU options, what each may reach, and how each is stopped.
- One small GPU spike each for sort, one join and a conditional loop across dispatches, run in Dyno and cited by run ID, shows the GPU forms are feasible.
- Each owner decision the design raises is filed as a decision item, with options and a recommendation.
- The work the design implies (IR ops, stage kinds, reader limits, verification in CI) is listed for the main session to file.

## Not covered here

- The styling language's syntax (CS-1140).
- CS-1325's constant-bounded loops, item rate and kernel stage. This design informs them, and doesn't wait on them.
