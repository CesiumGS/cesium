# @cesium/core

Cesium 2.0's core: the WebGPU engine, worlds, views and the camera, the renderer and the GPU layer, streaming, the globe, queries, the transform graph, styling and Cesium IR.

It is one of Cesium 2.0's packages, which all release together at one version. Install it alone, or install the umbrella package to get every one of them.

```sh
npm install @cesium/core
```

```js
import { Engine } from "@cesium/core";
```

Every other package builds on it. An application that embeds the engine under its own services can install the core alone.

Cesium 2.0 is in prerelease: its API can change from one release to the next until beta.1. What changed in each release is in [CHANGELOG.md](CHANGELOG.md).

## License

Apache 2.0. See [LICENSE.md](LICENSE.md).
