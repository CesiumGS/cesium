---
id: CS-686
title: How should we use proposals until hitld does it for us, and what should the Proposals tab show?
kind: decision
state: done
created: 2026-11-18
project: CS-18
decider: owner
---

## Question

How should this project use `proposed` until human-in-the-lead's triage, shaping and dashboard do it for us, how should the chief of staff generate proposals as work goes on and bring them to the owner, and what should Dyno's Proposals tab show?

The owner, 2026-11-17: "figure out how you should be generating proposals as work progresses and surfacing them to me to discuss, design, and commit or drop." Research of the same day (the chief of staff's notes) found:

- In hitld's design (`03-data-model.md`, "Project and item"), `proposed` means not committed yet: a decider commits it to `planned` or drops it, and a stale sweep retires old proposals (`13-operations.md`). An idea not yet shaped is a signal (`SIG-`), with `design_refs` so triage doesn't file work a design already holds. rc.1 builds the states but no commit command, triage, shaping or sweep.
- Here, `proposed` mixes "later" copies of design-document lists (about 55), work contingent on a decision or study (about 10), the owner's deferrals (3) and new filings (3). Seven proposed items block planned work.
- The Proposals tab mixes committing with starting ("Waits on other items"), calls every row an "Idea", hides a proposed milestone's planned constraints, says "commit one" with no way to, and renders "Proposed milestone milestone".

## Options and recommendation

- **A. Proposals are candidate commitments, short-lived.** Each carries a header: its source (a run's follow-up, a review, research, the owner's words), why now and what it unblocks, a rough size, the decider and the date. The chief of staff files follow-ups as `proposed`, never `planned`, puts them in a "to discuss" part of each digest in small batches, and brings one back once when stale, then drops it with the reason. Ideas without a case for now aren't items: they stay in their design documents. The Proposals tab shows the flow: new to discuss, being shaped, ready for the owner's yes, plus an alert lane for committed work that needs something uncommitted; its gate says what a commit needs (the decider, an open decision), not the state of the needs; the bugs are fixed.
- **B. Keep today's use** and only fix the tab's bugs.

Recommendation: A. It follows hitld's design, so moving onto hitld's own triage and shaping later is a small step. Once answered, a work item redesigns the Proposals tab, and the chief of staff's practice changes at once.

## Answer

The owner, 2026-11-17: "A, but don't drop the later things, keep them as proposals so i can review."

- Proposals are candidate commitments with a header: source, why now and what it unblocks, rough size, decider and date.
- The chief of staff files every follow-up as `proposed`, never `planned`, and brings them to the owner in a "to discuss" part of each digest, about five at a time, grouped by project; the owner commits, drops or sends each to shaping. One untouched for about two weeks comes back once.
- The "later" copies of design-document lists are **not** dropped: they stay `proposed`, each gains the header, and the owner reviews them in batches (CS-680). New ideas without a case for now stay in their design documents rather than becoming items.
- The Proposals tab is redesigned around this flow (CS-688).

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
