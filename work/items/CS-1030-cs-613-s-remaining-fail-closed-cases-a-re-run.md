---
id: CS-1030
title: "CS-613's remaining fail-closed cases: a re-run attempt, a dispatched ci.yml run on a branch, Snyk's path findings, and the 35-day window"
kind: work
state: proposed
created: 2026-11-22
project: CS-609
needs: [CS-613]
---

> **Proposal.** Source: CS-613's fifth security review and its scoped re-review (2026-11-22). None of these fails open; they're kept visible. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- **Re-running an attempt:** "Re-run all jobs" on a run whose first attempt already staged is stopped before npm, not only by npm's refusal of a second staging.
- **A dispatched run:** a dispatched `ci.yml` run on a pull request's branch can't make skipped jobs count as passing required checks. For example, a required check excludes dispatched runs.
- **Snyk:** its four Low path-traversal findings (CWE-23) on CLI folder arguments in `scripts/release/` are recorded with the reason they're accepted: `scratchFolder`'s realpath confinement.
- **The 35-day window:** a version older than the runs query's 35-day window is guarded only by npm's unique-index refusal. That's documented, with a check if retention or approval timeouts change.
- **The base branch:** `.changeset/config.json`'s `baseBranch` follows the 2.0 branch if it's renamed or becomes the default.
