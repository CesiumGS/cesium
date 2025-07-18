import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const width = 32;
const height = 32;

const noiseTerrainProvider = new Cesium.CustomHeightmapTerrainProvider({
  width: width,
  height: height,
  callback: function (x, y, level) {
    function fract(x) {
      return x - Math.floor(x);
    }
    function smoothstep(x) {
      return x * x * (3.0 - 2.0 * x);
    }
    function hash(x, y) {
      const a = 50.0 * fract(x * 0.3183099 + 0.71);
      const b = 50.0 * fract(y * 0.3183099 + 0.113);
      const v = fract(a * b * (a + b));
      return -1.0 + 2.0 * v; // -1 to +1
    }
    function lerp(x, y, t) {
      return x * (1.0 - t) + y * t;
    }
    function noise(x, y) {
      // Value noise: lerp between random values
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = fract(x);
      const fy = fract(y);
      const tx = smoothstep(fx);
      const ty = smoothstep(fy);
      const v00 = hash(ix, iy);
      const v10 = hash(ix + 1, iy);
      const v01 = hash(ix, iy + 1);
      const v11 = hash(ix + 1, iy + 1);
      const v = lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
      return v; // -1 to +1
    }
    function fbm(x, y) {
      // Fractal brownian motion: accumulate octaves of self-similar noise
      let v = 0.5 * noise(x * 1.0, y * 1.0);
      v += 0.25 * noise(x * 0.4, y * 2.8);
      v += 0.125 * noise(x * -2.72, y * 4.96);
      v += 0.0625 * noise(x * -10.3, y * 4.67);
      v += 0.03125 * noise(x * -22.09, y * -4.89);
      v += 0.015625 * noise(x * -29.48, y * -34.33);
      // v += 0.0078125 * noise(x * -5.97, y * -90.31);
      // v += 0.00390625 * noise(x * 98.83, y * -151.66);
      return v; // -1 to +1
    }
    function terrainNoise(x, y) {
      let v = fbm(x, y);
      // Move to 0 to 1 range, then make it pointier
      v = Math.pow(v * 0.5 + 0.5, 2.0);
      return v;
    }

    const buffer = new Float32Array(width * height);

    for (let yy = 0; yy < height; yy++) {
      for (let xx = 0; xx < width; xx++) {
        const u = (x + xx / (width - 1)) / Math.pow(2, level);
        const v = (y + yy / (height - 1)) / Math.pow(2, level);

        const heightValue = 9000 * terrainNoise(u * 1750 - 10, v * 1500);

        const index = yy * width + xx;
        buffer[index] = heightValue;
      }
    }

    return buffer;
  },
});

const sineTerrainProvider = new Cesium.CustomHeightmapTerrainProvider({
  width: width,
  height: height,
  callback: function (x, y, level) {
    const buffer = new Float32Array(width * height);

    for (let yy = 0; yy < height; yy++) {
      for (let xx = 0; xx < width; xx++) {
        /* eslint-disable-next-line no-unused-vars */
        const u = (x + xx / (width - 1)) / Math.pow(2, level);
        const v = (y + yy / (height - 1)) / Math.pow(2, level);

        const heightValue = 4000 * (Math.sin(8000 * v) * 0.5 + 0.5);

        const index = yy * width + xx;
        buffer[index] = heightValue;
      }
    }

    return buffer;
  },
});

const viewer = new Cesium.Viewer("cesiumContainer");

Sandcastle.addDefaultToolbarMenu([
  {
    text: "Noise",
    onselect: function () {
      viewer.terrainProvider = noiseTerrainProvider;
    },
  },
  {
    text: "Sine",
    onselect: function () {
      viewer.terrainProvider = sineTerrainProvider;
    },
  },
]);

viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    339907.1874329616,
    5654554.279066735,
    2936259.008266917,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    5.473742192009368,
    -0.2225518333236931,
    6.28274245960864,
  ),
});
