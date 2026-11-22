# @cesium/frames

Cesium 2.0's reference frames: the frame catalog, Earth orientation, ephemerides, trajectories and the frames resolver.

It is one of Cesium 2.0's packages, which all release together at one version. Install it alone, or install the umbrella package to get every one of them.

```sh
npm install @cesium/frames
```

```js
import { createFrameCatalog } from "@cesium/frames";
```

The precise providers (Earth orientation parameters and ephemerides) load on demand, when an application asks for them.

Cesium 2.0 is in prerelease: its API can change from one release to the next until beta.1. What changed in each release is in [CHANGELOG.md](CHANGELOG.md).

## License

Apache 2.0. See [LICENSE.md](LICENSE.md).
