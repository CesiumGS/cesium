import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

function addBillboardAndPrimitive() {
  Sandcastle.declare(addBillboardAndPrimitive);

  const billboards = scene.primitives.add(new Cesium.BillboardCollection());
  billboards.add({
    image: "../images/facility.gif",
    position: Cesium.Cartesian3.fromDegrees(-77, 40.5),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(5.5e6),
  });

  scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(-80.5, 39.7, -75.1, 42.0),
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            new Cesium.Color(1.0, 0.0, 0.0, 0.5),
          ),
          distanceDisplayCondition:
            new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(
              0.0,
              5.5e6,
            ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        closed: true,
      }),
    }),
  );
}

async function addPointAndModel() {
  Sandcastle.declare(addPointAndModel);

  const position = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);

  const pointPrimitives = scene.primitives.add(
    new Cesium.PointPrimitiveCollection(),
  );
  pointPrimitives.add({
    color: Cesium.Color.YELLOW,
    position: position,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(250.5),
  });

  try {
    scene.primitives.add(
      await Cesium.Model.fromGltfAsync({
        url: "../../SampleData/models/GroundVehicle/GroundVehicle.glb",
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
          0.0,
          250.5,
        ),
      }),
    );
  } catch (error) {
    window.alert(error);
  }
}

Sandcastle.addToolbarMenu([
  {
    text: "Billboard and Primitive",
    onselect: function () {
      addBillboardAndPrimitive();
      Sandcastle.highlight(addBillboardAndPrimitive);
    },
  },
  {
    text: "Point and Model",
    onselect: function () {
      addPointAndModel();
      Sandcastle.highlight(addPointAndModel);
    },
  },
]);

Sandcastle.reset = function () {
  viewer.camera.flyHome(0);
  scene.primitives.removeAll();
};
