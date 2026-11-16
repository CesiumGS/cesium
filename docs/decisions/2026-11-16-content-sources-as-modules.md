# Content sources as modules (owner, 2026-11-16)

**What this holds:** The owner's call that 2.0's module system loads content from many kinds of source through one seam, built now rather than when a second consumer appears. The work is tracked under CS-191 (Content sources and formats).

**The call.**

- The module system loads content from heterogeneous sources: 3D Tiles, MVT, Esri services, glTF files, USD and others. In the owner's words: "i want the overall module system to support loading from heterogenous sources (3d tiles, MVT, esri, gltf files, USD, etc.) so we should build those seams anyway".
- **The globe is one of those sources:** its terrain and imagery go behind the same seam, not with the 3D Tiles module. In the owner's words: "the globe is also probably one of those data sources".
- **Build the seams now.** Each kind of source becomes a module behind one content-source interface, and 3D Tiles moves behind it too, with a `@cesium/next/tiles` entry point.

**Why.** The number of kinds of source, not a measured bundle cost, is the reason for the seam. Waiting for a second consumer would build 3D Tiles' assumptions into everything that follows it.

**What it supersedes.** `docs/design/modular-renderer.md` proposed keeping one package "until a second consumer exists", separating by file first, and splitting only if a bundle-size measure showed a cost. The order changes: the seam comes first. Two parts of that proposal stay:

- The bundle measure (the check in `scripts/checkBundle.mjs`) is kept as the baseline the seam is checked against, not as a gate.
- Moving the styling language's compiler into a folder of its own, with 3D Tiles' bindings (`FeatureStyle`) in the tiles module, still holds.

**What stays open,** for the seam's design to settle or to raise as decisions: whether the renderer lets modules register their own passes, how the seam relates to scene items and "the globe as an item" (CS-454), and how ion's content-source interface (CS-269) fits it.
