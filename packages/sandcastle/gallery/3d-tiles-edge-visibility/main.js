import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4665927);

  viewer.scene.primitives.add(tileset);
  tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.EDGES_ONLY;
  await viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0.0, -0.5, 0.0));

  Sandcastle.addToolbarMenu([
    {
      text: "Edges Only",
      onselect: function () {
        tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.EDGES_ONLY;
      },
    },
    {
      text: "Surfaces + Edges",
      onselect: function () {
        tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;
      },
    },
    {
      text: "Surfaces Only",
      onselect: function () {
        tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_ONLY;
      },
    },
  ]);
  Sandcastle.addToggleButton("Show Tile Bounds", false, function (checked) {
    tileset.debugShowBoundingVolume = checked;
  });
} catch (error) {
  window.alert(`Error loading tileset: ${error}`);
}

const measurements = viewer.scene.primitives.add(
  new Cesium.PrimitiveCollection(),
);

const pointPrimitiveCollection = measurements.add(
  new Cesium.PointPrimitiveCollection(),
);

const firstPoint = pointPrimitiveCollection.add({
  color: Cesium.Color.YELLOW,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
});

const secondPoint = pointPrimitiveCollection.add({
  color: Cesium.Color.YELLOW,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  show: false,
});

let polyline;

function createPolyline(startPosition, endPosition) {
  if (Cesium.defined(polyline)) {
    measurements.remove(polyline);
  }

  polyline = measurements.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [startPosition, endPosition],
          width: 2.0,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
          arcType: Cesium.ArcType.NONE,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.YELLOW,
          ),
        },
      }),
      appearance: new Cesium.PolylineColorAppearance({
        translucent: false,
      }),
      asynchronous: false,
    }),
  );
}

const MeasurementState = {
  READY: 0,
  STARTED: 1,
  FINISHED: 2,
};

let measurementState = MeasurementState.READY;

const scratchPickRay = new Cesium.Ray();

function getSnapPosition(screenPos) {
  // Hide measurements so they don't interfere with picking
  measurements.show = false;

  let position;

  const hit = viewer.scene.snap(screenPos, 25, 25);
  if (Cesium.defined(hit)) {
    console.log(`snap: dx=${hit.x} dy=${hit.y} edge=${hit.isEdge}`);
    position = hit.position;
  } else {
    position = viewer.scene.pickPosition(screenPos);
  }

  if (!Cesium.defined(position)) {
    position = viewer.camera.pickEllipsoid(screenPos, viewer.scene.ellipsoid);
  }

  if (!Cesium.defined(position)) {
    // Sky fallback: project onto the pick ray so the dot still tracks the cursor.
    const ray = viewer.camera.getPickRay(screenPos, scratchPickRay);
    if (Cesium.defined(ray)) {
      const distance = Math.max(viewer.camera.positionCartographic.height, 1.0);
      position = Cesium.Ray.getPoint(ray, distance);
    }
  }

  // Restore measurements show
  measurements.show = true;

  return position;
}

viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
  const position = getSnapPosition(movement.endPosition);
  if (measurementState === MeasurementState.READY) {
    firstPoint.position = position ?? Cesium.Cartesian3.ZERO;
    firstPoint.show = Cesium.defined(position);
  } else if (measurementState === MeasurementState.STARTED) {
    secondPoint.position = position ?? Cesium.Cartesian3.ZERO;
    secondPoint.show = Cesium.defined(position);
    if (Cesium.defined(position)) {
      createPolyline(firstPoint.position, secondPoint.position);
    }
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
  const position = getSnapPosition(movement.position);
  if (!Cesium.defined(position)) {
    return;
  }
  if (measurementState === MeasurementState.READY) {
    firstPoint.position = position;
    secondPoint.position = firstPoint.position;
    secondPoint.show = true;
    measurementState = MeasurementState.STARTED;
  } else if (measurementState === MeasurementState.STARTED) {
    secondPoint.position = position;
    createPolyline(firstPoint.position, secondPoint.position);
    secondPoint.show = true;
    measurementState = MeasurementState.FINISHED;
  } else if (measurementState === MeasurementState.FINISHED) {
    measurementState = MeasurementState.READY;
    firstPoint.position = position;
    firstPoint.show = true;
    secondPoint.show = false;
    polyline.show = false;
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
