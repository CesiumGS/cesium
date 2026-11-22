# @cesium/time

Cesium 2.0's time library: instants and time scales, leap seconds, the clock, the Sun and the Moon from analytic models, formatting, and TDB from TT.

It is one of Cesium 2.0's packages, which all release together at one version. Install it alone, or install the umbrella package to get every one of them.

```sh
npm install @cesium/time
```

```js
import { Clock } from "@cesium/time";
```

It needs no frames data, so a page with a clock and no precise reference frames pays for nothing more.

Cesium 2.0 is in prerelease: its API can change from one release to the next until beta.1. What changed in each release is in [CHANGELOG.md](CHANGELOG.md).

## License

Apache 2.0. See [LICENSE.md](LICENSE.md).
