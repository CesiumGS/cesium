# CesiumJS

[![Build Status](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml/badge.svg)](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml)
[![npm](https://img.shields.io/npm/v/cesium)](https://www.npmjs.com/package/cesium)
[![Docs](https://img.shields.io/badge/docs-online-orange.svg)](https://cesium.com/learn/)

![Cesium](https://github.com/CesiumGS/cesium/wiki/logos/Cesium_Logo_Color.jpg)

CesiumJS is a JavaScript library for creating 3D globes and 2D maps in a web browser without a plugin. It uses WebGL for hardware-accelerated graphics, and is cross-platform, cross-browser, and tuned for dynamic-data visualization.

Built on open formats, CesiumJS is designed for robust interoperability and scaling for massive datasets.

---

[**Examples**](https://sandcastle.cesium.com/) :earth_asia: [**Docs**](https://cesium.com/learn/cesiumjs-learn/) :earth_americas: [**Website**](https://cesium.com/cesiumjs) :earth_africa: [**Forum**](https://community.cesium.com/) :earth_asia: [**User Stories**](https://cesium.com/user-stories/)

---

## :rocket: Get started

Visit the [Downloads page](https://cesium.com/downloads/) to download a pre-built copy of CesiumJS.

### npm & yarn

If you’re building your application using a module bundler such as Webpack, Parcel, or Rollup, you can install CesiumJS via the [`cesium` npm package](https://www.npmjs.com/package/cesium):

```sh
npm install cesium --save
```

Then, import CesiumJS in your app code. Import individual modules to benefit from tree shaking optimizations through most build tools:

```js
import { Viewer } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const viewer = new Viewer("cesiumContainer");
```

In addition to the `cesium` package, CesiumJS is also [distributed as scoped npm packages for better dependency management](https://cesium.com/blog/2022/12/07/modular-structure-in-cesiumjs/):

- [`@cesium/engine`](./packages/engine/README.md) - CesiumJS's core, rendering, and data APIs
- [`@cesium/widgets`](./packages/widgets/README.md) - A widgets library for use with CesiumJS

### What next?

See our [Quickstart Guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/) for more information on getting a CesiumJS app up and running.

Instructions for serving local data are in the CesiumJS
[Offline Guide](./Documentation/OfflineGuide/README.md).

Interested in contributing? See [CONTRIBUTING.md](CONTRIBUTING.md). :heart:

## :green_book: License

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.html). CesiumJS is free for both commercial and non-commercial use.

## :earth_americas: Where does the Global 3D Content come from?

The Cesium platform follows an [open-core business model](https://cesium.com/why-cesium/open-ecosystem/cesium-business-model/) with open source runtime engines such as CesiumJS and optional commercial subscription to Cesium ion.

CesiumJS can stream [3D content such as terrain, imagery, and 3D Tiles from the commercial Cesium ion platform](https://cesium.com/platform/cesium-ion/content/) alongside open standards from other offline or online services. We provide Cesium ion as the quickest option for all users to get up and running, but you are free to use any combination of content sources with CesiumJS that you please.

Bring your own data for tiling, hosting, and streaming from Cesium ion. [Using Cesium ion](https://cesium.com/ion/signup/) helps support CesiumJS development.

## :white_check_mark: Features

- Stream in 3D Tiles and other standard formats from Cesium ion or another source
- Visualize and analyze on a high-precision WGS84 globe
- Share with users on desktop or mobile

See more in the [CesiumJS Features Checklist](https://github.com/CesiumGS/cesium/wiki/CesiumJS-Features-Checklist).
