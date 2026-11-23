---
id: CS-1093
title: Merge CS-966, credentials and queries kept to their own origins
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; the Minors go to a follow-up item."
answered_at: 2026-11-23T20:29:00.427Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-966 into main? It stops resolveUri copying a base URL's query to other origins, sends a source's headers and a credential only to their own origins, follows redirects by hand when a source's own headers are attached (your CS-1033 A), and lets the host's request hook decide what is sent (your CS-1034 A).

A security fix the owner put first in the queue: one hostile tile in a trusted tileset could send its token to another server. resolveUri keeps the base's query only on the base's own origin; the fetch provider sends a source's headers and a credential without declared origins only to the source's origin, and a credential with origins only to those. Redirects: only when a non-Authorization source header is attached (Accept and Prefer count with Authorization, so iTwin stays unaffected), Node follows them by hand and checks each hop as a fresh request, capped at 20 hops, refusing loops, downgrades to http and any scheme other than http or https; browsers refuse the redirect with an error that names the URL without its query. The hook's returned request goes as is, read once, and only credentials with declared origins are re-checked after a move. A forwarding proxy's header that carries a credential's key now takes the by-hand path. Three security reviews (Opus) ran across the rounds; the last, on round 3, found nothing Important and nothing that fails open from source headers or credentials. Its Minors go into a follow-up: a hook-added query token whose name isn't on the fixed list rides a proxy's X-Target-URL under follow, and a custom proxy's fixed secret header follows a redirect unless the target carries a token (both documented as the host's choice under CS-1034 A); two test cases; and ion or iTwin endpoints through a credential-forwarding proxy now refuse a gateway redirect in browsers (fails closed). Also open for you, not blocking: headers a host's hook adds don't start by-hand redirects; the executor, a reviewer and the orchestrator recommend keeping that, as the onRequest docs now say. Mutations shown each round; parity tileset and models before and after, 84 rows, 0 differ. Checked by the orchestrator on the replay d8c7ff857b (patch identical outside work/): build, npm test 7,004 of 7,004, test:data, checkBundle, surface (unchanged), shaders, eslint, the handbook.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; the Minors go to a follow-up item.
- B. Hold it: Nothing merges; the token leak stays open on main.

Recommended: Merge it. It closes a credential leak you ranked first, built as you answered CS-1033 and CS-1034, the last security review found nothing that fails open, and every gate passes.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
