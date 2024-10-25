<template>
  <div
    class="viewer"
    id="viewer"
  ></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as Cesium from 'cesium'

onMounted(async () => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MWMyZWVjOS1lNmMzLTQ5NjQtOWQ2NC0zYTA4NTc0OGJkYjMiLCJpZCI6NjYzNjgsImlhdCI6MTYzMDkxMTIyOH0.nJMg8VBzAAtEiCZ0hdXU_LL5lRSxsdFWRYaz2ZQ82ow'
  const viewer = new Cesium.Viewer('viewer', {
    baseLayerPicker: false,
    useBrowserRecommendedResolution: false,
    timeline: false,
    animation: false,
    sceneMode: Cesium.SceneMode.SCENE3D,
    terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
      requestVertexNormals: true
    })
  })
  console.log(viewer)
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
