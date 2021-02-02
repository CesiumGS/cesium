<p align="center">
<img src="https://github.com/CesiumGS/cesium/wiki/logos/Cesium_Logo_Color.jpg" width="50%" />
[Light]
</p>

> Why a "light" version? Cesium project has grown quite big. Including a complex build system, loads of clutter like IDE settings, strange casings, slow build system and many dependencies. This forks tries to improve these issues.

# Goal
Goal of this repository is to improve the cleaness of the Cesium project.
- Improve build speed
- Improve build size 
- Make the project more developer friendly

# Changes to Cesium project
- [x] Major improvements to build setup ( removed whole gulp pipeline )
- [x] Removed all IDE specific code
- [x] Converted documentation to Docsify
- [ ] Compiling of shaders ( https://www.npmjs.com/package/rollup-plugin-glslify )
- [ ] Add minified build script
- [ ] Add rollup watch modus script
- [ ] Removal of PascalCasing in url's ( http is case-insensitve )
- [ ] Cleaner widget system
- [ ] Make use of gh-pages
- [ ] Cleaner folder structure: /dist, /docs, /src, /examples

# Usage
TODO

# Examples
HelloWorld [ES6 source](/apps/helloworld-src.html ':ignore') or [build version](/apps/helloworld.html ':ignore')
# Commands

- **Build scripts** -- build and package the source code and documentation
  - `build` - Creates a js bundle at `/dist/cesium.js`
  - `serve` - Starts up a server in the root ( `browser-sync` )
  - `build:css` - Combines all the widget assets to `/dist/widgets.css`
  