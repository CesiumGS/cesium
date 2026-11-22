---
id: CS-838
title: Merge CS-809, one fetch and credential provider for every request
kind: decision
state: planned
created: 2026-11-21
project: CS-10
decider: owner
---

## Question

Merge CS-809, which sends every request the engine makes through one fetch and credential provider (credentials, refresh after a 401, proxies, origin rules and a worker bridge), into main once a quiet plain cold-start check passes? It is an engine change, so under the cold-start rule it waits for that check. It also asks one security question: should a proxied request keep carrying the source's headers, an ion asset token included, to a proxy the host chose, as 1.x's DefaultProxy does?

Every request goes through FetchProvider, and a seam test (test/fetchSeam.test.ts) fails naming the line when code fetches around it: a planted fetch in itwin.ts fails naming src/io/itwin.ts:103. After a 401 the provider refreshes once and retries once; fifty refused requests share one refresh; a second refusal returns the 401; a token rotates without a reload; an ion 401 refetches the endpoint and retries; an asset token goes only to its asset's origin, which tightens today's behavior. Proxies: DefaultProxy as in 1.x, a provider-wide proxy with an opt-out rule, and ForwardingProxy (X-Target-URL). Origin rules match exactly or by *.subdomain, with a credentials mode per origin. Hooks can sign requests but never see a Credential. Workers ask the page's provider for bytes, and no token crosses a worker message. A no-leak test plants a fake token, tenant header and URL and finds them in nothing printed or thrown; error messages carry no URLs. 403 is not refreshed. Left for CS-808 (data resources): frameRoles.ts, engineering/proj.ts and atmosphere/skyPack.ts still fetch directly, listed as PENDING in the seam test with a staleness test. Outside its touches: rows in src/thread/protocol.ts and the handbook's apiMap.ts. api/surface.txt adds 14 names. Executor's parity: tileset 28 of 28 identical, globe 6 views identical but for load time (bench/results 2026-11-22T03-56-42-234Z and 03-57-45-533Z base, 04-00-32-772Z and 04-00-57-408Z branch). Checked by the orchestrator on main 026520244f (replay b6d217480b of e4434077c4): both type checks, work check (834 files), surface unchanged from the branch's, npm test exit 0 (383 files, 6,397 tests), test:data exit 0 (56 files), the bundle check and the sky-pack guard pass. eslint's one error (an unused PostStageKind import in src/render/post/chain.ts) is already on main and not this change's. Snyk (executor): 0 on src/io, src/globe and the test. The security question: today, as in 1.x, a request sent through a proxy carries its headers, an ion asset token included, to the proxy the host set; nothing is proxied unless a host sets a proxy. The alternative is to send credentials to a proxy only when its origin rule says so. Presentation: orch-11-merge-ready-CS-809.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge once a quiet check passes; proxies keep the headers: The orchestrator runs the plain 1,400 ms cold-start check on the candidate when the machine is quiet; on a pass it replays onto main's tip, reruns the type checks, work check and the seam tests, fast-forwards main, runs the plain check on main and logs the merge. A proxied request keeps carrying the source's headers, as 1.x does.
- B. Merge once a quiet check passes; credentials to a proxy only by rule: The same merge, after the executor or a follow-up changes the provider so a proxy gets credentials only when its origin rule allows it; that change is tested before the merge.
- C. Hold it: Nothing merges. CS-808, CS-835 and the other seams that build on the provider wait.

Recommended: Merge once a quiet check passes; proxies keep the headers. Every gate passes, the seam test stops code going around the provider, no token leaks to logs, errors or workers, and the proxy behavior matches 1.x, which hosts rely on; nothing is proxied unless a host chooses a proxy.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
