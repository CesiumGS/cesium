import * as Cesium from "cesium";

console.warn = () => {};
const viewer = new Cesium.Viewer("cesiumContainer", {});
viewer.scene.globe.show = true;
viewer.scene.debugShowFramesPerSecond = true;
// Need to replace this with tileset url from mesh export service
const tilesetUrl = "";
const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

viewer.screenSpaceEventHandler.setInputAction(async function onLeftClick(movement) {
  const pickPosition = viewer.scene.pickPosition(movement.position);
  const pickFeature = viewer.scene.pick(movement.position);
  const element = pickFeature.getProperty("element");
  const elementId = `0x${element.toString(16)}`;

  const cartoRad = Cesium.Cartographic.fromCartesian(pickPosition);
  const carto = {
    longitude: Cesium.Math.toDegrees(cartoRad.longitude),
    latitude: Cesium.Math.toDegrees(cartoRad.latitude),
    height: cartoRad.height
  }
  console.log(carto);
  console.log(elementId);

  if (pickPosition) {
    const snapResult = await doSnap(elementId, carto.latitude, carto.longitude, carto.height);
    console.log("snap result:", snapResult);

    const snapPoint = snapResult.snapPoint;

    // returned snap point
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        snapPoint.longitude, snapPoint.latitude, snapPoint.height
      ),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 10,
        outlineColor: Cesium.Color.YELLOW,
        outlineWidth: 3,
      },
    });

    // returned hit point
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        snapResult.hitPoint.longitude,
        snapResult.hitPoint.latitude,
        snapResult.hitPoint.height
      ),
      point: {
        color: Cesium.Color.PINK,
        pixelSize: 10,
        outlineColor: Cesium.Color.FUCHSIA,
        outlineWidth: 3,
      },
    });

    // picked position
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        carto.longitude, carto.latitude, carto.height
      ),
      point: {
        color: Cesium.Color.LIME,
        pixelSize: 10,
        outlineColor: Cesium.Color.CYAN,
        outlineWidth: 3,
      },
    });
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

async function doSnap(elementId, latitude, longitude, height) {
  const response = await fetch(
    "http://localhost:3000/api/assets/844c3411-0a0c-4ed5-b608-34dae75d3982/template/request-snap",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: elementId,
        testPoint: {
          latitude: latitude,
          longitude: longitude,
          height: height
        },
        // frustumCorners: cornersLonLat,
        viewportSize: {
          width: viewer.scene.context.drawingBufferWidth,
          height: viewer.scene.context.drawingBufferHeight,
        }
      }),
    },
  );
  const data = await response.json();
  return data;
}

function getFrustumCornersECEF(camera) {
  const viewProjection = Cesium.Matrix4.multiply(
    camera.frustum.projectionMatrix,
    camera.viewMatrix,
    new Cesium.Matrix4()
  );
  const inverseViewProjection = Cesium.Matrix4.inverse(viewProjection, new Cesium.Matrix4());

  // 8 NDC corners: z=-1 is near plane, z=+1 is far plane
  const ndcCorners = [
    new Cesium.Cartesian4(-1, -1, -1, 1), // near bottom-left
    new Cesium.Cartesian4( 1, -1, -1, 1), // near bottom-right
    new Cesium.Cartesian4( 1,  1, -1, 1), // near top-right
    new Cesium.Cartesian4(-1,  1, -1, 1), // near top-left
    new Cesium.Cartesian4(-1, -1,  1, 1), // far bottom-left
    new Cesium.Cartesian4( 1, -1,  1, 1), // far bottom-right
    new Cesium.Cartesian4( 1,  1,  1, 1), // far top-right
    new Cesium.Cartesian4(-1,  1,  1, 1), // far top-left
  ];

  const corners = ndcCorners.map(ndc => {
    const worldPos = Cesium.Matrix4.multiplyByVector(inverseViewProjection, ndc, new Cesium.Cartesian4());
    // Perspective divide
    return new Cesium.Cartesian3(
      worldPos.x / worldPos.w,
      worldPos.y / worldPos.w,
      worldPos.z / worldPos.w
    );
  });

  return corners; // ECEF Cartesian3 coordinates
}

function cornersECEFToLonLat(corners) {
  const lonLats = [];
  corners.forEach((corner) => {
    const lonLat = Cesium.Cartographic.fromCartesian(corner);

    lonLats.push({
      longitude: Cesium.Math.toDegrees(lonLat.longitude),
      latitude: Cesium.Math.toDegrees(lonLat.latitude),
      elevation: lonLat.height
    })
  });

  return {
    "nearLowerLeft": lonLats[0],
    "nearLowerRight": lonLats[1],
    "nearUpperLeft": lonLats[2],
    "nearUpperRight": lonLats[3],
    "farLowerLeft": lonLats[4],
    "farLowerRight": lonLats[5],
    "farUpperLeft": lonLats[6],
    "farUpperRight": lonLats[7]
  }
}
