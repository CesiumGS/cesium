import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.terrainProvider = false;

const googleStreetViewStaticApiKey = "key for Google Street View Static API";

function validateGoogleApiKey(key) {
  // Validate API key
  if (
    !Cesium.defined(googleStreetViewStaticApiKey) ||
    googleStreetViewStaticApiKey.trim() === "" ||
    googleStreetViewStaticApiKey === "key for Google Street View Static API"
  ) {
    throw new Cesium.DeveloperError(
      "A valid Google Street View Static API key must be provided.",
    );
  }
}

const cubeMapFromGoogle = (pos) => {
  validateGoogleApiKey(googleStreetViewStaticApiKey);
  const posString = pos.join(",");
  const posObj = Cesium.Cartesian3.fromDegrees(pos[1], pos[0], 0);

  const matrix4 = Cesium.Transforms.localFrameToFixedFrameGenerator(
    "north",
    "down",
  )(posObj, Cesium.Ellipsoid.default);

  const transform = Cesium.Matrix4.getMatrix3(matrix4, new Cesium.Matrix3());

  //Sample Google API URL
  //https://maps.googleapis.com/maps/api/streetview?
  //size=600x300&location=46.414382,10.013988&heading=151.7&pitch=-0.76&

  const baseUrl = "https://maps.googleapis.com/maps/api/streetview";
  function pUrl(h, p) {
    const r = new Cesium.Resource({
      url: baseUrl,
      queryParameters: {
        size: "600x600",
        location: posString,
        heading: h,
        pitch: p,
        key: googleStreetViewStaticApiKey,
      },
    });
    return r.url;
  }

  const positiveX = pUrl(90, 0);
  const negativeX = pUrl(270, 0);
  const positiveZ = pUrl(0, 0);
  const negativeZ = pUrl(180, 0);
  const positiveY = pUrl(0, -90);
  const negativeY = pUrl(0, 90);

  const cubeMapPanorama = new Cesium.CubeMapPanorama({
    sources: {
      positiveX,
      negativeX,
      positiveY,
      negativeY,
      positiveZ,
      negativeZ,
    },
    transform,
  });
  viewer.scene.camera.setView({
    destination: posObj,
    orientation: Cesium.HeadingPitchRoll.fromDegrees(0, 0, 0),
  });
  clearPrimitives();
  viewer.scene.primitives.add(cubeMapPanorama);
};

const clearPrimitives = () => {
  const primitives = viewer.scene.primitives;
  for (let i = primitives.length - 1; i >= 0; i--) {
    const primitive = primitives.get(i);
    const remove = primitive instanceof Cesium.CubeMapPanorama;
    if (remove) {
      primitives.remove(primitive);
    }
  }
};

const cubeMapFromFiles = () => {
  const pos = [11.569967, 104.923323];

  const posObj = Cesium.Cartesian3.fromDegrees(pos[1], pos[0], 0);

  const matrix4 = Cesium.Transforms.localFrameToFixedFrameGenerator(
    "north",
    "down",
  )(posObj, Cesium.Ellipsoid.default);

  const transform = Cesium.Matrix4.getMatrix3(matrix4, new Cesium.Matrix3());

  const cubeMapPanorama = new Cesium.CubeMapPanorama({
    sources: {
      positiveX: "../../SampleData/cubemap/1080px-positiveX.jpg",
      negativeX: "../../SampleData/cubemap/1080px-negativeX.jpg",
      positiveY: "../../SampleData/cubemap/1080px-positiveY.jpg",
      negativeY: "../../SampleData/cubemap/1080px-negativeY.jpg",
      positiveZ: "../../SampleData/cubemap/1080px-positiveZ.jpg",
      negativeZ: "../../SampleData/cubemap/1080px-negativeZ.jpg",
    },
    transform,
  });
  viewer.scene.camera.setView({
    destination: posObj,
    orientation: Cesium.HeadingPitchRoll.fromDegrees(0, 0, 0),
  });
  clearPrimitives();
  viewer.scene.primitives.add(cubeMapPanorama);
};

const locations = {
  Auckland: [-36.8509, 174.7645],
  Switzerland: [46.414382, 10.013988],
};
cubeMapFromFiles();

Sandcastle.addToolbarButton("Google Maps Auckland", function () {
  cubeMapFromGoogle(locations["Auckland"]);
});

Sandcastle.addToolbarButton("Google Maps Switzerland", function () {
  cubeMapFromGoogle(locations["Switzerland"]);
});

Sandcastle.addToolbarButton("Local Images Phnom Penh", function () {
  cubeMapFromFiles();
});
