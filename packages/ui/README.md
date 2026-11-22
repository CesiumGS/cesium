# @cesium/ui

Cesium 2.0's widgets and the Viewer composed from them, with the inspector and the credits, over an engine view.

It is one of Cesium 2.0's packages, which all release together at one version. Install it alone, or install the umbrella package to get every one of them.

```sh
npm install @cesium/ui
```

```js
import { Viewer } from "@cesium/ui";
```

It keeps the widgets out of the headless core, so an application that brings its own interface doesn't install them.

Cesium 2.0 is in prerelease: its API can change from one release to the next until beta.1. What changed in each release is in [CHANGELOG.md](CHANGELOG.md).

## License

Apache 2.0. See [LICENSE.md](LICENSE.md).
