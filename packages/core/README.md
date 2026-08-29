# @cesium/core

[![Build Status](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml/badge.svg)](https://github.com/CesiumGS/cesium/actions/workflows/dev.yml)
[![npm](https://img.shields.io/npm/v/@cesium/core)](https://www.npmjs.com/package/@cesium/core)
[![Docs](https://img.shields.io/badge/docs-online-orange.svg)](https://cesium.com/learn/)

![Cesium](https://github.com/CesiumGS/cesium/wiki/logos/Cesium_Logo_Color.jpg)

[CesiumJS](../../README.md) is a JavaScript library for creating 3D globes and 2D maps in a web browser without a plugin.

`@cesium/core` provides the foundational math, geometry, and time utilities used by CesiumJS. It has no WebGL or browser dependencies and can run in any JavaScript environment. Here you will find Cartesian and matrix math, geodetic calculations, bounding volumes, geometric primitives, time standards, and general-purpose utilities.

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
import { Cartesian3, Matrix4 } from @cesium/core;

const position = new Cartesian3(1.0, 2.0, 3.0);
```

## Community

Have questions? Ask them on the [community forum](https://community.cesium.com/).
