---
id: CS-1072
title: The owner's publishing steps outside the repository are tracked by no item
kind: work
state: proposed
created: 2026-11-22
project: CS-609
---

> **Proposal.** Source: the Fable alpha1-path review (`fable-review-alpha1-path.md`, finding 2), 2026-11-22. Severity: Critical. Land before: alpha.1. **Items:** CS-613, CS-614, CS-616, CS-617, CS-889. Decider: owner.

## Done when

- file three items under CS-609 or CS-615 and add them to CS-530: (a) an `external` item, "The owner's npm and GitHub setup for 2.0's releases", with the checklist as its done-when; (b) a work item, "CI's first green run on GitHub, on Linux", needing CS-613; (c) a work item, "A rehearsal release: a record staged to npm and rejected, or published as `2.0.0-alpha.0` under `next`", needing (a), (b) and CS-617. Ask the owner whether (c) should publish or stop at staging.
- The finding's evidence in the review is rechecked first, since the code may have moved.
