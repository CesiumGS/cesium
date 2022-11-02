# @cesium/widgets

![Cesium](https://github.com/CesiumGS/cesium/wiki/logos/Cesium_Logo_Color.jpg)

[![Build Status](https://travis-ci.com/CesiumGS/cesium.svg?branch=main)](https://travis-ci.com/CesiumGS/cesium)
[![npm](https://img.shields.io/npm/v/cesium/widgets)](https://www.npmjs.com/package/@cesium/widgets)
[![Docs](https://img.shields.io/badge/docs-online-orange.svg)](https://cesium.com/learn/)

CesiumJS is a JavaScript library for creating 3D globes and 2D maps in a web browser without a plugin. It uses WebGL for hardware-accelerated graphics, and is cross-platform, cross-browser, and tuned for dynamic-data visualization.

[Examples](https://sandcastle.cesium.com/)
:earth_africa: [Docs](https://cesium.com/learn/cesiumjs-learn/) :earth_asia: [Website](https://cesium.com/cesiumjs) :earth_americas: [Forum](https://community.cesium.com/)

## Install

`@cesium/widgets` is published as ES modules with full typing support.

Install with npm

```sh
npm install @cesium/widgets --save
```

Or, install with yarn

```sh
yarn add @cesium/widgets
```

## Usage

```js
import * as CesiumWidgets from "@cesium/widgets";
import "@cesium/widgets/Source/widgets.css";

const viewer = new CesiumWidgets.Viewer("cesiumContainer");
```

Or, import individual modules to benefit from tree shaking optmtimizations through most build tools:

```js
import { Viewer } from "@cesium/widgets";
import "@cesium/widgets/Source/widgets.css";

const viewer = new Viewer("cesiumContainer");
```

See our [Quickstart Guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/) for more information on getting a Cesium app up and running.

## Community

Have questions? Ask them on the [community forum](https://community.cesium.com/).

Interested in contributing? See [CONTRIBUTING.md](../../CONTRIBUTING.md). :heart:

### License

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.html). CesiumJS is free for both commercial and non-commercial use.
