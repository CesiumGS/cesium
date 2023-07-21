import { test, expect } from "./test.js";

test("Shows cartographic position on mouse over", async ({ cesiumPage }) => {
  await cesiumPage.goto();

  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      selectionIndicator: false,
      infoBox: false,
    });

    const scene = viewer.scene;

    const entity = viewer.entities.add({
      label: {
        show: false,
        showBackground: true,
        font: "14px monospace",
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(15, 0),
      },
    });

    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction(function (movement) {
      const cartesian = viewer.camera.pickEllipsoid(
        movement.endPosition,
        scene.globe.ellipsoid
      );
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const longitudeString = Cesium.Math.toDegrees(
          cartographic.longitude
        ).toFixed(2);
        const latitudeString = Cesium.Math.toDegrees(
          cartographic.latitude
        ).toFixed(2);

        entity.position = cartesian;
        entity.label.show = true;
        entity.label.text =
          `Lon: ${`   ${longitudeString}`.slice(-7)}\u00B0` +
          `\nLat: ${`   ${latitudeString}`.slice(-7)}\u00B0`;
      } else {
        entity.label.show = false;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  });

  await cesiumPage.tick();
  await cesiumPage.page.waitForLoadState("networkidle");

  const { width, height } = cesiumPage.page.viewportSize();
  await cesiumPage.page.mouse.move(width / 2, height / 2);

  await cesiumPage.tick();

  await expect(cesiumPage.page).toHaveScreenshot();
});
