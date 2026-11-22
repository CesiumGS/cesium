---
id: CS-688
title: "Dyno's Proposals tab follows the proposal flow: to discuss, being shaped, ready for the owner's yes"
kind: work
state: done
created: 2026-11-18
project: CS-18
claimed_by: orch-9-CS-688
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The owner answered CS-686 on 2026-11-17: proposals are short-lived candidate commitments with a header (source, why now and what it unblocks, rough size, decider, date), brought to the owner in small batches to commit, drop or send to shaping; the "later" copies stay proposed for the owner's review. Today's tab mixes committing with starting ("Waits on other items"), calls every row an "Idea", hides a proposed milestone's planned constraints, says "commit one" with no way to, and renders "Proposed milestone milestone" (`bench/suite/work.ts`: `proposalsOf`, `proposalGate`; `views/Work.tsx`: `ProposalsCard`, `ProposalTable`, `ProposalRow`, `GateCell`).

## Done when

- The tab groups proposals by stage: new to discuss, being shaped, ready for the owner's yes, and "later" copies awaiting review, with an alert lane for committed work that needs an uncommitted item.
- Each row shows its header: source, why, rough size, decider and date, read from the item; a row without a header says so.
- The gate says what a commit needs (the decider, any open decision or study), not the state of the item's needs, which move to a secondary detail.
- A proposed milestone shows all its constraints with their states, and the "milestone milestone" text is fixed.
- The tab says how to commit one until hitld's dashboard intents exist ("ask the main session to commit it").
- Your move shows the proposals waiting on the owner (the current "to discuss" batch and those ready for the owner's yes), each with its header and a link into the Proposals tab, beside the decisions it already shows; the owner, 2026-11-17: "also seems like maybe your move now should contain proposals?"
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples").
