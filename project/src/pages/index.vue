<template>
  <div
    class="viewer"
    id="viewer"
  ></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as Cesium from 'cesium'
import geoJson from './china_geo.json'
import { ContourGeoJsonLayer3D } from './geojson'

onMounted(async () => {
  // Cesium.Ion.defaultAccessToken =
  //   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MWMyZWVjOS1lNmMzLTQ5NjQtOWQ2NC0zYTA4NTc0OGJkYjMiLCJpZCI6NjYzNjgsImlhdCI6MTYzMDkxMTIyOH0.nJMg8VBzAAtEiCZ0hdXU_LL5lRSxsdFWRYaz2ZQ82ow'
  const viewer = new Cesium.Viewer('viewer', {
    baseLayerPicker: false,
    useBrowserRecommendedResolution: false,
    timeline: false,
    animation: false,
    baseLayer: false,
    skyAtmosphere: false,
    sceneMode: Cesium.SceneMode.SCENE3D,
    shadows: true
  })
  viewer.scene.verticalExaggeration = 5
  viewer.cesiumWidget.creditContainer.remove()
  viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({ url: 'http://qefiles.91weather.com/cdn-repo/mlog/cloud/terrain/tile/gaode/d461a96842e24b958142f84c3051e588/{z}/{x}_{y}.png' }))
  viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
    requestVertexNormals: true
  })
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#fff')
  viewer.scene.debugShowFramesPerSecond = true
  viewer.scene.globe.showGroundAtmosphere = true
  const layer = new ContourGeoJsonLayer3D(geoJson as any)
  layer.addTo(viewer)
})
</script>

<style lang="scss">
.viewer {
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}
</style>
