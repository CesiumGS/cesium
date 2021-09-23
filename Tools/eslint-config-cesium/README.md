The official [shareable ESLint config](http://eslint.org/docs/developer-guide/shareable-configs) for the [Cesium](https://cesium.com/) ecosystem.

## Usage

---

We export three ESLint configurations.

### eslint-config-cesium

This config contains basic Cesium syntax and style config, from which `browser` and `node` extend. Extends `eslint:recommended` with additional rules.

### eslint-config-cesium/browser

For use in [`AMD`](http://requirejs.org/docs/whyamd.html) modules and browser code.

### eslint-config-cesium/node

For use in `node` packages.

---

To use any of these configs,

1. `npm install eslint-config-cesium --save-dev`

   If using the `browser` config: `npm install eslint-plugin-html --save-dev`

2. Add `"extends": "cesium"` to your `.eslintrc.*` files
