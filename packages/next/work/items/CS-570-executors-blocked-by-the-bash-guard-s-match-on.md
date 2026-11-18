---
id: CS-570
title: Executors blocked by the Bash guard's match on the word hitld
kind: decision
state: planned
created: 2026-11-17
project: CS-10
decider: owner
---

## Question

<!-- markdownlint-disable-next-line MD033 -->
Executors can't rename their worktree branch to hitld/<ID>-<slug>, because the Bash guard refuses any command containing the word hitld: how should this run's two items proceed?

D-21 (CS-51) came back blocked: the PreToolUse guard (core/harness/claude-code/hooks/guard.mjs, hitldCalls at lines 25-26 and the check at 62-63) matches \bhitld\b anywhere in a command, so `git branch -m hitld/CS-51-...`, which the brief orders, reads as a forbidden hitld subcommand. Commands without that word should pass; D-21 said every non-hitld command was refused, but its examples all held the branch name. D-21's worktree had no changes, so it was removed; nothing was claimed. D-20 (CS-201) runs on the same brief step and will likely stop at the same place. Earlier executors (CS-48, CS-200) did get hitld/ branch names; I don't know how.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Orchestrator renames: Until the guard is fixed, the orchestrator renames each executor's worktree branch to its dispatch branch name from the main checkout right after launch and tells the executor to skip that step. The guard stays as it is for everything else. (cost: One git command per dispatch; an orchestrator acting on a step the guard refused executors.)
- B. Hold for a fixed release: CS-201 and CS-51 wait until hitld ships a guard that ignores hitld/ in branch names and paths and the owner moves the pin; this run does nothing meanwhile. (cost: The run idles; D-20 likely blocks too.)
- C. Owner runs the rename: The owner renames each branch by hand when an executor reports this, then the executor is followed up. (cost: An owner step on every dispatch.)

Recommended: Orchestrator renames. The rename is one the brief already orders and the merge queue needs; the guard's purpose (keeping executors off orchestrator commands) isn't served by refusing it, and the workaround touches nothing else.

If unanswered by 2026-11-18T17:00:00.000Z: Hold for a fixed release.

## Answer

Recorded in the front matter once answered.
