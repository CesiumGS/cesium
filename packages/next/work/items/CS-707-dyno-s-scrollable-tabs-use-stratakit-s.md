---
id: CS-707
title: Dyno's scrollable tabs use StrataKit's supported API, and the StrataKit feedback is corrected
kind: work
state: planned
created: 2026-11-19
project: CS-389
touches: [packages/next/bench/suite/**]
---

The owner, 2026-11-19: "also i think that scrollButtons thing we filed against stratakit at itwin/stratakit/issues/2092 was us using a deprecated api, let's get that sorted out too". The issue is likely Dyno's StrataKit feedback note 50 (`bench/suite/STRATAKIT_FEEDBACK.md`: scrollable `Tabs` fade the first tab at rest). The issue can't be read from this Mac (iTwin's SAML), and Dyno's source no longer passes `scrollButtons` anywhere (searched 2026-11-19), so the executor confirms what the issue reported and what StrataKit supports now.

## Done when

- What the issue reported, and which API StrataKit and MUI intend for scrollable tabs today, are written down with the docs read and their dates.
- Every Dyno page that scrolls tabs uses the supported API, checked in both themes, at 380 px wide and with the keyboard only, on a server of the executor's own.
- `STRATAKIT_FEEDBACK.md` note 50 says what was ours and what, if anything, is StrataKit's.
- A comment for itwin/stratakit#2092 is drafted (withdrawing or narrowing it) for the owner to post: this Mac can't reach iTwin's repositories, and posting is the owner's.
