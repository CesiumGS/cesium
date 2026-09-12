import * as Cesium from "cesium";

const contextOptions = new Cesium.SharedContext();
// const contextOptions = undefined;
// Uncomment the line above and comment out the one preceding it to illustrate how primitives cannot be shared between scenes by default.

const options = {
  contextOptions,
  fullscreenButton: false,
  sceneModePicker: false,
};

const view1 = new Cesium.Viewer("view3D", options);
const view2 = new Cesium.Viewer("view2D", options);

// Add the same entity to both viewers. Each viewer will create separate WebGL resources to draw it.
const greenCylinder = {
  name: "Green cylinder with black outline",
  position: Cesium.Cartesian3.fromDegrees(-100.0, 40.0, 200000.0),
  cylinder: {
    length: 400000.0,
    topRadius: 200000.0,
    bottomRadius: 200000.0,
    material: Cesium.Color.GREEN.withAlpha(0.5),
    outline: true,
    outlineColor: Cesium.Color.BLACK,
  },
};

view1.entities.add(greenCylinder);
view2.entities.add(greenCylinder);

// Add the same cylinder primitive to both viewers. Each will use the same WebGL resources to draw it.
const cylinder = new Cesium.CylinderGeometry({
  length: 400000.0,
  topRadius: 200000.0,
  bottomRadius: 200000.0,
});
const geometry = Cesium.CylinderGeometry.createGeometry(cylinder);
const primitive = new Cesium.Primitive({
  geometryInstances: new Cesium.GeometryInstance({
    geometry,
    modelMatrix: Cesium.Matrix4.multiplyByTranslation(
      Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(-95.59777, 40.03883),
      ),
      new Cesium.Cartesian3(0.0, 0.0, 500000.0),
      new Cesium.Matrix4(),
    ),
    id: "red cylinder",
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
    },
  }),
  appearance: new Cesium.PerInstanceColorAppearance(),
  asynchronous: false,
});

view1.scene.primitives.add(primitive);
view2.scene.primitives.add(primitive);

// Add the same tileset to both viewers. Each viewer will use the same WebGL resources to draw it.
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);
for (const view of [view1, view2]) {
  view.scene.primitives.add(tileset);
  view.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      0.5,
      -0.2,
      tileset.boundingSphere.radius * 4.0,
    ),
  );
}
