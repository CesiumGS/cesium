---
id: CS-775
title: "The Work page's older views retire: the Older views menu, the Dependencies view and the old Projects matrix go"
kind: work
state: planned
created: 2026-11-20
project: CS-389
needs: [CS-746, CS-748, CS-749]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/Dependencies.tsx, packages/next/bench/suite/views/dependencies.css, packages/next/bench/suite/views/Projects.tsx, packages/next/bench/suite/views/projects.css, packages/next/bench/suite/views/work.css, packages/next/bench/suite/workModel.ts, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md, packages/next/test/dynoDependencies.test.ts, packages/next/test/dynoProjects.test.ts, packages/next/test/dynoWork*.test.ts]
---

The owner, 2026-11-22: "you can get rid of the older views in the work tab." The Roadmap kept the old views behind one "Older views" menu (CS-744) until their replacements landed. They have now:

- the Dependencies view (`deps`, CS-694), with its waves grid and project matrix, is replaced by Path (CS-746);
- the old Projects view (`ProjectsView` and `ProjectMatrixView` in `Projects.tsx`) is replaced by Projects as bets (CS-748);
- the Plan view is already replaced by Order (CS-749).

This takes in what CS-775 first held, which was the waves grid alone, kept until the owner had tried Path. The owner's word covers the whole menu now.

Source: the owner, through the chief of staff, 2026-11-22. Why now: two views of one answer drift apart, and the menu is clutter. Rough size: small to medium, mostly deletion. Decider: the executor, within the touches above. Filed: 2026-11-20; widened 2026-11-22.

## Done when

- The Older views menu (`OlderViews` in `Work.tsx`), the two `place: "older"` view definitions, and the `older` group in `workModel.ts` are gone.
- `Dependencies.tsx` and `dependencies.css` are gone. So are the old `ProjectsView` and `ProjectMatrixView` in `Projects.tsx`, while `ProjectBetsView`, which `workProjects.tsx` mounts, stays.
- Their tests and CSS go too. Grep each class and export before it's removed, and keep anything a live view still uses.
- `DependenciesLink` in an item's drawer becomes a link to the Path view focused on that item.
- Old links land on a live view with a one-line note saying where the old one went:
  - `roadmap=deps` opens Path;
  - `roadmap=projects` keeps opening Projects as bets.
- `bench/suite/DESIGN.md` says the older views are retired and why. It drops their sections, including CS-693's old Projects section, which CS-787 also names.
- Run on a server of the executor's own, never the owner's 5190 or 5199. The owner checks it by clicking around: both themes, 380 px wide, keyboard only.
