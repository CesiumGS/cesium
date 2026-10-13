# @cesium/core

[![Build Status](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml/badge.svg)](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml)
[![npm](https://img.shields.io/npm/v/@cesium/core)](https://www.npmjs.com/package/@cesium/core)
[![Docs](https://img.shields.io/badge/docs-online-orange.svg)](https://cesium.com/learn/)

![Cesium](https://github.com/CesiumGS/cesium/wiki/logos/Cesium_Logo_Color.jpg)

[CesiumJS](../../README.md) is a JavaScript library for creating 3D globes and 2D maps in a web browser without a plugin.

`@cesium/core` contains CesiumJS's math, geometry, and time primitives, along with utility and error types, with no dependency on rendering, data-source, or widget code.

---

[**Examples**](https://sandcastle.cesium.com/) :earth_asia: [**Docs**](https://cesium.com/learn/cesiumjs-learn/) :earth_americas: [**Website**](https://cesium.com/cesiumjs) :earth_africa: [**Forum**](https://community.cesium.com/) :earth_asia: [**User Stories**](https://cesium.com/user-stories/)

---

## Install

`@cesium/core` is published as ES modules with full typing support.

Install with npm:

```sh
npm install @cesium/core --save
```

Or, install with yarn:

```sh
yarn add @cesium/core
```

## Usage

Import individual modules to benefit from tree shaking optimizations through most build tools:

```js
import { Cartesian3 } from "@cesium/core";

const position = new Cartesian3(1.0, 2.0, 3.0);
```

See our [Quickstart Guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/) for more information on getting a CesiumJS app up and running.

## Community

Have questions? Ask them on the [community forum](https://community.cesium.com/).

Interested in contributing? See [CONTRIBUTING.md](../../CONTRIBUTING.md). :heart:

## License

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.html). CesiumJS is free for both commercial and non-commercial use.
