import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  }),
});

if (!Cesium.GroundPolylinePrimitive.isSupported(viewer.scene)) {
  window.alert("Polylines on terrain are not supported on this platform.");
}

const polylineIds = ["polyline1", "polyline2"];
const groundPrimitiveId = "ground primitive";
let selectedId = polylineIds[0];
let polylineOnTerrainPrimitive;
let groundPrimitiveOnTop = false;

let lineWidth = 4.0;
const viewModel = {
  lineWidth: lineWidth,
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "lineWidth")
  .subscribe(function (newValue) {
    lineWidth = parseFloat(viewModel.lineWidth);
    if (Cesium.defined(selectedId)) {
      const attributes =
        polylineOnTerrainPrimitive.getGeometryInstanceAttributes(selectedId);
      lineWidth = parseFloat(viewModel.lineWidth);
      attributes.width = [lineWidth];
    }
  });

const scene = viewer.scene;

// Add a Rectangle GroundPrimitive to demonstrate Z-indexing with GroundPrimitives
scene.groundPrimitives.add(
  new Cesium.GroundPrimitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: Cesium.Rectangle.fromDegrees(
          -112.1340164450331,
          36.05494287836128,
          -112.0840164450331,
          36.10494287836128,
        ),
        vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
      }),
      id: groundPrimitiveId,
    }),
    appearance: new Cesium.EllipsoidSurfaceAppearance({
      aboveGround: false,
      material: Cesium.Material.fromType("Color"),
    }),
    classificationType: Cesium.ClassificationType.TERRAIN,
  }),
);

const leftHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
leftHandler.setInputAction(function (movement) {
  const pickedObject = viewer.scene.pick(movement.position);
  if (Cesium.defined(pickedObject)) {
    console.log(pickedObject.id);
    // If picked the ground primitive, don't do anything
    if (pickedObject.id !== groundPrimitiveId) {
      selectedId = pickedObject.id;

      // Sync line width in toolbar with selected
      const attributes =
        polylineOnTerrainPrimitive.getGeometryInstanceAttributes(selectedId);
      viewModel.lineWidth = attributes.width[0];
    }
  } else {
    selectedId = undefined;
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

const polylinePositions = Cesium.Cartesian3.fromDegreesArray([
  -112.1340164450331,
  36.05494287836128,
  -112.08821010582645,
  36.097804071380715,
  -112.13296079730024,
  36.168769146801104,
  -112.10828895143331,
  36.20031318533197,
  -112.138548165717,
  36.1691100215289, // hairpins
  -112.11482556496543,
  36.20127524083297,
  -112.15921333464016,
  36.17876011207708,
  -112.14700151155604,
  36.21683132404626,
  -112.20919883052926,
  36.19475754001766,
]);

const loopPositions = Cesium.Cartesian3.fromDegreesArray([
  -111.94500779274114, 36.27638678884143, -111.90983004392696,
  36.07985366173454, -111.80360100637773, 36.13694878292542,
  -111.85510122419183, 36.26029588763386, -111.69141601804614,
  36.05128770351902,
]);

function createPolylines(debugShowShadowVolume) {
  const instance1 = new Cesium.GeometryInstance({
    geometry: new Cesium.GroundPolylineGeometry({
      positions: polylinePositions,
      loop: false,
      width: 4.0,
    }),
    id: polylineIds[0],
    attributes: {
      show: new Cesium.ShowGeometryInstanceAttribute(),
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(
        Cesium.Color.fromCssColorString("green").withAlpha(0.7),
      ),
    },
  });

  const instance2 = new Cesium.GeometryInstance({
    geometry: new Cesium.GroundPolylineGeometry({
      positions: loopPositions,
      loop: true,
      width: 8.0,
    }),
    id: polylineIds[1],
    attributes: {
      show: new Cesium.ShowGeometryInstanceAttribute(),
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(
        Cesium.Color.fromCssColorString("#67ADDF").withAlpha(0.7),
      ),
    },
  });

  polylineOnTerrainPrimitive = new Cesium.GroundPolylinePrimitive({
    geometryInstances: [instance1, instance2],
    debugShowShadowVolume: debugShowShadowVolume,
  });
  scene.groundPrimitives.add(polylineOnTerrainPrimitive);
}

function applyPerInstanceColor() {
  polylineOnTerrainPrimitive.appearance = new Cesium.PolylineColorAppearance();
}
function applyColorMaterial() {
  polylineOnTerrainPrimitive.appearance = new Cesium.PolylineMaterialAppearance(
    {
      material: Cesium.Material.fromType("Color", {
        color: new Cesium.Color(0.7, 0.0, 1.0, 1.0),
      }),
    },
  );
}
function applyGlowMaterial() {
  polylineOnTerrainPrimitive.appearance = new Cesium.PolylineMaterialAppearance(
    {
      material: Cesium.Material.fromType("PolylineGlow", {
        innerWidth: 1.0,
      }),
    },
  );
}
function applyArrow() {
  polylineOnTerrainPrimitive.appearance = new Cesium.PolylineMaterialAppearance(
    {
      material: Cesium.Material.fromType("PolylineArrow"),
    },
  );
}
function applyDash() {
  polylineOnTerrainPrimitive.appearance = new Cesium.PolylineMaterialAppearance(
    {
      material: Cesium.Material.fromType("PolylineDash", {
        color: Cesium.Color.YELLOW,
      }),
    },
  );
}
function applyOutline() {
  polylineOnTerrainPrimitive.appearance = new Cesium.PolylineMaterialAppearance(
    {
      material: Cesium.Material.fromType("PolylineOutline"),
    },
  );
}

Sandcastle.addToolbarButton("Toggle instance show", function () {
  if (Cesium.defined(selectedId)) {
    const attributes =
      polylineOnTerrainPrimitive.getGeometryInstanceAttributes(selectedId);
    attributes.show = [attributes.show[0] ? 0 : 1];
  }
});

Sandcastle.addToolbarButton("Show all", function () {
  if (Cesium.defined(selectedId)) {
    let attributes =
      polylineOnTerrainPrimitive.getGeometryInstanceAttributes("polyline1");
    attributes.show = [1];
    attributes =
      polylineOnTerrainPrimitive.getGeometryInstanceAttributes("polyline2");
    attributes.show = [1];
  }
});

Sandcastle.addToolbarButton("Toggle debugShowShadowVolume", function () {
  const debugShowShadowVolume =
    !polylineOnTerrainPrimitive.debugShowShadowVolume;
  const appearance = polylineOnTerrainPrimitive.appearance;
  scene.groundPrimitives.remove(polylineOnTerrainPrimitive);
  createPolylines(debugShowShadowVolume);
  polylineOnTerrainPrimitive.appearance = appearance;
});

Sandcastle.addToolbarButton("Toggle z-index", function () {
  if (groundPrimitiveOnTop) {
    scene.groundPrimitives.raiseToTop(polylineOnTerrainPrimitive);
  } else {
    scene.groundPrimitives.lowerToBottom(polylineOnTerrainPrimitive);
  }
  groundPrimitiveOnTop = !groundPrimitiveOnTop;
});

function lookAt() {
  viewer.camera.lookAt(
    polylinePositions[1],
    new Cesium.Cartesian3(50000.0, 50000.0, 50000.0),
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

Sandcastle.addToolbarButton("reset view", function () {
  lookAt();
});

createPolylines(false);
applyPerInstanceColor();

lookAt();

Sandcastle.addToolbarMenu([
  {
    text: "Per Instance Color",
    onselect: function () {
      applyPerInstanceColor();
      Sandcastle.highlight(applyPerInstanceColor);
    },
  },
  {
    text: "Color",
    onselect: function () {
      applyColorMaterial();
      Sandcastle.highlight(applyColorMaterial);
    },
  },
  {
    text: "Glow",
    onselect: function () {
      applyGlowMaterial();
      Sandcastle.highlight(applyGlowMaterial);
    },
  },
  {
    text: "Arrow",
    onselect: function () {
      applyArrow();
      Sandcastle.highlight(applyArrow);
    },
  },
  {
    text: "Dash",
    onselect: function () {
      applyDash();
      Sandcastle.highlight(applyDash);
    },
  },
  {
    text: "Outline",
    onselect: function () {
      applyOutline();
      Sandcastle.highlight(applyOutline);
    },
  },
]);
