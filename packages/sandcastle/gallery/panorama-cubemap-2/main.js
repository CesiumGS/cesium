import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  skyBox: false,
});

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

const sky = new Cesium.CubeMapPanorama({
  sources: {
    positiveX: "../../SampleData/cubemap/1080px-positiveX.jpg",
    negativeX: "../../SampleData/cubemap/1080px-negativeX.jpg",
    positiveY: "../../SampleData/cubemap/1080px-positiveY.jpg",
    negativeY: "../../SampleData/cubemap/1080px-negativeY.jpg",
    positiveZ: "../../SampleData/cubemap/1080px-positiveZ.jpg",
    negativeZ: "../../SampleData/cubemap/1080px-negativeZ.jpg",
  },
});

viewer.scene.primitives.add(sky);

const pos = [11.569967, 104.923323];

const posObj = Cesium.Cartesian3.fromDegrees(pos[1], pos[0], 0);

setTransform(posObj);
