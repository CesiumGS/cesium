# Description

Updating outdated npm packages prior to the CesiumJS `<version>` release, per the [release guide](https://github.com/CesiumGS/cesium/tree/main/Documentation/Contributors/ReleaseGuide).

<!-- One row per package, per workspace. Paste from `npm outdated` run before making changes. Status is `updated`, `held back <link>`, or `pinned <link>`. -->

| Status                                                   | Package    | Current | Wanted | Latest | Location                               | Depended by                               |
| -------------------------------------------------------- | ---------- | ------: | -----: | -----: | -------------------------------------- | ----------------------------------------- |
| updated                                                  | `prettier` |   3.9.6 |  3.9.6 |  3.9.9 | node_modules/prettier                  | `cesium`                                  |
| held back https://github.com/CesiumGS/cesium/issues/NNNN | `jsdoc`    |  3.6.11 | 3.6.11 |  4.0.5 | node_modules/jsdoc                     | `cesium`                                  |
| pinned https://github.com/CesiumGS/cesium/issues/NNNN    | `earcut`   |   3.0.2 |  3.0.2 |  3.2.3 | node_modules/earcut                    | `engine@npm:@cesium/engine@26.4.0`        |
| updated                                                  | `react`    |  19.2.7 | 19.2.8 | 19.2.8 | packages/sandcastle/node_modules/react | `sandcastle@npm:@cesium/sandcastle@0.5.1` |

## Major version bumps

<!-- One entry per package marked `updated` with a major bump. Remove this section if there are none. For 0.x.y packages, 0.(x+1).0 counts as major. -->

- `<package>` `<old>` -> `<new>`: [changelog](link)
  - Why it is safe:
  - Code changes needed (and where):
  - Impact on downstream consumers (none, or what changes in the public API, bundle, or peer dependencies):
