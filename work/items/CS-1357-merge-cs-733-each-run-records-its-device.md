---
id: CS-1357
title: Merge CS-733, each run records its device, configuration and state
kind: decision
state: planned
created: 2026-11-25
project: CS-389
decider: owner
---

## Question

Merge CS-733 into main? Every Dyno run records which device it ran on, its configuration and its state, with no host name, user name, serial, GPU UUID, MAC or IP address in any identity field, and enrollment through dyno device.

A run records device (ID, alias, hardware, hardware key, class), configuration (fields, configKey, seriesKey) and state beside CS-390's machine record, for suite, images, coldstart and Lab runs. dyno device enroll, show and list work; enroll refuses an alias that holds the host or user name; a power-source switch changes only state; reuse matches on reuseKey (device ID plus configKey) and the same power source; an old store loads unchanged and its legacy runs read under the device after enrollment, with no file changed. Privacy is the point of the item: a Sonnet review found 5 Importants (series keys that split on every macOS kernel build and merged Windows 10 and 11; the home path, so the user name, in output; a denylist test that couldn't fail on the likeliest fields; --fake writing a real enrollment; a legacy claim that ignored the run's alias), all fixed at the root in one round, and two short rounds closed the last of them: the run file's environment, including a typed Windows power-plan name, is now scrubbed where it is read and again when any run file is written, and the denylist test covers it. Series keys are built from named parts and tested on real macOS, Windows 10, Windows 11 and Debian strings; the denylist test builds hostile fixtures from the machine's real host and user names. Measured values and machine details stay in Dyno's store; nothing was measured (--fake only). Follow-ups filed: CS-1349 to CS-1352, plus two from the fix round; a call on whether reuseKey should include hardwareKey went to the chief of staff. Bench code only (@cesium/dyno, which the changeset config ignores; an empty changeset); the Dyno handbook tab says each run records its device, configuration and state. It touches bench/suite/commands/suite.mjs and schema.ts beside in-flight bench branches (CS-166, CS-1152, CS-1172, CS-577, CS-581), which still call the removed machineKey: the orchestrator checks each of those merges. No owner paths. Checked by the orchestrator on the replay 13e0e50cba (changed lines identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh. CS-734 to CS-740, toward CS-722, can then start.
- B. B. Hold it: Nothing merges; runs keep only the machine record, and CS-722's chain waits.

Recommended: A. Merge it. It meets the done-when, every privacy finding is fixed and tested, and it heads alpha.1's five-deep chain to CS-722.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
