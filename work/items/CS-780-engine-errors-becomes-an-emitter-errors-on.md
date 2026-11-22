---
id: CS-780
title: 'Engine.errors becomes an emitter: errors.on("support", …) reaches notice listeners, as the engine-profiles plan names it'
kind: work
state: in-progress
created: 2026-11-20
project: CS-437
needs: [CS-23]
claimed_by: orch-11-CS-780
touches: [packages/next/src/scene/Engine.ts, packages/next/src/scene/**, packages/next/src/thread/protocol.ts, packages/next/test, packages/next/api/surface.txt, packages/next/widgets/**, packages/next/bench/**]
---

The owner, 2026-11-20, answering CS-23's first question: support notices reach listeners as the engine-profiles plan names it, `engine.errors.on("support", …)`, rather than through `engine.onError(e => e.kind === "support" && e.notice)` as CS-23 left them. Today `Engine.errors` is a `readonly EngineError[]` getter (`src/scene/Engine.ts`), so this is a change to a public member's shape, and the owner has approved it.

Source: the owner's answer to CS-23's question, through the chief of staff. Why now: beta.1 freezes the lifetime and error contract, and every caller that learns `onError` now has to move later. Rough size: small to medium. Decider: the executor, for how the list of past errors stays readable next to `on`. Removing `onError` outright, or any change outside `Engine.errors` and its listeners, comes back as a question. Filed: 2026-11-20.

## Done when

- `engine.errors.on(kind, listener)` exists for each error kind, `"support"` among them, and returns a way to stop listening. The errors already raised stay readable, and the TSDoc says how.
- `onError` is either kept as a documented shorthand or deprecated with a pointer to `errors.on`. Every caller in `packages/next` (widgets, examples, Dyno) uses `errors.on`.
- A Node test with `test/fakeGpu.ts` raises a support notice and checks that `errors.on("support", …)` sees it once, and that a listener stopped beforehand doesn't.
- The protocol table (`src/thread/protocol.ts`) gives the new members their kind. `npm run surface` is run and `api/surface.txt` is committed with the change.
- Notices still carry no view id. That comes with the worker façade (CS-31) and is out of scope here.
