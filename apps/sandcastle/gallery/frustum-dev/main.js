import * as Cesium from "cesium";

// Create the viewer.
const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

const positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(-105.0, 45.0, 20.0);

const enu = Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid);
const rotation = Cesium.Matrix4.getMatrix3(enu, new Cesium.Matrix3());
Cesium.Matrix3.multiply(
  rotation,
  Cesium.Matrix3.fromRotationX(-Cesium.Math.PI_OVER_TWO),
  rotation,
);
const orientation = Cesium.Quaternion.fromRotationMatrix(rotation);

const frustum = new Cesium.PerspectiveFrustum({
  fov: Cesium.Math.toRadians(60.0),
  aspectRatio: scene.canvas.clientWidth / scene.canvas.clientHeight,
  near: 10.0,
  far: 50.0,
});

const frustumGeometry = new Cesium.FrustumGeometry({
  frustum: frustum,
  origin: positionOnEllipsoid,
  orientation: orientation,
  vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
});

const frustumGeometryInstance = new Cesium.GeometryInstance({
  geometry: frustumGeometry,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
  },
  id: "frustum",
});

const frustumPrimitive = scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: frustumGeometryInstance,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      flat: true,
    }),
  }),
);
scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.FrustumOutlineGeometry({
        frustum: frustum,
        origin: positionOnEllipsoid,
        orientation: orientation,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(0.0, 0.0, 0.0, 1.0),
        ),
      },
    }),
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
    }),
  }),
);

const removeListener = scene.postRender.addEventListener(() => {
  if (!frustumPrimitive.ready) {
    return;
  }

  const bs =
    frustumPrimitive.getGeometryInstanceAttributes("frustum").boundingSphere;
  scene.camera.viewBoundingSphere(bs);
  scene.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

  removeListener();
});
