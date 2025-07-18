import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.extend(Cesium.viewerCesiumInspectorMixin);
const scene = viewer.scene;
const ellipsoid = scene.globe.ellipsoid;

const id1 = "1";
const id2 = "2";
const id3 = "3";

const center1 = Cesium.Cartesian3.fromDegrees(-110, 30);
let offset = Cesium.Cartesian3.multiplyByScalar(
  ellipsoid.geodeticSurfaceNormal(center1),
  100000,
  new Cesium.Cartesian3(),
);
const dimensions = new Cesium.Cartesian3(400000.0, 300000.0, 500000.0);
const boxModelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(center1),
  new Cesium.Cartesian3(0.0, 0.0, dimensions.z * 0.5),
  new Cesium.Matrix4(),
);

const i1 = new Cesium.GeometryInstance({
  id: id1,
  geometry: Cesium.BoxGeometry.fromDimensions({
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    dimensions: dimensions,
    offsetAttribute: Cesium.GeometryOffsetAttribute.ALL,
  }),
  modelMatrix: boxModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
    offset: Cesium.OffsetGeometryInstanceAttribute.fromCartesian3(offset),
  },
});

const o1 = new Cesium.GeometryInstance({
  id: id1,
  geometry: Cesium.BoxOutlineGeometry.fromDimensions({
    dimensions: dimensions,
    offsetAttribute: Cesium.GeometryOffsetAttribute.ALL,
  }),
  modelMatrix: boxModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
    offset: Cesium.OffsetGeometryInstanceAttribute.fromCartesian3(offset),
  },
});

const center2 = Cesium.Cartesian3.fromDegrees(-100, 30);
offset = Cesium.Cartesian3.multiplyByScalar(
  ellipsoid.geodeticSurfaceNormal(center2),
  100000,
  new Cesium.Cartesian3(),
);
const length = 400000.0;
const topRad = 200000.0;
const bottomRad = 200000.0;
const cylinderModelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(center2),
  new Cesium.Cartesian3(0.0, 0.0, length * 0.5),
  new Cesium.Matrix4(),
);

const i2 = new Cesium.GeometryInstance({
  id: id2,
  geometry: new Cesium.CylinderGeometry({
    length: length,
    topRadius: topRad,
    bottomRadius: bottomRad,
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    offsetAttribute: Cesium.GeometryOffsetAttribute.ALL,
  }),
  modelMatrix: cylinderModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
    offset: Cesium.OffsetGeometryInstanceAttribute.fromCartesian3(offset),
  },
});

const o2 = new Cesium.GeometryInstance({
  id: id2,
  geometry: new Cesium.CylinderOutlineGeometry({
    length: length,
    topRadius: topRad,
    bottomRadius: bottomRad,
    numberOfVerticalLines: 16,
    offsetAttribute: Cesium.GeometryOffsetAttribute.ALL,
  }),
  modelMatrix: cylinderModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
    offset: Cesium.OffsetGeometryInstanceAttribute.fromCartesian3(offset),
  },
});

const center3 = Cesium.Cartesian3.fromDegrees(-90, 30);
offset = Cesium.Cartesian3.multiplyByScalar(
  ellipsoid.geodeticSurfaceNormal(center3),
  100000,
  new Cesium.Cartesian3(),
);
const radii = new Cesium.Cartesian3(200000.0, 200000.0, 300000.0);
const ellipsoidModelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(center3),
  new Cesium.Cartesian3(0.0, 0.0, radii.z),
  new Cesium.Matrix4(),
);
const i3 = new Cesium.GeometryInstance({
  id: id3,
  geometry: new Cesium.EllipsoidGeometry({
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    radii: radii,
    offsetAttribute: Cesium.GeometryOffsetAttribute.ALL,
  }),
  modelMatrix: ellipsoidModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      new Cesium.Color(1.0, 0.0, 0.0, 0.5),
    ),
    offset: Cesium.OffsetGeometryInstanceAttribute.fromCartesian3(offset),
  },
});
const o3 = new Cesium.GeometryInstance({
  id: id3,
  geometry: new Cesium.EllipsoidOutlineGeometry({
    radii: radii,
    stackPartitions: 16,
    slicePartitions: 8,
    offsetAttribute: Cesium.GeometryOffsetAttribute.ALL,
  }),
  modelMatrix: ellipsoidModelMatrix,
  attributes: {
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
    offset: Cesium.OffsetGeometryInstanceAttribute.fromCartesian3(offset),
  },
});

const p = scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [i1, i2, i3],
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
    }),
    asynchronous: false,
  }),
);
const o = scene.primitives.add(
  new Cesium.Primitive({
    geometryInstances: [o1, o2, o3],
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      renderState: {
        lineWidth: Math.min(2.0, scene.maximumAliasedLineWidth),
      },
    }),
    asynchronous: false,
  }),
);

Sandcastle.addToolbarButton("Move box", function () {
  let attributes = p.getGeometryInstanceAttributes(id1);
  offset = Cesium.Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center1),
    150000,
    new Cesium.Cartesian3(),
  );
  attributes.offset = Cesium.OffsetGeometryInstanceAttribute.toValue(
    offset,
    attributes.offset,
  );

  attributes = o.getGeometryInstanceAttributes(id1);
  offset = Cesium.Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center1),
    150000,
    new Cesium.Cartesian3(),
  );
  attributes.offset = Cesium.OffsetGeometryInstanceAttribute.toValue(
    offset,
    attributes.offset,
  );
});

Sandcastle.addToolbarButton("Move Cylinder", function () {
  let attributes = p.getGeometryInstanceAttributes(id2);
  offset = Cesium.Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center2),
    150000,
    new Cesium.Cartesian3(),
  );
  attributes.offset = Cesium.OffsetGeometryInstanceAttribute.toValue(
    offset,
    attributes.offset,
  );

  attributes = o.getGeometryInstanceAttributes(id2);
  offset = Cesium.Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center2),
    150000,
    new Cesium.Cartesian3(),
  );
  attributes.offset = Cesium.OffsetGeometryInstanceAttribute.toValue(
    offset,
    attributes.offset,
  );
});

Sandcastle.addToolbarButton("Move ellipsoid", function () {
  let attributes = p.getGeometryInstanceAttributes(id3);
  offset = Cesium.Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center3),
    150000,
    new Cesium.Cartesian3(),
  );
  attributes.offset = Cesium.OffsetGeometryInstanceAttribute.toValue(
    offset,
    attributes.offset,
  );

  attributes = o.getGeometryInstanceAttributes(id3);
  offset = Cesium.Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center3),
    150000,
    new Cesium.Cartesian3(),
  );
  attributes.offset = Cesium.OffsetGeometryInstanceAttribute.toValue(
    offset,
    attributes.offset,
  );
});
