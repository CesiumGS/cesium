# 3D Tiles Performance Testing Guide

**Note**: This is the beginning of a guide for various tests of 3D Tiles
performance.

## Testing Load Time

This section is for measuring how long it takes a tileset and the initial view
of tiles takes to load.

The subsections below will explain the process for setting up a Sandcastle for
performance testing, as in this [Helsinki Example](http://localhost:8080/Build/Apps/Sandcastle/index.html#c=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).

(Helsinki data provided by Aalto University with support from City of Helsinki
https://zenodo.org/record/5578198#.YjoTWBNKiu4)

### Pick a fixed camera view

For reproducibility, it is best to fix the camera in one spot so the same tiles
load each time.

The code from [this Sandcastle](https://sandcastle.cesium.com/#c=fVNNi9swEP0rgynYgSC39NbEoSUUeljo0oWefFhFnmxEZClIY2ezi/97R3K+drP0ZM2892ZGb+Reeug17tFDBRb3sMSgu1b8TbkiVylcOktSW/T5ZFbbnjVBoUWWjFqRQoZGUEn+hAs6xgyPBxGQfhB5veoIi5zkStsGn/Mp5J+5AZQl3HcEa6e6AM4CbfBY8lzBWWW02nKLdWcVaWeLCbzWFuDIFEldxHGHNNeJx/iOOo9L2aKXD0ik7VMoxkmPNZSzgZgYGde3iPHsPWHpmmjE47UTR268aDSySFUbDNxLxiG+XVu9lJ74JO3X4tPrUbhzQUeieB6mcJs9fJh9GSbT2Mh5jbyvm0a/UDZ82XtNavPHGXNptxmRN1Uj6zrhWZEaDJPZ49kFZ1AY91RcvEiWR8cb3kDLgwjZND97PtzpQGwOv6otHhq3t7zx81oKPC1QrzkQTIGqqiBX+QmA/+8uzQRDGjCbZvNAB4OLUfldtzvnCTpvCiFKwnZnJLterjq1RRIqhKiflyfRvNE96Kaqs3d/QJ2BMjIERtadMQ/6BetsMS+Z/0ZmXLL0d4/eyEOkbL4s7sakEGJecnirIufMSvqriv8A) can be helpful to capture
the camera parameters and print them to the console.

Load the tileset as you would normally, then manually adjust the camera to get
a detailed view of the tileset. The goal is to load many tiles so differences
in performance are more pronounced.

![Camera View](camera-view.png)

Once your view is configured, capture the parameters with the `c` key on the
keyboard, which will result in a JS code snippet with the camera position baked
in like this:

```js
viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    2881774.230386411,
    1342620.6006856258,
    5510835.220814708
  ),
  orientation: new Cesium.HeadingPitchRoll(
    5.708910165980631,
    -0.2293856922649915,
    2.875174018868165e-7
  ),
});
```

Add the code to your final Sandcastle for performance testing.

### Avoid extraneous requests

When creating the `Viewer`, turn off the globe and sky box, to avoid extra
network requests that may impact the load time of your tileset.

```js
const viewer = Cesium.Viewer("cesiumContainer", {
  globe: false,
  skybox: false,
});
```

### Load more detailed tiles

By default, Cesium sets the `maximumScreenSpaceError` threshold to 16 px. If
the visible tile's screen space error goes above this threshold, tiles with more
detail will be loaded.

For performance testing, we want a reasonably detailed scene without hitting
out-of-memory problems or the test taking a long time. Decrease
`maximumScreenSpaceError` to as needed. For example:

```js
tileset.maximumScreenSpaceError = 4;
```

### How to measure elapsed time

In the browser, measuring elapsed time is quite simple using `performance.now()`:

```js
const start = performance.now();
expensiveOperation();
const end = performance.now();
const differenceSeconds = (end - start) / 1000.0;
console.log(`difference: ${differenceSeconds} sec`);
```

However, if you want to time multiple things, you might want to make yourself
a small helper class. Here's an example:

```js
// Helper class for measuring elapsed time.
class Timer {
  constructor(label) {
    this.label = label;
    this.startTime = undefined;
    this.endTime = undefined;
  }

  start() {
    this.startTime = performance.now();
  }

  stop() {
    this.endTime = performance.now();
  }

  print() {
    const difference_sec = (this.endTime - this.startTime) / 1000.0;
    console.log(`${this.label}: ${difference_sec} sec`);
  }
}
```

### How to measure tileset load time

To time how long it takes for the tileset.json to be fetched and the
`Cesium3DTileset` to be initialized (not including the tile content), start
the timer just before creating the tileset, and stop it in the `readyPromise`

```js
tilesetTimer.start();
const tileset = new Cesium.Cesium3DTileset({
  url,
});
tileset.maximumScreenSpaceError = 4;
// and any other initialization code

viewer.scene.primitives.add(tileset);

tileset.readyPromise.then(() => {
  tilesetTimer.stop();
  tilesetTimer.print();
});
```

### How to measure tile load time

To time how long it takes for all the tiles in the current camera view to load
(not including the tileset load time), start the timer in the ready promise
and stop it in the `initialTilesLoaded` event handler. This event is used
because we only care about our initial fixed camera view. `allTilesLoaded`, in
contrast, may trigger multiple times if the camera moves, which is undesireable
here.

```js
tileset.readyPromise.then(() => {
  tileTimer.start();
});

// This callback is fired the first time that all the visible tiles are loaded.
// It indicates the end of the test.
tileset.initialTilesLoaded.addEventListener(() => {
  tileTimer.stop();
  tileTimer.print();
});
```

### Configure a static server

Since CesiumJS' development server (`npm run start`) does not enable caching,
you will need a static server to load your tiles. The server must:

1. Enable caching. Using the browser cache will eliminate noise from network
   latency.
2. Enable CORS. Ideally we would want to avoid a CORS check by hosting the data
   on the same domain as the CesiumJS server, but again

A example using the `npm` module `http-server` might look like this:

```bash
# Host the current directory at http://localhost:8003
# http-server defaults to caching with max-age of 1 hour
http-server -p 8003 --cors
```

To ensure that your server is configured correctly, check your browser cache
settings. For Chrome, in the Network tab, make sure `Disable cache` is NOT
checked.

![Uncheck disable cache](no-disable-cache.png)

Furthermore, if you load the tileset, all the tiles should show up as
`(disk cache)` for the `Size` column:

![Disk Cache](disk-cache.png)

### Running the Test

When running the test, there are a few additional considerations:

1. Use the built version of Sandcastle to remove debug pragmas, combine JS
   files, and minify the results. This way, results reflect how users will
   be running Cesium.

```
# first time only: make a release build of CesiumJS
npm run release

# build Sandcastle and other apps
npm run buildApps
```

2. Close DevTools, so your browser isn't spending time checking breakpoints,
   tracking network usage, etc.
3. Warm up the cache. Run the Sandcastle once or twice and make sure all the
   tiles are loaded
4. Do not adjust the camera or window size, so each run is consistent. Due to
   screen space error calculations, changing the window dimensions may cause
   different levels of detail to load.
5. Run the Sandcastle again to check the results. It may be desireable to
   run it multiple times and average the results.
