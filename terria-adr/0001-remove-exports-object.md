# 1. remove exports object from package.json in terriajs' fork of cesium

Date: 2020-08-05

## Status

Accepted

## Context

Cesium's `exports` object in `package.json` allows users of the "cesium" package to use Cesium as an ESM or CommonJS package.
However in TerriaJS we only import individual files from "terriajs-cesium". These imports would be broken by Cesium's current `exports`
object when webpack or TypeScript respects this (implemented in webpack v5 beta version https://github.com/webpack/webpack/issues/9509).

Also, and of more immediate concern, it also breaks our build process' method of finding the root directory of "terriajs-cesium" in Node v12.17.0+: 
```js
require.resolve("terriajs-cesium/package.json")
```

Discussion in https://github.com/nodejs/node/issues/33460 shows that there is no good replacement to requiring `package.json` for finding a 
package's root directory.

## Decision

Remove the `exports` object in "terriajs-cesium", and don't merge any future changes made to `exports` in upstream "cesium" into our package.
