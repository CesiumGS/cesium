# @cesium/crs

Cesium 2.0's coordinate reference systems: CRS definitions and WKT2, georeferencing, engineering frames, placement and snapping, with PROJ.

It is one of Cesium 2.0's packages, which all release together at one version. Install it alone, or install the umbrella package to get every one of them.

```sh
npm install @cesium/crs
```

```js
import { readGeoreference } from "@cesium/crs";
```

Coordinate operations go through PROJ, compiled to WebAssembly.

Cesium 2.0 is in prerelease: its API can change from one release to the next until beta.1. What changed in each release is in [CHANGELOG.md](CHANGELOG.md).

## License

Apache 2.0. See [LICENSE.md](LICENSE.md).
