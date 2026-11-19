---
id: CS-707
title: Dyno's scrollable tabs use StrataKit's supported API, and the StrataKit feedback is corrected
kind: work
state: in-progress
created: 2026-11-19
project: CS-389
claimed_by: orch-10-CS-707
touches: [packages/next/bench/suite/**]
---
The owner, 2026-11-19: "also i think that scrollButtons thing we filed against stratakit at itwin/stratakit/issues/2092 was us using a deprecated api, let's get that sorted out too". The issue (public; read 2026-11-19) reported scrollable `Tabs` fading the first tab at rest, with `scrollButtons={false}` in the reproduction. StrataKit's maintainers closed it as incorrect usage: StrataKit deliberately doesn't support the `scrollButtons` prop (their #1530), it's marked deprecated in `@stratakit/mui`'s types, and the fade is right when the scroll buttons aren't forced off. Their note: with types set up, the editor strikes the prop through. Dyno moved to the standard variant as a workaround (`bench/suite/STRATAKIT_FEEDBACK.md`, note 50), and its source no longer passes `scrollButtons` anywhere (searched 2026-11-19).

## Done when

- Where Dyno's tabs can overflow (the Work page's tabs at narrow widths), they use `variant="scrollable"` with StrataKit's default scroll buttons, never `scrollButtons`, checked in both themes, at 380 px wide and with the keyboard only, on a server of the executor's own.
- `STRATAKIT_FEEDBACK.md` note 50 says the fault was ours (a prop StrataKit doesn't support), not StrataKit's.
- Deprecated props can't slip in again: lint flags deprecated APIs in `bench/suite` (for example typescript-eslint's `no-deprecated`), or the reason it can't is written down, and StrataKit's types are confirmed set up for Dyno (`@stratakit/mui` type augmentation in the project's types).
- No comment on the closed issue is needed; if the executor thinks a short thank-you is worth it, it drafts one for the owner to post.
