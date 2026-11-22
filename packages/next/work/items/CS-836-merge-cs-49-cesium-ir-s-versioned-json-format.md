---
id: CS-836
title: Merge CS-49, Cesium IR's versioned JSON format, cesium-ir/1.0
kind: decision
state: planned
created: 2026-11-21
project: CS-10
decider: owner
---

## Question

Merge CS-49, which gives Cesium IR a versioned JSON form (cesium-ir/1.0) with a writer, a checking reader, a schema and written versioning rules, into main? It sets IR_VERSION to cesium-ir/1.0 and fixes how later versions read, which is a format other tools may come to write.

Every one of 358 test programs (CS-51's emitter cases, the spike, built-in and sample programs, and their scalarized, literals-as-uniforms and Jacobian forms) round-trips through JSON to the same shape key, the same literal values (the sign of zero included) and the same text on rewrite, and evaluates identically. Malformed files are refused with messages naming the problem: an unknown major ('cesium-ir: unknown major version 2 ... this reader reads major version 1'), an unlisted extension, a forward reference, and a type mismatch ('declared float2, but its operands give float'), plus 12 more. The schema (src/ir/cesium-ir-1.0.schema.json, one file per minor, no validator dependency) validates every fixture and every written document, and a test fails if its op lists drift from the vocabulary. The versioning rules, written in src/ir/FORMAT.md: a minor version only adds ops or optional fields, never a meaning; a reader reads its own major only and refuses any other, naming both numbers; a file of a newer minor is read with unknown fields ignored and unknown ops refused by name; the writer writes the lowest minor that covers the program; released schemas never change. Special float values are written as strings ('-0', 'NaN', 'Infinity'). IR_VERSION moves from cesium-ir/0.1 to cesium-ir/1.0; no golden holds the old string, and transformGolden passes. src/ir isn't an entry point, so api/surface.txt doesn't change, and nothing at startup imports the new JSON modules, so the viewer's start is unchanged; the bundle check still finds Cesium IR's core at 4 modules, 8.3 KB. Outside its touches: one line in test/irSpike.test.ts (the spike's programs carry the old version string), and new test helpers and fixtures. Checked by hand on main f112dc0903 (tested 88bae88ac1): both type checks, hitld work check (829 files), surface, npm test exit 1 on the board adapter test alone and test:data exit 1 on dish-tracks alone, both known load failures that passed alone twice (87 of 87, 5 of 5), every other file passed; the bundle check passes. For CS-54 (routes on both emitters): a new op needs a line in ops.ts and in the schema, and is a new minor version. Presentation: orch-11-merge-ready-CS-49.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the IR tests, fast-forwards main, regenerates the views and logs the merge; cesium-ir/1.0 becomes the format, and CS-54 can start once CS-794 merges.
- B. Hold it: Nothing merges; Cesium IR keeps no stable file format, and CS-54, CS-59 and CS-61 wait.

Recommended: Merge it. Every program round-trips exactly, malformed files are refused by name, the versioning rules are written down before anyone writes the format, and every gate passes but two known load failures that pass alone.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
