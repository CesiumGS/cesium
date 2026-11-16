---
id: CS-403
title: Dyno's navigation rail, regrouped by what people come to do
kind: work
state: done
created: 2026-11-13
project: CS-389
---

The rail regrouped by what people come to do, with a reserved first place for the tracker's Work page. Images beside Overview and Alerts. Machines moved into Overview. Examples in the looking group. The footer's Settings item. The redirect for `?tab=machines`. Shortcuts and the command palette updated. DESIGN.md's who-it-is-for list, information architecture, words and the shell's comment updated. Analysis keeps its name and place until CS-405 replaces it.

Reserves the first place in "Needs a look" for the Work board (CS-170), which needs this item.

## Done when

Every route in section 16's inventory is reachable from the rail, a run, a scene or the palette, and highlights the right rail item. Old links land on their new homes. The rail fits a 900 px tall window, collapsed and expanded. DESIGN.md's table matches `shell.tsx`. Owner review by clicking around.

## Files

`bench/suite/shell.tsx`, `routes.tsx`, `views/Analysis.tsx` (Machines out), `views/Overview.tsx` (Machines), `views/FirstRun.tsx` (links), `DESIGN.md`, the route and link tests

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.

Order note (2026-11-13): it needed CS-391 only because both edit `routes.tsx`. The owner asked to start the work UI first, so this item goes first and CS-391 rebases onto it.
