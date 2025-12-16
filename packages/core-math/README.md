# @cesium/core-math

Core mathematical primitives for CesiumJS.

## Overview

This package contains the foundational mathematical classes used throughout CesiumJS:

- **Cartesian2** - A 2D Cartesian point
- **Cartesian3** - A 3D Cartesian point
- **Cartesian4** - A 4D Cartesian point
- **Matrix2** - A 2x2 matrix
- **Matrix3** - A 3x3 matrix
- **Matrix4** - A 4x4 matrix
- **CesiumMath** - Mathematical constants and functions

## Installation

```bash
npm install @cesium/core-math
```

## Usage

```javascript
import { Cartesian3, Matrix4, CesiumMath } from "@cesium/core-math";

// Create a 3D point
const point = new Cartesian3(1.0, 2.0, 3.0);

// Use math utilities
const radians = CesiumMath.toRadians(45.0);

// Create a transformation matrix
const matrix = Matrix4.fromTranslation(point);
```

## Part of Project Buildology

This package is part of the CesiumJS Modernization effort (Track 1: Leaf Node Strategy). It extracts foundational math classes into an isolated package to enable:

1. Strict TypeScript enforcement
2. ES6 class syntax modernization
3. Independent versioning and testing

## License

Apache 2.0. See [LICENSE.md](./LICENSE.md) for details.
