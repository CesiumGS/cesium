import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.terrainProvider = false;

const googleStreetViewStaticApiKey = "key for Google Street View Static API";

const setTransform = (posObj) => {
  Cesium.Transforms.northDownEastToFixedFrame =
    Cesium.Transforms.localFrameToFixedFrameGenerator("north", "down");

  Cesium.Transforms.computeTemeToPseudoFixedMatrix = (time, result) =>
    Cesium.Matrix4.getMatrix3(
      Cesium.Transforms.northDownEastToFixedFrame(
        posObj,
        Cesium.Ellipsoid.default,
      ),
      result,
    );

  viewer.scene.camera.setView({
    destination: posObj,
    orientation: Cesium.HeadingPitchRoll.fromDegrees(0, 0, 0),
  });
};

const cubeMapFromGoogle = (pos) => {
  const posString = pos.join(",");
  const posObj = Cesium.Cartesian3.fromDegrees(pos[1], pos[0], 0);

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
  });
  setTransform(posObj);
  viewer.scene.skyBox = cubeMapPanorama;
};

const cubeMapFromFiles = () => {
  const pos = [11.569967, 104.923323];

  const posObj = Cesium.Cartesian3.fromDegrees(pos[1], pos[0], 0);

  const cubeMapPanorama = new Cesium.CubeMapPanorama({
    sources: {
      positiveX: "../../SampleData/cubemap/1080px-positiveX.jpg",
      negativeX: "../../SampleData/cubemap/1080px-negativeX.jpg",
      positiveY: "../../SampleData/cubemap/1080px-positiveY.jpg",
      negativeY: "../../SampleData/cubemap/1080px-negativeY.jpg",
      positiveZ: "../../SampleData/cubemap/1080px-positiveZ.jpg",
      negativeZ: "../../SampleData/cubemap/1080px-negativeZ.jpg",
    },
  });
  setTransform(posObj);
  viewer.scene.skyBox = cubeMapPanorama;
};

const locations = {
  Aukland: [-36.8509, 174.7645],
  Switzerland: [46.414382, 10.013988],
};
cubeMapFromFiles();

Sandcastle.addToolbarButton("Google Maps Aukland", function () {
  cubeMapFromGoogle(locations["Aukland"]);
});

Sandcastle.addToolbarButton("Google Maps Switzerland", function () {
  cubeMapFromGoogle(locations["Switzerland"]);
});

Sandcastle.addToolbarButton("Local Images Phnom Penh", function () {
  cubeMapFromFiles();
});
