---
id: CS-681
title: Should 2.0 keep marking APIs experimental, and how?
kind: decision
state: planned
created: 2026-11-17
project: CS-437
decider: owner
---

## Question

1.x marks some features `@experimental` in its docs: they may change without its usual deprecation policy. 2.0 plans stability tiers as TSDoc tags (CS-434), and the release plan lets a module that arrives after beta.1 ship in an experimental tier without holding the API freeze. The owner, 2026-11-17: "we'll also need to think through how the api is marking things as experimental and whether that's a practice we want to continue." Does 2.0 keep an experimental marking, and what does it promise?

## Options and recommendation

Rewritten on 2026-11-21 from a survey of current practice, at the owner's request. The sources are listed below.

- A. Experimental packages, outside the umbrella: a module that isn't ready at beta.1 ships as its own scoped package in the experimental tier, and `cesium@2` doesn't depend on it, so a user has to add it by name. It may break in any release. `test/importBoundary.test.ts` keeps stable packages from importing it, and it graduates through an API review (CS-102). (cost: a tier per package in `scripts/surfaceMap.mjs`, a boundary rule, and a call on its version numbers, because lockstep gives it 2.x numbers that look stable.)
- B. A, plus member tags inside stable packages: where a capability can't be split out (GPU ray queries, say), its members carry `@experimental`. A surface check fails when a stable signature names an experimental type, which is API Extractor's `ae-incompatible-release-tags` rule rebuilt in `surfaceMap`. (cost: a small `surfaceMap` extension, plus a per-member contract that readers only see in hover text and docs.)
- C. An experimental subpath per package: `@cesium/<name>/experimental` holds the unstable symbols and re-exports the stable ones, as OpenTelemetry's semantic conventions `incubating` entry does. (cost: users rewrite their imports when something graduates, and each package gets two entries.)
- D. Drop it: everything published is stable at beta.1. Late modules stay unpublished, or on a prerelease dist-tag, until they pass review. (cost: panoramas, sensors and legacy glTF reach users later, and outside validation before rc.1 needs a prerelease channel instead.)

Recommended: B, applied to whole packages wherever possible. A package boundary is the strongest guard an npm library has, and the split into packages (CS-617) is happening anyway. Member tags alone protect little: TypeScript enforces nothing for `@experimental`, and users see it only in hover text. Add a written graduation gate. Use Node's stage names, where "release candidate" means no further breaks are expected. Graduate only through an API review, and review each experimental item at every minor release: graduate it, keep it with a reason on record, or remove it.

Two calls come with it:

- Version numbers. Either a paired 0.x line for experimental packages (OpenTelemetry pairs 2.0.x with 0.200.x), which costs release tooling and breaks lockstep for them. Or a React-style exemption in the versioning policy, which is cheap, but means `^2.1` can pull in a breaking change to an experimental package. Can't tell which is better; it's a matter of taste. It ties to CS-616 (the package names).
- The tag set. `@stable` isn't a TSDoc tag. TSDoc's `@experimental` is a synonym of `@beta`. API Extractor uses `@public`, `@beta`, `@alpha` and `@internal`. Keep the repository's own words (`stable`, `experimental`, `internal`), or align with TSDoc and API Extractor so outside tools read them.

What the survey found goes wrong elsewhere:

- People depend on experimental APIs anyway. Apple's own Swift packages used underscored attributes, and Babel removed its stage presets because users didn't know what they relied on.
- Things stay experimental forever: TypeScript's `--experimentalDecorators`, Node's `vm.SourceTextModule` since v9.6.0.
- Graduating by renaming breaks users, as Babel's `-proposal-` plugins and Next.js's `unstable_` and `experimental` keys show.

### Sources (read 2026-11-21)

- TSDoc `@experimental`: tsdoc.org/pages/tags/experimental
- API Extractor rollups and release tags: api-extractor.com/pages/setup/configure_rollup
- React versioning policy: react.dev/community/versioning-policy
- Next.js 16 upgrade guide: nextjs.org/docs/app/guides/upgrading/version-16
- OpenTelemetry JS releasing and semantic conventions: github.com/open-telemetry/opentelemetry-js (doc/contributing/releasing.md; semantic-conventions/README.md)
- Semantic Versioning, 0.x: semver.org
- Kotlin opt-in requirements: kotlinlang.org/docs/opt-in-requirements.html
- Rust stability: rustc-dev-guide.rust-lang.org/stability.html
- Java preview features: docs.oracle.com/en/java/javase/21/language/preview-language-and-vm-features.html
- Node stability index: nodejs.org/api/documentation.html
- Chrome origin trials explainer: github.com/GoogleChrome/OriginTrials (explainer.md)
- Babel stage presets: babeljs.io/blog/2018/07/27/removing-babels-stage-presets
- TypeScript 5.0 decorators: devblogs.microsoft.com/typescript/announcing-typescript-5-0

## Answer

Open.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
