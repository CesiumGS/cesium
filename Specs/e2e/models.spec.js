import { test, expect } from "./test.js";

test("loads animated model", async ({ cesiumPage }) => {
  await cesiumPage.goto();

  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      globe: false,
    });

    const position = Cesium.Cartesian3.fromDegrees(
      -123.0744619,
      44.0503706,
      150.0,
    );
    const heading = Cesium.Math.toRadians(135);
    const pitch = 0;
    const roll = 0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr,
    );

    const entity = viewer.entities.add({
      position: position,
      orientation: orientation,
      model: {
        uri: "../../Apps/SampleData/models/CesiumDrone/CesiumDrone.glb",
        minimumPixelSize: 128,
        maximumScale: 20000,
      },
    });

    viewer.trackedEntity = entity;
  });
  await cesiumPage.page.clock.pauseAt(new Date("2023-12-25T14:00:00"));
  await cesiumPage.page.waitForLoadState("networkidle");

  await cesiumPage.page.clock.runFor(1000);
  await cesiumPage.page.clock.runFor(1000);
  await cesiumPage.page.clock.runFor(1000);

  await expect(cesiumPage.page).toHaveScreenshot();
});

test("loads draco model", async ({ cesiumPage }) => {
  await cesiumPage.goto();

  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      globe: false,
    });

    const position = Cesium.Cartesian3.fromDegrees(
      -123.0744619,
      44.0503706,
      0.0,
    );
    const heading = Cesium.Math.toRadians(135);
    const pitch = 0;
    const roll = 0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr,
    );

    const entity = viewer.entities.add({
      position: position,
      orientation: orientation,
      model: {
        uri: "../../Apps/SampleData/models/DracoCompressed/CesiumMilkTruck.gltf",
        minimumPixelSize: 128,
        maximumScale: 20000,
      },
    });

    viewer.trackedEntity = entity;
  });

  await expect(cesiumPage.page).toHaveScreenshot();
});

test("loads model with KTX2 textures", async ({ cesiumPage }) => {
  await cesiumPage.goto();
  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      globe: false,
    });

    const position = Cesium.Cartesian3.fromDegrees(
      -123.0744619,
      44.0503706,
      1000.0,
    );
    const heading = Cesium.Math.toRadians(135);
    const pitch = 0;
    const roll = 0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr,
    );

    const entity = viewer.entities.add({
      position: position,
      orientation: orientation,
      model: {
        uri: "../../Apps/SampleData/models/CesiumBalloonKTX2/CesiumBalloonKTX2.glb",
        minimumPixelSize: 128,
        maximumScale: 20000,
      },
    });

    viewer.trackedEntity = entity;
  });

  await expect(cesiumPage.page).toHaveScreenshot();
});
