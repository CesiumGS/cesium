import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

const options = {
  camera: viewer.scene.camera,
  canvas: viewer.scene.canvas,
};
const dataSourcePromise = viewer.dataSources.add(
  Cesium.KmlDataSource.load(
    "../../SampleData/kml/facilities/facilities.kml",
    options,
  ),
);
dataSourcePromise.then(function (dataSource) {
  const pixelRange = 15;
  const minimumClusterSize = 3;
  const enabled = true;

  dataSource.clustering.enabled = enabled;
  dataSource.clustering.pixelRange = pixelRange;
  dataSource.clustering.minimumClusterSize = minimumClusterSize;

  let removeListener;

  const pinBuilder = new Cesium.PinBuilder();
  const pin50 = pinBuilder.fromText("50+", Cesium.Color.RED, 48).toDataURL();
  const pin40 = pinBuilder.fromText("40+", Cesium.Color.ORANGE, 48).toDataURL();
  const pin30 = pinBuilder.fromText("30+", Cesium.Color.YELLOW, 48).toDataURL();
  const pin20 = pinBuilder.fromText("20+", Cesium.Color.GREEN, 48).toDataURL();
  const pin10 = pinBuilder.fromText("10+", Cesium.Color.BLUE, 48).toDataURL();

  const singleDigitPins = new Array(8);
  for (let i = 0; i < singleDigitPins.length; ++i) {
    singleDigitPins[i] = pinBuilder
      .fromText(`${i + 2}`, Cesium.Color.VIOLET, 48)
      .toDataURL();
  }

  function customStyle() {
    if (Cesium.defined(removeListener)) {
      removeListener();
      removeListener = undefined;
    } else {
      removeListener = dataSource.clustering.clusterEvent.addEventListener(
        function (clusteredEntities, cluster) {
          cluster.label.show = false;
          cluster.billboard.show = true;
          cluster.billboard.id = cluster.label.id;
          cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;

          if (clusteredEntities.length >= 50) {
            cluster.billboard.image = pin50;
          } else if (clusteredEntities.length >= 40) {
            cluster.billboard.image = pin40;
          } else if (clusteredEntities.length >= 30) {
            cluster.billboard.image = pin30;
          } else if (clusteredEntities.length >= 20) {
            cluster.billboard.image = pin20;
          } else if (clusteredEntities.length >= 10) {
            cluster.billboard.image = pin10;
          } else {
            cluster.billboard.image =
              singleDigitPins[clusteredEntities.length - 2];
          }
        },
      );
    }

    // force a re-cluster with the new styling
    const pixelRange = dataSource.clustering.pixelRange;
    dataSource.clustering.pixelRange = 0;
    dataSource.clustering.pixelRange = pixelRange;
  }

  // start with custom style
  customStyle();

  const viewModel = {
    pixelRange: pixelRange,
    minimumClusterSize: minimumClusterSize,
  };
  Cesium.knockout.track(viewModel);

  const toolbar = document.getElementById("toolbar");
  Cesium.knockout.applyBindings(viewModel, toolbar);

  function subscribeParameter(name) {
    Cesium.knockout
      .getObservable(viewModel, name)
      .subscribe(function (newValue) {
        dataSource.clustering[name] = newValue;
      });
  }

  subscribeParameter("pixelRange");
  subscribeParameter("minimumClusterSize");

  Sandcastle.addToggleButton("Enabled", true, function (checked) {
    dataSource.clustering.enabled = checked;
  });

  Sandcastle.addToggleButton("Custom Styling", true, function (checked) {
    customStyle();
  });

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (movement) {
    const pickedLabel = viewer.scene.pick(movement.position);
    if (Cesium.defined(pickedLabel)) {
      const ids = pickedLabel.id;
      if (Array.isArray(ids)) {
        for (let i = 0; i < ids.length; ++i) {
          ids[i].billboard.color = Cesium.Color.RED;
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
});
