---
id: CS-1249
title: Merge CS-202, a view on another body
kind: decision
state: planned
created: 2026-11-24
project: CS-188
decider: owner
---

## Question

Merge CS-202 into main? A view on another body (frames 5c, Task 3) now shades in that body's own axes: its sun, stars, Moon, shadows and selection casters are turned there, while Earth views keep every float they had.

A new viewSkyInputs gives each view its sky inputs. For a view whose body anchor isn't the Earth's, it turns the sun direction, the star rotation and the Moon's position and axes into the body anchor's axes, in float64, through the two anchors' placements. For an Earth view it returns the engine's own arrays, so Earth views are identical by construction. Shadows, selection casters and the light list follow the turned sun. A view on an airless body draws no sky, throws nothing, and its light list's sun has the outside-air illuminance until 5e. Departures from the plan, because the code moved since it was written: the view block, environment and shadows live in render/view/, and Sky.write already took per-view inputs, so Engine.ts and Sky.ts are unchanged. An Opus review found no Important. It checked the transform's direction, every reader of the engine's sun, star and Moon inputs, Earth-view identity, that no two views share state, and the light list's illuminance. Lab sky, atmosphere and parity, base against branch: every image metric the same, only two GPU timings differ. Those suites render Earth views only; the browser checks for a Moon view come with Tasks 4 and 10. Minors for later tasks: earthshine assumes the Earth's distance (fine until a third body with air), and the selection-caster change and a world with no Moon anchor are untested. No owner paths. Checked by the orchestrator on the replay 0f21cd5d53 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. Plan 5c's next tasks can build on it.
- B. B. Hold it: Nothing merges; views on other bodies keep the Earth's sun and stars.

Recommended: A. Merge it. It meets Task 3's done-when, Earth views are unchanged by construction and in the Lab, and the review found nothing Important.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
