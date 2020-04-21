A [Rollup](https://rollupjs.org) plugin to strip [requirejs](https://requirejs.org/) build pragmas from your code.

## Installation

`npm install rollup-plugin-strip-pragma --save-dev`

## Usage

Given source code with a requirejs build pragma, such as:

```js
Cartesian3.fromSpherical = function(spherical, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object('spherical', spherical);
    //>>includeEnd('debug');
    ...
}
```

The following rollup usage will produce code with pragmas stripped.

```js
const rollup = require("rollup");
const rollupStripPragma = require("./rollup-plugin-strip-pragma");
const bundle = await rollup.rollup({
  input: "source.js",
  plugins: [
    rollupStripPragma({
      pragmas: ["debug"],
    }),
  ],
});
```
