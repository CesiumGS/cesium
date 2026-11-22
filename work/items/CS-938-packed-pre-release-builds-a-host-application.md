---
id: CS-938
title: Packed pre-release builds a host application can install, at a named commit
kind: work
state: done
created: 2026-11-22
project: CS-609
needs: [CS-612]
claimed_by: orch-11-CS-938
---

> **Committed by the owner (2026-11-22):** a host application outside this repository installs pre-release 2.0 from packed tarballs. Source: a host integration's needs, through the chief of staff. Size: small. It builds on CS-612's `npm pack` checks.

## Done when

- One command, run in any 2.0 checkout or worktree, packs every published package at the checked-out commit: `npm pack` of each, after `npm run build` and the packed checks.
- It writes the tarballs to a folder outside the checkout, by default `~/.cesium-bench/packs/<commit>/`, with a manifest beside them: the commit, each package's name and version, and each tarball's file name and integrity hash.
- It refuses a dirty tree, so a set always matches a named commit.
- A host copies the tarballs into its own git-ignored folder and installs them by `file:` path, so its lockfile pins each integrity. Nothing in this repository depends on any host, and the command never writes outside its output folder.
- A test packs a set, installs it into a temporary project outside the checkout, and imports each entry point.
- The command and its output folder are documented for hosts. Asking for a fresh set when 2.0 moves means running the command at the new commit.
